/* ========== Configuration ========== */ 
const API_KEY = "869f3b6cbedc59f29e4a20bf74f51a93"; // <<-- your TMDb API key
const BASE = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w500";

/* ========== DOM refs ========== */
const trendingMovies = document.getElementById("trendingMovies");
const genresContainer = document.getElementById("genresContainer");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const homeBtn = document.getElementById("homeBtn");
const watchlistBtn = document.getElementById("watchlistBtn");
const watchlistSection = document.getElementById("watchlistSection");
const watchlistMovies = document.getElementById("watchlistMovies");
const homeSection = document.getElementById("homeSection");
const usernameInput = document.getElementById("usernameInput");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const welcome = document.getElementById("welcome");
const modal = document.getElementById("movieModal");
const modalClose = document.getElementById("modalClose");
const modalContent = document.getElementById("modalContent");
const yearSpan = document.getElementById("year");

/* ========== Genre list we want on homepage ========== */
/* These IDs are official TMDb genre IDs */
const HOME_GENRES = [
  { id: 28, name: "Action" },
  { id: 35, name: "Comedy" },
  { id: 18, name: "Drama" },
  { id: 10749, name: "Romance" },
  { id: 16, name: "Animation" },
  { id: 53, name: "Thriller" }
];

/* ========== Init ========= */
function init() {
  yearSpan && (yearSpan.textContent = new Date().getFullYear());
  setupAuth();
  bindUI();
  loadHome();
}

function setupAuth() {
  const user = localStorage.getItem("kum_user");
  if (user) {
    welcome.textContent = `Welcome, ${user}`;
    usernameInput.classList.add("hidden");
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
  } else {
    welcome.textContent = "";
    usernameInput.classList.remove("hidden");
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
  }
}

function bindUI() {
  loginBtn.addEventListener("click", () => {
    const name = usernameInput.value.trim();
    if (!name) return alert("Enter a name to login");

    // Only create empty watchlist if user doesn't already have one
    if (!localStorage.getItem("watchlist_" + name)) {
      localStorage.setItem("watchlist_" + name, JSON.stringify([]));
    }

    localStorage.setItem("kum_user", name);
    setupAuth();
    loadHome();
  });

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("kum_user");
    setupAuth();
    // return to home
    showHome();
  });

  searchBtn.addEventListener("click", async () => {
    const q = searchInput.value.trim();
    if (!q) return;
    await searchMovies(q);
  });

  homeBtn.addEventListener("click", () => { showHome(); loadHome(); });
  watchlistBtn.addEventListener("click", () => { showWatchlist(); });

  modalClose.addEventListener("click", closeModal);
  // close on outside click
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === "Escape") closeModal(); });
}

/* ========== Navigation helpers ========== */
function showHome() {
  homeSection.style.display = "";
  watchlistSection.style.display = "none";
}

function showWatchlist() {
  homeSection.style.display = "none";
  watchlistSection.style.display = "";
  renderWatchlist();
}

/* ========== Home: load trending + genres ========== */
async function loadHome() {
  await loadTrending();
  await loadGenreRows();
}

async function loadTrending() {
  trendingMovies.innerHTML = `<div class="center muted">Loading...</div>`;
  try {
    const res = await fetch(`${BASE}/movie/popular?api_key=${API_KEY}&language=en-US&page=1`);
    const data = await res.json();
    if (!data.results) throw new Error("Invalid response");
    trendingMovies.innerHTML = "";
    data.results.slice(0, 12).forEach((m, i) => {
      const card = createMovieCard(m);
      // slight fade-in effect
      card.style.opacity = 0;
      trendingMovies.appendChild(card);
      setTimeout(() => card.style.opacity = 1, i * 60);
    });
  } catch (err) {
    console.error("Trending fetch failed:", err);
    trendingMovies.innerHTML = `<div class="center muted">Failed to load trending movies</div>`;
  }
}

async function loadGenreRows() {
  genresContainer.innerHTML = "";
  for (const g of HOME_GENRES) {
    const block = document.createElement("div");
    block.className = "genre-block";
    block.innerHTML = `<div class="genre-title"><strong>${g.name}</strong><button class="btn small" data-genre="${g.id}">See all</button></div><div id="genre-${g.id}" class="row-container"><div class="center muted">Loading...</div></div>`;
    genresContainer.appendChild(block);

    // fetch movies for genre
    try {
      const res = await fetch(`${BASE}/discover/movie?api_key=${API_KEY}&language=en-US&sort_by=popularity.desc&with_genres=${g.id}&page=1`);
      const data = await res.json();
      const container = document.getElementById(`genre-${g.id}`);
      container.innerHTML = "";
      (data.results || []).slice(0, 10).forEach((m, idx) => {
        const card = createMovieCard(m);
        card.style.opacity = 0;
        container.appendChild(card);
        setTimeout(() => card.style.opacity = 1, idx * 50);
      });
    } catch (err) {
      console.error(`Genre fetch failed for ${g.name}:`, err);
      const container = document.getElementById(`genre-${g.id}`);
      container.innerHTML = `<div class="center muted">Failed to load ${g.name}</div>`;
    }
  }

  // 'See all' buttons: go to search results (genre id)
  genresContainer.querySelectorAll('button[data-genre]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const genreId = btn.dataset.genre;
      // Fetch more and show in trending area as results for simplicity
      await showGenreAll(genreId);
    });
  });
}

async function showGenreAll(genreId) {
  // show many movies filtered by genre in the trendingMovies area
  trendingMovies.innerHTML = `<div class="center muted">Loading genre...</div>`;
  try {
    const res = await fetch(`${BASE}/discover/movie?api_key=${API_KEY}&language=en-US&sort_by=popularity.desc&with_genres=${genreId}&page=1`);
    const data = await res.json();
    trendingMovies.innerHTML = "";
    (data.results || []).forEach((m, i) => {
      const card = createMovieCard(m);
      card.style.opacity = 0;
      trendingMovies.appendChild(card);
      setTimeout(() => card.style.opacity = 1, i * 40);
    });
    // ensure home displayed
    showHome();
  } catch (err) {
    console.error(err);
    trendingMovies.innerHTML = `<div class="center muted">Failed to load genre list</div>`;
  }
}

/* ========== Movie card builder (used for trending and genre rows) ========= */
function createMovieCard(m) {
  const card = document.createElement("div");
  card.className = "movie-card";
  const poster = m.poster_path ? IMG + m.poster_path : `https://via.placeholder.com/400x600?text=${encodeURIComponent(m.title)}`;
  card.innerHTML = `
    <img class="movie-poster" src="${poster}" alt="${escapeHtml(m.title)}">
    <div class="movie-info">
      <div class="movie-title">${escapeHtml(m.title)}</div>
      <div class="movie-sub">${ (m.release_date || "").slice(0,4) } • ⭐ ${ (m.vote_average || 0).toFixed(1) }</div>
      <div style="margin-top:8px;display:flex;gap:8px">
        <button class="btn small btn-view" data-id="${m.id}">View</button>
        <button class="btn small btn-watch" data-id="${m.id}">Watchlist</button>
      </div>
    </div>
  `;

  // View details
  card.querySelector('.btn-view').addEventListener('click', (e) => {
    e.stopPropagation();
    openMovieModal(m.id);
  });
  // Add to watchlist
  card.querySelector('.btn-watch').addEventListener('click', (e) => {
    e.stopPropagation();
    addToWatchlist(m);
  });

  return card;
}

/* ========== Movie Modal (details, TMDb reviews, local reviews & rating + CAST & CREW) ========== */
async function openMovieModal(movieId) {
  modal.style.display = "flex";
  modal.setAttribute('aria-hidden','false');
  modalContent.innerHTML = `<div class="center muted">Loading movie...</div>`;

  try {
    const res = await fetch(`${BASE}/movie/${movieId}?api_key=${API_KEY}&append_to_response=credits,reviews,videos`);
    const movie = await res.json();

    // 🎬 Trailer embed (safe)
    let trailerHTML = '';
    try {
      if (movie.videos && Array.isArray(movie.videos.results) && movie.videos.results.length) {
        const yt = movie.videos.results.find(v => (v.site || '').toLowerCase() === 'youtube' && (v.type === 'Trailer' || v.type === 'Teaser'));
        if (yt && yt.key) {
          trailerHTML = `
            <div style="margin-top:8px">
              <iframe width="100%" height="360" src="https://www.youtube.com/embed/${yt.key}?rel=0&modestbranding=1" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>`;
        }
      }
    } catch (err) {
      console.warn("Trailer parse error", err);
    }

    // ⭐ TMDb Reviews
    let tmdbReviewsHTML = '<p>No TMDb reviews.</p>';
    if (movie.reviews && Array.isArray(movie.reviews.results) && movie.reviews.results.length) {
      tmdbReviewsHTML = movie.reviews.results.slice(0,3).map(r => `
        <div class="user-review">
          <strong>${escapeHtml(r.author)}</strong>
          <div style="margin-top:6px">${escapeHtml((r.content || '').slice(0,300))}${(r.content && r.content.length>300) ? '...' : ''}</div>
        </div>`).join('');
    }

    // 🧑‍💼 Cast Section (safe fallback)
    let castHTML = '<p class="muted">No cast data available.</p>';
    if (movie.credits && Array.isArray(movie.credits.cast) && movie.credits.cast.length) {
      castHTML = movie.credits.cast.slice(0,8).map(c => `
        <div class="cast-card">
          <img src="${c.profile_path ? IMG + c.profile_path : 'https://via.placeholder.com/100x100?text=No+Image'}" alt="${escapeHtml(c.name)}">
          <div class="cast-name">${escapeHtml(c.name)}</div>
          <div class="cast-role">${escapeHtml(c.character || '')}</div>
        </div>`).join('');
    }

    // 🎥 Crew Section
    let crewHTML = '';
    if (movie.credits && Array.isArray(movie.credits.crew) && movie.credits.crew.length) {
      const directors = movie.credits.crew.filter(p => p.job === "Director");
      const writers = movie.credits.crew.filter(p => p.department === "Writing");
      const producers = movie.credits.crew.filter(p => p.job === "Producer");

      crewHTML = `
        <div class="crew-list">
          ${directors.length ? `<p><strong>Director:</strong> ${directors.map(d => escapeHtml(d.name)).join(', ')}</p>` : ''}
          ${writers.length ? `<p><strong>Writers:</strong> ${writers.map(w => escapeHtml(w.name)).join(', ')}</p>` : ''}
          ${producers.length ? `<p><strong>Producers:</strong> ${producers.map(p => escapeHtml(p.name)).join(', ')}</p>` : ''}
        </div>`;
    }

    // 💬 Local reviews
    const localHTML = renderLocalReviewsHTML(movieId);
    const starsId = `stars-${movieId}`;
    const textareaId = `reviewText-${movieId}`;
    const submitId = `submitReview-${movieId}`;

    // Build modal HTML (poster fallback = placeholder)
    const posterUrl = movie.poster_path ? IMG + movie.poster_path : `https://via.placeholder.com/500x750?text=${encodeURIComponent(movie.title)}`;

    modalContent.innerHTML = `
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        <div style="flex:0 0 260px">
          <img src="${posterUrl}" style="width:100%;border-radius:8px" alt="${escapeHtml(movie.title)}">
        </div>
        <div style="flex:1 1 420px">
          <h2>${escapeHtml(movie.title)} <small style="color:#666">(${movie.release_date ? movie.release_date.slice(0,4) : ''})</small></h2>
          <div style="color:#666;margin-top:6px">${(movie.genres || []).map(g => g.name).join(', ')} • ${movie.runtime ? movie.runtime + ' min' : ''}</div>
          <p style="margin-top:12px">${escapeHtml(movie.overview || 'No overview available.')}</p>
          ${crewHTML}
          ${trailerHTML}
        </div>
      </div>

      <div class="cast-section">
        <h3>Cast</h3>
        <div class="cast-grid">${castHTML}</div>
      </div>

      <div class="reviews-section">
        <h3>TMDb Reviews</h3>
        <div class="reviews-grid">${tmdbReviewsHTML}</div>

        <h3 style="margin-top:12px">User Reviews</h3>
        <div id="localReviews-${movieId}">
          ${localHTML}
        </div>

        <h3 style="margin-top:12px">Add your review</h3>
        <div id="${starsId}" class="stars">
          ${[1,2,3,4,5].map(n => `<span class="star" data-value="${n}">&#9733;</span>`).join('')}
        </div>
        <textarea id="${textareaId}" placeholder="Write your review..."></textarea>
        <button id="${submitId}">Submit Review</button>
      </div>
    `;

    // wire up stars & submit
    setupStars(movieId);
    const submitBtn = document.getElementById(submitId);
    if (submitBtn) {
      submitBtn.addEventListener("click", () => {
        submitLocalReview(movieId);
      });
    }

  } catch (err) {
    console.error("Movie detail error:", err);
    modalContent.innerHTML = `<div class="center muted">Failed to load movie details.</div>`;
  }
}

function closeModal() {
  modal.style.display = "none";
  modal.setAttribute('aria-hidden','true');
}

/* ========== Local Reviews logic stored by movieId ========== */
function getLocalReviews(movieId) {
  try {
    return JSON.parse(localStorage.getItem("kum_reviews_" + movieId)) || [];
  } catch {
    return [];
  }
}

function saveLocalReviews(movieId, reviews) {
  localStorage.setItem("kum_reviews_" + movieId, JSON.stringify(reviews));
}

function renderLocalReviewsHTML(movieId) {
  const reviews = getLocalReviews(movieId);
  if (!reviews || reviews.length === 0) return `<div class="muted">No user reviews yet.</div>`;
  return reviews.map(r => `<div class="user-review"><strong>${escapeHtml(r.user)}</strong> — ${'★'.repeat(r.rating)} (${r.rating}/5)<div style="margin-top:6px">${escapeHtml(r.text)}</div><small style="color:#666">${r.date}</small></div>`).join('');
}

function submitLocalReview(movieId) {
  const starsEl = document.querySelector(`#stars-${movieId}`);
  const selected = starsEl && starsEl.querySelector(".star.selected");
  const rating = selected ? Number(selected.dataset.value) : 0;
  const text = document.getElementById(`reviewText-${movieId}`).value.trim();
  const user = localStorage.getItem("kum_user") || "Anonymous";

  if (!rating || !text) return alert("Please select a star rating and write a review.");

  const reviews = getLocalReviews(movieId);
  const newReview = { user, rating, text, date: new Date().toLocaleDateString() };
  reviews.unshift(newReview);
  saveLocalReviews(movieId, reviews);

  // refresh local reviews block
  const localBlock = document.getElementById(`localReviews-${movieId}`);
  if (localBlock) localBlock.innerHTML = renderLocalReviewsHTML(movieId);

  // clear inputs
  document.getElementById(`reviewText-${movieId}`).value = "";
  // clear stars
  const stars = starsEl.querySelectorAll(".star");
  stars.forEach(s => s.classList.remove("selected"));

  alert("Review submitted. Thank you!");
}

/* ========== star UI helper ========= */
function setupStars(movieId) {
  const starsEl = document.getElementById(`stars-${movieId}`);
  if (!starsEl) return;
  const stars = starsEl.querySelectorAll(".star");
  stars.forEach(s => {
    s.addEventListener("mouseenter", () => {
      const v = Number(s.dataset.value);
      stars.forEach(s2 => s2.classList.toggle("hover", Number(s2.dataset.value) <= v));
    });
    s.addEventListener("mouseleave", () => {
      stars.forEach(s2 => s2.classList.remove("hover"));
    });
    s.addEventListener("click", () => {
      const v = Number(s.dataset.value);
      stars.forEach(s2 => s2.classList.toggle("selected", Number(s2.dataset.value) <= v));
    });
  });
}

/* ========== Watchlist functions (per user) - persistent and stable ========= */
function getWatchlistForUser() {
  const user = localStorage.getItem("kum_user");
  if (!user) return [];
  try {
    return JSON.parse(localStorage.getItem("watchlist_" + user)) || [];
  } catch { return []; }
}

function saveWatchlistForUser(list) {
  const user = localStorage.getItem("kum_user");
  if (!user) return;
  localStorage.setItem("watchlist_" + user, JSON.stringify(list));
}

function addToWatchlist(movie) {
  const user = localStorage.getItem("kum_user");
  if (!user) return alert("Please login to add to your watchlist.");

  let list = getWatchlistForUser();
  if (list.find(x => x.id === movie.id)) return alert("Already in watchlist.");
  // store minimal data
  list.push({ id: movie.id, title: movie.title, poster_path: movie.poster_path || null, release_date: movie.release_date || '' });
  saveWatchlistForUser(list);
  alert("Added to watchlist");
}

function removeFromWatchlist(movieId) {
  const user = localStorage.getItem("kum_user");
  if (!user) return;
  let list = getWatchlistForUser();
  list = list.filter(m => m.id !== movieId);
  saveWatchlistForUser(list);
  renderWatchlist();
}

function renderWatchlist() {
  const list = getWatchlistForUser();
  watchlistMovies.innerHTML = '';
  if (!list || list.length === 0) {
    watchlistMovies.innerHTML = `<div class="center muted">Your watchlist is empty.</div>`;
    return;
  }
  list.forEach(m => {
    const card = document.createElement("div");
    card.className = "movie-card";
    const poster = m.poster_path ? IMG + m.poster_path : `https://via.placeholder.com/400x600?text=${encodeURIComponent(m.title)}`;
    card.innerHTML = `
      <img class="movie-poster" src="${poster}" alt="${escapeHtml(m.title)}">
      <div class="movie-info">
        <div class="movie-title">${escapeHtml(m.title)}</div>
        <div class="movie-sub">${(m.release_date||'').slice(0,4)}</div>
        <div style="margin-top:8px;display:flex;gap:8px">
          <button class="btn small btn-view" data-id="${m.id}">View</button>
          <button class="btn small btn-remove" data-id="${m.id}">Remove</button>
        </div>
      </div>
    `;
    card.querySelector('.btn-view').addEventListener('click', () => openMovieModal(m.id));
    card.querySelector('.btn-remove').addEventListener('click', () => removeFromWatchlist(m.id));
    watchlistMovies.appendChild(card);
  });
}

/* ========== Search movies ========= */
async function searchMovies(q) {
  trendingMovies.innerHTML = `<div class="center muted">Searching for "${q}"...</div>`;
  try {
    const res = await fetch(`${BASE}/search/movie?api_key=${API_KEY}&language=en-US&query=${encodeURIComponent(q)}&page=1&include_adult=false`);
    const data = await res.json();
    trendingMovies.innerHTML = "";
    if (!data.results || data.results.length === 0) {
      trendingMovies.innerHTML = `<div class="center muted">No results for "${q}"</div>`;
      return;
    }
    data.results.forEach((m, i) => {
      const card = createMovieCard(m);
      card.style.opacity = 0;
      trendingMovies.appendChild(card);
      setTimeout(() => card.style.opacity = 1, i * 60);
    });
    showHome();
  } catch (err) {
    console.error("Search failed", err);
    trendingMovies.innerHTML = `<div class="center muted">Search failed</div>`;
  }
}

/* ========== Helpers ========== */
function escapeHtml(text = '') {
  return text.replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

/* ========== Start ========= */
window.addEventListener('load', init);
