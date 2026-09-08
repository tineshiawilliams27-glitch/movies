import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CinemaForge — Make something worth watching',
  description: 'A focused AI film studio for shaping ideas into living films.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="bg-dark">
      <body>{children}</body>
    </html>
  )
}
