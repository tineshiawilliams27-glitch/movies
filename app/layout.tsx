import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Lumen Forge'

export const metadata: Metadata = {
  title: `${appName} — AI video studio`,
  description: 'Turn ideas into stories, scenes, and finished films in one focused studio.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#11131a',
  userScalable: false,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className="bg-background"><body className="antialiased">{children}{process.env.NODE_ENV === 'production' && <Analytics />}</body></html>
}
