'use client'

import { useMemo, useState } from 'react'

type Section = 'Overview' | 'Characters' | 'Storyboard' | 'Screenplay'
type Character = { id: number; name: string; role: string; status: string; bio: string; tone: string }
type BoardScene = { id: number; number: string; title: string; location: string; shot: string; status: string; color: string }
type ScriptScene = { id: number; heading: string; body: string; note: string }

const initialCharacters: Character[] = [
  { id: 1, name: 'Mara Voss', role: 'Lead · 34', status: 'Locked', bio: 'A forensic cartographer who can read cities like living maps.', tone: 'rose' },
  { id: 2, name: 'Elias Reed', role: 'Supporting · 41', status: 'Casting', bio: 'A disgraced architect with one last impossible blueprint.', tone: 'blue' },
  { id: 3, name: 'June Voss', role: 'Supporting · 16', status: 'Locked', bio: 'Mara’s younger sister. Observant, restless, and always recording.', tone: 'gold' },
]
const initialBoard: BoardScene[] = [
  { id: 1, number: '01', title: 'The missing street', location: 'EXT. OLD TOWN — NIGHT', shot: 'Wide establishing', status: 'Ready', color: 'navy' },
  { id: 2, number: '02', title: 'A line in the glass', location: 'INT. VOSS STUDIO — NIGHT', shot: 'Over the shoulder', status: 'In review', color: 'coral' },
  { id: 3, number: '03', title: 'Northbound', location: 'INT. NIGHT TRAIN — DAWN', shot: 'Tracking shot', status: 'Draft', color: 'sage' },
]
const initialScript: ScriptScene[] = [
  { id: 1, heading: 'EXT. OLD TOWN — NIGHT', body: 'Rain needles the empty street. MARA VOSS, 34, stands beneath a dead streetlamp with a paper map spread across her palms.\n\nThe map is wrong. A whole block has disappeared.', note: 'Hold on Mara before the title card.' },
  { id: 2, heading: 'INT. VOSS STUDIO — NIGHT', body: 'The studio hums with monitors and half-built models. Elias enters carrying a glass plate wrapped in a coat.', note: 'Elias should feel like an interruption.' },
  { id: 3, heading: 'INT. NIGHT TRAIN — DAWN', body: 'June films the passing city through a scratched window. In the reflection, a street moves backward.', note: 'Sound design: rails into a low pulse.' },
]

function Icon({ type }: { type: string }) { return <span className={`icon icon-${type}`} aria-hidden="true">{type === 'overview' ? '◈' : type === 'characters' ? '◉' : type === 'storyboard' ? '▦' : '▤'}</span> }
function Badge({ children, tone = 'muted' }: { children: React.ReactNode; tone?: string }) { return <span className={`badge badge-${tone}`}>{children}</span> }

export default function Home() {
  const [active, setActive] = useState<Section>('Overview')
  const [characters, setCharacters] = useState(initialCharacters)
  const [board, setBoard] = useState(initialBoard)
  const [script, setScript] = useState(initialScript)
  const [selectedScript, setSelectedScript] = useState(1)
  const [showCharacterForm, setShowCharacterForm] = useState(false)
  const [showSceneForm, setShowSceneForm] = useState(false)
  const [toast, setToast] = useState('')

  const activeScript = script.find((scene) => scene.id === selectedScript) ?? script[0]
  const lockedCount = characters.filter((character) => character.status === 'Locked').length
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2400) }
  const completion = useMemo(() => Math.round((lockedCount / Math.max(characters.length, 1)) * 100), [characters.length, lockedCount])

  function addCharacter(form: FormData) {
    const name = String(form.get('name') || '').trim()
    const role = String(form.get('role') || '').trim()
    if (!name || !role) return
    setCharacters((items) => [...items, { id: Date.now(), name, role, status: 'Casting', bio: 'New character profile ready for development.', tone: 'purple' }])
    setShowCharacterForm(false); notify('Character added to the cast')
  }
  function addScene(form: FormData) {
    const title = String(form.get('title') || '').trim()
    const location = String(form.get('location') || '').trim()
    if (!title || !location) return
    setBoard((items) => [...items, { id: Date.now(), number: String(items.length + 1).padStart(2, '0'), title, location, shot: 'To be defined', status: 'Draft', color: 'purple' }])
    setShowSceneForm(false); notify('Scene added to storyboard')
  }
  function updateScript(value: string) {
    setScript((items) => items.map((scene) => scene.id === activeScript.id ? { ...scene, body: value } : scene))
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">M</span><div><strong>MONUMENT</strong><span>production workspace</span></div></div>
        <div className="project-select"><span className="project-dot" /><div><small>ACTIVE PROJECT</small><strong>After the Rain</strong></div><span className="chevron">⌄</span></div>
        <nav aria-label="Main navigation">
          <p className="nav-label">Workspace</p>
          {(['Overview', 'Characters', 'Storyboard', 'Screenplay'] as Section[]).map((item) => <button key={item} className={`nav-item ${active === item ? 'is-active' : ''}`} onClick={() => setActive(item)}><Icon type={item.toLowerCase()} /><span>{item}</span>{item === 'Screenplay' && <span className="nav-count">3</span>}</button>)}
        </nav>
        <div className="sidebar-bottom"><div className="completion"><div className="completion-row"><span>Project completion</span><strong>{completion}%</strong></div><div className="progress"><span style={{ width: `${completion}%` }} /></div></div><button className="profile"><span className="avatar avatar-small">AT</span><span><strong>Alex Turner</strong><small>Director</small></span><span className="more">•••</span></button></div>
      </aside>

      <section className="main-area">
        <header className="topbar"><div className="breadcrumbs"><span>Projects</span><b>/</b><strong>After the Rain</strong></div><div className="top-actions"><span className="live-dot" /> <span className="saved">All changes saved</span><button className="icon-button" aria-label="Search">⌕</button><button className="share-button" onClick={() => notify('Share link copied to clipboard')}>Share project <span>↗</span></button></div></header>
        <div className="content">
          <div className="page-heading"><div><p className="eyebrow">Feature film · v0.8</p><h1>{active}</h1><p className="heading-copy">{active === 'Overview' ? 'Your production at a glance. Keep the vision moving forward.' : active === 'Characters' ? 'Build the people who make this story matter.' : active === 'Storyboard' ? 'Shape every beat before the cameras roll.' : 'Turn the outline into a living, breathing film.'}</p></div><div className="heading-actions"><button className="outline-button" onClick={() => notify('Preview mode opened')}>Preview <span>▷</span></button>{active === 'Characters' && <button className="primary-button" onClick={() => setShowCharacterForm(true)}>+ New character</button>}{active === 'Storyboard' && <button className="primary-button" onClick={() => setShowSceneForm(true)}>+ Add scene</button>}{active === 'Screenplay' && <button className="primary-button" onClick={() => notify('Screenplay exported')}>Export screenplay <span>↓</span></button>}</div></div>

          {active === 'Overview' && <Overview characters={characters} board={board} script={script} setActive={setActive} />}
          {active === 'Characters' && <Characters characters={characters} onDelete={(id) => { setCharacters((items) => items.filter((item) => item.id !== id)); notify('Character removed') }} showForm={showCharacterForm} setShowForm={setShowCharacterForm} addCharacter={addCharacter} />}
          {active === 'Storyboard' && <Storyboard board={board} onDelete={(id) => { setBoard((items) => items.filter((item) => item.id !== id)); notify('Scene removed') }} showForm={showSceneForm} setShowForm={setShowSceneForm} addScene={addScene} />}
          {active === 'Screenplay' && <Screenplay script={script} activeScript={activeScript} selected={selectedScript} setSelected={setSelectedScript} updateScript={updateScript} />}
        </div>
      </section>
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  )
}

function Overview({ characters, board, script, setActive }: { characters: Character[]; board: BoardScene[]; script: ScriptScene[]; setActive: (section: Section) => void }) {
  return <div className="overview"><div className="stats-grid"><button className="stat-card" onClick={() => setActive('Characters')}><span className="stat-icon rose-bg">◉</span><span><small>CHARACTERS</small><strong>{characters.length}</strong><em>{characters.filter((c) => c.status === 'Locked').length} locked</em></span><b>→</b></button><button className="stat-card" onClick={() => setActive('Storyboard')}><span className="stat-icon blue-bg">▦</span><span><small>STORYBOARD</small><strong>{board.length}</strong><em>scenes mapped</em></span><b>→</b></button><button className="stat-card" onClick={() => setActive('Screenplay')}><span className="stat-icon gold-bg">▤</span><span><small>SCREENPLAY</small><strong>{script.length}</strong><em>scenes drafted</em></span><b>→</b></button></div><div className="overview-grid"><section className="panel activity-panel"><div className="panel-header"><div><p className="eyebrow">Production pulse</p><h2>Recent activity</h2></div><button className="text-button">View all →</button></div><div className="activity-list"><Activity avatar="AT" title="Alex updated the screenplay" detail="Scene 02 · 12 minutes ago" tone="ink" /><Activity avatar="JM" title="Jamie locked a character" detail="Mara Voss · 42 minutes ago" tone="coral" /><Activity avatar="AT" title="Alex added a storyboard frame" detail="Scene 03 · 2 hours ago" tone="sage" /></div></section><section className="panel next-panel"><div className="panel-header"><div><p className="eyebrow">Keep moving</p><h2>Next up</h2></div><span className="step-chip">This week</span></div><div className="next-task"><span className="check">✓</span><div><strong>Lock supporting cast</strong><small>2 characters waiting for review</small></div><button onClick={() => setActive('Characters')}>Open →</button></div><div className="next-task"><span className="check empty"> </span><div><strong>Review Scene 02</strong><small>Storyboard needs approval</small></div><button onClick={() => setActive('Storyboard')}>Open →</button></div></section></div></div>
}
function Activity({ avatar, title, detail, tone }: { avatar: string; title: string; detail: string; tone: string }) { return <div className="activity"><span className={`avatar avatar-${tone}`}>{avatar}</span><div><strong>{title}</strong><small>{detail}</small></div><span className="activity-arrow">↗</span></div> }

function Characters({ characters, onDelete, showForm, setShowForm, addCharacter }: { characters: Character[]; onDelete: (id: number) => void; showForm: boolean; setShowForm: (show: boolean) => void; addCharacter: (form: FormData) => void }) { return <div className="section-stack"><div className="section-intro"><span>{characters.length} profiles</span><span className="filter">All characters⌄</span></div><div className="character-grid">{characters.map((character) => <article className="character-card" key={character.id}><div className={`character-art art-${character.tone}`}><span>{character.name.split(' ').map((part) => part[0]).join('')}</span><Badge tone={character.status === 'Locked' ? 'green' : 'orange'}>{character.status}</Badge></div><div className="card-content"><div className="card-title"><div><h3>{character.name}</h3><p>{character.role}</p></div><button className="more-button" aria-label={`Options for ${character.name}`} onClick={() => onDelete(character.id)}>•••</button></div><p className="bio">{character.bio}</p><button className="edit-link">Edit profile <span>↗</span></button></div></article>)}</div>{showForm && <Modal title="New character" close={() => setShowForm(false)}><form action={addCharacter} className="form"><label>Name<input name="name" placeholder="e.g. Mara Voss" required /></label><label>Role<input name="role" placeholder="e.g. Lead · 34" required /></label><div className="modal-actions"><button type="button" className="outline-button" onClick={() => setShowForm(false)}>Cancel</button><button className="primary-button">Add character</button></div></form></Modal>}</div> }

function Storyboard({ board, onDelete, showForm, setShowForm, addScene }: { board: BoardScene[]; onDelete: (id: number) => void; showForm: boolean; setShowForm: (show: boolean) => void; addScene: (form: FormData) => void }) { return <div className="section-stack"><div className="section-intro"><span>{board.length} scenes · Act I</span><span className="filter">Sort: Scene order⌄</span></div><div className="board-list">{board.map((scene) => <article className="board-card" key={scene.id}><div className={`board-thumb thumb-${scene.color}`}><span>{scene.number}</span><i>▧</i></div><div className="board-info"><div className="card-title"><div><h3>{scene.title}</h3><p>{scene.location}</p></div><button className="more-button" aria-label={`Delete ${scene.title}`} onClick={() => onDelete(scene.id)}>•••</button></div><div className="board-meta"><Badge tone={scene.status === 'Ready' ? 'green' : scene.status === 'In review' ? 'orange' : 'muted'}>{scene.status}</Badge><span>{scene.shot}</span></div></div><button className="frame-button">View frames <span>→</span></button></article>)}</div>{showForm && <Modal title="Add storyboard scene" close={() => setShowForm(false)}><form action={addScene} className="form"><label>Scene title<input name="title" placeholder="e.g. The crossing" required /></label><label>Location<input name="location" placeholder="e.g. EXT. HARBOR — DAY" required /></label><div className="modal-actions"><button type="button" className="outline-button" onClick={() => setShowForm(false)}>Cancel</button><button className="primary-button">Add scene</button></div></form></Modal>}</div> }

function Screenplay({ script, activeScript, selected, setSelected, updateScript }: { script: ScriptScene[]; activeScript: ScriptScene; selected: number; setSelected: (id: number) => void; updateScript: (value: string) => void }) { return <div className="screenplay-layout"><aside className="scene-list"><div className="scene-list-heading"><p className="eyebrow">Scenes</p><span>{script.length}</span></div>{script.map((scene) => <button key={scene.id} className={`scene-list-item ${selected === scene.id ? 'selected' : ''}`} onClick={() => setSelected(scene.id)}><span>{String(scene.id).padStart(2, '0')}</span><strong>{scene.heading}</strong><small>{scene.body.slice(0, 48)}…</small></button>)}</aside><section className="editor"><div className="editor-toolbar"><span>Scene {String(activeScript.id).padStart(2, '0')} <b>·</b> Draft</span><div><button aria-label="Bold">B</button><button aria-label="Italic"><i>I</i></button><button aria-label="Align">≡</button></div></div><div className="script-paper"><p className="script-heading">{activeScript.heading}</p><textarea value={activeScript.body} onChange={(event) => updateScript(event.target.value)} aria-label="Screenplay scene text" /><div className="script-note"><span>Director&apos;s note</span><p>{activeScript.note}</p></div></div></section></div> }
function Modal({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) { return <div className="modal-backdrop" role="presentation"><div className="modal" role="dialog" aria-modal="true" aria-label={title}><div className="modal-heading"><h2>{title}</h2><button onClick={close} aria-label="Close">×</button></div>{children}</div></div> }
