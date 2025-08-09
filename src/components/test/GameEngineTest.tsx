'use client'

import { useEffect, useState } from 'react'
import { chainValidator } from '@/lib/game/chain-validator'
import { scoringSystem } from '@/lib/game/scoring'

export function GameEngineTest() {
  const [output, setOutput] = useState<string>('')

  useEffect(() => {
    (async () => {
      try {
        const valid1 = await chainValidator.validateNextWord([], 'puzzle')
        const valid2 = await chainValidator.validateNextWord(['puzzle'], 'lethal')
        const score = scoringSystem.calculateWordScore('lethal', 0)
        setOutput(`puzzle valid=${valid1.valid}, puzzle->lethal valid=${valid2.valid}, lethal score=${score.total}`)
      } catch (e) {
        setOutput('Error: ' + (e as Error).message)
      }
    })()
  }, [])

  return (
    <div className="rounded border p-4 bg-white shadow">
      <div className="font-semibold mb-2">Engine Test</div>
      <pre className="text-sm">{output}</pre>
    </div>
  )
}


