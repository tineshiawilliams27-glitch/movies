const movies = [
  { id: 1, title: 'Past Lives', year: 2023, genre: 'Drama', rating: 4.8, image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=700&q=85' },
  { id: 2, title: 'The Creator', year: 2023, genre: 'Sci-Fi', rating: 4.5, image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=700&q=85' },
  { id: 3, title: 'Anatomy of a Fall', year: 2023, genre: 'Thriller', rating: 4.7, image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=700&q=85' },
  { id: 4, title: 'The Holdovers', year: 2023, genre: 'Drama', rating: 4.6, image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=700&q=85' },
  { id: 5, title: 'Dune: Part Two', year: 2024, genre: 'Sci-Fi', rating: 4.9, image: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=700&q=85' },
  { id: 6, title: 'Saltburn', year: 2023, genre: 'Thriller', rating: 4.2, image: 'https://images.unsplash.com/photo-1543536448-d209d2d13a1c?auto=format&fit=crop&w=700&q=85' },
  { id: 7, title: 'The Zone of Interest', year: 2023, genre: 'Drama', rating: 4.4, image: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=700&q=85' },
  { id: 8, title: 'Poor Things', year: 2023, genre: 'Drama', rating: 4.6, image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=700&q=85' },
];

let activeFilter = 'All';
let query = '';
let saved = new Set(JSON.parse(sessionStorage.getItem('framewise-watchlist') || '[]'));
const grid = document.querySelector('#movie-grid');
const watchlistGrid = document.querySelector('#watchlist-grid');
const emptyState = document.querySelector('#empty-state');
const toast = document.querySelector('#toast');

function visibleMovies() {
  return movies.filter((movie) => {
    const matchesFilter = activeFilter === 'All' || movie.genre === activeFilter;
    const matchesQuery = movie.title.toLowerCase().includes(query.toLowerCase());
    return matchesFilter && matchesQuery;
  });
}

function card(movie) {
  const isSaved = saved.has(movie.id);
  return `<article class="movie-card" data-id="${movie.id}">
    <div class="movie-image"><img src="${movie.image}" alt="Poster artwork for ${movie.title}" loading="lazy" />
      <button class="bookmark ${isSaved ? 'saved' : ''}" type="button" aria-label="${isSaved ? 'Remove' : 'Add'} ${movie.title} ${isSaved ? 'from' : 'to'} watchlist" aria-pressed="${isSaved}">${isSaved ? '▣' : '▱'}</button>
    </div>
    <div class="movie-info"><div class="movie-title"><span>${movie.title}</span></div>
      <div class="movie-meta"><span>${movie.year} · ${movie.genre}</span><button class="rating-button" type="button" aria-label="Rate ${movie.title}">★ <span>${movie.rating}</span></button></div>
    </div>
  </article>`;
}

function render() {
  const shown = visibleMovies();
  grid.innerHTML = shown.map(card).join('');
  emptyState.hidden = shown.length > 0;
  watchlistGrid.innerHTML = movies.filter((movie) => saved.has(movie.id)).map(card).join('');
  document.querySelector('#watchlist-count').textContent = saved.size;
  document.querySelector('#nav-count').textContent = saved.size;
  document.querySelectorAll('.bookmark').forEach((button) => button.addEventListener('click', toggleSaved));
  document.querySelectorAll('.rating-button').forEach((button) => button.addEventListener('click', () => showToast('Ratings are coming soon.')));
}

function toggleSaved(event) {
  const id = Number(event.currentTarget.closest('[data-id]').dataset.id);
  const movie = movies.find((item) => item.id === id);
  if (saved.has(id)) { saved.delete(id); showToast(`${movie.title} removed from your shelf.`); }
  else { saved.add(id); showToast(`${movie.title} saved to your shelf.`); }
  sessionStorage.setItem('framewise-watchlist', JSON.stringify([...saved]));
  render();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2400);
}

document.querySelector('#search-input').addEventListener('input', (event) => { query = event.target.value; render(); });
document.querySelectorAll('.filter-tab').forEach((tab) => tab.addEventListener('click', () => {
  activeFilter = tab.dataset.filter;
  document.querySelectorAll('.filter-tab').forEach((item) => { item.classList.toggle('active', item === tab); item.setAttribute('aria-selected', item === tab); });
  render();
}));
render();
