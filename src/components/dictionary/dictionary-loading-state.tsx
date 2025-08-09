'use client'

export function DictionaryLoadingState({ state, isLoading, error, loadingState }: any) {
  return (
    <div className="p-4 text-sm text-gray-700">
      <div>Dictionary status: {state?.status}</div>
      {isLoading && <div>Loading... {Math.round(loadingState?.progress ?? 0)}%</div>}
      {error && <div className="text-red-600">Error: {String(error)}</div>}
    </div>
  )
}


