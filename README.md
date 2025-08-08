# TailSpin Core Engine

A framework-agnostic game engine for the TailSpin word-chaining game. This package contains all the core business logic, validation rules, and Firebase infrastructure without any UI components.

## Features

- 🎮 Complete game engine with word validation and scoring
- 🔥 Firebase integration (Auth, Firestore, Admin SDK)
- 🎯 Power-up system with 5 different power-ups
- 🏆 Achievement system and leaderboards
- 📊 Real-time multiplayer foundation
- 🔒 Complete authentication and security
- 📝 Comprehensive TypeScript definitions

## Installation

```bash
npm install tailspin-core
```

## Quick Start

```typescript
import { GameManager } from 'tailspin-core/game'
import { DictionaryService } from 'tailspin-core/dictionary'
import { validateWord } from 'tailspin-core/validation'

// Initialize the game
const gameManager = new GameManager(userId)
await gameManager.initialize('daily')

// Add a word to the chain
const result = await gameManager.addWord('puzzle')
```

## Documentation

- [Game Engine API](./docs/game-engine.md)
- [Firebase Setup](./docs/firebase-setup.md)
- [Integration Guide](./docs/integration-guide.md)

## Examples

See the `examples/` directory for integration examples:
- [Next.js Integration](./examples/nextjs-integration/)
- [Node.js Integration](./examples/nodejs-integration/)
- [React Integration](./examples/react-integration/)

## License

MIT
