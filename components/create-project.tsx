'use client'

import Link from 'next/link'
import { ArrowLeft, Check, Loader2, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function CreateProject() {
  const router = useRouter()
  const [duration, setDuration] = useState('15 minutes')
  const [kind, setKind] = useState('Story')
  const [idea, setIdea] = useState('')
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function createProject() {
    const trimmedTitle = title.trim()
    const trimmedIdea = idea.trim()
    if (!trimmedTitle || !trimmedIdea || status === 'saving') return

    setStatus('saving')
    setErrorMessage('')
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: trimmedTitle, concept: trimmedIdea, format: kind, durationSeconds: parseDuration(duration) }),
      })

      if (response.status === 401) {
        setStatus('error')
        router.replace(`/login?redirect=${encodeURIComponent('/projects/new')}`)
        return
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null
        setStatus('error')
        setErrorMessage(payload?.error ?? 'Project could not be saved. Check your connection and try again.')
        return
      }

      const data = await response.json() as { project?: { id?: string } }
      if (!data.project?.id) {
        setStatus('error')
        return
      }

      setStatus('saved')
      router.push(`/projects/${data.project.id}`)
    } catch {
      setStatus('error')
    }
  }

  return <main className="min-h-screen bg-background px-5 py-8 text-foreground md:px-10"><div className="mx-auto max-w-5xl"><Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={16} />Back to studio</Link><div className="mt-14 max-w-3xl"><p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">New production</p><h1 className="mt-3 font-serif text-5xl tracking-tight">What do you want to make?</h1><p className="mt-4 text-sm leading-6 text-muted-foreground">Start with a thought, a feeling, or a whole premise. Your project will be saved before generation begins.</p></div><div className="mt-10 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]"><section className="rounded-2xl border border-border bg-card p-6 md:p-8"><label htmlFor="title" className="text-sm font-medium">Working title<input id="title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="The Last Transmission" className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-3 outline-none focus:ring-2 focus:ring-ring" /></label><label htmlFor="idea" className="mt-6 block text-sm font-medium">Describe your video<textarea id="idea" value={idea} onChange={(event) => setIdea(event.target.value)} placeholder="Create a suspense drama about a family business hiding a major secret..." className="mt-3 min-h-52 w-full resize-y rounded-xl border border-input bg-background p-4 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring" /></label><div className="mt-7 flex flex-wrap gap-2">{['A mystery in one location', 'A quiet documentary', 'A bold product story'].map((prompt) => <button key={prompt} onClick={() => setIdea(prompt)} className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground">{prompt}</button>)}</div><div className="mt-8 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-end"><label className="flex-1 text-sm font-medium">Format<select value={kind} onChange={(event) => setKind(event.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-3 outline-none focus:ring-2 focus:ring-ring">{['Short video', 'Social video', 'Story', 'Documentary', 'Movie', 'Advertisement', 'Educational video', 'YouTube video', 'Custom'].map((option) => <option key={option}>{option}</option>)}</select></label><label className="flex-1 text-sm font-medium">Approximate duration<select value={duration} onChange={(event) => setDuration(event.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-3 outline-none focus:ring-2 focus:ring-ring">{['15 seconds', '5 minutes', '15 minutes', '30 minutes', '1 hour', '2 hours', 'Custom'].map((option) => <option key={option}>{option}</option>)}</select></label></div><button onClick={createProject} disabled={status === 'saving' || !idea.trim() || !title.trim()} className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">{status === 'saving' ? <Loader2 className="animate-spin" size={16} /> : status === 'saved' ? <Check size={16} /> : <Sparkles size={16} />} {status === 'saving' ? 'Saving project...' : 'Create project'}</button>{status === 'error' && <p role="alert" className="mt-3 text-sm text-destructive">{errorMessage || 'Project could not be saved. Your input is still here; try again.'}</p>}</section><aside className="rounded-2xl border border-border bg-card p-6"><p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">What happens next</p><div className="mt-6 flex flex-col gap-5">{['Your idea is saved as a project', 'Build an editable story treatment', 'Break the treatment into scenes', 'Generate visuals, voices, and a timeline'].map((step, index) => <div key={step} className="flex gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">{index + 1}</span><p className="pt-1 text-sm leading-5 text-muted-foreground">{step}</p></div>)}</div><p className="mt-8 border-t border-border pt-5 text-xs leading-5 text-muted-foreground">Unlimited projects, scenes, and timeline duration. Processing speed depends on the connected worker capacity.</p></aside></div></div></main>
}

function parseDuration(value: string) {
  const match = value.match(/(\d+(?:\.\d+)?)\s*(second|minute|hour)/i)
  if (!match) return 0
  const amount = Number(match[1])
  const unit = match[2].toLowerCase()
  return unit === 'hour' ? amount * 3600 : unit === 'minute' ? amount * 60 : amount
}
