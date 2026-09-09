import Link from 'next/link'
import { ArrowLeft, ArrowUpRight, BookOpen, Clapperboard, FileText, Megaphone } from 'lucide-react'

const templates = [
  { title: 'The three-act story', type: 'Narrative', icon: BookOpen, description: 'A flexible long-form structure for tension, transformation, and payoff.' },
  { title: 'Field notes', type: 'Documentary', icon: FileText, description: 'Build a thoughtful documentary from interviews, scenes, and source material.' },
  { title: 'Launch film', type: 'Advertisement', icon: Megaphone, description: 'A focused product story with a clean hook, proof, and memorable close.' },
  { title: 'Scene study', type: 'Short story', icon: Clapperboard, description: 'Start small with a single location, a point of view, and a turn.' },
]

export default function TemplatesPage() {
  return <main className="min-h-screen bg-background px-5 py-8 text-foreground md:px-10"><div className="mx-auto max-w-6xl"><Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={16} />Back to studio</Link><div className="mt-16 max-w-2xl"><p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">Blueprint library</p><h1 className="mt-3 font-serif text-5xl tracking-tight">Begin with a shape.</h1><p className="mt-4 text-sm leading-6 text-muted-foreground">Templates give your first draft a rhythm. Everything stays editable once you enter the studio.</p></div><div className="mt-12 grid gap-5 md:grid-cols-2">{templates.map((template) => <Link key={template.title} href="/projects/new" className="group rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-0.5 hover:border-primary/40"><div className="flex items-start justify-between"><span className="flex size-11 items-center justify-center rounded-xl bg-accent/15 text-accent-foreground"><template.icon size={20} /></span><ArrowUpRight size={18} className="text-muted-foreground transition group-hover:text-foreground" /></div><p className="mt-10 text-xs text-muted-foreground">{template.type}</p><h2 className="mt-2 font-serif text-2xl">{template.title}</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{template.description}</p></Link>)}</div></div></main>
}
