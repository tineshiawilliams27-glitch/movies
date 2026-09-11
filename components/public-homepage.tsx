import Link from 'next/link'
import { ArrowRight, Film, Layers3, Play, Sparkles, Volume2 } from 'lucide-react'

export function PublicHomepage({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const navigationLinks = isAuthenticated
    ? [
        { href: '/dashboard', label: 'Dashboard' },
        { href: '/projects', label: 'My Projects' },
        { href: '/projects/new', label: 'New Project', primary: true },
      ]
    : [
        { href: '/login', label: 'Log in' },
        { href: '/signup', label: 'Create account', primary: true },
      ]

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <Link href="/" className="flex items-center gap-3 font-semibold tracking-tight">
          <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Film size={18} /></span>
          <span>Lumen Forge</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm" aria-label="Primary navigation">
          {navigationLinks.map((link) => <Link key={link.href} href={link.href} className={link.primary ? 'rounded-lg bg-accent px-4 py-2 font-medium text-accent-foreground transition hover:opacity-90' : 'rounded-lg px-4 py-2 text-muted-foreground transition hover:bg-muted hover:text-foreground'}>{link.label}</Link>)}
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl gap-12 px-6 pb-20 pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-10 lg:pt-24">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground"><Sparkles size={14} className="text-accent" />Open production workspace for long-form video</div>
          <h1 className="max-w-3xl text-balance text-5xl font-semibold tracking-[-0.05em] sm:text-6xl lg:text-7xl">Turn a first idea into a finished film.</h1>
          <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground">Lumen Forge brings story, scenes, characters, visuals, audio, and timeline editing into one calm workspace for AI-assisted production.</p>
          <div className="mt-8 flex flex-wrap gap-3">{isAuthenticated ? <><Link href="/projects/new" className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 font-medium text-accent-foreground transition hover:opacity-90">New project <ArrowRight size={17} /></Link><Link href="/dashboard" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 font-medium transition hover:bg-muted"><Play size={16} /> Open studio</Link></> : <><Link href="/signup" className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 font-medium text-accent-foreground transition hover:opacity-90">Start creating <ArrowRight size={17} /></Link><Link href="/login" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 font-medium transition hover:bg-muted"><Play size={16} /> Open studio</Link></>}</div>
          <p className="mt-4 text-sm text-muted-foreground">Free plans. Unlimited projects. No credits or artificial duration caps.</p>
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-3 shadow-2xl shadow-accent/5">
          <div className="mb-2 flex items-center justify-between px-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground"><span>Example workspace</span><span className="rounded-full border border-border px-2 py-1 tracking-normal">Illustrative demo</span></div>
          <div className="rounded-2xl border border-border bg-background p-5"><div className="flex items-center justify-between border-b border-border pb-4"><div><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Example project</p><h2 className="mt-1 text-xl font-semibold">The Last Light</h2></div><span className="rounded-full bg-accent/15 px-3 py-1 text-xs text-accent">Demo draft</span></div><div className="relative mt-5 aspect-video overflow-hidden rounded-2xl border border-border bg-background"><video className="h-full w-full object-cover" controls playsInline preload="metadata" poster="/demo-film-frame.png" aria-label="Lumen Forge live demo video with sound"><source src="https://media.w3.org/2010/05/sintel/trailer.mp4" type="video/mp4" />Your browser does not support the video element.</video><div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 rounded-full border border-border bg-background/85 px-3 py-1.5 text-xs text-foreground backdrop-blur"><Volume2 size={14} className="text-accent" />Sound available</div></div><div className="mt-5 grid grid-cols-3 gap-3"><div className="rounded-xl border border-border p-3"><Layers3 size={16} className="text-accent" /><p className="mt-3 text-lg font-semibold">24</p><p className="text-xs text-muted-foreground">Scenes</p></div><div className="rounded-xl border border-border p-3"><Film size={16} className="text-accent" /><p className="mt-3 text-lg font-semibold">12:48</p><p className="text-xs text-muted-foreground">Timeline</p></div><div className="rounded-xl border border-border p-3"><Sparkles size={16} className="text-accent" /><p className="mt-3 text-lg font-semibold">Ready</p><p className="text-xs text-muted-foreground">Workspace</p></div></div></div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 border-t border-border px-6 py-12 sm:grid-cols-3 lg:px-10"><div className="rounded-2xl border border-border bg-card p-5"><p className="text-sm font-medium">01 · Shape the story</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Write, expand, shorten, and revise a story without losing the project context.</p></div><div className="rounded-2xl border border-border bg-card p-5"><p className="text-sm font-medium">02 · Direct every scene</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Keep character references, dialogue, visual prompts, and durations together.</p></div><div className="rounded-2xl border border-border bg-card p-5"><p className="text-sm font-medium">03 · Finish the cut</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Move from storyboard to timeline, audio, subtitles, rendering, and export.</p></div></section>
    </main>
  )
}
