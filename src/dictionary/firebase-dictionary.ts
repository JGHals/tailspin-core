import type { Firestore } from 'firebase/firestore';
import { collection, doc, getDoc, getDocs, query, where, writeBatch, runTransaction, orderBy } from 'firebase/firestore';
import { FIREBASE_CONFIG, DICTIONARY_CONFIG } from './constants';
import type { DictionaryAccess, DictionaryMetadata, CacheAnalytics, DictionaryOperations } from './types';
import type { FirestoreProvider, QueryConstraint } from '@/services/firestore-provider';

interface WordChunk {
  words: string[];
  prefix: string;
  chunkIndex: number;
  wordCount: number;
  minLength: number;
  maxLength: number;
  updatedAt: string;
}

/**
 * Optimized dictionary implementation using Firebase for storage and caching.
 * This is the primary dictionary implementation used by the game.
 * 
 * Features:
 * - Efficient prefix-based word lookup
 * - Local caching for frequently accessed words
 * - Real-time updates for dictionary changes
 * - Batch loading for performance
 * 
 * Usage:
 * ```typescript
 * // Initialize
 * await dictionaryAccess.initialize();
 * 
 * // Validate a word
 * const isValid = await dictionaryAccess.isValidWord("puzzle");
 * 
 * // Get next possible words
 * const nextWords = await dictionaryAccess.getValidNextWords("puzzle");
 * ```
 */
export class FirebaseDictionaryOptimized implements DictionaryAccess, DictionaryOperations {
  private metadata: DictionaryMetadata | null = null;
  private chunkCache: Map<string, WordChunk[]> = new Map();
  private initialized: boolean = false;
  private provider: FirestoreProvider | null;

  // Global override usable from server/API to force admin provider
  private static providerOverride: FirestoreProvider | null = null;

  static setProviderOverride(provider: FirestoreProvider | null) {
    FirebaseDictionaryOptimized.providerOverride = provider;
  }

  constructor(provider?: FirestoreProvider | null) {
    this.provider = provider ?? null;
  }

  private get activeProvider(): FirestoreProvider | null {
    return this.provider ?? FirebaseDictionaryOptimized.providerOverride ?? null;
  }

  private async getClientDb(): Promise<Firestore | null> {
    if (typeof window === 'undefined') return null;
    const mod = await import('../firebase/firebase');
    return (mod.db as Firestore | null) ?? null;
  }

  // Helper to read metadata via provider or client db
  private async getMetadata(): Promise<DictionaryMetadata> {
    if (this.metadata) return this.metadata;
    const provider = this.activeProvider;
    if (provider) {
      const data = await provider.getDocument<DictionaryMetadata>(
        FIREBASE_CONFIG.COLLECTIONS.METADATA,
        FIREBASE_CONFIG.METADATA_DOC
      );
      if (!data) throw new Error('Dictionary metadata not found');
      this.metadata = data;
      return data;
    }
    const database = await this.getClientDb();
    if (!database) throw new Error('[Dictionary] Firestore not initialized');
    const ref = doc(collection(database, FIREBASE_CONFIG.COLLECTIONS.METADATA), FIREBASE_CONFIG.METADATA_DOC);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Dictionary metadata not found');
    this.metadata = snap.data() as DictionaryMetadata;
    return this.metadata;
  }

  private async loadMetadata(): Promise<DictionaryMetadata> {
    return this.getMetadata();
  }

  async getWords(prefix: string): Promise<string[]> {
    // Check cache first
    const cached = this.chunkCache.get(prefix);
    if (cached) {
      return cached.flatMap(chunk => chunk.words);
    }

    const provider = this.activeProvider;
    let wordChunks: WordChunk[] = [];
    if (provider) {
      const constraints: QueryConstraint[] = [
        { type: 'where', field: 'prefix', operator: '==', value: prefix },
        { type: 'orderBy', field: 'chunkIndex', direction: 'asc' }
      ];
      const docs = await provider.queryCollection<WordChunk>(FIREBASE_CONFIG.COLLECTIONS.PREFIXES, constraints);
      wordChunks = docs;
    } else {
      const database = await this.getClientDb();
      if (!database) return [];
      const prefixRef = collection(database, FIREBASE_CONFIG.COLLECTIONS.PREFIXES);
      const chunks = await getDocs(query(prefixRef, where('prefix', '==', prefix), orderBy('chunkIndex')));
      if (chunks.empty) return [];
      chunks.forEach(d => {
        wordChunks.push(d.data() as WordChunk);
      });
    }

    this.chunkCache.set(prefix, wordChunks);
    return wordChunks.flatMap(chunk => chunk.words);
  }

  async updateWords(prefix: string, words: string[]): Promise<void> {
    const chunks: WordChunk[] = [];
    
    // Split words into chunks
    for (let i = 0; i < words.length; i += FIREBASE_CONFIG.CHUNK_SIZE) {
      const chunkWords = words.slice(i, i + FIREBASE_CONFIG.CHUNK_SIZE);
      const lengths = chunkWords.map(w => w.length);
      
      chunks.push({
        words: chunkWords,
        prefix,
        chunkIndex: Math.floor(i / FIREBASE_CONFIG.CHUNK_SIZE),
        wordCount: chunkWords.length,
        minLength: Math.min(...lengths),
        maxLength: Math.max(...lengths),
        updatedAt: new Date().toISOString()
      });
    }

    const provider = this.activeProvider;
    if (provider) {
      // Batch write chunks
      const ops = chunks.map(chunk => ({
        type: 'set' as const,
        collectionPath: FIREBASE_CONFIG.COLLECTIONS.PREFIXES,
        docId: `${prefix}_${chunk.chunkIndex}`,
        data: chunk
      }));
      await provider.writeBatch(ops);

      // Transaction to update metadata
      await provider.runTransaction<void>(async (tx) => {
        const meta = (await tx.get<DictionaryMetadata>(
          FIREBASE_CONFIG.COLLECTIONS.METADATA,
          FIREBASE_CONFIG.METADATA_DOC
        ))!;
        const metadata = meta ?? {
          prefixCounts: {}, lastUpdated: new Date().toISOString(), totalWords: 0
        } as any as DictionaryMetadata;
        metadata.prefixCounts[prefix] = words.length;
        metadata.lastUpdated = new Date().toISOString();
        metadata.totalWords = Object.values(metadata.prefixCounts).reduce((s: number, c: number) => s + (c as number), 0);
        await tx.set(FIREBASE_CONFIG.COLLECTIONS.METADATA, FIREBASE_CONFIG.METADATA_DOC, metadata);
      });
    } else {
      const database = await this.getClientDb();
      if (!database) throw new Error('[Dictionary] Firestore not initialized');
      const batches: Array<Promise<void>> = [];
      for (let i = 0; i < chunks.length; i += FIREBASE_CONFIG.BATCH_SIZE) {
        const batch = writeBatch(database);
        const batchChunks = chunks.slice(i, i + FIREBASE_CONFIG.BATCH_SIZE);
        batchChunks.forEach(chunk => {
          const chunkRef = doc(collection(database, FIREBASE_CONFIG.COLLECTIONS.PREFIXES), `${prefix}_${chunk.chunkIndex}`);
          batch.set(chunkRef, chunk);
        });
        batches.push(batch.commit());
      }
      await runTransaction(database, async (transaction) => {
        const metaRef = doc(collection(database, FIREBASE_CONFIG.COLLECTIONS.METADATA), FIREBASE_CONFIG.METADATA_DOC);
        const snap = await transaction.get(metaRef as any);
        const metadata = (snap?.exists() ? snap.data() : { prefixCounts: {}, totalWords: 0 }) as DictionaryMetadata;
        metadata.prefixCounts[prefix] = words.length;
        metadata.lastUpdated = new Date().toISOString();
        metadata.totalWords = Object.values(metadata.prefixCounts).reduce((s: number, c: number) => s + (c as number), 0);
        transaction.set(metaRef as any, metadata as any);
      });
      await Promise.all(batches);
    }
    
    // Update cache
    this.chunkCache.set(prefix, chunks);
  }

  async getWordsByLength(prefix: string, minLength: number, maxLength: number): Promise<string[]> {
    const provider = this.activeProvider;
    if (provider) {
      const constraints: QueryConstraint[] = [
        { type: 'where', field: 'prefix', operator: '==', value: prefix },
        { type: 'where', field: 'minLength', operator: '<=', value: maxLength },
        { type: 'where', field: 'maxLength', operator: '>=', value: minLength },
      ];
      const docs = await provider.queryCollection<WordChunk>(FIREBASE_CONFIG.COLLECTIONS.PREFIXES, constraints);
      return docs
        .flatMap(c => c.words)
        .filter(w => w.length >= minLength && w.length <= maxLength);
    } else {
      const database = await this.getClientDb();
      if (!database) return [];
      const prefixRef = collection(database, FIREBASE_CONFIG.COLLECTIONS.PREFIXES);
      const chunks = await getDocs(
        query(
          prefixRef,
          where('prefix', '==', prefix),
          where('minLength', '<=', maxLength),
          where('maxLength', '>=', minLength)
        )
      );
      if (chunks.empty) return [];
      const words: string[] = [];
      chunks.forEach(d => {
        const chunk = d.data() as WordChunk;
        words.push(...chunk.words.filter(w => w.length >= minLength && w.length <= maxLength));
      });
      return words;
    }
  }

  async getPopularPrefixes(limit: number = 10): Promise<Array<{ prefix: string; count: number }>> {
    const metadata = await this.loadMetadata();
    return Object.entries(metadata.prefixCounts)
      .map(([prefix, count]) => ({ prefix, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  clearCache(): void {
    this.chunkCache.clear();
    this.metadata = null;
  }

  /**
   * Initializes the dictionary by loading metadata from Firebase.
   * Must be called before using any other methods.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      await this.loadMetadata();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize dictionary:', error);
      throw error;
    }
  }

  async getWordsWithPrefix(prefix: string): Promise<string[]> {
    return this.getWords(prefix);
  }

  getCacheAnalytics(): CacheAnalytics {
    const popularPrefixes = new Map<string, number>();
    let hits = 0;
    let misses = 0;
    let evictions = 0;
    let totalAccesses = 0;
    let totalTime = 0;

    // Calculate cache statistics
    this.chunkCache.forEach((chunks, prefix) => {
      const wordCount = chunks.reduce((sum, chunk) => sum + chunk.wordCount, 0);
      popularPrefixes.set(prefix, wordCount);
      hits += wordCount;
      totalAccesses += wordCount;
    });

    return {
      hits,
      misses,
      evictions,
      totalAccesses,
      averageAccessTime: totalAccesses > 0 ? totalTime / totalAccesses : 0,
      popularPrefixes
    };
  }

  async isValidWord(word: string): Promise<boolean> {
    const prefix = word.slice(0, 2);
    const words = await this.getWords(prefix);
    return words.includes(word);
  }

  async findNextValidWords(lastWord: string): Promise<string[]> {
    const prefix = lastWord.slice(-2);
    return this.getWords(prefix);
  }

  isValidChain(prevWord: string, nextWord: string): boolean {
    if (!prevWord || !nextWord) return false;
    return nextWord.startsWith(prevWord.slice(-2));
  }

  async isTerminalWord(word: string): Promise<boolean> {
    const nextWords = await this.findNextValidWords(word);
    return nextWords.length === 0;
  }

  getValidNextWords(currentWord: string): Promise<string[]> {
    return this.findNextValidWords(currentWord);
  }

  getValidPreviousWords(currentWord: string): Promise<string[]> {
    const prefix = currentWord.slice(0, 2);
    return this.getWords(prefix);
  }

  async getRandomWord(options?: { minLength?: number; maxLength?: number }): Promise<string> {
    const metadata = await this.loadMetadata();
    const prefixes = Object.keys(metadata.prefixCounts);
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    
    let words = await this.getWords(randomPrefix);
    
    if (options) {
      const { minLength = 2, maxLength = 15 } = options;
      words = words.filter(w => w.length >= minLength && w.length <= maxLength);
    }
    
    return words[Math.floor(Math.random() * words.length)];
  }

  async getHintWords(prefix: string, count: number = 3): Promise<string[]> {
    const words = await this.getWords(prefix);
    return words
      .sort(() => Math.random() - 0.5)
      .slice(0, count);
  }
} 