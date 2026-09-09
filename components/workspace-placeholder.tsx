'use client'

import Link from 'next/link'
import { ArrowLeft, CircleDashed, Film, Sparkles } from 'lucide-react'
import { WorkspaceNavigation } from '@/components/workspace-navigation'

export function WorkspacePlaceholder({ projectId, title, description, focus }: { projectId: string; title: string; description: string; focus: string }) {
  return <main className="min-h-screen bg-background text-foreground"><header className="flex items-center gap-3 border-b border-border px-5 py-4 md:px-8"><Link href={`/projects/${projectId}`} className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground" aria-label="Back to project"><ArrowLeft size={17} /></Link><div><p className="text-xs text-muted-foreground">Project workspace</p><h1 className="font-serif text-xl">{title}</h1></div></header><div className="mx-auto max-w-[1500px] px-5 py-6 md:px-8"><WorkspaceNavigation projectId={projectId} /><section className="mt-8 grid min-h-[520px] place-items-center rounded-2xl border border-border bg-card p-8 text-center"><div className="max-w-lg"><div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground"><Film size={24} /></div><p className="mt-6 text-xs font-medium uppercase tracking-[0.18em] text-accent">{focus}</p><h2 className="mt-2 font-serif text-3xl">{title}</h2><p className="mt-4 leading-7 text-muted-foreground">{description}</p><div className="mt-6 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground"><CircleDashed size={15} />Ready for your project data</div></div></section></div></main>
}
