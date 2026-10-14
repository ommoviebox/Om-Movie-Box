
import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import { db } from "./firebase-config.js";

// ===============================
// OM MOVIE BOX - MAIN APP
// ===============================

const $ = (selector) => document.querySelector(selector);

const PAGE_SIZE = 30;

let allMovies = [];
let filteredMovies = [];
let currentPage = 1;

// Sample movies are used only if Firestore has no accessible movies.
const sampleTitles = [
  {
    id: "sample-sathi-leelavathi",
    name: "Sathi Leelavathi",
    title: "Sathi Leelavathi",
    year: "2025",
    language: "Hindi",
    type: "Movie",
    genre: "Drama",
    poster: "",
    description: "Movie details will appear here.",
    published: true
  },
  {
    id: "sample-vibe",
    name: "Vibe",
    title: "Vibe",
    year: "2025",
    language: "Hindi",
    type: "Movie",
    genre: "Drama",
    poster: "",
    description: "Movie details will appear here.",
    published: true
  }
];

// Get the first available field from a movie document.
function getField(movie, ...keys) {
  for (const key of keys) {
    const value = movie?.[key];

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return "";
}

// Safely create a valid HTTP/HTTPS URL.
function safeURL(value) {
  if (!value || typeof value !== "string") return "";

  try {
    const url = new URL(value.trim());

    if (url.protocol === "https:" || url.protocol === "http:") {
      return url.href;
    }
  } catch {
    return "";
  }

  return "";
}

// Create elements without inserting movie text as HTML.
function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;

  return element;
}

function getMovieName(movie) {
  return String(getField(movie, "name", "title", "movieName") || "Untitled Movie");
}

function getPoster(movie) {
  return safeURL(
    getField(movie, "poster", "posterUrl", "image", "imageUrl", "thumbnail")
  );
}

function getMovieId(movie) {
  return String(movie.id || "");
}

// ===============================
// MOVIE CARD
// ===============================

function posterHTML(movie) {
  const card = createElement("article", "movie-card");
  const link = createElement("a", "movie-poster-link");

  link.href = `movie.html?id=${encodeURIComponent(getMovieId(movie))}`;
  link.setAttribute("aria-label", `View ${getMovieName(movie)}`);

  const posterURL = getPoster(movie);

  if (posterURL) {
    const image = document.createElement("img");

    image.src = posterURL;
    image.alt = getMovieName(movie);
    image.loading = "lazy";
    image.onerror = () => {
      image.style.display = "none";

      const placeholder = createElement(
        "div",
        "poster-placeholder",
        "Poster unavailable"
      );

      link.appendChild(placeholder);
    };

    link.appendChild(image);
  } else {
    link.appendChild(
      createElement("div", "poster-placeholder", "OM MOVIE BOX")
    );
  }

  const info = createElement("div", "movie-info");
  const title = createElement("h3", "movie-title", getMovieName(movie));

  const year = getField(movie, "year", "releaseYear");
  const language = getField(movie, "language", "lang");

  const meta = [year, language].filter(Boolean).join(" • ");
  const details = createElement("p", "movie-meta", meta);

  info.append(title, details);
  link.appendChild(info);
  card.appendChild(link);

  return card;
}

// ===============================
// FILTER OPTIONS
// ===============================

function fillFilters() {
  const genreFilter = $("#genreFilter");
  const languageFilter = $("#languageFilter");
  const typeFilter = $("#typeFilter");

  fillOneFilter(genreFilter, "genre", "All Genres");
  fillOneFilter(languageFilter, "language", "All Languages");
  fillOneFilter(typeFilter, "type", "All Types");
}

function fillOneFilter(select, field, defaultLabel) {
  if (!select) return;

  const oldValue = select.value;
  const values = new Set();

  allMovies.forEach((movie) => {
    const value = getField(
      movie,
      field,
      field === "language" ? "lang" : field
    );

    if (value) {
      String(value)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((item) => values.add(item));
    }
  });

  select.replaceChildren();

  const firstOption = document.createElement("option");
  firstOption.value = "";
  firstOption.textContent = defaultLabel;
  select.appendChild(firstOption);

  [...values]
    .sort((a, b) => a.localeCompare(b))
    .forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });

  if ([...select.options].some((option) => option.value === oldValue)) {
    select.value = oldValue;
  }
}

// ===============================
// SEARCH AND FILTERS
// ===============================

function applyFilters() {
  const search = ($("#searchInput")?.value || "")
    .trim()
    .toLowerCase();

  const selectedType = $("#typeFilter")?.value || "";
  const selectedGenre = $("#genreFilter")?.value || "";
  const selectedLanguage = $("#languageFilter")?.value || "";

  filteredMovies = allMovies.filter((movie) => {
    const name = getMovieName(movie).toLowerCase();
    const description = String(
      getField(movie, "description", "story", "details")
    ).toLowerCase();

    const language = String(
      getField(movie, "language", "lang")
    ).toLowerCase();

    const genre = String(getField(movie, "genre")).toLowerCase();
    const type = String(getField(movie, "type")).toLowerCase();

    const matchesSearch =
      !search ||
      name.includes(search) ||
      description.includes(search) ||
      language.includes(search) ||
      genre.includes(search);

    const matchesType =
      !selectedType || type === selectedType.toLowerCase();

    const matchesGenre =
      !selectedGenre ||
      genre.split(",").map((v) => v.trim()).includes(selectedGenre.toLowerCase());

    const matchesLanguage =
      !selectedLanguage ||
      language.split(",").map((v) => v.trim()).includes(selectedLanguage.toLowerCase());

    return (
      matchesSearch &&
      matchesType &&
      matchesGenre &&
      matchesLanguage
    );
  });

  currentPage = 1;
  renderMovies();
}

// ===============================
// PAGINATION
// ===============================

function renderPagination() {
  const pagination = $("#pagination");
  if (!pagination) return;

  pagination.replaceChildren();

  const totalPages = Math.ceil(filteredMovies.length / PAGE_SIZE);

  if (totalPages <= 1) return;

  const previous = createElement("button", "page-btn", "Previous");
  previous.type = "button";
  previous.disabled = currentPage === 1;
  previous.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderMovies();
      scrollToMovies();
    }
  });

  const pageInfo = createElement(
    "span",
    "page-info",
    `Page ${currentPage} of ${totalPages}`
  );

  const next = createElement("button", "page-btn", "Next");
  next.type = "button";
  next.disabled = currentPage === totalPages;
  next.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderMovies();
      scrollToMovies();
    }
  });

  pagination.append(previous, pageInfo, next);

  // Numbered page buttons
  const numbers = createElement("div", "page-numbers");

  for (let page = 1; page <= totalPages; page++) {
    const button = createElement("button", "page-number", String(page));
    button.type = "button";
    button.setAttribute("aria-label", `Page ${page}`);

    if (page === currentPage) {
      button.classList.add("active");
      button.setAttribute("aria-current", "page");
    }

    button.addEventListener("click", () => {
      currentPage = page;
      renderMovies();
      scrollToMovies();
    });

    numbers.appendChild(button);
  }

  pagination.appendChild(numbers);
}

function scrollToMovies() {
  $("#movieGrid")?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

// ===============================
// RENDER MOVIES
// ===============================

function renderMovies() {
  const grid = $("#movieGrid");
  if (!grid) return;

  grid.replaceChildren();

  const total = filteredMovies.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (totalPages > 0 && currentPage > totalPages) {
    currentPage = totalPages;
  }

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageMovies = filteredMovies.slice(start, start + PAGE_SIZE);

  pageMovies.forEach((movie) => {
    grid.appendChild(posterHTML(movie));
  });

  const emptyState = $("#emptyState");

  if (emptyState) {
    emptyState.hidden = total !== 0;
  }

  const resultCount = $("#resultCount");

  if (resultCount) {
    resultCount.textContent = total
      ? `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, total)} of ${total} movies`
      : "No movies found";
  }

  renderPagination();
}

// ===============================
// LOAD MOVIES FROM FIRESTORE
// ===============================

async function loadMovies() {
  const grid = $("#movieGrid");

  if (grid) {
    grid.replaceChildren(
      createElement("p", "loading-message", "Loading movies...")
    );
  }

  try {
    const titlesQuery = query(
      collection(db, "titles"),
      where("published", "==", true)
    );

    const snapshot = await getDocs(titlesQuery);

    allMovies = snapshot.docs.map((document) => ({
      id: document.id,
      ...document.data()
    }));

    // Newest first when createdAt is available.
    allMovies.sort((a, b) => {
      const getTime = (movie) => {
        const date = getField(movie, "createdAt", "created_at");

        if (date && typeof date.toMillis === "function") {
          return date.toMillis();
        }

        if (date && typeof date.seconds === "number") {
          return date.seconds * 1000;
        }

        const parsed = Date.parse(date);
        return Number.isNaN(parsed) ? 0 : parsed;
      };

      return getTime(b) - getTime(a);
    });

    if (allMovies.length === 0) {
      allMovies = sampleTitles.map((movie) => ({ ...movie }));
    }
  } catch (error) {
    console.error("Firestore movie loading error:", error);

    allMovies = sampleTitles.map((movie) => ({ ...movie }));

    const errorBox = $("#loadError");

    if (errorBox) {
      errorBox.hidden = false;
      errorBox.textContent =
        "Movies could not be loaded from Firebase. Showing sample movies. Please check Firebase configuration and Firestore rules.";
    }
  }

  fillFilters();
  applyFilters();
}

// ===============================
// MOVIE DETAILS PAGE
// ===============================

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value || "";
}

function setImage(id, url, alt) {
  const image = document.getElementById(id);
  if (!image) return;

  const validURL = safeURL(url);

  if (validURL) {
    image.src = validURL;
    image.alt = alt || "Movie poster";
    image.hidden = false;
  } else {
    image.removeAttribute("src");
    image.alt = alt || "Poster unavailable";
  }
}

function setButton(id, value) {
  const button = document.getElementById(id);
  if (!button) return;

  const url = safeURL(value);

  button.hidden = !url;
  button.disabled = !url;

  if (url) {
    button.onclick = () => window.open(url, "_blank", "noopener,noreferrer");
  } else {
    button.onclick = null;
  }
}

function renderDetails(movie) {
  const name = getMovieName(movie);

  setText("detailTitle", name);
  setText("detailType", getField(movie, "type"));
  setText("detailMeta", [
    getField(movie, "year", "releaseYear"),
    getField(movie, "language", "lang"),
    getField(movie, "genre")
  ].filter(Boolean).join(" • "));

  setText(
    "detailDescription",
    getField(movie, "description", "story", "details") || "No description available."
  );

  setText("detailLanguage", getField(movie, "language", "lang"));
  setText("detailGenre", getField(movie, "genre"));
  setText("detailYear", getField(movie, "year", "releaseYear"));

  setImage("detailPoster", getPoster(movie), name);

  for (const quality of ["480", "720", "1080", "2160"]) {
    setButton(
      `download${quality}`,
      getField(movie, `download${quality}`, `download${quality}p`)
    );

    setButton(
      `watch${quality}`,
      getField(movie, `watch${quality}`, `watch${quality}p`)
    );
  }

  setButton("tutorialLink", getField(movie, "tutorialLink", "tutorial"));

  const loading = $("#detailLoading");
  const details = $("#movieDetails");
  const error = $("#detailError");

  if (loading) loading.hidden = true;
  if (details) details.hidden = false;
  if (error) error.hidden = true;
}

async function loadMovieDetails() {
  const params = new URLSearchParams(window.location.search);
  const movieId = params.get("id");

  const loading = $("#detailLoading");
  const details = $("#movieDetails");
  const error = $("#detailError");

  if (loading) loading.hidden = false;
  if (details) details.hidden = true;
  if (error) error.hidden = true;

  if (!movieId) {
    if (loading) loading.hidden = true;

    if (error) {
      error.hidden = false;
      error.textContent = "Movie ID is missing from the URL.";
    }

    return;
  }

  // Reuse the movies already loaded on the home page, if available.
  let movie = allMovies.find((item) => item.id === movieId);

  if (!movie) {
    try {
      const titlesQuery = query(
        collection(db, "titles"),
        where("published", "==", true)
      );

      const snapshot = await getDocs(titlesQuery);

      movie = snapshot.docs
        .map((document) => ({
          id: document.id,
          ...document.data()
        }))
        .find((item) => item.id === movieId);
    } catch (err) {
      console.error("Movie details loading error:", err);
    }
  }

  if (!movie) {
    if (loading) loading.hidden = true;

    if (error) {
      error.hidden = false;
      error.textContent =
        "Movie not found. Please check that it exists and is published in the Admin Panel.";
    }

    return;
  }

  renderDetails(movie);
}

// ===============================
// SEARCH FORM AND NAVIGATION
// ===============================

function setupEvents() {
  const searchForm = $("#searchForm");

  if (searchForm) {
    searchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      applyFilters();
    });
  }

  const searchInput = $("#searchInput");

  if (searchInput) {
    searchInput.addEventListener("input", applyFilters);
  }

  ["typeFilter", "genreFilter", "languageFilter"].forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener("change", applyFilters);
    }
  });

  const menuToggle = $("#menuToggle");
  const siteNav = $("#siteNav");

  if (menuToggle && siteNav) {
    menuToggle.addEventListener("click", () => {
      const isOpen = siteNav.classList.toggle("open");

      menuToggle.setAttribute("aria-expanded", String(isOpen));
    });
  }

  const year = $("#year");

  if (year) {
    year.textContent = String(new Date().getFullYear());
  }
}

// ===============================
// START APP
// ===============================

setupEvents();

if ($("#movieGrid")) {
  loadMovies();
}

if ($("#movieDetails")) {
  loadMovieDetails();
}
