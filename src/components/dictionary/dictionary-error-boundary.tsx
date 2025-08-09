'use client'

import React from 'react'

export function DictionaryErrorBoundary({ children, onRetry }: { children: React.ReactNode; onRetry: () => void }) {
  return (
    <div>
      {children}
    </div>
  )
}


