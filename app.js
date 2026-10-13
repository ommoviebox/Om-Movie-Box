
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

// Sample movie data
// Add your own movies here or use your configured Firebase database.
const sampleTitles = [
  {
    id: "sathi-leelavathi",
    title: "Sathi Leelavathi",
    type: "movie",
    year: 2025,
    genre: "Drama",
    language: "Tamil",
    quality: "HD",
    description: "Sathi Leelavathi",
    poster: "./Sathi.jpg",
    officialUrl: "https://www.diskwala.com/app/6accba3368b5fcba7d4abb4c",
    download480: "",
    watch480: "",
    download720: "",
    watch720: "",
    download1080: "",
    watch1080: "",
    download2160: "",
    watch2160: "",
    tutorialUrl: ""
  }
];

const $ = selector => document.querySelector(selector);

let titles = [...sampleTitles];

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function safeURL(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol)
      ? url.href
      : "";
  } catch {
    return "";
  }
}

function firebaseConfigured() {
  return Boolean(
    firebaseConfig?.apiKey &&
    !firebaseConfig.apiKey.startsWith("PASTE_") &&
    firebaseConfig?.projectId &&
    firebaseConfig.projectId !== "YOUR_PROJECT_ID"
  );
}

function normalizeMovie(movie) {
  return {
    ...movie,
    download480: movie.download480 || "",
    watch480: movie.watch480 || "",
    download720: movie.download720 || "",
    watch720: movie.watch720 || "",
    download1080: movie.download1080 || "",
    watch1080: movie.watch1080 || "",
    download2160: movie.download2160 || "",
    watch2160: movie.watch2160 || "",
    tutorialUrl: movie.tutorialUrl || ""
  };
}

// Load movie data from Firebase when configured.
async function loadTitles() {
  if (firebaseConfigured()) {
    try {
      const app = initializeApp(firebaseConfig);
      const db = getFirestore(app);

      const movieQuery = query(
        collection(db, "titles"),
        where("published", "==", true),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(movieQuery);
      const onlineMovies = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      if (onlineMovies.length > 0) {
        titles = onlineMovies.map(normalizeMovie);
      }
    } catch (error) {
      console.warn("Firebase unavailable; using sample movies.", error);
    }
  }

  if ($("#movieGrid")) {
    fillFilters();
    renderMovies();
  }

  if ($("#movieDetails")) {
    renderDetails();
  }
}

// Build the poster image or a placeholder.
function posterHTML(movie) {
  const posterURL = movie.poster
    ? (movie.poster.startsWith("./") || movie.poster.startsWith("/")
        ? movie.poster
        : safeURL(movie.poster))
    : "";

  if (posterURL) {
    return `<img class="poster" src="${escapeHTML(posterURL)}"
      alt="${escapeHTML(movie.title)} poster"
      loading="lazy"
      onerror="this.style.display='none'">`;
  }

  return `<div class="poster-placeholder">${escapeHTML(movie.title)}</div>`;
}

// Populate genre and language filters.
function fillFilters() {
  const genreSelect = $("#genreFilter");
  const languageSelect = $("#languageFilter");

  if (!genreSelect || !languageSelect) return;

  const genres = [...new Set(titles.map(movie => movie.genre).filter(Boolean))].sort();
  const languages = [...new Set(titles.map(movie => movie.language).filter(Boolean))].sort();

  genreSelect.innerHTML =
    '<option value="all">All Genres</option>' +
    genres.map(genre =>
      `<option value="${escapeHTML(genre)}">${escapeHTML(genre)}</option>`
    ).join("");

  languageSelect.innerHTML =
    '<option value="all">All Languages</option>' +
    languages.map(language =>
      `<option value="${escapeHTML(language)}">${escapeHTML(language)}</option>`
    ).join("");
}

// Display movie poster cards.
function renderMovies() {
  const grid = $("#movieGrid");
  if (!grid) return;

  const search = ($("#searchInput")?.value || "").trim().toLowerCase();
  const type = $("#typeFilter")?.value || "all";
  const genre = $("#genreFilter")?.value || "all";
  const language = $("#languageFilter")?.value || "all";

  const results = titles.filter(movie => {
    const searchable = [
      movie.title,
      movie.genre,
      movie.language,
      movie.year,
      movie.type
    ].join(" ").toLowerCase();

    return searchable.includes(search) &&
      (type === "all" || movie.type === type) &&
      (genre === "all" || movie.genre === genre) &&
      (language === "all" || movie.language === language);
  });

  if ($("#resultCount")) {
    $("#resultCount").textContent = `${results.length} titles`;
  }

  if ($("#emptyState")) {
    $("#emptyState").hidden = results.length !== 0;
  }

  grid.innerHTML = results.map(movie => `
    <article class="movie-card"
      tabindex="0"
      role="link"
      data-id="${escapeHTML(movie.id)}"
      aria-label="View ${escapeHTML(movie.title)} details">

      <div class="poster-wrap">
        ${posterHTML(movie)}
        <span class="quality-tag">${escapeHTML(movie.quality || "HD")}</span>
      </div>

      <div class="card-body">
        <h3 class="card-title">${escapeHTML(movie.title)}
          <span>(${escapeHTML(movie.year || "N/A")})</span>
        </h3>

        <div class="card-meta">
          ${movie.type === "series" ? "Web Series" : "Movie"}
          · ${escapeHTML(movie.language || "Various")}
        </div>

        <div class="card-tags">
          <span class="tag">${escapeHTML(movie.genre || "General")}</span>
          <span class="tag">${escapeHTML(movie.quality || "HD")}</span>
        </div>

        <span class="card-link">VIEW DETAILS ↗</span>
      </div>
    </article>
  `).join("");
}

// Open the selected movie's separate page.
function openMovie(id) {
  window.location.href = `movie.html?id=${encodeURIComponent(id)}`;
}

// Configure a quality button.
// Empty links stay disabled.
function setButton(id, url, className) {
  const button = $("#" + id);
  if (!button) return;

  const safeLink = safeURL(url || "");

  button.classList.remove("disabled");
  button.removeAttribute("aria-disabled");
  button.removeAttribute("target");
  button.removeAttribute("rel");
  button.removeAttribute("href");

  if (safeLink) {
    button.href = safeLink;
    button.target = "_blank";
    button.rel = "noopener noreferrer";
  } else {
    button.href = "#";
    button.classList.add("disabled");
    button.setAttribute("aria-disabled", "true");
  }
}

// Show movie details on movie.html.
function renderDetails() {
  const id = new URLSearchParams(window.location.search).get("id");
  const movie = titles.find(item => String(item.id) === id);

  const loading = $("#detailLoading");
  const details = $("#movieDetails");
  const error = $("#detailError");

  if (!movie) {
    if (loading) loading.hidden = true;
    if (details) details.hidden = true;
    if (error) error.hidden = false;
    return;
  }

  if (loading) loading.hidden = true;
  if (error) error.hidden = true;
  if (details) details.hidden = false;

  const image = $("#detailPoster");
  const posterURL = movie.poster
    ? (movie.poster.startsWith("./") || movie.poster.startsWith("/")
        ? movie.poster
        : safeURL(movie.poster))
    : "";

  if (image) {
    image.src = posterURL || "";
    image.alt = `${movie.title} poster`;
    image.hidden = !posterURL;
  }

  if ($("#detailType")) {
    $("#detailType").textContent =
      movie.type === "series" ? "WEB SERIES" : "MOVIE DETAILS";
  }

  if ($("#detailTitle")) {
    $("#detailTitle").textContent = movie.title || "Untitled";
  }

  if ($("#detailMeta")) {
    $("#detailMeta").textContent =
      `${movie.year || "Year not listed"} · ${movie.quality || "Quality not listed"}`;
  }

  if ($("#detailDescription")) {
    $("#detailDescription").textContent =
      movie.description || "More information coming soon.";
  }

  if ($("#detailLanguage")) {
    $("#detailLanguage").textContent = movie.language || "Language not listed";
  }

  if ($("#detailGenre")) {
    $("#detailGenre").textContent = movie.genre || "Genre not listed";
  }

  if ($("#detailYear")) {
    $("#detailYear").textContent = movie.year || "Year not listed";
  }

  ["480", "720", "1080", "2160"].forEach(quality => {
    setButton(`download${quality}`, movie[`download${quality}`]);
    setButton(`watch${quality}`, movie[`watch${quality}`]);
  });

  setButton("tutorialLink", movie.tutorialUrl);
}

// Home page event listeners.
const grid = $("#movieGrid");

if (grid) {
  grid.addEventListener("click", event => {
    const card = event.target.closest(".movie-card");
    if (card) openMovie(card.dataset.id);
  });

  grid.addEventListener("keydown", event => {
    const card = event.target.closest(".movie-card");

    if (card && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      openMovie(card.dataset.id);
    }
  });

  $("#searchInput")?.addEventListener("input", renderMovies);

  $("#searchForm")?.addEventListener("submit", event => {
    event.preventDefault();
    renderMovies();
    $("#latest")?.scrollIntoView({ behavior: "smooth" });
  });

  ["#typeFilter", "#genreFilter", "#languageFilter"].forEach(selector => {
    $(selector)?.addEventListener("change", renderMovies);
  });

  $("#menuToggle")?.addEventListener("click", () => {
    const nav = $("#siteNav");
    if (!nav) return;

    const isOpen = nav.classList.toggle("open");
    $("#menuToggle").setAttribute("aria-expanded", String(isOpen));
  });
}

if ($("#year")) {
  $("#year").textContent = new Date().getFullYear();
}

loadTitles();
