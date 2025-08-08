# Node.js Integration Example

This example shows how to integrate the TailSpin Core Engine into a Node.js/Express.js backend.

## Setup

1. Install the core engine:
```bash
npm install tailspin-core
```

2. Set up environment variables:
```env
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com
```

3. Create an Express.js server:

```typescript
// server.ts
import express from 'express'
import { GameManager, validateWord, adminApp } from 'tailspin-core'

const app = express()
app.use(express.json())

// Initialize Firebase Admin
adminApp

// Game routes
app.post('/api/game/start', async (req, res) => {
  try {
    const { userId, mode } = req.body
    
    if (!userId || !mode) {
      return res.status(400).json({ error: 'Missing userId or mode' })
    }

    const gameManager = new GameManager(userId)
    await gameManager.initialize(mode)
    
    const state = gameManager.getState()
    res.json({ success: true, state })
  } catch (error) {
    console.error('Failed to start game:', error)
    res.status(500).json({ error: 'Failed to start game' })
  }
})

app.post('/api/game/submit-word', async (req, res) => {
  try {
    const { userId, word } = req.body
    
    if (!userId || !word) {
      return res.status(400).json({ error: 'Missing userId or word' })
    }

    const gameManager = new GameManager(userId)
    const result = await gameManager.addWord(word)
    
    if (result.success) {
      const state = gameManager.getState()
      res.json({ success: true, result, state })
    } else {
      res.json({ success: false, error: result.error })
    }
  } catch (error) {
    console.error('Failed to submit word:', error)
    res.status(500).json({ error: 'Failed to submit word' })
  }
})

app.get('/api/game/state/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const gameManager = new GameManager(userId)
    const state = gameManager.getState()
    
    res.json({ success: true, state })
  } catch (error) {
    console.error('Failed to get game state:', error)
    res.status(500).json({ error: 'Failed to get game state' })
  }
})

// Power-up routes
app.post('/api/game/use-powerup', async (req, res) => {
  try {
    const { userId, powerUpType } = req.body
    
    if (!userId || !powerUpType) {
      return res.status(400).json({ error: 'Missing userId or powerUpType' })
    }

    const gameManager = new GameManager(userId)
    let result
    
    switch (powerUpType) {
      case 'hint':
        result = await gameManager.useHint()
        break
      case 'undo':
        result = await gameManager.useUndo()
        break
      case 'flip':
        result = await gameManager.useFlip()
        break
      case 'bridge':
        result = await gameManager.useBridge()
        break
      case 'wordWarp':
        result = await gameManager.useWordWarp()
        break
      default:
        return res.status(400).json({ error: 'Invalid power-up type' })
    }
    
    const state = gameManager.getState()
    res.json({ success: true, result, state })
  } catch (error) {
    console.error('Failed to use power-up:', error)
    res.status(500).json({ error: 'Failed to use power-up' })
  }
})

// Validation routes
app.post('/api/validate-word', async (req, res) => {
  try {
    const { word, chain, gameMode } = req.body
    
    if (!word) {
      return res.status(400).json({ error: 'Missing word' })
    }

    const result = await validateWord(word, chain || [], gameMode)
    res.json({ success: true, result })
  } catch (error) {
    console.error('Failed to validate word:', error)
    res.status(500).json({ error: 'Failed to validate word' })
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`TailSpin API server running on port ${PORT}`)
})
```

4. Create a client to test the API:

```typescript
// client.ts
import fetch from 'node-fetch'

class TailSpinClient {
  private baseUrl: string

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl
  }

  async startGame(userId: string, mode: 'daily' | 'endless' | 'versus') {
    const response = await fetch(`${this.baseUrl}/api/game/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, mode })
    })
    return response.json()
  }

  async submitWord(userId: string, word: string) {
    const response = await fetch(`${this.baseUrl}/api/game/submit-word`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, word })
    })
    return response.json()
  }

  async usePowerUp(userId: string, powerUpType: string) {
    const response = await fetch(`${this.baseUrl}/api/game/use-powerup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, powerUpType })
    })
    return response.json()
  }

  async validateWord(word: string, chain?: string[], gameMode?: string) {
    const response = await fetch(`${this.baseUrl}/api/validate-word`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word, chain, gameMode })
    })
    return response.json()
  }
}

// Usage example
async function main() {
  const client = new TailSpinClient()
  
  // Start a daily challenge
  const startResult = await client.startGame('user123', 'daily')
  console.log('Game started:', startResult)
  
  // Submit a word
  const submitResult = await client.submitWord('user123', 'puzzle')
  console.log('Word submitted:', submitResult)
  
  // Use a hint
  const hintResult = await client.usePowerUp('user123', 'hint')
  console.log('Hint used:', hintResult)
}

main().catch(console.error)
```

## Features Demonstrated

- RESTful API endpoints for game operations
- Firebase Admin SDK integration
- Word validation and submission
- Power-up system
- Error handling and validation
- Client library for easy integration

## Next Steps

- Add authentication middleware
- Implement rate limiting
- Add WebSocket support for real-time updates
- Create database persistence layer
- Add monitoring and logging
