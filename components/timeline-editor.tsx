'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronDown, GripVertical, Pause, Play, Plus, Scissors, Volume2 } from 'lucide-react'
import { WorkspaceNavigation } from '@/components/workspace-navigation'

type Scene = { id: string; sceneNumber: number; title: string; description: string; durationSeconds: string }
type TimelineItem = { id: string; trackType: string; label: string; startSeconds: string; durationSeconds: string; content: string }
type Track = { name: string; color: string; icon: typeof Play }

const tracks: Track[] = [
  { name: 'Video', color: 'bg-accent', icon: Play },
  { name: 'Dialogue', color: 'bg-sky-400', icon: Volume2 },
  { name: 'Music', color: 'bg-violet-400', icon: Play },
  { name: 'SFX', color: 'bg-amber-400', icon: Volume2 },
  { name: 'Subtitles', color: 'bg-emerald-400', icon: Play },
]

export function TimelineEditor({ projectId }: { projectId: string }) {
  const [scenes, setScenes] = useState<Scene[]>([])
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([])
  const [playing, setPlaying] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [cursor, setCursor] = useState(18)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadTimeline() {
      try {
        const [filmResponse, scenesResponse] = await Promise.all([
          fetch(`/api/projects/${projectId}/film`, { cache: 'no-store' }),
          fetch(`/api/projects/${projectId}/scenes`, { cache: 'no-store' }),
        ])
        if (cancelled) return
        if (filmResponse.ok) {
          const data = await filmResponse.json()
          setTimelineItems(data.timeline ?? [])
        }
        if (scenesResponse.ok) {
          const data = await scenesResponse.json()
          setScenes(data.scenes ?? [])
        }
      } catch {
        if (!cancelled) setMessage('Unable to load timeline data. Check your connection.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadTimeline()
    return () => { cancelled = true }
  }, [projectId])

  const totalSeconds = useMemo(() => timelineItems.length > 0 ? timelineItems.reduce((total, item) => Math.max(total, Number(item.startSeconds || 0) + Number(item.durationSeconds || 0)), 0) : scenes.reduce((total, scene) => total + Number(scene.durationSeconds || 0), 0), [scenes, timelineItems])
  const timelineWidth = Math.max(900, totalSeconds * 8 * zoom)

  async function saveTimeline() {
    setSaving(true)
    try {
      const response = await fetch(`/api/projects/${projectId}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ metadata: { timeline: { zoom, cursor, playing: false } } }) })
      setMessage(response.ok ? 'Timeline saved' : 'Timeline save failed')
    } catch {
      setMessage('Timeline save failed')
    } finally {
      setSaving(false)
      window.setTimeout(() => setMessage(''), 2200)
    }
  }

  return <main className="min-h-screen bg-background text-foreground"><header className="flex items-center justify-between border-b border-border px-5 py-4 md:px-8"><div className="flex items-center gap-3"><Link href={`/projects/${projectId}`} className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground" aria-label="Back to project"><ArrowLeft size={17} /></Link><div><p className="text-xs text-muted-foreground">Project workspace</p><h1 className="font-serif text-xl">Timeline / {projectId.replaceAll('-', ' ')}</h1></div></div>{message && <span role="status" className="mr-3 text-sm text-primary">{message}</span>}<button onClick={saveTimeline} disabled={saving} className="mr-2 rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50">{saving ? 'Saving' : 'Save timeline'}</button><button onClick={() => setPlaying((value) => !value)} className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground">{playing ? <Pause size={15} /> : <Play size={15} />}{playing ? 'Pause preview' : 'Preview timeline'}</button></header><div className="mx-auto max-w-[1500px] px-5 py-6 md:px-8"><WorkspaceNavigation projectId={projectId} /><div className="mb-7 mt-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">Editorial assembly</p><h2 className="mt-2 font-serif text-4xl">Shape the full cut.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Compose scenes, audio, and subtitles on a timeline that grows with your story. No artificial duration ceiling.</p></div><div className="flex items-center gap-2 rounded-lg border border-border bg-card p-1"><button onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))} className="rounded px-2 py-1 text-sm text-muted-foreground">−</button><span className="min-w-12 text-center text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span><button onClick={() => setZoom((value) => Math.min(3, value + 0.25))} className="rounded px-2 py-1 text-sm text-muted-foreground">+</button></div></div><section className="overflow-hidden rounded-2xl border border-border bg-card"><div className="flex items-center justify-between border-b border-border px-4 py-3 text-xs text-muted-foreground"><span>{formatTime(totalSeconds)} total duration · {scenes.length} scenes</span><span>Cursor {formatTime(totalSeconds * cursor / 100)}</span></div><div className="overflow-x-auto"><div style={{ width: `${timelineWidth}px` }} className="min-w-full"><div className="ml-28 flex h-10 border-b border-border text-[10px] text-muted-foreground">{Array.from({ length: Math.max(8, Math.ceil(totalSeconds / 10)) }, (_, index) => <span key={index} className="min-w-20 border-l border-border px-2 pt-2">{formatTime(index * 10)}</span>)}</div>{loading ? <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Loading timeline</div> : tracks.map((track, trackIndex) => { const Icon = track.icon; return <div key={track.name} className="flex min-h-20 border-b border-border"><div className="sticky left-0 z-10 flex w-28 shrink-0 items-center gap-2 border-r border-border bg-card px-3 text-xs font-medium"><Icon size={14} className="text-muted-foreground" />{track.name}</div><div className="relative flex flex-1 items-center gap-1 px-2" onClick={(event) => { const rect = event.currentTarget.getBoundingClientRect(); setCursor(Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100))) }}>{trackIndex === 0 && scenes.map((scene) => <div key={scene.id} className={`group relative flex h-12 shrink-0 items-center gap-2 rounded-lg ${track.color}/20 px-3 text-xs ring-1 ring-inset ring-white/10`} style={{ width: `${Math.max(110, Number(scene.durationSeconds || 10) * 8 * zoom)}px` }}><GripVertical size={13} className="text-muted-foreground" /><span className="truncate font-medium">{scene.sceneNumber}. {scene.title}</span><button aria-label={`Split ${scene.title}`} className="ml-auto hidden rounded p-1 text-muted-foreground group-hover:block"><Scissors size={13} /></button></div>)}{trackIndex > 0 && <div className="h-10 w-40 rounded-lg bg-muted/70" />}</div></div> })}<div className="pointer-events-none relative h-0"><div className="absolute bottom-0 top-[-400px] w-px bg-accent" style={{ left: `calc(7rem + ${cursor}%)` }} /></div></div></div><div className="flex items-center justify-between border-t border-border px-4 py-3"><button className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"><Plus size={15} />Add media</button><button className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground"><ChevronDown size={15} />Track options</button></div></section></div></main>
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '00:00'
  const minutes = Math.floor(seconds / 60)
  return `${String(minutes).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}
