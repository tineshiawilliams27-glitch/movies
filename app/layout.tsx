import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Monument · After the Rain',
  description: 'A cinematic production workspace for characters, storyboards, and screenplay development.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className="bg-canvas"><body>{children}</body></html>
}
