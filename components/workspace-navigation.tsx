'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AudioLines, Clapperboard, Film, FileText, Images, Mic2, Settings2, Sparkles } from 'lucide-react'

const items = [
  { label: 'Overview', suffix: '', icon: Sparkles },
  { label: 'Script', suffix: '/script', icon: FileText },
  { label: 'Characters', suffix: '/characters', icon: Images },
  { label: 'Scenes', suffix: '/scenes', icon: Clapperboard },
  { label: 'Storyboard', suffix: '/storyboard', icon: Film },
  { label: 'Timeline', suffix: '/timeline', icon: Film },
  { label: 'Audio', suffix: '/audio', icon: AudioLines },
  { label: 'Media', suffix: '/media', icon: Images },
  { label: 'Export', suffix: '/export', icon: Mic2 },
]

export function WorkspaceNavigation({ projectId }: { projectId: string }) {
  const pathname = usePathname()
  return <nav aria-label="Project workspace" className="flex gap-1 overflow-x-auto border-b border-border pb-1">
    {items.map(({ label, suffix, icon: Icon }) => {
      const href = `/projects/${projectId}${suffix}`
      const active = suffix ? pathname === href : pathname === `/projects/${projectId}`
      return <Link key={href} href={href} className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}><Icon size={15} />{label}</Link>
    })}
  </nav>
}
