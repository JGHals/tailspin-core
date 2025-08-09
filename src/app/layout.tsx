import './globals.css'
import type { ReactNode } from 'react'
export const metadata = {
  title: 'TailSpin Core Test',
  description: 'Testing TailSpin core engine in Next.js',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900" suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  )
}


