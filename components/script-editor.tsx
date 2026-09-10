'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2, Save } from 'lucide-react'

type Project = { title: string; concept: string; format: string; metadata: Record<string, unknown> | null }

export function ScriptEditor({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    fetch(`/api/projects/${projectId}`).then((response) => response.json()).then((data) => setProject(data.project ?? null)).finally(() => setLoading(false))
  }, [projectId])

  async function save() {
    if (!project) return
    setSaving(true)
    setSaved(false)
    setSaveError('')
    try {
      const response = await fetch(`/api/projects/${projectId}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: project.title, concept: project.concept, format: project.format, metadata: project.metadata ?? {} }) })
      const data = await response.json().catch(() => null) as { error?: string; project?: Project } | null
      if (!response.ok) {
        setSaveError(data?.error || 'The script could not be saved. Please try again.')
        return
      }
      setProject(data?.project ?? project)
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2200)
    } catch {
      setSaveError('The script could not be saved. Please check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex min-h-64 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 animate-spin" size={18} />Loading script</div>
  if (!project) return <p className="p-8 text-center text-muted-foreground">Project not found.</p>
  return <main className="min-h-screen bg-background px-5 py-8 text-foreground md:px-8"><div className="mx-auto max-w-5xl"><div className="mb-8 flex items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.18em] text-accent">Story development</p><h1 className="mt-2 font-serif text-4xl">Shape the story before production.</h1></div><button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"><Save size={15} />{saving ? 'Saving' : saved ? 'Saved' : 'Save script'}</button></div>{saveError && <p role="alert" className="mb-4 text-right text-sm text-destructive">{saveError}</p>}<section className="grid gap-6 rounded-2xl border border-border bg-card p-6 md:grid-cols-[1fr_280px]"><div><label className="text-sm font-medium">Working title<input value={project.title} onChange={(event) => setProject({ ...project, title: event.target.value })} className="mt-2 w-full rounded-lg border border-border bg-background p-3 font-serif text-2xl outline-none" /></label><label className="mt-6 block text-sm font-medium">Concept / logline<textarea value={project.concept} onChange={(event) => setProject({ ...project, concept: event.target.value })} className="mt-2 min-h-52 w-full rounded-lg border border-border bg-background p-4 leading-7 outline-none" /></label></div><aside className="rounded-xl bg-muted/40 p-4 text-sm"><p className="font-medium">Script room</p><p className="mt-2 leading-6 text-muted-foreground">Use the concept as the north star for scenes, characters, and generation prompts.</p>{saved && <p className="mt-5 inline-flex items-center gap-2 text-accent"><Check size={15} />Saved to project</p>}</aside></section></div></main>
}
