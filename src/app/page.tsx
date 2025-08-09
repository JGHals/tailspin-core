'use client'

import { GameEngineTest } from '@/components/test/GameEngineTest'
import FirebaseDebug from '@/components/debug/FirebaseDebug'
import CoreEngineTest from '@/components/test/CoreEngineTest'

export default function HomePage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">TailSpin Core Engine</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <GameEngineTest />
        <FirebaseDebug />
        <CoreEngineTest />
      </div>
    </main>
  )
}


