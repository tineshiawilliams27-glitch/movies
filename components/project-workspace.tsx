'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, Loader2, Plus, Save, Sparkles, WandSparkles } from 'lucide-react'
import { WorkspaceNavigation } from '@/components/workspace-navigation'

type Scene = { id: string; sceneNumber: number; title: string; description: string; dialogue: string; location: string; timeOfDay: string; durationSeconds: string }

export function ProjectWorkspace({ projectId }: { projectId: string }) {
  const [scenes, setScenes] = useState<Scene[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [activeJob, setActiveJob] = useState<{ id: string; status: string; progress: number; stage: string } | null>(null)
  const [film, setFilm] = useState<{ bible: { logline: string; acts: unknown[]; screenplay: string; styleBible: Record<string, unknown> } | null; characters: unknown[]; shots: Array<{ status: string }>; timeline: unknown[] } | null>(null)
  const activeScene = scenes.find((scene) => scene.id === activeId) ?? scenes[0]
  const activeSceneId = activeScene?.id

  useEffect(() => {
    if (!activeSceneId) return
    let cancelled = false
    const poll = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/jobs?sceneId=${activeSceneId}`, { cache: 'no-store' })
        if (!response.ok || cancelled) return
        const data = await response.json()
        const nextJob = data.jobs?.find((job: { status: string }) => job.status === 'QUEUED' || job.status === 'PROCESSING') ?? data.jobs?.[0] ?? null
        setActiveJob(nextJob ? { id: nextJob.id, status: nextJob.status, progress: nextJob.progress, stage: nextJob.stage } : null)
      } catch {
        // Polling is best effort; the next interval can recover from a transient network failure.
      }
    }
    poll()
    const timer = window.setInterval(poll, 2500)
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [projectId, activeSceneId])

  useEffect(() => {
    fetch(`/api/projects/${projectId}/film`).then(async (response) => {
      if (response.ok) setFilm(await response.json())
    }).catch(() => undefined)
  }, [projectId])

  useEffect(() => {
    fetch(`/api/projects/${projectId}/scenes`).then(async (response) => {
      const data = await response.json()
      if (response.ok) { setScenes(data.scenes); setActiveId(data.scenes[0]?.id ?? null) }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [projectId])

  function updateScene(field: keyof Scene, value: string) {
    if (!activeScene) return
    setScenes((current) => current.map((scene) => scene.id === activeScene.id ? { ...scene, [field]: value } : scene))
  }

  async function addScene() {
    const response = await fetch(`/api/projects/${projectId}/scenes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: `Scene ${scenes.length + 1}`, description: '', dialogue: '', location: 'New location', timeOfDay: 'Day', durationSeconds: 10 }) })
    const data = await response.json()
    if (response.ok) { setScenes((current) => [...current, data.scene]); setActiveId(data.scene.id); setMessage('Scene added') }
  }

  async function generateVisual() {
    if (!activeScene) return
    setMessage('Queuing visual job...')
    const response = await fetch(`/api/projects/${projectId}/jobs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'IMAGE_GENERATION', sceneId: activeScene.id, payload: { prompt: activeScene.description, location: activeScene.location } }) })
    setMessage(response.ok ? 'Visual job queued' : 'Queue failed')
    window.setTimeout(() => setMessage(''), 2400)
  }

  async function generatePipeline() {
    const prompt = window.prompt('Describe the film, tone, and audience.', 'A tense, intimate short film about memory and the cost of telling the truth.')
    if (!prompt) return
    setMessage('Generating story, characters, screenplay, and storyboard...')
    const response = await fetch(`/api/projects/${projectId}/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'pipeline', prompt }) })
    if (response.ok) {
      const [nextFilm, nextScenes] = await Promise.all([
        fetch(`/api/projects/${projectId}/film`, { cache: 'no-store' }),
        fetch(`/api/projects/${projectId}/scenes`, { cache: 'no-store' }),
      ])
      if (nextFilm.ok) setFilm(await nextFilm.json())
      if (nextScenes.ok) {
        const data = await nextScenes.json()
        setScenes(data.scenes)
        setActiveId((current) => current ?? data.scenes[0]?.id ?? null)
      }
    }
    setMessage(response.ok ? 'Pipeline generated and clips queued' : 'Pipeline failed')
    window.setTimeout(() => setMessage(''), 3200)
  }

  async function saveScene() {
    if (!activeScene) return
    setSaving(true)
    const response = await fetch(`/api/projects/${projectId}/scenes/${activeScene.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(activeScene) })
    setSaving(false)
    setMessage(response.ok ? 'Saved' : 'Save failed')
    window.setTimeout(() => setMessage(''), 2000)
  }

  return <main className="min-h-screen bg-background text-foreground">
    <header className="flex items-center justify-between border-b border-border px-5 py-4 md:px-8"><div className="flex items-center gap-3"><Link href="/dashboard" className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground" aria-label="Back to dashboard"><WandSparkles size={17} /></Link><div><p className="text-xs text-muted-foreground">Project workspace</p><h1 className="font-serif text-xl">{projectId.replaceAll('-', ' ')}</h1></div></div><div className="flex items-center gap-2 text-sm text-muted-foreground">{message && <span role="status" className="flex items-center gap-1 text-primary"><Check size={14} />{message}</span>}<button onClick={saveScene} disabled={!activeScene || saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 font-medium text-primary-foreground disabled:opacity-50"><Save size={15} />{saving ? 'Saving' : 'Save'}</button></div></header>
    <div className="mx-auto max-w-[1500px] px-5 py-6 md:px-8"><WorkspaceNavigation projectId={projectId} />{film?.bible && <section className="mt-6 grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-[1fr_auto] md:items-center"><div><p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">Film bible</p><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{film.bible.logline || 'Your generated logline will appear here.'}</p></div><div className="flex flex-wrap gap-2 text-xs text-muted-foreground"><span className="rounded-full bg-muted px-3 py-1">{film.characters.length} characters</span><span className="rounded-full bg-muted px-3 py-1">{film.shots.length} shots</span><span className="rounded-full bg-muted px-3 py-1">{film.timeline.length} timeline items</span><span className="rounded-full bg-muted px-3 py-1">{film.shots.filter((shot) => shot.status === 'COMPLETED').length} clips ready</span></div></section>}{film?.bible && <div className="mt-4 grid gap-4 md:grid-cols-3"><section className="rounded-2xl border border-border bg-card p-4"><p className="text-xs font-medium uppercase tracking-[0.16em] text-accent">Acts</p><p className="mt-3 text-2xl font-serif">{film.bible.acts.length}</p><p className="text-xs text-muted-foreground">story movements generated</p></section><section className="rounded-2xl border border-border bg-card p-4"><p className="text-xs font-medium uppercase tracking-[0.16em] text-accent">Screenplay</p><p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{film.bible.screenplay || 'Screenplay formatting will appear here.'}</p></section><section className="rounded-2xl border border-border bg-card p-4"><p className="text-xs font-medium uppercase tracking-[0.16em] text-accent">Style bible</p><p className="mt-3 text-sm leading-6 text-muted-foreground">{Object.keys(film.bible.styleBible).length} continuity rules ready</p></section></div>}<div className="mb-6 mt-6 flex items-center justify-between"><div><p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">Scene builder</p><h2 className="mt-2 font-serif text-3xl">Shape the next beat.</h2></div><div className="flex items-center gap-2"><button onClick={generatePipeline} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"><Sparkles size={15} />Generate full pipeline</button><button onClick={addScene} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"><Plus size={15} />New scene</button></div></div>
      {loading ? <div className="flex min-h-[400px] items-center justify-center text-muted-foreground"><Loader2 className="mr-2 animate-spin" size={18} />Loading scenes</div> : <div className="grid gap-6 lg:grid-cols-[280px_1fr]"><aside className="rounded-2xl border border-border bg-card p-3"><div className="mb-3 flex items-center justify-between px-2"><span className="text-sm font-medium">Scenes</span><span className="text-xs text-muted-foreground">{scenes.length}</span></div>{scenes.length === 0 ? <p className="p-3 text-sm text-muted-foreground">No scenes yet. Add the first beat.</p> : <div className="flex flex-col gap-1">{scenes.map((scene) => <button key={scene.id} onClick={() => setActiveId(scene.id)} className={`rounded-lg px-3 py-3 text-left ${scene.id === activeScene?.id ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}><span className="text-[11px] opacity-70">{String(scene.sceneNumber).padStart(2, '0')}</span><span className="mt-1 block truncate text-sm font-medium">{scene.title}</span><span className="mt-1 block text-xs opacity-70">{scene.durationSeconds}s · {scene.location || 'Unassigned'}</span></button>)}</div>}</aside>
        <section className="rounded-2xl border border-border bg-card p-5 md:p-7">{activeScene ? <><div className="flex items-start justify-between gap-4"><div><span className="text-xs text-accent">SCENE {String(activeScene.sceneNumber).padStart(2, '0')}</span><input value={activeScene.title} onChange={(event) => updateScene('title', event.target.value)} className="mt-2 block w-full bg-transparent font-serif text-3xl outline-none" aria-label="Scene title" /></div><div className="flex items-center gap-2"><button onClick={generateVisual} disabled={!activeScene || activeJob?.status === 'PROCESSING' || activeJob?.status === 'QUEUED'} className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"><Sparkles size={15} />Generate visual</button></div></div>{activeJob && <div className="mt-5 rounded-xl border border-accent/30 bg-accent/10 p-4" role="status"><div className="flex items-center justify-between text-sm"><span className="font-medium">{activeJob.stage}</span><span className="text-muted-foreground">{activeJob.progress}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${activeJob.progress}%` }} /></div><p className="mt-2 text-xs text-muted-foreground">{activeJob.status === 'QUEUED' ? 'Waiting for a worker' : 'Processing on the generation worker'}</p></div>}<div className="mt-8 grid gap-5 md:grid-cols-2"><label className="text-sm font-medium">Location<input value={activeScene.location} onChange={(event) => updateScene('location', event.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" /></label><label className="text-sm font-medium">Time<input value={activeScene.timeOfDay} onChange={(event) => updateScene('timeOfDay', event.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" /></label></div><label className="mt-5 block text-sm font-medium">Description<textarea value={activeScene.description} onChange={(event) => updateScene('description', event.target.value)} rows={5} className="mt-2 w-full resize-y rounded-lg border border-input bg-background px-3 py-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring" placeholder="What happens in this scene?" /></label><label className="mt-5 block text-sm font-medium">Dialogue<textarea value={activeScene.dialogue} onChange={(event) => updateScene('dialogue', event.target.value)} rows={5} className="mt-2 w-full resize-y rounded-lg border border-input bg-background px-3 py-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring" placeholder="Write dialogue or narration..." /></label><label className="mt-5 block max-w-xs text-sm font-medium">Duration (seconds)<input type="number" min="0.1" step="0.1" value={activeScene.durationSeconds} onChange={(event) => updateScene('durationSeconds', event.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" /></label></> : <div className="flex min-h-[420px] items-center justify-center text-center text-muted-foreground">Create a scene to start building your storyboard.</div>}</section></div>}
    </div>
  </main>
}
