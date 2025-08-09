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
export { gameStateService, GameStateService } from './services/game-state-service'
export { userProfileService, UserProfileService } from './services/user-profile-service'
export { achievementService } from './services/achievement-service'
export { powerUpSystem as PowerUpService } from './game/power-up-system'
export { errorRecovery } from './services/error-recovery'
export { connectionManager } from './services/connection-manager'
export { startupService } from './services/startup-service'

// Firebase
export { app as firebaseApp } from './firebase/firebase'
// admin app instance is not exported; use admin services directly

// Types
export type {
  GameState,
  GameMode,
  GameScore,
  PowerUpResult,
  GameResult
} from './types/game'

// user/achievement/power-up types not present in this extraction

export type {
  WordValidationResult,
  ValidationError,
  ChainValidationResult
} from './types/validation'

// Achievement and power-up types are encapsulated within feature modules in this extraction

// Hooks (for React integration)
// export { useGame } from './hooks/useGame' // not present in extracted engine
export { useDictionary } from './hooks/useDictionary'
export { useUserProfile } from './hooks/useUserProfile'
// export { useConnection } from './hooks/useConnection'

// Contexts (for React integration)
export { GameProvider } from './contexts/game-context'
export { AuthProvider, useAuth } from './contexts/AuthContext'
export { ConnectionProvider, useConnection as useConnectionContext } from './contexts/connection-context'

// Utils
export * from './utils/utils'
export * from './game/game-utils'

// Constants
export { VALID_STARTING_COMBOS } from './validation/constants'
// POWER_UP_COSTS constant not exported; use powerUpSystem.getCosts()
