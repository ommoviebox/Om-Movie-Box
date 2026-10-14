import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

import {
  getFirestore,
  collection,
  getDocs
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
  try {
    const url = new URL(String(value || ""));
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function renderCard(movie) {
  const card = document.createElement("a");
  card.className = "movie-card";
  card.href = `movie.html?id=${encodeURIComponent(movie.id)}`;

  const poster = safeURL(movie.poster);
  const title = escapeHTML(movie.title || "Untitled Movie");
  const year = escapeHTML(movie.year || "");
  const language = escapeHTML(movie.language || "");
  const type = escapeHTML(movie.contentType || "Movie");

  card.innerHTML = `
    <div class="poster-wrap">
      ${poster
        ? `<img class="movie-poster" src="${escapeHTML(poster)}"
             alt="${title}" loading="lazy">`
        : `<div class="movie-poster poster-placeholder">OM</div>`
      }
    </div>
    <div class="movie-info">
      <h3 class="movie-title">${title}</h3>
      <div class="movie-meta">
        ${year ? `<span>${year}</span>` : ""}
        ${language ? `<span>${language}</span>` : ""}
        <span>${type}</span>
      </div>
    </div>
  `;

  const img = card.querySelector("img");
  if (img) {
    img.addEventListener("error", () => {
      const placeholder = document.createElement("div");
      placeholder.className = "movie-poster poster-placeholder";
      placeholder.textContent = "OM";
      img.replaceWith(placeholder);
    }, { once: true });
  }

  return card;
}

function getSearchText() {
  const search = $("searchInput");
  return (search?.value || "").trim().toLowerCase();
}

function getFilterValue(ids) {
  for (const id of ids) {
    const element = $(id);
    if (element && element.value && element.value !== "all") {
      return element.value.trim().toLowerCase();
    }
  }
  return "";
}

function applyFilters() {
  const query = getSearchText();
  const genre = getFilterValue(["genreFilter", "genreSelect"]);
  const language = getFilterValue(["languageFilter", "languageSelect"]);
  const type = getFilterValue(["typeFilter", "contentTypeFilter", "typeSelect"]);

  filteredMovies = allMovies.filter((movie) => {
    const searchable = [
      movie.title,
      movie.genre,
      movie.language,
      movie.year,
      movie.contentType,
      movie.description
    ].join(" ").toLowerCase();

    if (query && !searchable.includes(query)) return false;
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
  const pageMovies = filteredMovies.slice(start, start + pageSize);

  pageMovies.forEach((movie) => grid.appendChild(renderCard(movie)));

  if (count) {
    count.textContent = `${total} ${total === 1 ? "title" : "titles"}`;
  }

  if (empty) {
    empty.hidden = total !== 0;
    empty.textContent = allMovies.length
      ? "No titles match your search."
      : "अभी कोई प्रकाशित मूवी उपलब्ध नहीं है।";
  }

  if (pagination) {
    pagination.replaceChildren();

    if (totalPages > 1) {
      const makeButton = (label, page, disabled = false) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        button.disabled = disabled;
        button.style.cssText =
          "margin:4px;padding:9px 13px;border:0;border-radius:7px;background:#7c3aed;color:white;font-weight:bold";
        button.addEventListener("click", () => {
          currentPage = page;
          renderMovies();
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
        return button;
      };

      pagination.appendChild(
        makeButton("← Previous", currentPage - 1, currentPage === 1)
      );

      const pageLabel = document.createElement("span");
      pageLabel.textContent = ` Page ${currentPage} of ${totalPages} `;
      pagination.appendChild(pageLabel);

      pagination.appendChild(
        makeButton("Next →", currentPage + 1, currentPage === totalPages)
      );
    }
  }
}

function setupFilters() {
  const searchForm = $("searchForm");
  if (searchForm) {
    searchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      applyFilters();
    });
  }

  const search = $("searchInput");
  if (search) search.addEventListener("input", applyFilters);

  [
    "genreFilter", "genreSelect",
    "languageFilter", "languageSelect",
    "typeFilter", "contentTypeFilter", "typeSelect"
  ].forEach((id) => {
    const element = $(id);
    if (element) element.addEventListener("change", applyFilters);
  });
}

async function loadMovies() {
  if (!grid) return;

  grid.replaceChildren();
  if (count) count.textContent = "Loading...";

  try {
    const snapshot = await getDocs(collection(db, "titles"));

    allMovies = snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .filter((movie) => movie.published === true)
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
        "मूवी लोड नहीं हुई। इंटरनेट, firebase-config.js और Firestore Rules जाँचें।";
    }

    if (pagination) pagination.replaceChildren();
  }
}

setupFilters();
loadMovies();
