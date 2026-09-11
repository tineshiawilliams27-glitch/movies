'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, AudioLines, Clapperboard, Film, FileText, Images, Mic2, Sparkles } from 'lucide-react'

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
  const router = useRouter()
  return <nav aria-label="Project workspace" className="flex items-center gap-1 overflow-x-auto border-b border-border pb-1">
    <button type="button" onClick={() => router.back()} className="inline-flex shrink-0 items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" aria-label="Go back" title="Go back"><ArrowLeft size={15} /></button>
    <button type="button" onClick={() => router.forward()} className="inline-flex shrink-0 items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" aria-label="Go forward" title="Go forward"><ArrowRight size={15} /></button>
    <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden="true" />
    <Link href="/dashboard" className="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" aria-label="Back to studio dashboard"><ArrowLeft size={15} /><span className="hidden sm:inline">Dashboard</span></Link>
    <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden="true" />
    {items.map(({ label, suffix, icon: Icon }) => {
      const href = `/projects/${projectId}${suffix}`
      const active = suffix ? pathname === href : pathname === `/projects/${projectId}`
      return <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}><Icon size={15} />{label}</Link>
    })}
  </nav>
}
