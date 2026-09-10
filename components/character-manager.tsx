'use client'

import { useEffect, useState } from 'react'
import { Loader2, Plus, Save } from 'lucide-react'

type Character = { id: string; name: string; description: string; appearance: string; voice: string }

export function CharacterManager({ projectId }: { projectId: string }) {
  const [characters, setCharacters] = useState<Character[]>([])
  const [activeId, setActiveId] = useState<string>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [addError, setAddError] = useState('')
  const active = characters.find((character) => character.id === activeId)

  useEffect(() => {
    fetch(`/api/projects/${projectId}/characters`).then((response) => response.json()).then((data) => {
      const next = data.characters ?? []
      setCharacters(next)
      setActiveId(next[0]?.id)
    }).finally(() => setLoading(false))
  }, [projectId])

  async function addCharacter() {
    setAddError('')
    try {
      const response = await fetch(`/api/projects/${projectId}/characters`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'New character', description: '', appearance: '', voice: '' }),
      })
      const data = await response.json().catch(() => null) as { character?: Character; error?: string } | null
      if (!response.ok || !data?.character) {
        setAddError(data?.error || 'Character could not be added. Please try again.')
        return
      }
      setCharacters((current) => [...current, data.character as Character])
      setActiveId(data.character.id)
    } catch {
      setAddError('Character could not be added. Please check your connection and try again.')
    }
  }

  async function saveCharacter() {
    if (!active) return
    setSaving(true)
    const response = await fetch(`/api/projects/${projectId}/characters/${active.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(active) })
    setSaving(false)
    setMessage(response.ok ? 'Character saved' : 'Save failed')
    window.setTimeout(() => setMessage(''), 2200)
  }

  function update(field: keyof Character, value: string) {
    setCharacters((current) => current.map((character) => character.id === activeId ? { ...character, [field]: value } : character))
  }

  if (loading) return <div className="flex min-h-64 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 animate-spin" size={18} />Loading characters</div>
  return <main className="mx-auto min-h-screen max-w-6xl px-5 py-8 text-foreground md:px-8"><div className="mb-8 flex items-end justify-between"><div><p className="text-xs uppercase tracking-[0.18em] text-accent">Character continuity</p><h1 className="mt-2 font-serif text-4xl">Keep every performance consistent.</h1></div><div className="flex flex-col items-end gap-2"><button onClick={addCharacter} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"><Plus size={16} />Add character</button>{addError && <p role="alert" className="max-w-xs text-right text-sm text-destructive">{addError}</p>}</div></div><div className="grid gap-6 lg:grid-cols-[240px_1fr]"><aside className="rounded-2xl border border-border bg-card p-3">{characters.length === 0 && <p className="p-3 text-sm text-muted-foreground">No characters yet.</p>}{characters.map((character) => <button key={character.id} onClick={() => setActiveId(character.id)} className={`mb-1 w-full rounded-lg px-3 py-3 text-left text-sm ${character.id === activeId ? 'bg-accent/15 text-accent' : 'hover:bg-muted'}`}>{character.name}</button>)}</aside><section className="rounded-2xl border border-border bg-card p-6">{active ? <><div className="flex items-center justify-between"><div className="flex items-center gap-3"><input value={active.name} onChange={(event) => update('name', event.target.value)} className="bg-transparent font-serif text-3xl outline-none" aria-label="Character name" /></div>{message && <span role="status" className="text-sm text-primary">{message}</span>}<button onClick={saveCharacter} disabled={saving} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50"><Save size={15} />{saving ? 'Saving' : 'Save'}</button></div><div className="mt-8 grid gap-5 md:grid-cols-2"><label className="text-sm">Description<textarea value={active.description} onChange={(event) => update('description', event.target.value)} className="mt-2 min-h-32 w-full rounded-lg border border-border bg-background p-3" /></label><label className="text-sm">Appearance<textarea value={active.appearance} onChange={(event) => update('appearance', event.target.value)} className="mt-2 min-h-32 w-full rounded-lg border border-border bg-background p-3" /></label><label className="text-sm md:col-span-2">Voice<textarea value={active.voice} onChange={(event) => update('voice', event.target.value)} className="mt-2 min-h-24 w-full rounded-lg border border-border bg-background p-3" /></label></div></> : <p className="text-muted-foreground">Add a character to begin.</p>}</section></div></main>
}
