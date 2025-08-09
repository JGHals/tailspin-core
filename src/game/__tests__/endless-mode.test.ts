import { GameModeManagerImpl } from '../game-mode-manager'
import { gameStateService } from '../../services/game-state-service'

// Mock chain validator for this suite to avoid dictionary dependency
jest.mock('../chain-validator', () => ({
  chainValidator: {
    validateNextWord: jest.fn(async (chain: string[], next: string) => ({ valid: true, isTerminal: next === 'jazz' })),
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
    resetUsedWords: jest.fn(() => {}),
  }
}))

jest.useFakeTimers()

describe('Endless Mode (aligned with GameModeManagerImpl)', () => {
  let manager: GameModeManagerImpl

  beforeEach(() => {
    jest.clearAllMocks()
    manager = new GameModeManagerImpl('endless')
    manager.setUserId('test-user')
  })

  it('starts with provided start word and not complete', async () => {
    await manager.startGame({ startWord: 'test' })
    const state = manager.getGameState()
    expect(state.mode).toBe('endless')
    expect(state.chain.length).toBe(1)
    expect(state.isComplete).toBe(false)
  })

  it('marks game complete when terminal word submitted (mocked validator)', async () => {
    await manager.startGame({ startWord: 'quick' })
    const result = await manager.submitWord('jazz')
    expect(result?.gameComplete).toBe(true)
    expect(manager.getGameState().isComplete).toBe(true)
  })

  it('uses hint power-up and updates state accordingly (global powerUp mocks)', async () => {
    await manager.startGame({ startWord: 'test' })
    const hints = await manager.useHint()
    expect(Array.isArray(hints)).toBe(true)
    const state = manager.getGameState()
    expect(state.hintsUsed).toBe(1)
    expect(state.powerUpsUsed.has('hint')).toBe(true)
  })

  it('autosaves state periodically', async () => {
    const spy = jest.spyOn(gameStateService, 'saveGameState')
    await manager.startGame({ startWord: 'test' })

    // advance interval to trigger autosave
    jest.advanceTimersByTime(30000)
    expect(spy).toHaveBeenCalled()
  })

  it('resets and saves on undo (power-up)', async () => {
    await manager.startGame({ startWord: 'test' })
    await manager.submitWord('tent')
    const before = manager.getGameState().chain.length
    const result = await manager.useUndo()
    expect(result.success).toBe(true)
    const after = manager.getGameState().chain.length
    expect(after).toBe(before - 1)
  })
})


