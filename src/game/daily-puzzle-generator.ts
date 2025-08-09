import { dictionaryAccess } from '../dictionary/dictionary-access';
import { chainValidator } from './chain-validator';
import { doc, setDoc, getDoc, collection } from 'firebase/firestore';
import type { FirestoreProvider } from '@/services/firestore-provider';

export interface DailyPuzzle {
  id: string;
  date: string;
  startWord: string;
  targetWord: string;
  parMoves: number;
  difficulty: 'easy' | 'medium' | 'hard';
  validPaths: string[][];
  hints?: string[];
  metadata?: {
    averageCompletionTime?: number;
    totalAttempts?: number;
    successRate?: number;
    optimalPathCount?: number;
    branchingFactor?: number;
  };
}

interface WordPath {
  word: string;
  path: string[];
  depth: number;
  branchingFactor?: number;
}

export interface GeneratorOptions {
  fastMode?: boolean;
  maxCandidatesPerPrefix?: number; // cap number of words sampled per prefix when scoring branching
  maxBranchingPerNode?: number; // cap number of next words explored from a node
  timeBudgetMs?: number; // optional overall time budget per puzzle
}

export class DailyPuzzleGenerator {
  private static readonly MIN_PATH_LENGTH = 4;
  private static readonly MAX_PATH_LENGTH = 8;
  private static readonly MAX_SEARCH_DEPTH = 10;
  private static readonly MIN_WORD_LENGTH = 4;
  private static readonly MAX_VALID_PATHS = 5;
  private static readonly COLLECTION_PUZZLES = 'daily_puzzles';

  private generationDeadline: number | null = null;

  private async findAllValidPaths(
    startWord: string,
    targetWord: string,
    maxDepth: number = DailyPuzzleGenerator.MAX_PATH_LENGTH
  ): Promise<string[][]> {
    const visited = new Set<string>([startWord]);
    const queue: WordPath[] = [{ word: startWord, path: [startWord], depth: 0 }];
    const validPaths: string[][] = [];
    
    while (queue.length > 0 && validPaths.length < DailyPuzzleGenerator.MAX_VALID_PATHS) {
      if (this.generationDeadline && Date.now() > this.generationDeadline) {
        break; // time budget exceeded
      }
      const { word, path, depth } = queue.shift()!;
      
      if (depth >= maxDepth) continue;
      
      const nextWords = await chainValidator.findPossibleNextWords(word);
      
      // Calculate branching factor for this position
      const validNextWordsAll = nextWords.filter(w => 
        w.length >= DailyPuzzleGenerator.MIN_WORD_LENGTH && 
        !visited.has(w)
      );
      const maxBranch = this.options?.maxBranchingPerNode ?? 100;
      const validNextWords = validNextWordsAll.slice(0, Math.max(1, maxBranch));

      // If we reached target, add to valid paths
      if (word === targetWord && path.length >= DailyPuzzleGenerator.MIN_PATH_LENGTH) {
        validPaths.push([...path]);
        continue;
      }
      
      // Add all valid next paths to queue
      for (const nextWord of validNextWords) {
        if (visited.has(nextWord)) continue;
        
        visited.add(nextWord);
        queue.push({
          word: nextWord,
          path: [...path, nextWord],
          depth: depth + 1,
          branchingFactor: validNextWords.length
        });
      }
    }
    
    return validPaths;
  }

  private async getRandomStartWord(): Promise<string> {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    let attempts = 0;
    const maxAttempts = 10;
    let bestWord = '';
    let maxBranchingFactor = 0;

    while (attempts < maxAttempts) {
      const prefix = letters[Math.floor(Math.random() * 26)] + 
                    letters[Math.floor(Math.random() * 26)];
      
      const words = await dictionaryAccess.getWordsWithPrefix(prefix);
      const validWordsUncapped = words.filter(w => 
        w.length >= DailyPuzzleGenerator.MIN_WORD_LENGTH
      );
      const cap = this.options?.maxCandidatesPerPrefix ?? 200;
      const validWords = validWordsUncapped.slice(0, Math.max(1, cap));
      if (process.env.DICTIONARY_DEBUG === '1' || process.env.DICTIONARY_DEBUG === 'true') {
        // eslint-disable-next-line no-console
        console.log(`[Generator] prefix=${prefix} total=${words.length} valid=${validWordsUncapped.length} (capped=${validWords.length})`);
      }
      
      for (const word of validWords) {
        const nextWordsAll = await chainValidator.findPossibleNextWords(word);
        const nextCap = this.options?.maxBranchingPerNode ?? 100;
        const nextWords = nextWordsAll.slice(0, Math.max(1, nextCap));
        if (nextWordsAll.length > maxBranchingFactor) {
          maxBranchingFactor = nextWords.length;
          bestWord = word;
        }
      }
      
      if (maxBranchingFactor > 5) {
        return bestWord;
      }
      
      attempts++;
    }

    if (!bestWord) {
      throw new Error('Could not find valid start word');
    }

    return bestWord;
  }

  private calculateDifficulty(paths: string[][]): {
    difficulty: 'easy' | 'medium' | 'hard';
    parMoves: number;
    branchingFactor: number;
  } {
    const shortestPath = Math.min(...paths.map(p => p.length - 1));
    const longestPath = Math.max(...paths.map(p => p.length - 1));
    const avgBranchingFactor = paths.reduce((sum, path) => sum + path.length, 0) / paths.length;
    
    let difficulty: 'easy' | 'medium' | 'hard';
    let parMoves: number;
    
    if (shortestPath <= 3 && avgBranchingFactor > 5) {
      difficulty = 'easy';
      parMoves = shortestPath + 1;
    } else if (shortestPath <= 5 && avgBranchingFactor > 3) {
      difficulty = 'medium';
      parMoves = shortestPath + 2;
    } else {
      difficulty = 'hard';
      parMoves = shortestPath + 3;
    }

    return {
      difficulty,
      parMoves,
      branchingFactor: avgBranchingFactor
    };
  }

  private generateHints(paths: string[][]): string[] {
    // Use the shortest path for hints
    const shortestPath = paths.reduce(
      (shortest, current) => current.length < shortest.length ? current : shortest,
      paths[0]
    );
    
    return shortestPath.slice(1).map(word => `${word.slice(0, 3)}...`);
  }

  constructor(private provider?: FirestoreProvider | null, private options?: GeneratorOptions) {}

  async generateDailyPuzzle(date: string): Promise<DailyPuzzle> {
    // Establish optional time budget
    this.generationDeadline = this.options?.timeBudgetMs ? Date.now() + this.options.timeBudgetMs : null;
    // Reset validator state
    chainValidator.resetUsedWords();
    
    // Get random start word with good branching factor
    const startWord = await this.getRandomStartWord();
    
    // Find all valid paths from start word to potential targets
    const nextWords = await chainValidator.findPossibleNextWords(startWord);
    let bestPaths: string[][] = [];
    let targetWord = '';
    
    const nextWordsCapped = (this.options?.maxBranchingPerNode
      ? nextWords.slice(0, Math.max(1, this.options.maxBranchingPerNode))
      : nextWords);
    for (const word of nextWordsCapped) {
      if (this.generationDeadline && Date.now() > this.generationDeadline) {
        break; // time budget exceeded
      }
      const paths = await this.findAllValidPaths(startWord, word);
      if (paths.length > bestPaths.length) {
        bestPaths = paths;
        targetWord = word;
      }
      
      if (bestPaths.length >= DailyPuzzleGenerator.MAX_VALID_PATHS) {
        break;
      }
    }
    
    if (bestPaths.length === 0) {
      throw new Error('Could not generate valid puzzle paths');
    }

    const { difficulty, parMoves, branchingFactor } = this.calculateDifficulty(bestPaths);
    const hints = this.generateHints(bestPaths);

    const puzzle: DailyPuzzle = {
      id: date,
      date,
      startWord,
      targetWord,
      parMoves,
      difficulty,
      validPaths: bestPaths,
      hints,
      metadata: {
        branchingFactor,
        optimalPathCount: bestPaths.length
      }
    };

    // Store in Firebase via provider if available, else client SDK in browser
    if (this.provider) {
      await this.provider.setDocument(DailyPuzzleGenerator.COLLECTION_PUZZLES, date, puzzle);
    } else {
      if (typeof window === 'undefined') {
        throw new Error('No Firestore provider available for server-side generation');
      }
      const mod = await import('../firebase/firebase');
      const db = mod.db;
      if (!db) throw new Error('Firestore not initialized');
      await setDoc(doc(db, DailyPuzzleGenerator.COLLECTION_PUZZLES, date), puzzle);
    }

    return puzzle;
  }

  async validatePuzzle(puzzle: DailyPuzzle): Promise<boolean> {
    // Reset validator state
    chainValidator.resetUsedWords();
    
    // Check if start word is valid
    if (!await dictionaryAccess.isValidWord(puzzle.startWord)) {
      return false;
    }
    
    // Check if target word is valid
    if (!await dictionaryAccess.isValidWord(puzzle.targetWord)) {
      return false;
    }
    
    // Try to find paths between start and target
    const paths = await this.findAllValidPaths(puzzle.startWord, puzzle.targetWord);
    
    // Puzzle is valid if we can find at least one path
    return paths.length > 0;
  }

  async updatePuzzleMetadata(puzzleId: string, metadata: {
    averageCompletionTime?: number;
    totalAttempts?: number;
    successRate?: number;
  }): Promise<void> {
    if (this.provider) {
      const existing = await this.provider.getDocument<DailyPuzzle>(DailyPuzzleGenerator.COLLECTION_PUZZLES, puzzleId);
      if (!existing) {
        throw new Error('Puzzle not found');
      }
      await this.provider.setDocument(DailyPuzzleGenerator.COLLECTION_PUZZLES, puzzleId, {
        ...existing,
        metadata: { ...existing.metadata, ...metadata }
      } as any);
      return;
    }
    const mod = await import('../firebase/firebase');
    const db = mod.db;
    if (!db) throw new Error('Firestore not initialized');
    const puzzleRef = doc(db, DailyPuzzleGenerator.COLLECTION_PUZZLES, puzzleId);
    const puzzleDoc = await getDoc(puzzleRef);
    
    if (!puzzleDoc.exists()) {
      throw new Error('Puzzle not found');
    }
    
    const puzzle = puzzleDoc.data() as DailyPuzzle;
    
    await setDoc(puzzleRef, { ...puzzle, metadata: { ...puzzle.metadata, ...metadata } });
  }
}

// Export singleton instance
export const dailyPuzzleGenerator = new DailyPuzzleGenerator();