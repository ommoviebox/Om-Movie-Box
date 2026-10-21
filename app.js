
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
const menuToggle = $("menuToggle");
const siteNav = $("siteNav");

let allMovies = [];
let filteredMovies = [];
let currentPage = 1;
let activeCategory = "All";

const pageSize = 30;

const categories = [
  "Movies4u",
  "18+ [Adult]",
  "Action",
  "Anime / Animation",
  "Bengali",
  "Bollywood Movies",
  "Bhojpuri",
  "Comedy",
  "Crime",
  "Drama",
  "Dual Audio",
  "English Movies",
  "Gujarati",
  "Haryanvi",
  "Hindi Dubbed",
  "Hollywood Movies",
  "Horror",
  "K-Drama",
  "Kannada",
  "Korean",
  "Malayalam",
  "Marathi",
  "Punjabi",
  "Rajasthani",
  "Romance",
  "South Hindi Movies",
  "Tamil",
  "Telugu",
  "Thriller",
  "TV-Shows",
  "UnOfficial Dubbed",
  "WEB-Series",
  "Ullu Web Series"
];

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

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function movieText(movie) {
  return normalize([
    movie.title,
    movie.genre,
    movie.language,
    movie.year,
    movie.contentType,
    movie.type,
    movie.description,
    movie.quality,
    movie.category,
    movie.categories,
    movie.audio,
    movie.tags
  ].flat().join(" "));
}

function matchesCategory(movie, category) {
  if (category === "All") return true;

  const text = movieText(movie);
  const cat = normalize(category);

  const languages = [
    "Bengali", "Bhojpuri", "Gujarati", "Haryanvi",
    "Kannada", "Korean", "Malayalam", "Marathi",
    "Punjabi", "Rajasthani", "Tamil", "Telugu"
  ];

  if (languages.includes(category)) {
    return normalize(movie.language).includes(cat) ||
      text.includes(cat);
  }

  if (category === "WEB-Series" || category === "TV-Shows") {
    return /web[\s-]*series|series|tv[\s-]*shows|television/.test(text);
  }

  if (category === "Bollywood Movies") {
    return /bollywood|hindi/.test(text);
  }

  if (category === "Hollywood Movies" || category === "English Movies") {
    return /hollywood|english/.test(text);
  }

  if (category === "South Hindi Movies") {
    return /south|tamil|telugu|malayalam|kannada/.test(text) &&
      /hindi/.test(text);
  }

  if (category === "Hindi Dubbed" || category === "UnOfficial Dubbed") {
    return /hindi dubbed|dubbed|unofficial dubbed/.test(text);
  }

  if (category === "Anime / Animation") {
    return /anime|animation|animated/.test(text);
  }

  if (category === "Dual Audio") {
    return /dual audio|dual language|multi audio/.test(text);
  }

  if (category === "K-Drama") {
    return /k drama|korean drama/.test(text);
  }

  if (category === "18+ [Adult]") {
    return /18\+|adult/.test(text);
  }

  if (category === "Movies4u") {
    return /movies4u/.test(text);
  }

  if (category === "Ullu Web Series") {
    return /ullu/.test(text);
  }

  return text.includes(cat);
}

/* Create category buttons inside the existing MENU */
function setupCategories() {
  if (!siteNav) return;

  let categoryBox = $("categoryButtons");

  if (!categoryBox) {
    categoryBox = document.createElement("div");
    categoryBox.id = "categoryButtons";
    categoryBox.className = "category-buttons";
    siteNav.appendChild(categoryBox);
  }

  categoryBox.replaceChildren();

  const allButton = document.createElement("button");
  allButton.type = "button";
  allButton.className = "category-button";
  allButton.textContent = "All";
  allButton.dataset.category = "All";
  categoryBox.appendChild(allButton);

  categories.forEach((category) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "category-button";
    button.textContent = category;
    button.dataset.category = category;

    categoryBox.appendChild(button);
  });

  categoryBox.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-category]");
    if (!button) return;

    activeCategory = button.dataset.category;

    categoryBox.querySelectorAll(".category-button").forEach((item) => {
      item.classList.toggle(
        "active",
        item.dataset.category === activeCategory
      );
      item.setAttribute(
        "aria-pressed",
        String(item.dataset.category === activeCategory)
      );
    });

    applyFilters();

    if (window.innerWidth <= 600 && siteNav) {
      siteNav.classList.remove("open");
      menuToggle?.setAttribute("aria-expanded", "false");
    }

    $("latest")?.scrollIntoView({ behavior: "smooth" });
  });

  allButton.classList.add("active");
  allButton.setAttribute("aria-pressed", "true");
}

/* Mobile MENU open and close */
function setupMenu() {
  if (!menuToggle || !siteNav) return;

  menuToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

function renderCard(movie) {
  const card = document.createElement("a");
  card.className = "movie-card";
  card.href = `movie.html?id=${encodeURIComponent(movie.id)}`;

  const posterURL = safeURL(movie.poster);
  const posterWrap = document.createElement("div");
  posterWrap.className = "poster-wrap";

  const placeholder = document.createElement("div");
  placeholder.className = "poster-placeholder";
  placeholder.textContent = "OM";
  placeholder.style.display = "none";

  if (posterURL) {
    const image = document.createElement("img");

    image.className = "poster";
    image.alt = movie.title || "Movie poster";
    image.loading = "lazy";
    image.decoding = "async";
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
    const searchable = movieText(movie);

    if (queryText && !searchable.includes(normalize(queryText))) {
      return false;
    }

    if (
      genre &&
      !normalize(movie.genre).includes(genre)
    ) return false;

    if (
      language &&
      !normalize(movie.language).includes(language)
    ) return false;

    if (
      type &&
      !normalize(movie.contentType || movie.type).includes(type)
    ) return false;

    if (!matchesCategory(movie, activeCategory)) return false;

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

  filteredMovies.slice(start, start + pageSize)
    .forEach((movie) => grid.appendChild(renderCard(movie)));

  if (count) {
    count.textContent = `${total} ${total === 1 ? "title" : "titles"}`;
  }

  if (empty) {
    empty.hidden = total !== 0;
    empty.textContent = allMovies.length
      ? "No titles match your search or selected category."
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
  $("searchForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    applyFilters();
  });

  $("searchInput")?.addEventListener("input", applyFilters);

  [
    "genreFilter", "genreSelect", "languageFilter",
    "languageSelect", "typeFilter", "contentTypeFilter", "typeSelect"
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
      .map((item) => ({ id: item.id, ...item.data() }))
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

setupMenu();
setupCategories();
setupFilters();
loadMovies();
