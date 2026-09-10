'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, FileAudio, FileImage, FileVideo, Loader2, Upload } from 'lucide-react'
import { WorkspaceNavigation } from '@/components/workspace-navigation'

type Asset = { id: string; kind: string; pathname: string; url?: string; contentType: string; createdAt: string }

export function MediaLibrary({ projectId }: { projectId: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')

  async function loadAssets() {
    const response = await fetch(`/api/projects/${projectId}/media`)
    if (response.ok) setAssets((await response.json()).assets)
    setLoading(false)
  }

  useEffect(() => { void loadAssets() }, [projectId])

  async function upload(file: File) {
    setUploading(true)
    const formData = new FormData()
    formData.set('file', file)
    formData.set('kind', file.type.startsWith('image/') ? 'IMAGE' : file.type.startsWith('audio/') ? 'AUDIO' : 'VIDEO')
    const response = await fetch(`/api/projects/${projectId}/media`, { method: 'POST', body: formData })
    setUploading(false)
    setMessage(response.ok ? 'Asset uploaded' : 'Upload failed')
    if (response.ok) await loadAssets()
    window.setTimeout(() => setMessage(''), 2400)
  }

  const iconFor = (type: string) => type.startsWith('image/') ? FileImage : type.startsWith('audio/') ? FileAudio : FileVideo

  return <main className="min-h-screen bg-background text-foreground"><header className="flex items-center justify-between border-b border-border px-5 py-4 md:px-8"><div><p className="text-xs text-muted-foreground">Project workspace</p><h1 className="font-serif text-xl">Media library</h1></div><button onClick={() => inputRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">{uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}Upload asset</button><input ref={inputRef} type="file" className="sr-only" accept="image/*,video/*,audio/*,.vtt,.srt" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.currentTarget.value = '' }} /></header><div className="mx-auto max-w-[1500px] px-5 py-6 md:px-8"><WorkspaceNavigation projectId={projectId} /><section className="mt-8"><div className="flex items-end justify-between"><div><p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">Private project assets</p><h2 className="mt-2 font-serif text-3xl">Keep every source close.</h2><p className="mt-2 text-sm text-muted-foreground">Images, footage, audio, and subtitles uploaded to this production.</p></div>{message && <span role="status" className="flex items-center gap-1 text-sm text-primary"><Check size={15} />{message}</span>}</div>{loading ? <div className="mt-8 flex min-h-48 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 animate-spin" size={18} />Loading assets</div> : assets.length === 0 ? <button onClick={() => inputRef.current?.click()} className="mt-8 flex min-h-56 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card text-center hover:border-primary/50"><Upload size={24} className="text-accent" /><span className="mt-3 text-sm font-medium">Upload your first asset</span><span className="mt-1 text-xs text-muted-foreground">Private Blob storage · up to 250 MB</span></button> : <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{assets.map((asset) => { const Icon = iconFor(asset.contentType); return <article key={asset.id} className="rounded-xl border border-border bg-card p-4"><div className="flex size-full min-h-32 items-center justify-center rounded-lg bg-muted/40"><Icon size={28} className="text-accent" /></div><p className="mt-3 truncate text-sm font-medium">{asset.pathname.split('/').pop()}</p><p className="mt-1 text-xs text-muted-foreground">{asset.kind} · {asset.contentType}</p></article> })}</div>}</section></div></main>
}
