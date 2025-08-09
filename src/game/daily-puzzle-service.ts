import { collection, doc, getDoc, setDoc, query, where, getDocs, limit } from 'firebase/firestore';
import { DailyPuzzleGenerator } from './daily-puzzle-generator';
import type { DailyPuzzle } from './game-mode-manager';
import { startupService } from '../services/startup-service';
import { UnifiedCache } from '../dictionary/unified-cache';
import type { FirestoreProvider } from '@/services/firestore-provider';

const CACHE_KEYS = {
  PUZZLE: 'puzzle',
  COMPLETED: 'completed',
  HISTORY: 'history'
} as const;

interface PuzzleHistoryResult {
  puzzles: DailyPuzzle[];
  hasMore: boolean;
}

export class DailyPuzzleService {
  private readonly COLLECTION = 'daily_puzzles';
  private readonly COMPLETED_COLLECTION = 'completed_puzzles';
  private readonly PREFETCH_DAYS = 3;
  private readonly HISTORY_BATCH_SIZE = 10;
  
  private puzzleCache: UnifiedCache<DailyPuzzle>;
  private historyCache: UnifiedCache<PuzzleHistoryResult>;
  private completedCache: Map<string, Set<string>>; // date -> userIds
  private prefetchTimeout: NodeJS.Timeout | null = null;
  
  constructor() {
    this.puzzleCache = UnifiedCache.getInstance<DailyPuzzle>({
      maxEntries: 10,
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      namespace: 'dailyPuzzles'
    });
    
    this.historyCache = UnifiedCache.getInstance<PuzzleHistoryResult>({
      maxEntries: 20,
      ttl: 12 * 60 * 60 * 1000, // 12 hours
      namespace: 'puzzleHistory'
    });
    
    this.completedCache = new Map();
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  async getDailyPuzzle(date?: Date): Promise<DailyPuzzle> {
    const puzzleDate = date ? this.formatDate(date) : this.formatDate(new Date());
    
    // Try cache first
    const cached = await this.puzzleCache.get(`${CACHE_KEYS.PUZZLE}_${puzzleDate}`);
    if (cached) {
      return cached;
    }

    // Get from Firebase
    const puzzle = await this.fetchPuzzleFromFirebase(puzzleDate);
    
    // Cache the result
    await this.puzzleCache.set(`${CACHE_KEYS.PUZZLE}_${puzzleDate}`, puzzle);
    
    // Start prefetching next few days in the background
    this.schedulePrefetch();
    
    return puzzle;
  }

  constructor(private provider?: FirestoreProvider | null) {
    this.puzzleCache = UnifiedCache.getInstance<DailyPuzzle>({
      maxEntries: 10,
      ttl: 24 * 60 * 60 * 1000,
      namespace: 'dailyPuzzles'
    });
    this.historyCache = UnifiedCache.getInstance<PuzzleHistoryResult>({
      maxEntries: 20,
      ttl: 12 * 60 * 60 * 1000,
      namespace: 'puzzleHistory'
    });
    this.completedCache = new Map();
  }

  private async fetchPuzzleFromFirebase(date: string): Promise<DailyPuzzle> {
    if (this.provider) {
      const data = await this.provider.getDocument<DailyPuzzle>(this.COLLECTION, date);
      if (!data) throw new Error(`No puzzle found for date: ${date}`);
      return data;
    }
    const mod = await import('../firebase/firebase');
    const db = mod.getDbOptional?.();
    const puzzleDoc = await getDoc(doc(db!, this.COLLECTION, date));
    
    if (!puzzleDoc.exists()) {
      throw new Error(`No puzzle found for date: ${date}`);
    }

    return puzzleDoc.data() as DailyPuzzle;
  }

  private schedulePrefetch(): void {
    // Cancel any existing prefetch
    if (this.prefetchTimeout) {
      clearTimeout(this.prefetchTimeout);
    }

    // Schedule prefetch for idle time (5 seconds after last action)
    this.prefetchTimeout = setTimeout(() => {
      this.prefetchUpcomingPuzzles().catch(console.error);
    }, 5000);
  }

  private async prefetchUpcomingPuzzles(): Promise<void> {
    const today = new Date();
    
    for (let i = 1; i <= this.PREFETCH_DAYS; i++) {
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + i);
      const dateStr = this.formatDate(futureDate);
      
      // Skip if already cached
      const cached = await this.puzzleCache.get(`${CACHE_KEYS.PUZZLE}_${dateStr}`);
      if (cached) continue;
      
      try {
        const puzzle = await this.fetchPuzzleFromFirebase(dateStr);
        await this.puzzleCache.set(`${CACHE_KEYS.PUZZLE}_${dateStr}`, puzzle);
      } catch (error) {
        console.error(`Failed to prefetch puzzle for ${dateStr}:`, error);
      }
    }
  }

  async getPuzzleHistory(userId: string, offset: number = 0): Promise<PuzzleHistoryResult> {
    const cacheKey = `${CACHE_KEYS.HISTORY}_${userId}_${offset}`;
    
    // Try cache first
    const cached = await this.historyCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Query Firebase
    let docs: any[] = [];
    if (this.provider) {
      docs = await this.provider.queryCollection<any>(this.COMPLETED_COLLECTION, [
        { type: 'where', field: 'userId', operator: '==', value: userId },
        { type: 'limit', count: this.HISTORY_BATCH_SIZE + 1 },
      ]);
    } else {
      const mod = await import('../firebase/firebase');
      const db = mod.getDbOptional?.();
      const completedQuery = query(
        collection(db!, this.COMPLETED_COLLECTION),
        where('userId', '==', userId),
        limit(this.HISTORY_BATCH_SIZE + 1)
      );
      const completedDocs = await getDocs(completedQuery);
      docs = completedDocs.docs.map(d => d.data());
    }
    const puzzles: DailyPuzzle[] = [];
    for (const d of docs.slice(0, this.HISTORY_BATCH_SIZE)) {
      const puzzle = await this.fetchPuzzleFromFirebase(d.puzzleDate);
      puzzles.push(puzzle);
    }

    const result: PuzzleHistoryResult = {
      puzzles,
      hasMore: completedDocs.docs.length > this.HISTORY_BATCH_SIZE
    };

    // Cache the result
    await this.historyCache.set(cacheKey, result);

    return result;
  }

  async markPuzzleCompleted(userId: string, puzzleDate: string): Promise<void> {
    // Update local cache
    const dateSet = this.completedCache.get(puzzleDate) || new Set();
    dateSet.add(userId);
    this.completedCache.set(puzzleDate, dateSet);

    // Update Firebase
    if (this.provider) {
      await this.provider.setDocument(this.COMPLETED_COLLECTION, `${puzzleDate}_${userId}`, {
        userId,
        puzzleDate,
        completedAt: new Date().toISOString()
      });
    } else {
      const mod = await import('../firebase/firebase');
      const db = mod.getDbOptional?.();
      await setDoc(doc(db!, this.COMPLETED_COLLECTION, `${puzzleDate}_${userId}`), {
        userId,
        puzzleDate,
        completedAt: new Date()
      });
    }
  }

  async hasCompletedPuzzle(userId: string, puzzleDate: string): Promise<boolean> {
    // Check local cache first
    const dateSet = this.completedCache.get(puzzleDate);
    if (dateSet?.has(userId)) return true;

    // Check Firebase
    let completed = false;
    if (this.provider) {
      completed = await this.provider.documentExists(this.COMPLETED_COLLECTION, `${puzzleDate}_${userId}`);
    } else {
      const mod = await import('../firebase/firebase');
      const db = mod.getDbOptional?.();
      const docRef = doc(db!, this.COMPLETED_COLLECTION, `${puzzleDate}_${userId}`);
      const docSnap = await getDoc(docRef);
      completed = docSnap.exists();
    }
    
    // Update cache
    if (completed) {
      const dateSet = this.completedCache.get(puzzleDate) || new Set();
      dateSet.add(userId);
      this.completedCache.set(puzzleDate, dateSet);
    }

    return completed;
  }

  clearCache(): void {
    this.puzzleCache.clear();
    this.historyCache.clear();
    this.completedCache.clear();
  }
}

// Export singleton instance (client default)
export const dailyPuzzleService = new DailyPuzzleService();

// Helper to create a server-side instance with provider when needed
export function createDailyPuzzleServiceWithProvider(provider: FirestoreProvider) {
  return new DailyPuzzleService(provider);
}