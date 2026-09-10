'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, Settings2 } from 'lucide-react'
import { authClient, useSession } from '@/lib/auth-client'

export default function SettingsPage() {
  const { data: session } = useSession()
  const [name, setName] = useState('')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  function handleNameChange(value: string) {
    setName(value)
    setSaved(false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSaved(false)
    const result = await authClient.updateUser({ name: name.trim() })
    if (result.error) {
      setError(result.error.message ?? 'Unable to save settings.')
      return
    }
    setSaved(true)
  }

  const displayName = name || session?.user?.name || ''

  return <main className="min-h-screen bg-background px-5 py-8 text-foreground md:px-10"><div className="mx-auto max-w-4xl"><Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={16} />Back to studio</Link><div className="mt-14 flex items-center gap-4"><span className="flex size-12 items-center justify-center rounded-xl bg-accent/15 text-accent-foreground"><Settings2 size={22} /></span><div><p className="text-xs uppercase tracking-[0.18em] text-accent">Studio settings</p><h1 className="mt-1 font-serif text-4xl">Make it yours.</h1></div></div><form onSubmit={handleSubmit} className="mt-10 rounded-2xl border border-border bg-card p-6"><div className="grid gap-6 md:grid-cols-2"><label className="text-sm font-medium">Display name<input required minLength={1} maxLength={120} value={displayName} onChange={(event) => handleNameChange(event.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-3 outline-none focus:ring-2 focus:ring-ring" /></label><label className="text-sm font-medium">Application name<input defaultValue="Lumen Forge" className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-3 outline-none focus:ring-2 focus:ring-ring" /></label><label className="text-sm font-medium">Default resolution<select defaultValue="1080p" className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-3 outline-none focus:ring-2 focus:ring-ring"><option>720p</option><option>1080p</option><option>4K</option></select></label><label className="text-sm font-medium">Default aspect ratio<select defaultValue="16:9" className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-3 outline-none focus:ring-2 focus:ring-ring"><option>16:9</option><option>9:16</option><option>1:1</option><option>4:5</option></select></label></div><div className="mt-8 flex items-center justify-between border-t border-border pt-5"><p className="text-sm text-muted-foreground" role="status">{error || (saved ? 'Settings saved to your studio profile.' : 'Changes are saved to your studio profile.')}</p><button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"><Check size={16} />Save settings</button></div></form></div></main>
}
