
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

import {
  getFirestore,
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

const $ = (id) => document.getElementById(id);

const grid = $("movieGrid");
const count = $("resultCount");
const empty = $("emptyState");
const pagination = $("pagination");

let allMovies = [];
let filteredMovies = [];
let currentPage = 1;
const pageSize = 12;

function safeURL(value) {
  if (!value) return "";

  try {
    const url = new URL(String(value).trim());
    if (!["https:", "http:"].includes(url.protocol)) return "";
    return url.href;
  } catch {
    return "";
  }
}

function renderCard(movie) {
  const card = document.createElement("a");
  card.className = "movie-card";
  card.href = `movie.html?id=${encodeURIComponent(movie.id)}`;

  const posterURL = safeURL(movie.poster);
  const posterWrap = document.createElement("div");
  posterWrap.className = "poster-wrap";

  const image = document.createElement("img");
  image.className = "poster";
  image.alt = movie.title || "Movie poster";
  image.loading = "lazy";
  image.decoding = "async";

  const placeholder = document.createElement("div");
  placeholder.className = "poster-placeholder";
  placeholder.textContent = "OM";
  placeholder.style.display = "none";

  if (posterURL) {
    image.src = posterURL;
    image.addEventListener("error", () => {
      image.style.display = "none";
      placeholder.style.display = "grid";
    }, { once: true });
    posterWrap.append(image, placeholder);
  } else {
    placeholder.style.display = "grid";
    posterWrap.appendChild(placeholder);
  }

  const info = document.createElement("div");
  info.className = "movie-info";

  const title = document.createElement("h3");
  title.className = "movie-title";
  title.textContent = movie.title || "Untitled Movie";

  const meta = document.createElement("div");
  meta.className = "movie-meta";

  [movie.year, movie.language, movie.contentType || "Movie"]
    .filter(Boolean)
    .forEach((value) => {
      const span = document.createElement("span");
      span.textContent = value;
      span.style.marginRight = "5px";
      meta.appendChild(span);
    });

  info.append(title, meta);
  card.append(posterWrap, info);
  return card;
}

function getSearchText() {
  return ($("searchInput")?.value || "").trim().toLowerCase();
}

function getFilterValue(ids) {
  for (const id of ids) {
    const element = $(id);
    if (element?.value && element.value !== "all") {
      return element.value.trim().toLowerCase();
    }
  }
  return "";
}

function applyFilters() {
  const queryText = getSearchText();
  const genre = getFilterValue(["genreFilter", "genreSelect"]);
  const language = getFilterValue(["languageFilter", "languageSelect"]);
  const type = getFilterValue([
    "typeFilter",
    "contentTypeFilter",
    "typeSelect"
  ]);

  filteredMovies = allMovies.filter((movie) => {
    const searchable = [
      movie.title,
      movie.genre,
      movie.language,
      movie.year,
      movie.contentType,
      movie.description
    ].join(" ").toLowerCase();

    if (queryText && !searchable.includes(queryText)) return false;
    if (genre && !String(movie.genre || "").toLowerCase().includes(genre)) return false;
    if (language && !String(movie.language || "").toLowerCase().includes(language)) return false;
    if (type && !String(movie.contentType || "").toLowerCase().includes(type)) return false;
    return true;
  });

  currentPage = 1;
  renderMovies();
}

function renderMovies() {
  if (!grid) return;

  grid.replaceChildren();
  const total = filteredMovies.length;
  const totalPages = Math.ceil(total / pageSize);

  currentPage = Math.max(1, Math.min(currentPage, totalPages || 1));
  const start = (currentPage - 1) * pageSize;

  filteredMovies
    .slice(start, start + pageSize)
    .forEach((movie) => grid.appendChild(renderCard(movie)));

  if (count) {
    count.textContent = `${total} ${total === 1 ? "title" : "titles"}`;
  }

  if (empty) {
    empty.hidden = total !== 0;
    empty.textContent = allMovies.length
      ? "No titles match your search."
      : "अभी कोई प्रकाशित मूवी उपलब्ध नहीं है।";
  }

  if (!pagination) return;
  pagination.replaceChildren();
  if (totalPages <= 1) return;

  function makeButton(label, page, disabled) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "page-btn";
    button.textContent = label;
    button.disabled = disabled;
    button.addEventListener("click", () => {
      currentPage = page;
      renderMovies();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    return button;
  }

  pagination.appendChild(
    makeButton("← Previous", currentPage - 1, currentPage === 1)
  );

  const label = document.createElement("span");
  label.className = "page-info";
  label.textContent = `Page ${currentPage} of ${totalPages}`;
  pagination.appendChild(label);

  pagination.appendChild(
    makeButton("Next →", currentPage + 1, currentPage === totalPages)
  );
}

function setupFilters() {
  const searchForm = $("searchForm");

  searchForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    applyFilters();
  });

  $("searchInput")?.addEventListener("input", applyFilters);

  [
    "genreFilter", "genreSelect",
    "languageFilter", "languageSelect",
    "typeFilter", "contentTypeFilter", "typeSelect"
  ].forEach((id) => {
    $(id)?.addEventListener("change", applyFilters);
  });
}

async function loadMovies() {
  if (!grid) return;

  if (count) count.textContent = "Loading...";
  if (empty) empty.hidden = true;

  try {
    const publishedMoviesQuery = query(
      collection(db, "titles"),
      where("published", "==", true)
    );

    const snapshot = await getDocs(publishedMoviesQuery);

    allMovies = snapshot.docs
      .map((item) => ({
        id: item.id,
        ...item.data()
      }))
      .sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });

    applyFilters();
  } catch (error) {
    console.error("Homepage movie loading error:", error);

    if (count) count.textContent = "Load failed";

    if (empty) {
      empty.hidden = false;
      empty.textContent =
        "Movies load nahi hui. Internet aur Firestore Rules check karein.";
    }

    if (pagination) pagination.replaceChildren();
  }
}

setupFilters();
loadMovies();
