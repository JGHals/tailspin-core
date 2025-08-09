import { GameModeManagerImpl } from '../game-mode-manager'
import { defaultScoringRules } from '../scoring'

describe('Daily Challenge Mode (aligned with GameModeManagerImpl)', () => {
  let manager: GameModeManagerImpl

  beforeEach(() => {
    jest.clearAllMocks()
    manager = new GameModeManagerImpl('daily')
    manager.setUserId('test-user')
  })

  it('initializes with today\'s daily puzzle', async () => {
    const daily = await manager.getCurrentDailyPuzzle()
    await manager.startGame({ dailyPuzzle: daily })

    const state = manager.getGameState()
    expect(state.mode).toBe('daily')
    expect(state.startWord).toBe(daily.startWord)
    expect(state.targetWord).toBe(daily.targetWord)
    expect(state.chain).toEqual([daily.startWord])
  })

  it('completes when reaching the target word', async () => {
    const daily = await manager.getCurrentDailyPuzzle()
    await manager.startGame({ dailyPuzzle: daily })

    await manager.submitWord(daily.startWord)
    const result = await manager.submitWord(daily.targetWord)

    expect(result.gameComplete).toBe(true)
    const state = manager.getGameState()
    expect(state.isComplete).toBe(true)
  })

  it('applies daily bonuses on completion', async () => {
    const daily = await manager.getCurrentDailyPuzzle()
    await manager.startGame({ dailyPuzzle: daily })

    await manager.submitWord(daily.startWord)
    await manager.submitWord(daily.targetWord)

    const state = manager.getGameState()
    expect(state.score.dailyBonus).toBeGreaterThanOrEqual(
      defaultScoringRules.dailyBonus.completion
    )
    expect(state.score.total).toBeGreaterThan(0)
  })
})


