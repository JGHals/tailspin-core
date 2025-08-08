# Game Engine API Documentation

## Overview

The TailSpin Core Engine provides a complete game engine for word-chaining gameplay. This document covers the main classes and methods available in the engine.

## Core Classes

### GameManager

The main orchestrator for game state and logic.

```typescript
import { GameManager } from 'tailspin-core'

const gameManager = new GameManager(userId: string)
```

#### Methods

##### `initialize(mode: GameMode): Promise<void>`
Initializes a new game session or loads an existing one.

```typescript
await gameManager.initialize('daily') // 'daily' | 'endless' | 'versus'
```

##### `addWord(word: string): Promise<PowerUpResult>`
Adds a word to the current chain and validates it.

```typescript
const result = await gameManager.addWord('puzzle')
if (result.success) {
  console.log('Word added successfully')
  console.log('Score:', result.score)
} else {
  console.log('Error:', result.error)
}
```

##### `getState(): GameState`
Returns the current game state.

```typescript
const state = gameManager.getState()
console.log('Current chain:', state.chain)
console.log('Score:', state.score.total)
```

##### Power-up Methods

```typescript
// Get hints for next valid words
const hints = await gameManager.useHint()

// Undo the last word
const undoResult = await gameManager.useUndo()

// Flip the current 2-letter combo
const flipResult = await gameManager.useFlip()

// Use bridge power-up
const bridgeResult = await gameManager.useBridge()

// Use word warp power-up
const warpResult = await gameManager.useWordWarp()
```

### DictionaryService

Manages the word dictionary and provides lookup functionality.

```typescript
import { DictionaryService } from 'tailspin-core'

const dictionary = new DictionaryService()
await dictionary.initialize(wordList)
```

#### Methods

##### `isValidWord(word: string): boolean`
Checks if a word exists in the dictionary.

```typescript
const isValid = dictionary.isValidWord('puzzle') // true
```

##### `getWordsWithPrefix(prefix: string): string[]`
Gets all words that start with a given prefix.

```typescript
const words = dictionary.getWordsWithPrefix('pu') // ['puzzle', 'pump', ...]
```

##### `isValidChainPair(word1: string, word2: string): boolean`
Validates if two words can be chained together.

```typescript
const isValid = dictionary.isValidChainPair('puzzle', 'lethal') // true
```

### Validation Functions

#### `validateWord(word: string, chain?: string[], gameMode?: GameMode): Promise<WordValidationResult>`

Validates a word according to game rules.

```typescript
import { validateWord } from 'tailspin-core'

const result = await validateWord('lethal', ['puzzle'], 'daily')
if (result.isValid) {
  console.log('Word is valid')
} else {
  console.log('Validation errors:', result.errors)
}
```

#### `validateWordChain(words: string[], gameMode?: GameMode): Promise<ChainValidationResult>`

Validates an entire chain of words.

```typescript
import { validateWordChain } from 'tailspin-core'

const result = await validateWordChain(['puzzle', 'lethal', 'alliance'], 'daily')
console.log('Chain is valid:', result.isValid)
```

## Game State Structure

```typescript
interface GameState {
  mode: GameMode
  chain: string[]
  startWord: string
  targetWord?: string
  isComplete: boolean
  score: GameScore
  wordTimings: Map<string, number>
  terminalWords: Set<string>
  startTime: number
  lastMoveTime: number
  powerUpsUsed: Set<string>
  rareLettersUsed: Set<string>
  invalidAttempts: number
  hintsUsed: number
  achievements: Achievement[]
  // ... additional fields
}
```

## Scoring System

The game uses a comprehensive scoring system:

```typescript
interface GameScore {
  total: number
  wordPoints: number
  chainPoints: number
  bonusPoints: number
  terminalPoints: number
}
```

### Scoring Rules

- **Base Points**: 10 points per valid word
- **Length Bonus**: 5 points per letter beyond 4 letters
- **Rare Letter Bonus**: 15 points for Q, Z, X, J
- **Streak Bonus**: 10 points for consecutive valid words
- **Terminal Bonus**: 50 points for reaching a terminal word
- **Speed Bonus**: 20 points for moves under 5 seconds

## Power-up System

The game includes 5 different power-ups:

1. **Hint** (3 tokens): Shows valid next word suggestions
2. **Undo** (4 tokens): Removes the last word from the chain
3. **Word Warp** (10 tokens): Select any valid 2-letter combo
4. **Flip** (5 tokens): Inverts the current 2-letter combo
5. **Bridge** (7 tokens): Places a validated wildcard word

## Error Handling

All methods return structured results with error information:

```typescript
interface PowerUpResult {
  success: boolean
  error?: string
  score?: GameScore
  state?: GameState
  // ... additional fields
}
```

## Best Practices

1. **Always check return values** for success/error states
2. **Handle async operations** with proper error handling
3. **Validate user input** before passing to game methods
4. **Use the state management** for consistent game state
5. **Implement proper cleanup** when games end

## Examples

### Complete Game Flow

```typescript
import { GameManager, validateWord } from 'tailspin-core'

async function playGame() {
  const gameManager = new GameManager('user123')
  
  // Start daily challenge
  await gameManager.initialize('daily')
  
  // Add words to chain
  const words = ['puzzle', 'lethal', 'alliance']
  
  for (const word of words) {
    const result = await gameManager.addWord(word)
    if (result.success) {
      console.log(`Added "${word}" - Score: ${result.score?.total}`)
    } else {
      console.log(`Failed to add "${word}": ${result.error}`)
    }
  }
  
  // Get final state
  const finalState = gameManager.getState()
  console.log('Final score:', finalState.score.total)
  console.log('Chain:', finalState.chain.join(' → '))
}
```
