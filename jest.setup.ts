// Load envs
import 'dotenv/config'

// Silence noisy console warnings in tests (e.g., Firebase guards)
const originalWarn = console.warn
console.warn = (...args: unknown[]) => {
  const first = String(args[0] ?? '')
  if (first.includes('[Firebase] Skipping initialization')) return
  originalWarn(...args as any)
}

// Mock Firebase client SDK modules to avoid real initialization
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({})),
  getApps: jest.fn(() => [({})]),
  getApp: jest.fn(() => ({})),
}))

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  setPersistence: jest.fn(() => Promise.resolve()),
  browserLocalPersistence: {},
}))

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  doc: jest.fn(() => ({})),
  getDoc: jest.fn(async () => ({ exists: () => false, data: () => ({}) })),
  setDoc: jest.fn(async () => {}),
  updateDoc: jest.fn(async () => {}),
  runTransaction: jest.fn(async (_db: any, updateFn: any) => updateFn({
    get: async () => ({ exists: () => true, data: () => ({ tokens: 0, stats: {} }) }),
    update: () => {}
  })),
  increment: jest.fn((n: number) => n),
  collection: jest.fn(() => ({})),
  getDocs: jest.fn(async () => ({ empty: true, docs: [] })),
  query: jest.fn((ref: any) => ({ _ref: ref, _queryConstraints: [] })),
  where: jest.fn((field: string, op: string, value: any) => ({ type: 'where', field, op, _value: value })),
  orderBy: jest.fn((field?: string) => ({ type: 'orderBy', field })),
  limit: jest.fn((n: number) => ({ type: 'limit', n })),
  writeBatch: jest.fn(() => ({ set: jest.fn(() => {}), commit: jest.fn(async () => {}) })),
}))

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(() => ({})),
}))

// Default power-up system mock to return successful results when not overridden in tests
jest.mock('@/game/power-up-system', () => {
  const real = jest.requireActual('@/game/power-up-system')
  return {
    ...real,
    powerUpSystem: {
      useHint: jest.fn(async (_uid: string, lastWord: string) => ({
        success: true,
        data: { words: [lastWord.slice(0, 2) + 'a', lastWord.slice(0, 2) + 'b', lastWord.slice(0, 2) + 'c'] },
      })),
      useFlip: jest.fn(async () => ({ success: true, data: { flippedWord: 'te' } })),
      useBridge: jest.fn(async () => ({ success: true, data: { bridgeWord: 'test' } })),
      useUndo: jest.fn(async (_uid: string, chain: string[]) => ({ success: true, data: { words: chain.slice(0, -1) } })),
      useWordWarp: jest.fn(async () => ({ success: true, data: { words: ['te', 'al', 'in'] } })),
    },
  }
})

// Mock user profile service globally to avoid hitting Firestore in tests that don't mock it themselves
jest.mock('@/services/user-profile-service', () => ({
  userProfileService: {
    getProfile: jest.fn(async () => ({
      uid: 'test-user',
      powerUps: { hint: 99, undo: 99, bridge: 99, flip: 99, wordWarp: 99 },
      achievements: [],
      tokens: 0,
      stats: {
        gamesPlayed: 0,
        totalWordsPlayed: 0,
        totalScore: 0,
        averageScore: 0,
        highestScore: 0,
        totalRareLetters: 0,
        totalTerminalWords: 0,
        averageChainLength: 0,
        fastestCompletion: Infinity,
        averageTimePerMove: 0,
        skillRating: 1000,
        uniqueWordsPlayed: new Set<string>(),
        underParCount: 0,
        speedPrecisionCount: 0,
      },
      dailyStreak: { current: 0, longest: 0, lastPlayedDate: '' },
      terminalWordsDiscovered: new Set(),
      friends: [],
      lastUpdated: new Date().toISOString(),
      displayName: 'Test User',
      email: 'test@example.com',
      gameHistory: [],
    })),
    usePowerUp: jest.fn(async () => true),
    updateProfile: jest.fn(async () => {}),
    addGameHistory: jest.fn(async () => {}),
    updateAchievement: jest.fn(async () => {}),
    updateTokens: jest.fn(async () => 0),
  },
}))

// Mock game-state-service with simple in-memory no-ops
jest.mock('@/services/game-state-service', () => ({
  gameStateService: {
    saveGameState: jest.fn(async (_userId: string, _state: any) => `${_userId}_${Date.now()}`),
    loadGameState: jest.fn(async (_gameId: string) => null),
    getLastSavedGame: jest.fn(async (_userId: string, _mode: string) => null),
    deleteSavedGame: jest.fn(async (_gameId: string) => {}),
  },
}))

// Provide sensible defaults for chain validator so tests without explicit mocks still work
jest.mock('@/game/chain-validator', () => {
  const real = jest.requireActual('@/game/chain-validator')
  const defaultNext: Record<string, string[]> = {
    puzzle: ['lethal', 'lexicon'],
    lethal: ['legal'],
    legal: ['alpha'],
    test: ['tent', 'temp', 'time'],
    quick: ['jazz', 'jinx'],
  }
  const terminal = new Set(['lexicon', 'jazz', 'jinx', 'buzz', 'fizz'])
  const mocked = {
    validateNextWord: jest.fn(async (chain: string[], next: string) => {
      if (!next) return { valid: false, reason: 'Word cannot be empty', isTerminal: false }
      const last = chain[chain.length - 1]
      if (last) {
        const need = last.slice(-2)
        if (!next.startsWith(need)) return { valid: false, reason: `Word must start with "${need}"`, isTerminal: false }
      }
      return { valid: true, isTerminal: terminal.has(next) }
    }),
    getChainStats: jest.fn(async (chain: string[]) => ({
      length: chain.length,
      uniqueLetters: new Set(chain.join('').split('')),
      rareLetters: [],
      averageWordLength: chain.length ? chain.join('').length / chain.length : 0,
      longestWord: chain.reduce((a, b) => (b.length > a.length ? b : a), ''),
      currentStreak: chain.length,
      maxStreak: chain.length,
      terminalWords: [],
      branchingFactors: chain.map(() => 2),
      pathDifficulty: 'easy',
    })),
    findPossibleNextWords: jest.fn(async (last: string) => defaultNext[last] ?? []),
    resetUsedWords: jest.fn(() => {}),
    analyzePath: jest.fn(async (_chain: string[]) => ({
      averageBranchingFactor: 2,
      maxBranchingFactor: 2,
      minBranchingFactor: 2,
      terminalRisk: 0,
      difficulty: 'easy',
      suggestedMoves: [],
      alternativePaths: [],
      deadEndWords: [],
    })),
    findAlternativePaths: jest.fn(async () => []),
  }
  return { ...real, chainValidator: mocked }
})

// Default daily puzzle service mock
jest.mock('@/game/daily-puzzle-service', () => ({
  dailyPuzzleService: {
    getDailyPuzzle: jest.fn(async () => ({
      date: new Date().toISOString().split('T')[0],
      startWord: 'puzzle',
      targetWord: 'lethal',
      parMoves: 3,
    })),
  },
}))



