import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Framewise — Your movie shelf',
  description: 'Find films that linger long after the credits.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="bg-dark">
      <body>{children}</body>
    </html>
  )
}
