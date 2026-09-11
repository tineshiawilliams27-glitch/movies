'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Activity,
  ArrowUpRight,
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  Clapperboard,
  Clock3,
  Copy,
  Film,
  FolderKanban,
  Gauge,
  Grid2X2,
  Layers3,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Play,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  WandSparkles,
  X,
} from 'lucide-react'

const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Lumen Forge'

type Project = {
  id: string
  title: string
  type: string
  duration: string
  scenes: number
  updated: string
  status: 'Draft' | 'Rendering' | 'Ready'
  image: string
}

const navItems = [
  { label: 'Overview', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Projects', icon: FolderKanban, href: '/dashboard' },
  { label: 'Templates', icon: Grid2X2, href: '/templates' },
]

const workspaceItems = [
  { label: 'Story engine', icon: Sparkles },
  { label: 'Characters', icon: UserRound },
  { label: 'Storyboard', icon: Layers3 },
  { label: 'Timeline', icon: Clapperboard },
]

function StatusBadge({ status }: { status: Project['status'] }) {
  const styles = {
    Draft: 'bg-muted text-muted-foreground',
    Rendering: 'bg-accent/15 text-accent-foreground',
    Ready: 'bg-primary/10 text-primary',
  }
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${styles[status]}`}><span className={`size-1.5 rounded-full ${status === 'Rendering' ? 'bg-accent animate-pulse' : status === 'Ready' ? 'bg-primary' : 'bg-muted-foreground/50'}`} />{status}</span>
}

export function StudioDashboard({ persistedProjects = [], userName, userEmail }: { persistedProjects?: Project[]; userName?: string | null; userEmail?: string | null }) {
  const displayName = userName?.trim() || userEmail?.split('@')[0] || 'Account'
  const initials = displayName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  const [projects, setProjects] = useState(() => persistedProjects)
  const [query, setQuery] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [saved, setSaved] = useState(false)
  const [createError, setCreateError] = useState('')
  const [openMenu, setOpenMenu] = useState<'workspace' | 'notifications' | 'account' | 'sort' | string | null>(null)
  const filteredProjects = useMemo(() => projects.filter((project) => `${project.title} ${project.type}`.toLowerCase().includes(query.toLowerCase())), [projects, query])

  async function createProject() {
    setCreateError('')
    const title = newTitle.trim() || 'Untitled production'
    const response = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, format: 'New production', durationSeconds: 0, concept: '' }) })
    if (!response.ok) {
      const data = await response.json().catch(() => null) as { error?: string } | null
      setCreateError(data?.error || 'Project could not be created. Please try again.')
      return
    }
    const data = await response.json()
    const project: Project = {
      id: data.project.id,
      title: data.project.title,
      type: data.project.format,
      duration: '00:00',
      scenes: 0,
      updated: 'Just now',
      status: 'Draft',
      image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=900&q=85',
    }
    setProjects((current) => [project, ...current])
    setNewTitle('')
    setShowCreate(false)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2200)
  }

  async function duplicateProject(project: Project) {
    const response = await fetch(`/api/projects/${project.id}/duplicate`, { method: 'POST' })
    if (!response.ok) return
    const data = await response.json()
    setProjects((current) => [{ ...project, id: data.project.id, title: data.project.title, updated: 'Just now', status: 'Draft' }, ...current])
  }

  async function deleteProject(id: string) {
    const response = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    if (response.ok) setProjects((current) => current.filter((project) => project.id !== id))
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className={`${mobileOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-border bg-sidebar px-4 py-5 transition-transform lg:static lg:translate-x-0`}>
          <div className="flex items-center justify-between px-3">
            <Link href="/" className="flex items-center gap-3" aria-label={`${appName} home`}>
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/15"><WandSparkles size={18} /></span>
              <span className="font-serif text-lg tracking-tight">{appName}</span>
            </Link>
            <button className="rounded-lg p-2 text-muted-foreground hover:bg-accent lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={18} /></button>
          </div>
          <div className="mt-8 rounded-xl border border-border bg-card/70 p-2">
            <div className="relative"><button onClick={() => setOpenMenu(openMenu === 'workspace' ? null : 'workspace')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-accent" aria-label="Open project switcher" aria-expanded={openMenu === 'workspace'}>
              <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground"><Film size={16} /></span>
              <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium">Workspace</span><span className="block text-[11px] text-muted-foreground">Personal studio</span></span><ChevronDown size={14} className="text-muted-foreground" />
            </button>{openMenu === 'workspace' && <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-lg border border-border bg-card p-1 shadow-xl"><Link href="/dashboard" onClick={() => setOpenMenu(null)} className="block rounded-md px-3 py-2 text-sm hover:bg-accent">Personal studio</Link><Link href="/projects" onClick={() => setOpenMenu(null)} className="block rounded-md px-3 py-2 text-sm hover:bg-accent">All projects</Link></div>}</div>
          </div>
          <nav className="mt-7 flex flex-col gap-1" aria-label="Main navigation">
            <span className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Studio</span>
            {navItems.map((item, index) => <Link key={item.label} href={item.href} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${index === 0 ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}><item.icon size={17} />{item.label}</Link>)}
          </nav>
          <nav className="mt-7 flex flex-col gap-1" aria-label="Workspace navigation">
            <span className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Workspace</span>
            {workspaceItems.map((item) => { const suffix = item.label === 'Story engine' ? '' : item.label === 'Characters' ? '/characters' : item.label === 'Storyboard' ? '/storyboard' : '/timeline'; const projectHref = projects[0] ? `/projects/${projects[0].id}${suffix}` : '/dashboard'; return <Link key={item.label} href={projectHref} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"><item.icon size={17} />{item.label}</Link> })}
          </nav>
          <div className="mt-auto flex flex-col gap-1">
            <div className="mb-3 rounded-xl border border-border bg-card p-3"><div className="flex items-center gap-2"><Gauge size={15} className="text-accent" /><span className="text-xs font-medium">Free studio</span><span className="ml-auto text-[10px] text-primary">Unlimited</span></div><p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">No credits. No duration caps. Your worker capacity sets the pace.</p></div>
            <Link href="/settings" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"><Settings2 size={17} />Settings</Link>
            <Link href="/settings" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground"><CircleHelp size={17} />Help center</Link>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="flex h-16 items-center justify-between border-b border-border px-5 md:px-8">
            <button className="rounded-lg p-2 text-muted-foreground hover:bg-accent lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={19} /></button>
            <div className="hidden items-center gap-2 text-sm text-muted-foreground md:flex"><span>Studio</span><span>/</span><span className="text-foreground">Overview</span></div>
            <div className="flex items-center gap-2"><div className="relative"><button onClick={() => setOpenMenu(openMenu === 'notifications' ? null : 'notifications')} className="relative rounded-lg p-2 text-muted-foreground hover:bg-accent" aria-label="Notifications" aria-expanded={openMenu === 'notifications'}><Bell size={18} /><span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-accent" /></button>{openMenu === 'notifications' && <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-border bg-card p-4 shadow-xl"><p className="text-sm font-medium">Notifications</p><p className="mt-1 text-xs text-muted-foreground">You&apos;re all caught up.</p></div>}</div><div className="relative ml-2 border-l border-border pl-3"><button onClick={() => setOpenMenu(openMenu === 'account' ? null : 'account')} className="flex items-center gap-2 rounded-lg p-1 hover:bg-accent" aria-label="Open account menu" aria-expanded={openMenu === 'account'}><span className="flex size-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">{initials}</span><span className="hidden text-sm font-medium sm:block">{displayName}</span><ChevronDown size={14} className="text-muted-foreground" /></button>{openMenu === 'account' && <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-border bg-card p-1 shadow-xl"><Link href="/settings" onClick={() => setOpenMenu(null)} className="block rounded-md px-3 py-2 text-sm hover:bg-accent">Settings</Link><Link href="/" onClick={() => setOpenMenu(null)} className="block rounded-md px-3 py-2 text-sm hover:bg-accent">Back to home</Link></div>}</div></div>
          </header>

          <div className="mx-auto max-w-[1500px] px-5 py-8 md:px-8 lg:px-10">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><div className="mb-3 flex items-center gap-2 text-xs font-medium text-accent"><span className="size-1.5 rounded-full bg-accent" />WORKSPACE OVERVIEW</div><h1 className="font-serif text-4xl tracking-tight md:text-5xl">Make something <em className="text-primary not-italic">worth watching.</em></h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">A quiet place to turn loose ideas into full-length stories, scenes, and finished films.</p></div><button onClick={() => { setCreateError(''); setShowCreate(true) }} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/10 hover:opacity-90"><Plus size={17} />Create video</button></div>

            <div className="mt-10 grid gap-4 md:grid-cols-3"><div className="rounded-xl border border-border bg-card p-5"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Active productions</span><Activity size={16} className="text-accent" /></div><div className="mt-4 flex items-end gap-2"><span className="font-serif text-3xl">{projects.length}</span><span className="pb-1 text-xs text-muted-foreground">in your workspace</span></div></div><div className="rounded-xl border border-border bg-card p-5"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Production stages</span><Layers3 size={16} className="text-accent" /></div><div className="mt-4 flex items-end gap-2"><span className="font-serif text-3xl">7</span><span className="pb-1 text-xs text-muted-foreground">per project pipeline</span></div></div><div className="rounded-xl border border-border bg-card p-5"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Render queue</span><Clock3 size={16} className="text-accent" /></div><div className="mt-4 flex items-end gap-2"><span className="font-serif text-3xl">—</span><span className="pb-1 text-xs text-muted-foreground">starts with an export</span></div></div></div>

            <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-serif text-2xl">Recent projects</h2><p className="mt-1 text-sm text-muted-foreground">Pick up where you left off.</p></div><div className="flex items-center gap-2"><label className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects" className="w-32 bg-transparent outline-none placeholder:text-muted-foreground/60 sm:w-44" /></label><div className="relative"><button onClick={() => setOpenMenu(openMenu === 'sort' ? null : 'sort')} className="rounded-lg border border-border bg-card p-2 text-muted-foreground hover:bg-accent" aria-label="Open project actions" aria-expanded={openMenu === 'sort'}><MoreHorizontal size={18} /></button>{openMenu === 'sort' && <div className="absolute right-0 top-full z-30 mt-2 w-44 rounded-lg border border-border bg-card p-1 shadow-xl"><Link href="/templates" onClick={() => setOpenMenu(null)} className="block rounded-md px-3 py-2 text-sm hover:bg-accent">Browse templates</Link><button onClick={() => { setQuery(''); setOpenMenu(null) }} className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent">Clear search</button></div>}</div></div></div>

            {filteredProjects.length === 0 && <div className="mt-5 rounded-xl border border-dashed border-border bg-card p-10 text-center"><FolderKanban size={22} className="mx-auto text-muted-foreground" /><h3 className="mt-3 font-medium">{query ? 'No projects found' : 'Your studio is ready'}</h3><p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted-foreground">{query ? 'Try a different search term.' : 'Create your first production to begin shaping a story, storyboard, and final export.'}</p>{!query && <button onClick={() => { setCreateError(''); setShowCreate(true) }} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"><Plus size={15} />Create video</button>}</div>}
            <div className="mt-5 grid gap-5 xl:grid-cols-3">{filteredProjects.map((project) => <article key={project.id} className="group overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5"><div className="relative aspect-[16/10] overflow-hidden"><Image src={project.image} alt="" fill sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw" unoptimized className="object-cover transition duration-500 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-foreground/75 via-transparent to-transparent" /><div className="absolute bottom-3 left-3"><StatusBadge status={project.status} /></div><Link href={`/projects/${project.id}`} className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-background/80 text-foreground opacity-0 backdrop-blur transition group-hover:opacity-100" aria-label={`Open ${project.title}`}><ArrowUpRight size={16} /></Link></div><div className="p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-medium tracking-tight">{project.title}</h3><p className="mt-1 text-xs text-muted-foreground">{project.type}</p></div><div className="relative"><button onClick={() => setOpenMenu(openMenu === `project-${project.id}` ? null : `project-${project.id}`)} className="rounded-md p-1 text-muted-foreground hover:bg-accent" aria-label={`More actions for ${project.title}`} aria-expanded={openMenu === `project-${project.id}`}><MoreHorizontal size={16} /></button>{openMenu === `project-${project.id}` && <div className="absolute right-0 top-full z-30 mt-1 w-40 rounded-lg border border-border bg-card p-1 shadow-xl"><button onClick={() => { duplicateProject(project); setOpenMenu(null) }} className="block w-full rounded-md px-3 py-2 text-left text-xs hover:bg-accent">Duplicate project</button><button onClick={() => { deleteProject(project.id); setOpenMenu(null) }} className="block w-full rounded-md px-3 py-2 text-left text-xs text-destructive hover:bg-destructive/10">Delete project</button></div>}</div></div><div className="mt-5 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground"><span>{project.duration} · {project.scenes} scenes</span><span>{project.updated}</span></div><div className="mt-4 flex items-center gap-2"><Link href={`/projects/${project.id}`} className="flex-1 rounded-lg bg-primary px-3 py-2 text-center text-xs font-medium text-primary-foreground hover:opacity-90">Continue editing</Link><button onClick={() => duplicateProject(project)} className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-accent" aria-label={`Duplicate ${project.title}`}><Copy size={15} /></button><button onClick={() => deleteProject(project.id)} className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Delete ${project.title}`}><Trash2 size={15} /></button></div></div></article>)}</div>

            <section className="mt-12 rounded-2xl border border-border bg-card p-5 md:p-7"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><div className="flex items-center gap-2"><BookOpen size={17} className="text-accent" /><h2 className="font-serif text-xl">Start with a blueprint</h2></div><p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">Explore production-ready templates for stories, explainers, documentaries, and social cuts.</p></div><Link href="/templates" className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-accent">Browse templates <ArrowUpRight size={15} /></Link></div></section>
          </div>
        </section>
      </div>

      {showCreate && <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-5 backdrop-blur-sm"><div role="dialog" aria-modal="true" aria-labelledby="create-title" className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl"><div className="flex items-start justify-between"><div><h2 id="create-title" className="font-serif text-2xl">New production</h2><p className="mt-1 text-sm text-muted-foreground">Give your idea a working title. You can shape the story next.</p></div><button onClick={() => setShowCreate(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-accent" aria-label="Close dialog"><X size={18} /></button></div><label className="mt-6 block text-sm font-medium" htmlFor="project-title">Project title<input id="project-title" autoFocus value={newTitle} onChange={(event) => { setNewTitle(event.target.value); setCreateError('') }} onKeyDown={(event) => { if (event.key === 'Enter') createProject() }} placeholder="e.g. The Last Transmission" className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-3 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring" /></label>{createError && <p role="alert" className="mt-3 text-sm text-destructive">{createError}</p>}<div className="mt-6 flex justify-end gap-2"><button onClick={() => setShowCreate(false)} className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-accent">Cancel</button><button onClick={createProject} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"><Plus size={15} className="mr-2 inline" />Create project</button></div></div></div>}
      {saved && <div role="status" className="fixed bottom-5 right-5 flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm shadow-xl"><Check size={16} className="text-primary" />Project created and saved</div>}
    </main>
  )
}

function LegacyProjectWorkspace({ projectId }: { projectId: string }) {
  const [active, setActive] = useState('script')
  const tabs = ['script', 'characters', 'scenes', 'storyboard', 'timeline', 'audio', 'export']
  return <main className="min-h-screen bg-background text-foreground"><div className="border-b border-border px-5 py-4 md:px-8"><div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4"><div className="flex items-center gap-3"><Link href="/" className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><WandSparkles size={17} /></Link><div><p className="text-xs text-muted-foreground">Project workspace</p><h1 className="font-serif text-xl">{projectId.replaceAll('-', ' ')}</h1></div></div><div className="flex items-center gap-2"><span className="hidden text-xs text-primary sm:block">Saved just now</span><button className="rounded-lg border border-border p-2 hover:bg-accent" aria-label="Upload media"><Upload size={16} /></button><button className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"><Play size={15} className="mr-2 inline" />Preview</button></div></div></div><div className="mx-auto max-w-[1500px] px-5 py-6 md:px-8"><div className="flex gap-1 overflow-x-auto border-b border-border">{tabs.map((tab) => <button key={tab} onClick={() => setActive(tab)} className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm capitalize ${active === tab ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{tab}</button>)}</div><div className="grid gap-6 py-7 lg:grid-cols-[1.1fr_0.9fr]"><div className="min-h-[480px] rounded-2xl border border-border bg-card p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">{active} editor</p><h2 className="mt-2 font-serif text-3xl">Shape the next beat.</h2></div><button className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground"><Sparkles size={15} className="mr-2 inline" />Generate</button></div><div className="mt-8 rounded-xl border border-dashed border-border bg-background/50 p-8"><div className="mx-auto max-w-md text-center"><div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Sparkles size={20} /></div><h3 className="mt-4 font-medium">Your {active} is ready to take shape</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Edit manually or generate a first pass. Every change is saved to your project history.</p><button className="mt-5 rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-accent">Add first {active === 'script' ? 'story beat' : active.slice(0, -1)}</button></div></div></div><div className="flex flex-col gap-6"><div className="aspect-video overflow-hidden rounded-2xl border border-border bg-muted"><div className="flex size-full items-center justify-center bg-[radial-gradient(circle_at_70%_25%,oklch(0.55_0.12_230/.25),transparent_32%),linear-gradient(135deg,oklch(0.18_0.04_250),oklch(0.1_0.02_250))]"><div className="text-center"><Film size={28} className="mx-auto text-muted-foreground" /><p className="mt-3 text-sm text-muted-foreground">Preview canvas</p></div></div></div><div className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center justify-between"><h3 className="font-medium">Generation queue</h3><span className="rounded-full bg-accent/15 px-2 py-1 text-[11px] text-accent-foreground">Demo mode</span></div><div className="mt-5 flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-lg bg-accent/15 text-accent-foreground"><Activity size={16} /></div><div className="flex-1"><div className="flex justify-between text-xs"><span>Storyboard planning</span><span className="text-muted-foreground">Queued</span></div><div className="mt-2 h-1.5 rounded-full bg-muted"><div className="h-full w-1/3 rounded-full bg-accent" /></div></div></div></div></div></div></div></main>
}
