import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const sampleTitles = [
  {id:"sample-1",title:"The Last Signal",type:"movie",year:2026,genre:"Thriller",language:"Hindi",quality:"HD",description:"A fictional thriller about a mysterious signal that changes a small town.",poster:"",officialUrl:"https://www.netflix.com/",featured:true},
  {id:"sample-2",title:"City of Secrets",type:"series",year:2026,genre:"Mystery",language:"Hindi",quality:"Full HD",description:"A fictional mystery series following a journalist investigating old city secrets.",poster:"",officialUrl:"https://www.primevideo.com/",featured:true},
  {id:"sample-3",title:"Beyond the Horizon",type:"movie",year:2025,genre:"Adventure",language:"English",quality:"4K",description:"A fictional adventure story about a team crossing an unexplored landscape.",poster:"",officialUrl:"https://www.disneyplus.com/",featured:false},
  {id:"sample-4",title:"Midnight Files",type:"series",year:2025,genre:"Crime",language:"Tamil",quality:"HD",description:"A fictional crime drama about a detective reopening a cold case.",poster:"",officialUrl:"https://www.sonyliv.com/",featured:false},
  {id:"sample-5",title:"Monsoon Letters",type:"movie",year:2024,genre:"Romance",language:"Hindi",quality:"Full HD",description:"A fictional romance told through letters found during the monsoon.",poster:"",officialUrl:"https://www.zee5.com/",featured:false},
  
  {id:"sample-6",title:"The Green Room",type:"series",year:2026,genre:"Drama",language:"Malayalam",quality:"HD",description:"A fictional backstage drama about ambition, friendship and second chances.",poster:"",officialUrl:"https://www.sunnxt.com/",featured:false},
  {id:"sathi-leelavathi",title:"Sathi Leelavathi",type:"movie",year:2025,genre:"Drama",language:"Tamil",quality:"HD",description:"Sathi Leelavathi",poster:"./images/sathi.jpg",officialUrl:"https://www.diskwala.com/app/6accba3368b5fcba7d4abb4c",featured:true}
];
const grid = document.querySelector("#movieGrid");
const searchInput = document.querySelector("#searchInput");
const searchForm = document.querySelector("#searchForm");
const typeFilter = document.querySelector("#typeFilter");
const genreFilter = document.querySelector("#genreFilter");
const languageFilter = document.querySelector("#languageFilter");
const count = document.querySelector("#resultCount");
const empty = document.querySelector("#emptyState");
const dialog = document.querySelector("#detailsDialog");
const dialogContent = document.querySelector("#dialogContent");
let titles = [...sampleTitles];

function firebaseConfigured() {
  return firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("PASTE_") && firebaseConfig.projectId && firebaseConfig.projectId !== "YOUR_PROJECT_ID";
}
async function loadTitles() {
  if (firebaseConfigured()) {
    try {
      const app = initializeApp(firebaseConfig);
      const db = getFirestore(app);
      const snapshot = await getDocs(query(collection(db, "titles"), where("published", "==", true), orderBy("createdAt", "desc")));
      const online = snapshot.docs.map(d => ({id:d.id,...d.data()}));
      if (online.length) titles = online;
    } catch (err) {
      console.warn("Using demo titles; Firebase could not be loaded:", err.message);
    }
  }
  fillFilters();
  render();
}
function fillFilters() {
  const genres = [...new Set(titles.map(t=>t.genre).filter(Boolean))].sort();
  const languages = [...new Set(titles.map(t=>t.language).filter(Boolean))].sort();
  genreFilter.innerHTML = '<option value="all">All genres</option>' + genres.map(x=>`<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`).join("");
  languageFilter.innerHTML = '<option value="all">All languages</option>' + languages.map(x=>`<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`).join("");
}
function escapeHtml(value="") { return String(value).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function safeUrl(value) { try { const u=new URL(value); return ["https:","http:"].includes(u.protocol) ? u.href : ""; } catch { return ""; } }
function posterMarkup(t) {
  const src = safeUrl(t.poster || "");
  return src ? `<img class="poster" src="${escapeHtml(src)}" alt="${escapeHtml(t.title)} poster" loading="lazy" onerror="this.remove()">` : `<div class="poster-placeholder"><span>${escapeHtml(t.title)}</span></div>`;
}
function render() {
  const term = searchInput.value.trim().toLowerCase();
  const filtered = titles.filter(t => {
    const matchesText = [t.title,t.genre,t.language,String(t.year),t.type].join(" ").toLowerCase().includes(term);
    return matchesText && (typeFilter.value==="all" || t.type===typeFilter.value) && (genreFilter.value==="all" || t.genre===genreFilter.value) && (languageFilter.value==="all" || t.language===languageFilter.value);
  });
  count.textContent = `${filtered.length} title${filtered.length===1?"":"s"}`;
  empty.hidden = filtered.length > 0;
  grid.innerHTML = filtered.map(t => `
    <article class="movie-card" tabindex="0" role="button" aria-label="View ${escapeHtml(t.title)} details" data-id="${escapeHtml(t.id)}">
      <div class="poster-wrap">${posterMarkup(t)}<span class="quality-tag">${escapeHtml(t.quality || "HD")}</span></div>
      <div class="card-body"><h3 class="card-title">${escapeHtml(t.title)} (${escapeHtml(t.year || "N/A")})</h3>
      <div class="card-meta">${t.type==="series"?"Web Series":"Movie"} · ${escapeHtml(t.language || "Various")}</div>
      <div class="card-tags"><span class="tag">${escapeHtml(t.genre || "General")}</span><span class="tag">${escapeHtml(t.quality || "HD")}</span></div>
      <span class="card-link">VIEW DETAILS ↗</span></div>
    </article>`).join("");
}
function openDetails(id) {
  const t = titles.find(x=>x.id===id); if (!t) return;
  const link = safeUrl(t.officialUrl || "");
  dialogContent.innerHTML = `<div class="detail-layout"><div>${posterMarkup(t).replace('class="poster"','class="detail-poster"')}</div><div class="detail-copy"><p class="eyebrow">${t.type==="series"?"WEB SERIES":"MOVIE"} · ${escapeHtml(t.year || "Year not listed")}</p><h2>${escapeHtml(t.title)}</h2><p>${escapeHtml(t.description || "More information coming soon.")}</p><p><strong>Genre:</strong> ${escapeHtml(t.genre || "Not listed")}<br><strong>Language:</strong> ${escapeHtml(t.language || "Not listed")}<br><strong>Quality:</strong> ${escapeHtml(t.quality || "Not listed")}</p>${link?`<a class="detail-link" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">OPEN OFFICIAL STREAMING ↗</a>`:"<p>No official viewing link has been added yet.</p>"}</div></div>`;
  dialog.showModal();
}
grid.addEventListener("click", e=>{const card=e.target.closest(".movie-card");if(card)openDetails(card.dataset.id);});
grid.addEventListener("keydown", e=>{if((e.key==="Enter"||e.key===" ")&&e.target.matches(".movie-card")){e.preventDefault();openDetails(e.target.dataset.id);}});
searchInput.addEventListener("input", render);
searchForm.addEventListener("submit", e=>{e.preventDefault();render();document.querySelector("#latest").scrollIntoView({behavior:"smooth"});});
[typeFilter,genreFilter,languageFilter].forEach(el=>el.addEventListener("change",render));
document.querySelector("#closeDialog").addEventListener("click",()=>dialog.close());
dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close();});
document.querySelector("#menuToggle").addEventListener("click",()=>{const nav=document.querySelector("#siteNav");const isOpen=nav.classList.toggle("open");document.querySelector("#menuToggle").setAttribute("aria-expanded",String(isOpen));});
document.querySelector("#year").textContent = new Date().getFullYear();
loadTitles();
