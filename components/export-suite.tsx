'use client'

import { useEffect, useState } from 'react'
import { Check, Download, Film, Loader2, Play, Settings2 } from 'lucide-react'
import { WorkspaceNavigation } from '@/components/workspace-navigation'

type ExportFormat = 'MP4' | 'WebM'
type ExportSettings = { format: ExportFormat; resolution: string; frameRate: string; aspectRatio: string }

export function ExportSuite({ projectId }: { projectId: string }) {
  const [settings, setSettings] = useState<ExportSettings>({ format: 'MP4', resolution: '1920 × 1080', frameRate: '24 fps', aspectRatio: '16:9' })
  const [status, setStatus] = useState<'idle' | 'queued' | 'error'>('idle')
  const [error, setError] = useState('')
  const [latestJob, setLatestJob] = useState<{ id: string; status: string; progress: number; stage: string | null } | null>(null)

  useEffect(() => {
    let active = true
    const loadLatestJob = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/jobs`, { cache: 'no-store' })
        if (!response.ok) return
        const data = await response.json()
        const job = data.jobs?.find((item: { type: string }) => item.type === 'VIDEO_EXPORT')
        if (active && job) setLatestJob(job)
      } catch {
        // Polling is best effort; the next interval can recover from a transient network failure.
      }
    }
    void loadLatestJob()
    const interval = window.setInterval(() => void loadLatestJob(), 3000)
    return () => { active = false; window.clearInterval(interval) }
  }, [projectId])

  function downloadManifest() {
    const link = document.createElement('a')
    link.href = `/api/projects/${projectId}/export`
    link.download = 'film-project-manifest.json'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  const exportInProgress = status === 'queued' || latestJob?.status === 'QUEUED' || latestJob?.status === 'PROCESSING' || latestJob?.status === 'RUNNING'

  async function startExport() {
    if (exportInProgress) return
    setStatus('queued')
    setError('')
    try {
      const response = await fetch(`/api/projects/${projectId}/jobs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'VIDEO_EXPORT', payload: settings }) })
      if (!response.ok) {
        const data = await response.json().catch(() => null) as { error?: string } | null
        setStatus('error')
        setError(data?.error || 'The export could not be queued. Review the project and try again.')
        return
      }
      const data = await response.json()
      if (data.job) setLatestJob(data.job)
      window.setTimeout(() => setStatus('idle'), 2400)
    } catch {
      setStatus('error')
      setError('The export could not be queued. Check your connection and try again.')
    }
  }

  async function retryExport() {
    await startExport()
  }

  return <main className="min-h-screen bg-background text-foreground"><header className="flex items-center justify-between border-b border-border px-5 py-4 md:px-8"><div><p className="text-xs text-muted-foreground">Project workspace</p><h1 className="font-serif text-xl">Export suite</h1></div><div className="flex items-center gap-2"><button onClick={downloadManifest} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground"><Download size={15} />Manifest</button><button onClick={startExport} disabled={exportInProgress} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-60">{status === 'queued' ? <Loader2 className="animate-spin" size={15} /> : <Download size={15} />}{exportInProgress ? 'Render in progress' : status === 'error' ? 'Retry export' : 'Start export'}</button></div></header><div className="mx-auto max-w-[1500px] px-5 py-6 md:px-8"><WorkspaceNavigation projectId={projectId} />{latestJob && <section className="mt-6 rounded-2xl border border-border bg-card p-4" aria-live="polite"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-accent">Latest render job</p><p className="mt-2 text-sm text-foreground">{latestJob.stage || latestJob.status}</p></div><span className="text-sm text-muted-foreground">{latestJob.progress}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.max(0, Math.min(100, latestJob.progress))}%` }} /></div><div className="mt-2 flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">Job {latestJob.id.slice(0, 8)} · {latestJob.status}</p>{latestJob.status === 'FAILED' && <button onClick={retryExport} className="text-xs font-medium text-accent underline-offset-4 hover:underline">Retry export</button>}</div></section>}<section className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]"><div className="rounded-2xl border border-border bg-card p-6"><div className="flex items-start gap-4"><div className="flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Film size={22} /></div><div><p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">Final delivery</p><h2 className="mt-2 font-serif text-3xl">Render the cut</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Queue a worker render using the exact delivery profile your project needs. Rendering stays asynchronous so long-form exports do not block the application.</p></div></div>{status === 'error' && <p className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">{error}</p>}{status === 'queued' && <p className="mt-6 rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm text-accent" role="status">Render queued. Track progress from the project timeline.</p>}<div className="mt-8 flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-4"><Play size={17} className="text-accent" /><div><p className="text-sm font-medium">Preview before render</p><p className="text-xs text-muted-foreground">The final worker uses scene, audio, and subtitle tracks from this project.</p></div></div></div><aside className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center gap-2"><Settings2 size={17} className="text-accent" /><h3 className="font-medium">Delivery profile</h3></div><div className="mt-5 space-y-4">{([['format', 'Format', ['MP4', 'WebM']], ['resolution', 'Resolution', ['1920 × 1080', '3840 × 2160', '1280 × 720']], ['frameRate', 'Frame rate', ['24 fps', '30 fps', '60 fps']], ['aspectRatio', 'Aspect ratio', ['16:9', '9:16', '1:1']]] as const).map(([key, label, options]) => <label key={key} className="block text-sm"><span className="mb-2 block text-muted-foreground">{label}</span><select value={settings[key]} onChange={(event) => setSettings((current) => ({ ...current, [key]: event.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">{options.map((option) => <option key={option}>{option}</option>)}</select></label>)}</div><div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground"><Check size={14} className="text-accent" />Settings are saved with this export job</div></aside></section></div></main>
}
