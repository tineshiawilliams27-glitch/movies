'use client'

import { useEffect, useState } from 'react'
import { AudioLines, Check, Mic2, Music2, Plus, SlidersHorizontal, Volume2 } from 'lucide-react'
import { WorkspaceNavigation } from '@/components/workspace-navigation'

type Track = { id: string; name: string; kind: string; detail: string; enabled: boolean }

export function AudioStudio({ projectId }: { projectId: string }) {
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function loadProject() {
      try {
        const response = await fetch(`/api/projects/${projectId}`, { cache: 'no-store' })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Unable to load project')
        const savedTracks = Array.isArray(data.project.metadata?.audioTracks) ? data.project.metadata.audioTracks : []
        if (!cancelled) setTracks(savedTracks)
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Unable to load audio project')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadProject()
    return () => { cancelled = true }
  }, [projectId])
  const [saved, setSaved] = useState(false)

  function addTrack() {
    setTracks((current) => [...current, { id: crypto.randomUUID(), name: `New track ${current.length + 1}`, kind: 'Custom', detail: 'Ready for a new sound layer', enabled: true }])
  }

  async function saveMix() {
    setError('')
    try {
      const response = await fetch(`/api/projects/${projectId}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ metadata: { audioTracks: tracks } }) })
      if (!response.ok) { const data = await response.json().catch(() => null); setError(data?.error || 'Unable to save mix'); return }
      setSaved(true); window.setTimeout(() => setSaved(false), 2200)
    } catch { setError('Unable to save mix. Check your connection and try again.') }
  }

  return <main className="min-h-screen bg-background text-foreground"><header className="flex items-center justify-between border-b border-border px-5 py-4 md:px-8"><div><p className="text-xs text-muted-foreground">Project workspace</p><h1 className="font-serif text-xl">Audio studio</h1></div><button onClick={saveMix} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">{saved ? <Check size={15} /> : <SlidersHorizontal size={15} />}{saved ? 'Mix saved' : 'Save mix'}</button></header><div className="mx-auto max-w-[1500px] px-5 py-6 md:px-8"><WorkspaceNavigation projectId={projectId} />{error && <p role="alert" className="mt-6 text-sm text-destructive">{error}</p>}<section className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]"><div className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">Sound design</p><h2 className="mt-2 font-serif text-3xl">Build the mix</h2></div><button onClick={addTrack} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"><Plus size={15} />Add track</button></div><div className="mt-6 space-y-3">{tracks.map((track) => <div key={track.id} className="flex items-center gap-4 rounded-xl border border-border p-4"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">{track.kind === 'Voice' ? <Mic2 size={18} /> : track.kind === 'Score' ? <Music2 size={18} /> : <AudioLines size={18} />}</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className="font-medium">{track.name}</p><button onClick={() => setTracks((current) => current.map((item) => item.id === track.id ? { ...item, enabled: !item.enabled } : item))} aria-label={`${track.enabled ? 'Mute' : 'Enable'} ${track.name}`} className={track.enabled ? 'text-accent' : 'text-muted-foreground'}><Volume2 size={17} /></button></div><p className="mt-1 text-sm text-muted-foreground">{track.detail}</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full bg-accent ${track.enabled ? 'w-3/4' : 'w-1/4 opacity-40'}`} /></div></div></div>)}</div></div><aside className="rounded-2xl border border-border bg-card p-5"><p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Master output</p><div className="mt-5 flex items-end gap-1 h-32">{Array.from({ length: 24 }, (_, index) => <div key={index} className="flex-1 rounded-t bg-primary/70" style={{ height: `${28 + ((index * 17) % 68)}%` }} />)}</div><div className="mt-5 flex items-center justify-between text-sm"><span className="text-muted-foreground">Integrated loudness</span><span className="font-mono">-14 LUFS</span></div><div className="mt-3 flex items-center justify-between text-sm"><span className="text-muted-foreground">Peak</span><span className="font-mono">-1.0 dB</span></div><button className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"><AudioLines size={15} />Preview mix</button></aside></section></div></main>
}
