'use client'

import { FormEvent, useEffect, useState } from 'react'

const starterProjects = [
  { title: 'The Last Signal', meta: 'Sci-fi · 08:42', status: 'In production', tone: 'violet' },
  { title: 'A House with No Doors', meta: 'Drama · 04:18', status: 'Draft', tone: 'amber' },
  { title: 'Neon Orchard', meta: 'Animation · 12:05', status: 'Ready to export', tone: 'blue' },
]
const frames = [['01', 'EXT. SALT FLATS — DAWN', 'A lone figure crosses the white horizon.', 'violet'], ['02', 'THE SIGNAL', 'The radio wakes before the sun does.', 'amber'], ['03', 'INT. CONTROL ROOM — NIGHT', 'Every screen carries the same impossible image.', 'blue'], ['04', 'THE CROSSING', 'She steps into the frequency.', 'rose']]

type Project = { title: string; meta: string; status: string; tone: string }
type StudioUser = { name?: string | null; email?: string | null; image?: string | null }

export default function CinemaForgeStudio({ user }: { user?: StudioUser | null }) {
  const displayName = user?.name?.trim() || user?.email?.split('@')[0] || 'Creator'
  const initials = displayName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'CF'
  const [active, setActive] = useState('studio')
  const [wizardOpen, setWizardOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [projectTitle, setProjectTitle] = useState('')
  const [genre, setGenre] = useState('Science fiction')
  const [style, setStyle] = useState('Atmospheric')
  const [status, setStatus] = useState('Ready')
  const [projects, setProjects] = useState<Project[]>(starterProjects)
  const [message, setMessage] = useState('')
  const [selectedFrame, setSelectedFrame] = useState('01')

  useEffect(() => {
    fetch('/api/projects').then((response) => response.ok ? response.json() : null).then((data) => {
      if (data?.projects) setProjects(data.projects.map((item: { title: string; genre: string; status: string; visualStyle?: string }) => ({ title: item.title, meta: `${item.genre} · ${item.visualStyle ?? 'Atmospheric'}`, status: item.status, tone: 'violet' })))
    }).catch(() => setMessage('Demo mode: sign in to sync projects.'))
  }, [])

  function createProject() { setWizardOpen(true); setStep(1); setMessage('') }
  function closeWizard() { setWizardOpen(false); setStep(1) }
  async function advance(event: FormEvent) {
    event.preventDefault()
    if (step < 3) { setStep(step + 1); return }
    const title = projectTitle.trim() || 'Untitled film'
    const next = { title, meta: `${genre} · New`, status: 'Planning story', tone: 'violet' }
    setProjects((current) => [next, ...current])
    setStatus('Planning story')
    closeWizard()
    setActive('projects')
    const response = await fetch('/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title, genre, visualStyle: style }) }).catch(() => null)
    if (!response?.ok) setMessage('Project created locally. Sign in to persist it across devices.')
  }

  return <div className="forge-shell">
    <aside className="forge-sidebar"><a className="forge-brand" href="#top"><span className="forge-mark">C</span><span>CINEMA<span>FORGE</span></span></a><div className="workspace-label">Workspace <span>⌄</span></div><nav className="forge-nav" aria-label="Studio navigation">{[['studio', '◈', 'Studio'], ['projects', '▦', 'Projects'], ['storyboard', '▤', 'Storyboard'], ['assets', '◇', 'Assets']].map(([id, icon, label]) => <button key={id} className={active === id ? 'active' : ''} onClick={() => setActive(id)} type="button"><span>{icon}</span>{label}{id === 'projects' && <b>{projects.length}</b>}</button>)}</nav><div className="sidebar-bottom"><button className="quiet-button" type="button" onClick={() => setMessage('Help center is ready. Start a project or open a storyboard to continue.')}>? <span>Help center</span></button><button className="profile-mini" type="button" onClick={() => setMessage('Personal workspace · sign in to connect your account')}><i>{initials}</i><span>{displayName}<small>{user?.email || 'Personal workspace'}</small></span><b>···</b></button></div></aside>
    <main className="forge-main" id="top"><header className="forge-header"><div><p className="forge-kicker">{active === 'studio' ? 'Creative control room' : active}</p><h1>{active === 'studio' ? `Good morning, ${displayName}.` : active[0].toUpperCase() + active.slice(1)}</h1></div><div className="header-actions"><button className="icon-button" type="button" aria-label="Notifications" onClick={() => setMessage('No new production alerts.')}>◌</button><button className="forge-outline" type="button" onClick={() => setMessage('Invite links are available after sign in.')}>Invite</button><button className="forge-primary" type="button" onClick={createProject}>+ New project</button></div></header>
      {message && <div className="forge-toast" role="status">{message}<button type="button" onClick={() => setMessage('')}>×</button></div>}
      {active === 'studio' && <><section className="forge-hero"><div><span className="live-dot">●</span><span className="forge-kicker">Studio pulse · {status}</span><h2>Make something<br /><em>worth watching.</em></h2><p>Shape an idea into a living film. CinemaForge keeps your story, shots, and generation pipeline in one focused room.</p><button className="text-button" type="button" onClick={createProject}>Start a new film <span>↗</span></button></div><div className="signal-card"><div className="signal-top"><span>GENERATION QUEUE</span><span className="queue-count">02 active</span></div><div className="waveform">{Array.from({ length: 34 }).map((_, i) => <i key={i} style={{ height: `${18 + ((i * 17) % 62)}%` }} />)}</div><div className="signal-foot"><span>Story engine</span><strong>Building atmosphere...</strong></div></div></section><section className="section-block"><div className="section-head"><div><p className="forge-kicker">Your slate</p><h3>Recent projects</h3></div><button className="view-all" type="button" onClick={() => setActive('projects')}>View all ↗</button></div><div className="project-grid">{projects.slice(0, 3).map((project) => <article className="project-card" key={`${project.title}-${project.meta}`}><div className={`project-cover ${project.tone}`}><span>CF / {project.title.slice(0, 2).toUpperCase()}</span><strong>{project.title}</strong><small>⌁</small></div><div className="project-info"><div><h4>{project.title}</h4><p>{project.meta}</p></div><span className={`project-status ${project.status === 'In production' ? 'working' : ''}`}>{project.status}</span></div></article>)}</div></section></>}
      {active === 'projects' && <section className="section-block page-panel"><div className="section-head"><div><p className="forge-kicker">Your slate</p><h3>All projects</h3></div><button className="forge-primary" type="button" onClick={createProject}>+ New project</button></div><div className="project-grid">{projects.map((project) => <article className="project-card" key={`${project.title}-${project.meta}`}><div className={`project-cover ${project.tone}`}><span>CF / {project.title.slice(0, 2).toUpperCase()}</span><strong>{project.title}</strong></div><div className="project-info"><div><h4>{project.title}</h4><p>{project.meta}</p></div><span className="project-status">{project.status}</span></div></article>)}</div></section>}
      {active === 'storyboard' && <section className="section-block page-panel"><div className="section-head"><div><p className="forge-kicker">The Last Signal · scene 01</p><h3>Storyboard</h3></div><span className="forge-kicker">Selected frame {selectedFrame}</span></div><div className="frame-track">{frames.map(([number, title, copy, tone]) => <button className={`frame-card ${selectedFrame === number ? 'selected-frame' : ''}`} key={number} onClick={() => setSelectedFrame(number)} type="button"><div className={`frame-image ${tone}`}><span>{number}</span><i>✦</i></div><p>{title}</p><small>{copy}</small></button>)}</div></section>}
      {active === 'assets' && <section className="section-block page-panel empty-panel"><p className="forge-kicker">Production library</p><h3>Assets are waiting for a story.</h3><p>Generated images, voices, music, and reference files will collect here as your production grows.</p><button className="text-button" type="button" onClick={createProject}>Create a film ↗</button></section>}
      <footer className="forge-footer"><span>CINEMAFORGE / PRIVATE BETA</span><span>Provider interfaces online · 4 services ready</span></footer></main>
    {wizardOpen && <div className="wizard-backdrop" role="dialog" aria-modal="true" aria-labelledby="wizard-title"><form className="wizard" onSubmit={advance}><button className="wizard-close" onClick={closeWizard} type="button" aria-label="Close">×</button><p className="forge-kicker">New production · 0{step} / 03</p><h2 id="wizard-title">{step === 1 ? 'Name the feeling.' : step === 2 ? 'Set the visual language.' : 'Ready to forge.'}</h2>{step === 1 && <><p className="wizard-copy">Start with the smallest spark. You can shape the story later.</p><label>Project title<input autoFocus value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} placeholder="Untitled film" /></label></>}{step === 2 && <><p className="wizard-copy">Choose a starting point for your story engine.</p><label>Genre<select value={genre} onChange={(e) => setGenre(e.target.value)}><option>Science fiction</option><option>Drama</option><option>Documentary</option><option>Animation</option></select></label><div className="style-options">{['Atmospheric', 'Naturalistic', 'Surreal'].map((option) => <button className={style === option ? 'selected' : ''} onClick={() => setStyle(option)} type="button" key={option}>{option}</button>)}</div></>}{step === 3 && <div className="ready-card"><span>✦</span><p>{projectTitle || 'Untitled film'}</p><small>{genre} · {style} · Story engine ready</small></div>}<button className="forge-primary wizard-next" type="submit">{step === 3 ? 'Create project' : 'Continue'} <span>↗</span></button></form></div>}
  </div>
}
