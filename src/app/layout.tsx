import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/AuthContext"
import { GameProvider } from "@/contexts/game-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Tailspin - Word Chain Game",
  description: "Connect words where each new word starts with the last two letters of the previous word",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false}>
          <AuthProvider>
            <GameProvider>{children}</GameProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
