// TailSpin Core Engine - Main Export File

// Game Engine
export { GameManager } from './game/game-manager'
export { powerUpSystem } from './game/power-up-system'
export { chainValidator } from './game/chain-validator'

// Dictionary System
export { DictionaryService } from './dictionary/dictionary-service'
export { dictionaryAccess } from './dictionary/dictionary-access'

// Validation System
export { validateWord } from './validation/word-validation'
export { validateWordChain } from './validation/word-validation'
export { checkWordConnection } from './validation/word-validation'
export { isValidStartingCombo } from './validation/word-validation'

// Services
export { createGamePersistence } from './services/game-persistence'
export { GameStateService } from './services/game-state-service'
export { UserProfileService } from './services/user-profile-service'
export { AchievementService } from './services/achievement-service'
export { PowerUpService } from './services/power-up.service'
export { errorRecovery } from './services/error-recovery'
export { ConnectionManager } from './services/connection-manager'
export { StartupService } from './services/startup-service'

// Firebase
export { firebaseApp } from './firebase/firebase'
export { adminApp } from './firebase/admin'

// Types
export type {
  GameState,
  GameMode,
  GameScore,
  PowerUpResult,
  GameResult
} from './types/game'

export type {
  UserProfile,
  UserStats,
  UserAchievements
} from './types/user'

export type {
  WordValidationResult,
  ValidationError,
  ChainValidationResult
} from './types/validation'

export type {
  Achievement,
  AchievementType,
  AchievementProgress
} from './types/achievements'

export type {
  PowerUp,
  PowerUpType,
  PowerUpCost
} from './types/power-ups'

// Hooks (for React integration)
export { useGame } from './hooks/useGame'
export { useDictionary } from './hooks/useDictionary'
export { useUserProfile } from './hooks/useUserProfile'
export { useConnection } from './hooks/useConnection'

// Contexts (for React integration)
export { GameProvider, useGameContext } from './contexts/game-context'
export { AuthProvider, useAuth } from './contexts/AuthContext'
export { ConnectionProvider, useConnectionContext } from './contexts/connection-context'

// Utils
export * from './utils/utils'
export * from './utils/game-utils'

// Constants
export { VALID_STARTING_COMBOS } from './validation/constants'
export { POWER_UP_COSTS } from './game/power-up-system'
