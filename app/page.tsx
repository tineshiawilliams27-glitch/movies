'use client'

import { useMemo, useState } from 'react'

type Movie = { id: number; title: string; year: number; genre: string; rating: number; image: string }

const movies: Movie[] = [
  { id: 1, title: 'Past Lives', year: 2023, genre: 'Drama', rating: 4.8, image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=700&q=85' },
  { id: 2, title: 'The Creator', year: 2023, genre: 'Sci-Fi', rating: 4.5, image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=700&q=85' },
  { id: 3, title: 'Anatomy of a Fall', year: 2023, genre: 'Thriller', rating: 4.7, image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=700&q=85' },
  { id: 4, title: 'The Holdovers', year: 2023, genre: 'Drama', rating: 4.6, image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=700&q=85' },
  { id: 5, title: 'Dune: Part Two', year: 2024, genre: 'Sci-Fi', rating: 4.9, image: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=700&q=85' },
  { id: 6, title: 'Saltburn', year: 2023, genre: 'Thriller', rating: 4.2, image: 'https://images.unsplash.com/photo-1543536448-d209d2d13a1c?auto=format&fit=crop&w=700&q=85' },
  { id: 7, title: 'The Zone of Interest', year: 2023, genre: 'Drama', rating: 4.4, image: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=700&q=85' },
  { id: 8, title: 'Poor Things', year: 2023, genre: 'Drama', rating: 4.6, image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=700&q=85' },
]

function MovieCard({ movie, saved, onToggle, onRate }: { movie: Movie; saved: boolean; onToggle: () => void; onRate: () => void }) {
  return <article className="movie-card"><div className="movie-image"><img src={movie.image} alt={`Poster artwork for ${movie.title}`} loading="lazy" /><button className={`bookmark ${saved ? 'saved' : ''}`} type="button" aria-label={`${saved ? 'Remove' : 'Add'} ${movie.title} ${saved ? 'from' : 'to'} watchlist`} aria-pressed={saved} onClick={onToggle}>{saved ? '▣' : '▱'}</button></div><div className="movie-info"><div className="movie-title"><span>{movie.title}</span></div><div className="movie-meta"><span>{movie.year} · {movie.genre}</span><button className="rating-button" type="button" aria-label={`Rate ${movie.title}`} onClick={onRate}>★ <span>{movie.rating}</span></button></div></div></article>
}

export default function Home() {
  const [filter, setFilter] = useState('All')
  const [query, setQuery] = useState('')
  const [saved, setSaved] = useState<number[]>([])
  const [toast, setToast] = useState('')
  const visible = useMemo(() => movies.filter((movie) => (filter === 'All' || movie.genre === filter) && movie.title.toLowerCase().includes(query.toLowerCase())), [filter, query])
  const toggleSaved = (movie: Movie) => { const isSaved = saved.includes(movie.id); setSaved((current) => isSaved ? current.filter((id) => id !== movie.id) : [...current, movie.id]); setToast(`${movie.title} ${isSaved ? 'removed from' : 'saved to'} your shelf.`); window.setTimeout(() => setToast(''), 2400) }

  return <><header className="site-header"><a className="brand" href="#top" aria-label="Framewise home"><span className="brand-mark">F</span><span>framewise</span></a><nav className="main-nav" aria-label="Primary navigation"><a className="active" href="#discover">Discover</a><a href="#watchlist">My watchlist <span>{saved.length}</span></a></nav><div className="auth-actions"><a className="auth-link" href="/sign-in">Sign in</a><a className="auth-cta" href="/sign-up">Join framewise</a></div></header><main id="top"><section className="hero" id="discover"><div className="hero-copy"><p className="eyebrow">Your next great watch</p><h1>Stories worth<br /><em>staying for.</em></h1><p className="hero-text">Find films that linger long after the credits. Save your favorites, rate what you watch, and build a shelf of your own.</p><a className="hero-link" href="#catalog">Explore the collection <span aria-hidden="true">↘</span></a></div><div className="hero-poster"><img src="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=85" alt="Rows of red theater seats" /><div className="poster-caption"><span>01 / FEATURED</span><strong>Enter the world<br />of cinema.</strong></div></div></section><section className="toolbar" aria-label="Movie filters"><div className="section-heading"><p className="eyebrow">Curated for you</p><h2 id="catalog">The collection</h2></div><div className="controls"><label className="search-box"><span aria-hidden="true">⌕</span><input type="search" placeholder="Search titles..." aria-label="Search movies" value={query} onChange={(event) => setQuery(event.target.value)} /></label><div className="filter-tabs" role="tablist" aria-label="Movie genres">{['All', 'Drama', 'Sci-Fi', 'Thriller'].map((item) => <button key={item} className={`filter-tab ${filter === item ? 'active' : ''}`} type="button" role="tab" aria-selected={filter === item} onClick={() => setFilter(item)}>{item}</button>)}</div></div></section><section className="movie-grid" aria-live="polite">{visible.map((movie) => <MovieCard key={movie.id} movie={movie} saved={saved.includes(movie.id)} onToggle={() => toggleSaved(movie)} onRate={() => setToast('Ratings are coming soon.')} />)}</section>{visible.length === 0 && <p className="empty-state">No films match that search. Try another title or genre.</p>}<section className="watchlist-section" id="watchlist"><div><p className="eyebrow">Your personal shelf</p><h2>My watchlist <span>{saved.length}</span></h2></div><p className="watchlist-hint">Tap the bookmark on any film to save it here.</p></section><section className="watchlist-grid" aria-live="polite">{movies.filter((movie) => saved.includes(movie.id)).map((movie) => <MovieCard key={movie.id} movie={movie} saved onToggle={() => toggleSaved(movie)} onRate={() => setToast('Ratings are coming soon.')} />)}</section></main><div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">{toast}</div></>
}
