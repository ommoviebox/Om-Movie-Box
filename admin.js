import {
  initializeApp,
  getApps,
  getApp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

const ADMIN_UID = "psgRupW3EfRUe61pcJzjqo36dNc2";

const $ = id => document.getElementById(id);

const loginForm = $("loginForm");
const dashboard = $("dashboard");
const authMessage = $("authMessage");
const saveMessage = $("saveMessage");
const titleForm = $("titleForm");
const list = $("adminTitles");

const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let loadingTitles = false;

function isAdmin(user) {
  return Boolean(user && user.uid === ADMIN_UID);
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function val(id) {
  return $(id).value.trim();
}

function safeUrl(value = "") {
  if (!value) return true;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

const fields = [
  ["title", "title"],
  ["contentType", "type"],
  ["yearInput", "year"],
  ["genreInput", "genre"],
  ["languageInput", "language"],
  ["qualityInput", "quality"],
  ["posterInput", "poster"],
  ["descriptionInput", "description"],
  ["officialUrlInput", "officialUrl"],

  ["watch480Input", "watch480"],
  ["download480Input", "download480"],

  ["watch720Input", "watch720"],
  ["download720Input", "download720"],

  ["watch1080Input", "watch1080"],
  ["download1080Input", "download1080"],

  ["watch2160Input", "watch2160"],
  ["download2160Input", "download2160"],

  ["tutorialUrlInput", "tutorialUrl"]
];

function resetForm() {
  titleForm.reset();
  $("editId").value = "";
  $("yearInput").value = new Date().getFullYear();
  $("publishedInput").checked = true;
  saveMessage.textContent = "";
}

$("resetForm").addEventListener("click", resetForm);

onAuthStateChanged(auth, async user => {
  if (user && !isAdmin(user)) {
    currentUser = null;
    loginForm.hidden = false;
    dashboard.hidden = true;
    authMessage.textContent =
      "यह अकाउंट Admin के लिए अधिकृत नहीं है।";

    try {
      await signOut(auth);
    } catch (error) {
      console.error(error);
    }
    return;
  }

  currentUser = user;
  loginForm.hidden = Boolean(user);
  dashboard.hidden = !user;

  if (user) {
    authMessage.textContent = "Admin login सफल।";
    await loadAdminTitles();
  }
});

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  authMessage.textContent = "Login हो रहा है…";

  try {
    await signInWithEmailAndPassword(
      auth,
      $("email").value.trim(),
      $("password").value
    );
  } catch (error) {
    authMessage.textContent =
      "Login नहीं हुआ। Email और password जाँचें।";
    console.error("Login error:", error);
  }
});

$("logoutButton").addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout error:", error);
  }
});

// Validate and build the movie data.
function buildPayload() {
  const payload = {};

  for (const [inputId, key] of fields) {
    const value = val(inputId);

    if (value && [
      "poster",
      "officialUrl",
      "watch480", "download480",
      "watch720", "download720",
      "watch1080", "download1080",
      "watch2160", "download2160",
      "tutorialUrl"
    ].includes(key) && !safeUrl(value)) {
      throw new Error(`कृपया सही URL डालें: ${key}`);
    }

    payload[key] = value;
  }

  payload.year = Number(val("yearInput"));
  payload.quality = val("qualityInput") || "HD";
  payload.published = $("publishedInput").checked;
  payload.updatedAt = serverTimestamp();
  payload.updatedBy = currentUser.uid;

  return payload;
}

titleForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (!isAdmin(currentUser)) {
    saveMessage.textContent =
      "पहले अधिकृत Admin से login करें।";
    return;
  }

  let payload;

  try {
    payload = buildPayload();
  } catch (error) {
    saveMessage.textContent = error.message;
    return;
  }

  try {
    const id = val("editId");

    if (id) {
      await updateDoc(doc(db, "titles", id), payload);
      saveMessage.textContent = "मूवी और लिंक अपडेट हो गए।";
    } else {
      await addDoc(collection(db, "titles"), {
        ...payload,
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid
      });
      saveMessage.textContent = "मूवी और लिंक सेव हो गए।";
    }

    resetForm();
    await loadAdminTitles();

  } catch (error) {
    saveMessage.textContent =
      "सेव नहीं हुआ। Firebase Console और Firestore Rules जाँचें।";
    console.error("Save error:", error);
  }
});

// Load every title, including older documents without createdAt.
async function loadAdminTitles() {
  if (!isAdmin(currentUser) || loadingTitles) return;

  loadingTitles = true;
  list.textContent = "मूवी लोड हो रही हैं…";

  try {
    const snapshot = await getDocs(collection(db, "titles"));

    const items = snapshot.docs.map(item => ({
      id: item.id,
      data: item.data()
    }));

    items.sort((a, b) => {
      const aTime = a.data.createdAt?.toMillis?.() || 0;
      const bTime = b.data.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });

    list.innerHTML = items.map(item => {
      const movie = item.data;

      return `
        <article class="admin-title-row">
          <div>
            <strong>${escapeHtml(movie.title || "Untitled")}</strong>
            <p>
              ${escapeHtml(movie.type || "movie")} ·
              ${escapeHtml(movie.year || "")} ·
              ${movie.published === true ? "Published" : "Draft"}
            </p>
          </div>
          <div class="row-actions">
            <button type="button"
              data-edit="${escapeHtml(item.id)}"
              class="secondary-button">EDIT</button>
            <button type="button"
              data-delete="${escapeHtml(item.id)}"
              class="danger-button">DELETE</button>
          </div>
        </article>
      `;
    }).join("") ||
      "<p class='muted'>अभी कोई मूवी नहीं जोड़ी गई।</p>";

  } catch (error) {
    list.textContent =
      "मूवी लोड नहीं हुई। Firestore Rules और Console जाँचें।";
    console.error("Load titles error:", error);
  } finally {
    loadingTitles = false;
  }
}

// Edit and delete existing titles.
list.addEventListener("click", async event => {
  if (!isAdmin(currentUser)) return;

  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");

  if (editButton) {
    const id = editButton.dataset.edit;

    try {
      const snapshot = await getDocs(collection(db, "titles"));
      const found = snapshot.docs.find(item => item.id === id);

      if (!found) {
        saveMessage.textContent = "मूवी नहीं मिली।";
        return;
      }

      const movie = found.data();

      $("editId").value = found.id;

      for (const [inputId, key] of fields) {
        $(inputId).value = movie[key] ?? "";
      }

      $("publishedInput").checked = movie.published === true;

      saveMessage.textContent =
        "मूवी एडिट हो रही है। बदलाव करके SAVE TITLE दबाएँ।";

      titleForm.scrollIntoView({ behavior: "smooth" });

    } catch (error) {
      saveMessage.textContent = "मूवी की जानकारी लोड नहीं हुई।";
      console.error("Edit error:", error);
    }
  }

  if (deleteButton) {
    const id = deleteButton.dataset.delete;

    if (!confirm("क्या इस मूवी को हमेशा के लिए हटाना है?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "titles", id));
      saveMessage.textContent = "मूवी डिलीट हो गई।";
      await loadAdminTitles();

    } catch (error) {
      saveMessage.textContent =
        "Delete नहीं हुआ। Firestore Rules जाँचें।";
      console.error("Delete error:", error);
    }
  }
});
