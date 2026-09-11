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
  const [loadError, setLoadError] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [pipelinePrompt, setPipelinePrompt] = useState('A tense, intimate short film about memory and the cost of telling the truth.')
  const [pipelineLoading, setPipelineLoading] = useState(false)
  const [activeJob, setActiveJob] = useState<{ id: string; status: string; progress: number; stage: string } | null>(null)
  const [generationBusy, setGenerationBusy] = useState(false)
  const [film, setFilm] = useState<{ project: { title: string; concept: string; status: string }; bible: { logline: string; acts: unknown[]; screenplay: string; styleBible: Record<string, unknown> } | null; characters: unknown[]; shots: Array<{ status: string }>; timeline: unknown[] } | null>(null)
  const workflowSteps = [
    { label: 'Your idea is saved as a project', done: true },
    { label: 'Build an editable story treatment', done: Boolean(film?.bible) },
    { label: 'Break the treatment into scenes', done: scenes.length > 0 },
    { label: 'Generate visuals, voices, and a timeline', done: Boolean(film?.shots.some((shot) => shot.status === 'COMPLETED')) },
  ]
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
        const jobs = Array.isArray(data.jobs) ? data.jobs : []
        const nextJob = jobs.find((job: { status?: string }) => job.status === 'QUEUED' || job.status === 'PROCESSING') ?? jobs[0] ?? null
        setActiveJob(nextJob?.id ? { id: nextJob.id, status: nextJob.status || 'UNKNOWN', progress: Number(nextJob.progress) || 0, stage: nextJob.stage || 'Processing' } : null)
      } catch {
        // Polling is best effort; the next interval can recover from a transient network failure.
      }
    }
    poll()
    const timer = window.setInterval(poll, 2500)
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [projectId, activeSceneId])

  useEffect(() => {
    let cancelled = false

    async function loadWorkspace() {
      setLoading(true)
      setLoadError('')
      try {
        const [filmResponse, scenesResponse] = await Promise.all([
          fetch(`/api/projects/${projectId}/film`, { cache: 'no-store' }),
          fetch(`/api/projects/${projectId}/scenes`, { cache: 'no-store' }),
        ])
        if (cancelled) return
        if (filmResponse.ok) {
          const data = await filmResponse.json()
          if (data?.project && Array.isArray(data.characters) && Array.isArray(data.shots) && Array.isArray(data.timeline)) setFilm(data)
          else setLoadError('Unable to load project data.')
        } else {
          const data = await filmResponse.json().catch(() => null) as { error?: string } | null
          setLoadError(data?.error || 'Unable to load project.')
        }
        if (scenesResponse.ok) {
          const data = await scenesResponse.json()
          const nextScenes = Array.isArray(data.scenes) ? data.scenes : []
          setScenes(nextScenes)
          setActiveId(nextScenes[0]?.id ?? null)
        } else {
          const data = await scenesResponse.json().catch(() => null) as { error?: string } | null
          setLoadError(data?.error || 'Unable to load project scenes.')
        }
        if (!filmResponse.ok || !scenesResponse.ok) return
      } catch {
        if (!cancelled) setLoadError('Unable to load project. Check your connection.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadWorkspace()
    return () => { cancelled = true }
  }, [projectId, loadAttempt])

  function updateScene(field: keyof Scene, value: string) {
    if (!activeScene) return
    setScenes((current) => current.map((scene) => scene.id === activeScene.id ? { ...scene, [field]: value } : scene))
  }

  async function addScene() {
    try {
      const response = await fetch(`/api/projects/${projectId}/scenes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: `Scene ${scenes.length + 1}`, description: '', dialogue: '', location: 'New location', timeOfDay: 'Day', durationSeconds: 10 }) })
      const data = await response.json()
      if (response.ok && data.scene?.id) { setScenes((current) => [...current, data.scene]); setActiveId(data.scene.id); setMessage('Scene added') }
      else setMessage(data.error || 'Scene could not be added')
    } catch { setMessage('Scene could not be added. Check your connection.') }
  }

  async function generateVisual() {
    if (!activeScene || generationBusy) return
    setGenerationBusy(true)
    setMessage('Queuing visual job...')
    try {
      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), 15000)
      const response = await fetch(`/api/projects/${projectId}/jobs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'IMAGE_GENERATION', sceneId: activeScene.id, payload: { prompt: activeScene.description, location: activeScene.location } }), signal: controller.signal })
      window.clearTimeout(timeout)
      if (!response.ok) {
        const data = await response.json().catch(() => null) as { error?: string } | null
        setMessage(data?.error || 'Queue failed')
        return
      }
      setMessage('Visual job queued')
    } catch (error) { setMessage(error instanceof DOMException && error.name === 'AbortError' ? 'Visual request timed out. Retry.' : 'Queue failed. Check your connection. Retry.') }
    finally { setGenerationBusy(false) }
    window.setTimeout(() => setMessage(''), 2400)
  }

  async function generatePipeline() {
    const prompt = pipelinePrompt.trim()
    if (!prompt || generationBusy || pipelineLoading) return
    setPipelineLoading(true)
    setGenerationBusy(true)
    setMessage('Generating story, characters, screenplay, and storyboard...')
    try {
      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), 120000)
      const response = await fetch(`/api/projects/${projectId}/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'SCRIPT_GENERATION', kind: 'pipeline', prompt }), signal: controller.signal })
      window.clearTimeout(timeout)
      if (response.ok) {
        const queued = await response.json().catch(() => null) as { jobs?: Array<{ id: string; status?: string; progress?: number; stage?: string }> } | null
        const firstJob = queued?.jobs?.[0]
        if (firstJob?.id) setActiveJob({ id: firstJob.id, status: firstJob.status || 'QUEUED', progress: Number(firstJob.progress) || 0, stage: firstJob.stage || 'Pipeline queued' })
        const [nextFilm, nextScenes] = await Promise.all([
          fetch(`/api/projects/${projectId}/film`, { cache: 'no-store' }),
          fetch(`/api/projects/${projectId}/scenes`, { cache: 'no-store' }),
        ])
        if (nextFilm.ok) setFilm(await nextFilm.json())
        if (nextScenes.ok) {
          const data = await nextScenes.json()
          setScenes(data.scenes ?? [])
          setActiveId((current) => current ?? data.scenes?.[0]?.id ?? null)
        }
      }
      if (!response.ok) {
        const data = await response.json().catch(() => null) as { error?: string; details?: string } | null
        setMessage(data?.error || data?.details || 'Pipeline failed')
        return
      }
      setMessage('Pipeline generated and clips queued')
    } catch (error) { setMessage(error instanceof DOMException && error.name === 'AbortError' ? 'Generation timed out. Completed work was preserved. Retry.' : 'Pipeline failed. Completed work was preserved. Retry.') }
    finally {
      setPipelineLoading(false)
      setGenerationBusy(false)
    }
    window.setTimeout(() => setMessage(''), 3200)
  }

  async function saveScene() {
    if (!activeScene) return
    setSaving(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/scenes/${activeScene.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(activeScene) })
      if (!response.ok) {
        const data = await response.json().catch(() => null) as { error?: string } | null
        setMessage(data?.error || 'Save failed')
        return
      }
      setMessage('Saved')
    } catch { setMessage('Save failed. Check your connection.') }
    finally { setSaving(false) }
    window.setTimeout(() => setMessage(''), 2000)
  }

  return <main className="min-h-screen bg-background text-foreground">
    <header className="flex items-center justify-between border-b border-border px-5 py-4 md:px-8"><div className="flex items-center gap-3"><Link href="/dashboard" className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground" aria-label="Back to dashboard"><WandSparkles size={17} /></Link><div><p className="text-xs text-muted-foreground">Project workspace</p><h1 className="font-serif text-xl">{film?.project.title || 'Untitled project'}</h1></div></div><div className="flex items-center gap-2 text-sm text-muted-foreground">{message && <span role="status" className="flex items-center gap-1 text-primary"><Check size={14} />{message}</span>}<button onClick={saveScene} disabled={!activeScene || saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 font-medium text-primary-foreground disabled:opacity-50"><Save size={15} />{saving ? 'Saving' : 'Save'}</button></div></header>
    <div className="mx-auto max-w-[1500px] px-5 py-6 md:px-8"><WorkspaceNavigation projectId={projectId} />{loading ? <div className="mt-6 flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground" role="status"><Loader2 className="animate-spin" size={16} />Loading project...</div> : loadError ? <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm" role="alert"><span className="text-destructive">{loadError}</span><button type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)} className="rounded-lg border border-border bg-background px-3 py-1.5 font-medium text-foreground">Try Again</button></div> : <div className="mt-6 flex items-center gap-2 rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-primary" role="status"><Check size={16} />Project loaded</div>}<section aria-label="Generation workflow" className="mt-6 grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-4">{workflowSteps.map((step, index) => <div key={step.label} className="flex items-start gap-3"><span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${step.done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{step.done ? <Check size={14} /> : index + 1}</span><span className={`text-sm leading-6 ${step.done ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</span></div>)}</section>{film?.bible && <section className="mt-6 grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-[1fr_auto] md:items-center"><div><p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">Film bible</p><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{film.bible.logline || 'Your generated logline will appear here.'}</p></div><div className="flex flex-wrap gap-2 text-xs text-muted-foreground"><span className="rounded-full bg-muted px-3 py-1">{film.characters.length} characters</span><span className="rounded-full bg-muted px-3 py-1">{film.shots.length} shots</span><span className="rounded-full bg-muted px-3 py-1">{film.timeline.length} timeline items</span><span className="rounded-full bg-muted px-3 py-1">{film.shots.filter((shot) => shot.status === 'COMPLETED').length} clips ready</span></div></section>}{film?.bible && <div className="mt-4 grid gap-4 md:grid-cols-3"><section className="rounded-2xl border border-border bg-card p-4"><p className="text-xs font-medium uppercase tracking-[0.16em] text-accent">Acts</p><p className="mt-3 text-2xl font-serif">{film.bible.acts.length}</p><p className="text-xs text-muted-foreground">story movements generated</p></section><section className="rounded-2xl border border-border bg-card p-4"><p className="text-xs font-medium uppercase tracking-[0.16em] text-accent">Screenplay</p><p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{film.bible.screenplay || 'Screenplay formatting will appear here.'}</p></section><section className="rounded-2xl border border-border bg-card p-4"><p className="text-xs font-medium uppercase tracking-[0.16em] text-accent">Style bible</p><p className="mt-3 text-sm leading-6 text-muted-foreground">{Object.keys(film.bible.styleBible).length} continuity rules ready</p></section></div>}<div className="mb-6 mt-6 flex items-center justify-between"><div><p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">Scene builder</p><h2 className="mt-2 font-serif text-3xl">Shape the next beat.</h2></div><div className="flex items-center gap-2"><button onClick={() => void generatePipeline()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"><Sparkles size={15} />Generate full pipeline</button><button onClick={addScene} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"><Plus size={15} />New scene</button></div></div>
      {loading ? <div className="flex min-h-[400px] items-center justify-center text-muted-foreground"><Loader2 className="mr-2 animate-spin" size={18} />Loading scenes</div> : <div className="grid gap-6 lg:grid-cols-[280px_1fr]"><aside className="rounded-2xl border border-border bg-card p-3"><div className="mb-3 flex items-center justify-between px-2"><span className="text-sm font-medium">Scenes</span><span className="text-xs text-muted-foreground">{scenes.length}</span></div>{scenes.length === 0 ? <p className="p-3 text-sm text-muted-foreground">No scenes yet. Add the first beat.</p> : <div className="flex flex-col gap-1">{scenes.map((scene) => <button key={scene.id} onClick={() => setActiveId(scene.id)} className={`rounded-lg px-3 py-3 text-left ${scene.id === activeScene?.id ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}><span className="text-[11px] opacity-70">{String(scene.sceneNumber).padStart(2, '0')}</span><span className="mt-1 block truncate text-sm font-medium">{scene.title}</span><span className="mt-1 block text-xs opacity-70">{scene.durationSeconds}s · {scene.location || 'Unassigned'}</span></button>)}</div>}</aside>
        <section className="rounded-2xl border border-border bg-card p-5 md:p-7">{activeScene ? <><div className="flex items-start justify-between gap-4"><div><span className="text-xs text-accent">SCENE {String(activeScene.sceneNumber).padStart(2, '0')}</span><input value={activeScene.title} onChange={(event) => updateScene('title', event.target.value)} className="mt-2 block w-full bg-transparent font-serif text-3xl outline-none" aria-label="Scene title" /></div><div className="flex items-center gap-2"><button onClick={generateVisual} disabled={!activeScene || generationBusy || activeJob?.status === 'PROCESSING' || activeJob?.status === 'QUEUED'} className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"><Sparkles size={15} />{generationBusy ? 'Queuing…' : activeJob?.status === 'FAILED' ? 'Retry visual' : 'Generate visual'}</button></div></div>{activeJob && <div className="mt-5 rounded-xl border border-accent/30 bg-accent/10 p-4" role="status"><div className="flex items-center justify-between text-sm"><span className="font-medium">{activeJob.stage}</span><span className="text-muted-foreground">{activeJob.progress}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${activeJob.progress}%` }} /></div><p className="mt-2 text-xs text-muted-foreground">{activeJob.status === 'QUEUED' ? 'Waiting for a worker' : activeJob.status === 'FAILED' || activeJob.status === 'DEAD_LETTER' ? 'Generation failed. Use Retry visual to try again.' : activeJob.status === 'CANCELLED' ? 'Generation was cancelled.' : activeJob.status === 'COMPLETED' ? 'Generation complete.' : 'Processing on the generation worker'}</p></div>}<div className="mt-8 grid gap-5 md:grid-cols-2"><label className="text-sm font-medium">Location<input value={activeScene.location} onChange={(event) => updateScene('location', event.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" /></label><label className="text-sm font-medium">Time<input value={activeScene.timeOfDay} onChange={(event) => updateScene('timeOfDay', event.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" /></label></div><label className="mt-5 block text-sm font-medium">Description<textarea value={activeScene.description} onChange={(event) => updateScene('description', event.target.value)} rows={5} className="mt-2 w-full resize-y rounded-lg border border-input bg-background px-3 py-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring" placeholder="What happens in this scene?" /></label><label className="mt-5 block text-sm font-medium">Dialogue<textarea value={activeScene.dialogue} onChange={(event) => updateScene('dialogue', event.target.value)} rows={5} className="mt-2 w-full resize-y rounded-lg border border-input bg-background px-3 py-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring" placeholder="Write dialogue or narration..." /></label><label className="mt-5 block max-w-xs text-sm font-medium">Duration (seconds)<input type="number" min="0.1" step="0.1" value={activeScene.durationSeconds} onChange={(event) => updateScene('durationSeconds', event.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" /></label></> : <div className="flex min-h-[420px] items-center justify-center text-center text-muted-foreground">Create a scene to start building your storyboard.</div>}</section></div>}
    </div>
  </main>
}
