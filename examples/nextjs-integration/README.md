# Next.js Integration Example

This example shows how to integrate the TailSpin Core Engine into a Next.js project.

## Setup

1. Install the core engine:
```bash
npm install tailspin-core
```

2. Set up Firebase configuration in your `.env.local`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
# ... other Firebase config
```

3. Create a game page component:

```typescript
// pages/game.tsx
import { useState, useEffect } from 'react'
import { GameManager, validateWord } from 'tailspin-core'

export default function GamePage() {
  const [gameManager, setGameManager] = useState<GameManager | null>(null)
  const [word, setWord] = useState('')
  const [chain, setChain] = useState<string[]>([])
  const [score, setScore] = useState(0)

  useEffect(() => {
    // Initialize game manager
    const manager = new GameManager('user-id')
    manager.initialize('daily').then(() => {
      setGameManager(manager)
      const state = manager.getState()
      setChain(state.chain)
      setScore(state.score.total)
    })
  }, [])

  const handleSubmitWord = async () => {
    if (!gameManager || !word) return

    try {
      const result = await gameManager.addWord(word)
      if (result.success) {
        const state = gameManager.getState()
        setChain(state.chain)
        setScore(state.score.total)
        setWord('')
      }
    } catch (error) {
      console.error('Failed to add word:', error)
    }
  }

  return (
    <div>
      <h1>TailSpin Game</h1>
      <div>Score: {score}</div>
      <div>Chain: {chain.join(' → ')}</div>
      <input
        value={word}
        onChange={(e) => setWord(e.target.value)}
        placeholder="Enter a word"
      />
      <button onClick={handleSubmitWord}>Submit</button>
    </div>
  )
}
```

4. Create API routes using the core engine:

```typescript
// pages/api/game/start.ts
import { NextApiRequest, NextApiResponse } from 'next'
import { GameManager } from 'tailspin-core'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, mode } = req.body
    const gameManager = new GameManager(userId)
    await gameManager.initialize(mode)
    
    const state = gameManager.getState()
    res.status(200).json({ success: true, state })
  } catch (error) {
    res.status(500).json({ error: 'Failed to start game' })
  }
}
```

## Features Demonstrated

- Game initialization and state management
- Word validation and submission
- Score tracking
- API route integration
- Error handling

## Next Steps

- Add authentication with Firebase Auth
- Implement power-ups
- Add achievement tracking
- Create multiplayer functionality
