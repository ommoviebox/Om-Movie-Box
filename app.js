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
"18+ [Adult]", "Action", "Anime / Animation", "Bengali",
"Bollywood Movies", "Bhojpuri", "Comedy", "Crime", "Drama",
"Dual Audio", "English Movies", "Gujarati", "Haryanvi",
"Hindi Dubbed", "Hollywood Movies", "Horror", "K-Drama",
"Kannada", "Korean", "Malayalam", "Marathi", "Punjabi",
"Rajasthani", "Romance", "South Hindi Movies", "Tamil",
"Telugu", "Thriller", "TV-Shows", "UnOfficial Dubbed",
"WEB-Series", "Ullu Web Series"
];

function safeURL(value) {
if (!value) return "";
try {
const url = new URL(String(value).trim());
return ["https:", "http:"].includes(url.protocol) ? url.href : "";
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
movie.title, movie.genre, movie.language, movie.year,
movie.contentType, movie.type, movie.description,
movie.quality, movie.category, movie.categories,
movie.audio, movie.tags
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
return normalize(movie.language).includes(cat) || text.includes(cat);
}

if (category === "WEB-Series" || category === "TV-Shows") {
return /web[\s-]*series|series|tv[\s-]*shows|television/.test(text);
}

if (category === "Bollywood Movies") return /bollywood|hindi/.test(text);

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

if (category === "Anime / Animation") return /anime|animation|animated/.test(text);
if (category === "Dual Audio") return /dual audio|dual language|multi audio/.test(text);
if (category === "K-Drama") return /k drama|korean drama/.test(text);
if (category === "18+ [Adult]") return /18+|adult/.test(text);
if (category === "Ullu Web Series") return /ullu/.test(text);

return text.includes(cat);
}

/* CATEGORY BUTTONS */
function setupCategories() {
if (!siteNav) return;

const categoryBox = document.createElement("div");
categoryBox.id = "categoryButtons";
categoryBox.className = "category-buttons";

Object.assign(categoryBox.style, {
display: "flex",
flexWrap: "wrap",
gap: "6px",
width: "100%",
justifyContent: "center"
});

siteNav.replaceChildren(categoryBox);

function addCategoryButton(category) {
const button = document.createElement("button");

button.type = "button";  
button.className = "category-button";  
button.textContent = category;  
button.dataset.category = category;  
button.setAttribute("aria-pressed", "false");  

button.style.setProperty("background-color", "#c6ff00", "important");  
button.style.setProperty("background-image", "none", "important");  
button.style.setProperty("color", "#000000", "important");  
button.style.setProperty("border", "1px solid #c6ff00", "important");  
button.style.setProperty("border-radius", "8px", "important");  
button.style.setProperty("font-family", "Arial, Helvetica, sans-serif", "important");  
button.style.setProperty(  
  "font-size",  
  window.matchMedia("(max-width: 600px)").matches ? "15px" : "19px",  
  "important"  
);  
button.style.setProperty("font-weight", "500", "important");  
button.style.setProperty("letter-spacing", "0px", "important");  
button.style.setProperty("line-height", "1.2", "important");  
button.style.setProperty("box-shadow", "none", "important");  
button.style.setProperty("text-shadow", "none", "important");  
button.style.setProperty("padding", "5px 8px", "important");  
button.style.setProperty("min-height", "30px", "important");  
button.style.setProperty("cursor", "pointer", "important");  

categoryBox.appendChild(button);

}

addCategoryButton("All");
categories
.filter((category) => category !== "Movies4u")
.forEach(addCategoryButton);

categoryBox.addEventListener("click", (event) => {
const button = event.target.closest("button[data-category]");
if (!button) return;

activeCategory = button.dataset.category;  

categoryBox.querySelectorAll(".category-button").forEach((item) => {  
  const active = item.dataset.category === activeCategory;  
  item.classList.toggle("active", active);  
  item.setAttribute("aria-pressed", String(active));  
});  

applyFilters();  

if (window.matchMedia("(max-width: 600px)").matches) {  
  setMenuOpen(false);  
}  

$("latest")?.scrollIntoView({ behavior: "smooth" });

});

const allButton = categoryBox.querySelector('[data-category="All"]');
allButton?.classList.add("active");
allButton?.setAttribute("aria-pressed", "true");
}

/* MENU: SINGLE CLICK HANDLER */
function setMenuOpen(open) {
if (!menuToggle || !siteNav) return;

const isMobile = window.matchMedia("(max-width: 600px)").matches;
const shouldShow = !isMobile || open;

menuToggle.setAttribute("aria-expanded", String(isMobile && open));
siteNav.classList.toggle("open", isMobile && open);
siteNav.hidden = !shouldShow;

siteNav.style.setProperty(
"display",
shouldShow ? "block" : "none",
"important"
);
}

function setupMenu() {
if (!menuToggle || !siteNav) return;

menuToggle.type = "button";
menuToggle.setAttribute("aria-controls", "siteNav");

setMenuOpen(false);

menuToggle.addEventListener("click", (event) => {
event.preventDefault();

if (!window.matchMedia("(max-width: 600px)").matches) return;  

const isOpen = menuToggle.getAttribute("aria-expanded") === "true";  
setMenuOpen(!isOpen);

});

window.addEventListener("resize", () => {
if (window.matchMedia("(max-width: 600px)").matches) {
setMenuOpen(menuToggle.getAttribute("aria-expanded") === "true");
} else {
setMenuOpen(false);
}
});
}

/* MOVIE CARDS */
function renderCard(movie) {
const card = document.createElement("a");
card.className = "movie-card";
card.href = movie.html?id=${encodeURIComponent(movie.id)};

const posterWrap = document.createElement("div");
posterWrap.className = "poster-wrap";

const placeholder = document.createElement("div");
placeholder.className = "poster-placeholder";
placeholder.textContent = "OM";
placeholder.style.display = "none";

const posterURL = safeURL(movie.poster);

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

/* SEARCH AND FILTERS */
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
const type = getFilterValue(["typeFilter", "contentTypeFilter", "typeSelect"]);

filteredMovies = allMovies.filter((movie) => {
const searchable = movieText(movie);

if (queryText && !searchable.includes(normalize(queryText))) return false;  
if (genre && !normalize(movie.genre).includes(genre)) return false;  
if (language && !normalize(movie.language).includes(language)) return false;  
if (type && !normalize(movie.contentType || movie.type).includes(type)) return false;  
if (!matchesCategory(movie, activeCategory)) return false;  

return true;

});

currentPage = 1;
renderMovies();
}

/* PAGINATION AND DISPLAY */
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
count.textContent = ${total} ${total === 1 ? "title" : "titles"};
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
label.textContent = Page ${currentPage} of ${totalPages};
pagination.appendChild(label);

pagination.appendChild(
makeButton("Next →", currentPage + 1, currentPage === totalPages)
);
}

/* SEARCH FORM */
function setupFilters() {
$("searchForm")?.addEventListener("submit", (event) => {
event.preventDefault();
applyFilters();
});

$("searchInput")?.addEventListener("input", applyFilters);

[
"genreFilter", "genreSelect", "languageFilter", "languageSelect",
"typeFilter", "contentTypeFilter", "typeSelect"
].forEach((id) => $(id)?.addEventListener("change", applyFilters));
}

/* LOAD PUBLISHED MOVIES FROM FIRESTORE */
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

/* START WEBSITE */
setupMenu();
setupCategories();
setupFilters();
loadMovies();
