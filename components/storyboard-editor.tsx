'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, GripVertical, ImageIcon, Loader2, Plus, Save, Sparkles } from 'lucide-react'
import { WorkspaceNavigation } from '@/components/workspace-navigation'

type Scene = { id: string; sceneNumber: number; title: string; description: string; dialogue: string; location: string; timeOfDay: string; durationSeconds: string }

export function StoryboardEditor({ projectId }: { projectId: string }) {
  const [scenes, setScenes] = useState<Scene[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch(`/api/projects/${projectId}/scenes`).then(async (response) => {
      const data = await response.json()
      if (response.ok) setScenes(data.scenes)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [projectId])

  async function saveScene(scene: Scene) {
    setSavingId(scene.id)
    const response = await fetch(`/api/projects/${projectId}/scenes/${scene.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(scene) })
    setSavingId(null)
    setMessage(response.ok ? 'Storyboard saved' : 'Save failed')
    window.setTimeout(() => setMessage(''), 2200)
  }

  async function moveScene(targetId: string) {
    if (!draggedId || draggedId === targetId) return
    const sourceIndex = scenes.findIndex((scene) => scene.id === draggedId)
    const targetIndex = scenes.findIndex((scene) => scene.id === targetId)
    const next = [...scenes]
    const [source] = next.splice(sourceIndex, 1)
    next.splice(targetIndex, 0, source)
    const reordered = next.map((scene, index) => ({ ...scene, sceneNumber: index + 1 }))
    setScenes(reordered)
    setDraggedId(null)
    const response = await fetch(`/api/projects/${projectId}/scenes/reorder`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sceneIds: reordered.map((scene) => scene.id) }) })
    if (!response.ok) {
      setMessage('Reorder failed')
      void fetch(`/api/projects/${projectId}/scenes`).then((result) => result.json()).then((data) => { if (data.scenes) setScenes(data.scenes) })
    }
  }

  async function addScene() {
    const response = await fetch(`/api/projects/${projectId}/scenes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: `Scene ${scenes.length + 1}`, description: 'Describe the visual beat for this scene.', dialogue: '', location: 'New location', timeOfDay: 'Day', durationSeconds: 10 }) })
    const data = await response.json()
    if (response.ok) setScenes((current) => [...current, data.scene])
  }

  return <main className="min-h-screen bg-background text-foreground"><header className="flex items-center justify-between border-b border-border px-5 py-4 md:px-8"><div className="flex items-center gap-3"><Link href={`/projects/${projectId}`} className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground" aria-label="Back to project"><ArrowLeft size={17} /></Link><div><p className="text-xs text-muted-foreground">Project workspace</p><h1 className="font-serif text-xl">Storyboard / {projectId.replaceAll('-', ' ')}</h1></div></div><div className="flex items-center gap-3 text-sm text-muted-foreground">{message}<button onClick={addScene} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 font-medium text-primary-foreground"><Plus size={15} />New scene</button></div></header><div className="mx-auto max-w-[1500px] px-5 py-6 md:px-8"><WorkspaceNavigation projectId={projectId} /><div className="mb-7 mt-8 flex items-end justify-between"><div><p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">Visual sequence</p><h2 className="mt-2 font-serif text-4xl">Arrange the cut.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Drag scenes into sequence, tune each visual beat, and save the board as the source for generation.</p></div><div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs text-muted-foreground md:flex"><Sparkles size={14} className="text-accent" />{scenes.length} scenes · unlimited duration</div></div>{loading ? <div className="flex min-h-[360px] items-center justify-center text-muted-foreground"><Loader2 className="mr-2 animate-spin" size={18} />Loading storyboard</div> : scenes.length === 0 ? <section className="grid min-h-[380px] place-items-center rounded-2xl border border-dashed border-border bg-card p-8 text-center"><div><ImageIcon className="mx-auto text-accent" size={30} /><h3 className="mt-4 font-serif text-2xl">No scenes on the board</h3><p className="mt-2 text-sm text-muted-foreground">Add your first scene to start shaping the sequence.</p><button onClick={addScene} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"><Plus size={15} />Add scene</button></div></section> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{scenes.map((scene) => <article key={scene.id} draggable onDragStart={() => setDraggedId(scene.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => moveScene(scene.id)} className="overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-accent/60"><div className="flex aspect-video items-center justify-center bg-muted/40"><ImageIcon className="text-muted-foreground" size={28} /></div><div className="p-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><GripVertical className="cursor-grab text-muted-foreground" size={16} aria-label="Drag to reorder" /><span className="text-xs font-medium uppercase tracking-[0.15em] text-accent">Scene {String(scene.sceneNumber).padStart(2, '0')}</span></div><span className="text-xs text-muted-foreground">{scene.durationSeconds}s</span></div><input value={scene.title} onChange={(event) => setScenes((current) => current.map((item) => item.id === scene.id ? { ...item, title: event.target.value } : item))} className="mt-3 w-full bg-transparent font-serif text-xl outline-none" aria-label={`Scene ${scene.sceneNumber} title`} /><textarea value={scene.description} onChange={(event) => setScenes((current) => current.map((item) => item.id === scene.id ? { ...item, description: event.target.value } : item))} className="mt-3 min-h-20 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring" aria-label={`Scene ${scene.sceneNumber} description`} /><button onClick={() => saveScene(scene)} disabled={savingId === scene.id} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"><Save size={14} />{savingId === scene.id ? 'Saving' : 'Save scene'}</button></div></article>)}</div>}</div></main>
}
