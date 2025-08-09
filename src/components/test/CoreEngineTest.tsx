'use client'

import { useEffect, useState } from 'react'
import { chainValidator } from '@/lib/game/chain-validator'
import { scoringSystem } from '@/lib/game/scoring'
import { powerUpSystem } from '@/lib/game/power-up-system'

export default function CoreEngineTest() {
  const [results, setResults] = useState<string>('Running...')

  useEffect(() => {
    (async () => {
      try {
        // Reset internal state
        chainValidator.resetUsedWords()

        // Validate chain rule only (dictionaryAccess may require Firebase), so test chainValidator logic via direct rule
        const step1 = await chainValidator.validateNextWord([], 'puzzle')
        const step2 = await chainValidator.validateNextWord(['puzzle'], 'lethal')

        // Scoring test for a 6-letter word: base(10) + length bonus ((6-4)*5=10) = >=20 before other bonuses
        const score = scoringSystem.calculateWordScore('lethal', 0)

        // Power-up costs
        const costs = powerUpSystem.getCosts()

        setResults([
          `validate 'puzzle': ${step1.valid}`,
          `validate 'puzzle' -> 'lethal': ${step2.valid}`,
          `score('lethal').base=${score.base} length=${score.length} total=${score.total}`,
          `power-up costs: hint=${costs.hint}, undo=${costs.undo}, flip=${costs.flip}, bridge=${costs.bridge}, warp=${costs.wordWarp}`
        ].join('\n'))
      } catch (e: any) {
        setResults(`Error: ${e?.message || String(e)}`)
      }
    })()
  }, [])

  return (
    <div className="p-4 border rounded bg-white whitespace-pre-wrap text-sm">
      <div className="font-semibold mb-2">Core Engine Test (no Firebase)</div>
      {results}
    </div>
  )
}


