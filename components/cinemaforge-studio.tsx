'use client'

import { useState } from 'react'

const projects = [
  { title: 'The Last Signal', meta: 'Sci-fi · 08:42', status: 'In production', tone: 'violet' },
  { title: 'A House with No Doors', meta: 'Drama · 04:18', status: 'Draft', tone: 'amber' },
  { title: 'Neon Orchard', meta: 'Animation · 12:05', status: 'Ready to export', tone: 'blue' },
]

const frames = [
  ['01', 'EXT. SALT FLATS — DAWN', 'A lone figure crosses the white horizon.', 'violet'],
  ['02', 'THE SIGNAL', 'The radio wakes before the sun does.', 'amber'],
  ['03', 'INT. CONTROL ROOM — NIGHT', 'Every screen carries the same impossible image.', 'blue'],
  ['04', 'THE CROSSING', 'She steps into the frequency.', 'rose'],
]

export default function CinemaForgeStudio() {
  const [active, setActive] = useState('studio')
  const [wizardOpen, setWizardOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [projectTitle, setProjectTitle] = useState('')
  const [genre, setGenre] = useState('Science fiction')
  const [status, setStatus] = useState('Ready')

  function createProject() {
    setWizardOpen(true)
    setStep(1)
  }

  function advance() {
    if (step < 3) setStep(step + 1)
    else { setWizardOpen(false); setStatus('Planning story') }
  }

  return <div className="forge-shell">
    <aside className="forge-sidebar">
      <a className="forge-brand" href="#top"><span className="forge-mark">C</span><span>CINEMA<span>FORGE</span></span></a>
      <div className="workspace-label">Workspace <span>⌄</span></div>
      <nav className="forge-nav" aria-label="Studio navigation">
        {[['studio', '◈', 'Studio'], ['projects', '▦', 'Projects'], ['storyboard', '▤', 'Storyboard'], ['assets', '◇', 'Assets']].map(([id, icon, label]) => <button key={id} className={active === id ? 'active' : ''} onClick={() => setActive(id)} type="button"><span>{icon}</span>{label}{id === 'projects' && <b>3</b>}</button>)}
      </nav>
      <div className="sidebar-bottom"><button className="quiet-button" type="button">? <span>Help center</span></button><button className="profile-mini" type="button"><i>JW</i><span>Jordan Williams<small>Personal workspace</small></span><b>···</b></button></div>
    </aside>
    <main className="forge-main" id="top">
      <header className="forge-header"><div><p className="forge-kicker">{active === 'studio' ? 'Creative control room' : active}</p><h1>{active === 'studio' ? 'Good morning, Jordan.' : active[0].toUpperCase() + active.slice(1)}</h1></div><div className="header-actions"><button className="icon-button" type="button" aria-label="Notifications">◌</button><button className="forge-outline" type="button">Invite</button><button className="forge-primary" type="button" onClick={createProject}>+ New project</button></div></header>
      <section className="forge-hero"><div><span className="live-dot">●</span><span className="forge-kicker">Studio pulse · {status}</span><h2>Make something<br /><em>worth watching.</em></h2><p>Shape an idea into a living film. CinemaForge keeps your story, shots, and generation pipeline in one focused room.</p><button className="text-button" type="button" onClick={createProject}>Start a new film <span>↗</span></button></div><div className="signal-card"><div className="signal-top"><span>GENERATION QUEUE</span><span className="queue-count">02 active</span></div><div className="waveform">{Array.from({ length: 34 }).map((_, i) => <i key={i} style={{ height: `${18 + ((i * 17) % 62)}%` }} />)}</div><div className="signal-foot"><span>Story engine</span><strong>Building atmosphere...</strong></div></div></section>
      <section className="section-block"><div className="section-head"><div><p className="forge-kicker">Your slate</p><h3>Recent projects</h3></div><button className="view-all" type="button" onClick={() => setActive('projects')}>View all ↗</button></div><div className="project-grid">{projects.map((project) => <article className="project-card" key={project.title}><div className={`project-cover ${project.tone}`}><span>CF / {project.title.slice(0, 2).toUpperCase()}</span><strong>{project.title}</strong><small>⌁</small></div><div className="project-info"><div><h4>{project.title}</h4><p>{project.meta}</p></div><span className={`project-status ${project.status === 'In production' ? 'working' : ''}`}>{project.status}</span></div></article>)}</div></section>
      <section className="section-block storyboard-preview"><div className="section-head"><div><p className="forge-kicker">The Last Signal · scene 01</p><h3>Storyboard</h3></div><button className="view-all" type="button" onClick={() => setActive('storyboard')}>Open board ↗</button></div><div className="frame-track">{frames.map(([number, title, copy, tone]) => <article className="frame-card" key={number}><div className={`frame-image ${tone}`}><span>{number}</span><i>✦</i></div><p>{title}</p><small>{copy}</small></article>)}</div></section>
      <footer className="forge-footer"><span>CINEMAFORGE / PRIVATE BETA</span><span>Provider interfaces online · 4 services ready</span></footer>
    </main>
    {wizardOpen && <div className="wizard-backdrop" role="dialog" aria-modal="true"><div className="wizard"><button className="wizard-close" onClick={() => setWizardOpen(false)} type="button">×</button><p className="forge-kicker">New production · 0{step} / 03</p><h2>{step === 1 ? 'Name the feeling.' : step === 2 ? 'Set the visual language.' : 'Ready to forge.'}</h2>{step === 1 && <><p className="wizard-copy">Start with the smallest spark. You can shape the story later.</p><label>Project title<input autoFocus value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} placeholder="Untitled film" /></label></>}{step === 2 && <><p className="wizard-copy">Choose a starting point for your story engine.</p><label>Genre<select value={genre} onChange={(e) => setGenre(e.target.value)}><option>Science fiction</option><option>Drama</option><option>Documentary</option><option>Animation</option></select></label><div className="style-options"><button className="selected" type="button">Atmospheric</button><button type="button">Naturalistic</button><button type="button">Surreal</button></div></>}{step === 3 && <div className="ready-card"><span>✦</span><p>{projectTitle || 'Untitled film'}</p><small>{genre} · Story engine ready</small></div>}<button className="forge-primary wizard-next" onClick={advance} type="button">{step === 3 ? 'Create project' : 'Continue'} <span>↗</span></button></div></div>}
  </div>
}
