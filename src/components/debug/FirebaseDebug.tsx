'use client'

import { useEffect, useState } from 'react'

export default function FirebaseDebug() {
  const hasApiKey = Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY)
  const apiKeyMasked = hasApiKey ? 'Present' : 'Missing'
  const [serverVars, setServerVars] = useState<Record<string, boolean> | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.log('NEXT_PUBLIC vars:', Object.keys(process.env || {}).filter(k => k?.startsWith?.('NEXT_PUBLIC')))
    }
    fetch('/api/env')
      .then(r => r.json())
      .then(d => setServerVars(d.serverVars))
      .catch(() => setServerVars(null))
  }, [])

  return (
    <div className="p-4 border rounded bg-gray-100 text-sm">
      <h3 className="font-semibold mb-2">Firebase Configuration Debug</h3>
      <div>Client API Key: {apiKeyMasked}</div>
      <div>Client Project ID: {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'Missing'}</div>
      <div>Client Auth Domain: {process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'Missing'}</div>
      <div>Client App ID: {process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? 'Present' : 'Missing'}</div>
      <div className="mt-2 font-semibold">Server env (present=true):</div>
      <pre className="bg-white p-2 border rounded whitespace-pre-wrap">{serverVars ? JSON.stringify(serverVars, null, 2) : 'Loading...'}</pre>
    </div>
  )
}


