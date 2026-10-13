import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword,
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore, collection, getDocs, addDoc,
  updateDoc, deleteDoc, doc, serverTimestamp,
  query, orderBy
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;

function isAdmin(user) {
  return !!user && user.uid === ADMIN_UID;
}

onAuthStateChanged(auth, async user => {
  if (user && !isAdmin(user)) {
    currentUser = null;
    loginForm.hidden = false;
    dashboard.hidden = true;
    authMessage.textContent = "यह अकाउंट Admin के लिए अधिकृत नहीं है।";
    await signOut(auth);
    return;
  }

  currentUser = user;
  loginForm.hidden = !!user;
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
      auth, $("email").value.trim(), $("password").value
    );
  } catch (error) {
    authMessage.textContent = "Login नहीं हुआ। Email और password जाँचें।";
    console.error(error);
  }
});

$("logoutButton").addEventListener("click", () => signOut(auth));

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  }[char]));
}

function safeUrl(value = "") {
  if (!value) return "";
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function val(id) {
  return $(id).value.trim();
}

function resetForm() {
  titleForm.reset();
  $("editId").value = "";
  $("yearInput").value = new Date().getFullYear();
  $("publishedInput").checked = true;
}

$("resetForm").addEventListener("click", resetForm);

titleForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (!isAdmin(currentUser)) {
    saveMessage.textContent = "पहले अधिकृत Admin से login करें।";
    return;
  }

  const poster = val("posterInput");
  const officialUrl = val("officialUrlInput");

  if ((poster && !safeUrl(poster)) ||
      (officialUrl && !safeUrl(officialUrl))) {
    saveMessage.textContent = "कृपया सही HTTP/HTTPS URL डालें।";
    return;
  }

  const payload = {
    title: val("title"),
    type: val("contentType"),
    year: Number(val("yearInput")),
    genre: val("genreInput"),
    language: val("languageInput"),
    quality: val("qualityInput") || "HD",
    poster,
    description: val("descriptionInput"),
    officialUrl,
    published: $("publishedInput").checked,
    updatedAt: serverTimestamp(),
    updatedBy: currentUser.uid
  };

  try {
    const id = val("editId");

    if (id) {
      await updateDoc(doc(db, "titles", id), payload);
    } else {
      await addDoc(collection(db, "titles"), {
        ...payload,
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid
      });
    }

    saveMessage.textContent = "मूवी सफलतापूर्वक सेव हो गई।";
    resetForm();
    await loadAdminTitles();
  } catch (error) {
    saveMessage.textContent =
      "सेव नहीं हुआ। Firestore Rules जाँचें।";
    console.error(error);
  }
});

async function loadAdminTitles() {
  if (!isAdmin(currentUser)) return;

  try {
    const snapshot = await getDocs(
      query(collection(db, "titles"), orderBy("createdAt", "desc"))
    );

    list.innerHTML = snapshot.docs.map(item => {
      const movie = item.data();

      return `
        <article class="admin-title-row">
          <div>
            <strong>${escapeHtml(movie.title || "Untitled")}</strong>
            <p>${escapeHtml(movie.type || "")} ·
              ${escapeHtml(movie.year || "")} ·
              ${movie.published ? "Published" : "Draft"}
            </p>
          </div>
          <div class="row-actions">
            <button type="button" data-edit="${item.id}"
              class="secondary-button">EDIT</button>
            <button type="button" data-delete="${item.id}"
              class="danger-button">DELETE</button>
          </div>
        </article>`;
    }).join("") ||
      "<p class='muted'>अभी कोई मूवी नहीं जोड़ी गई।</p>";
  } catch (error) {
    list.textContent = "मूवी लोड नहीं हुई। Firestore Rules जाँचें।";
    console.error(error);
  }
}

list.addEventListener("click", async event => {
  if (!isAdmin(currentUser)) return;

  const edit = event.target.closest("[data-edit]");
  const remove = event.target.closest("[data-delete]");

  if (edit) {
    try {
      const snapshot = await getDocs(collection(db, "titles"));
      const found = snapshot.docs.find(item => item.id === edit.dataset.edit);
      if (!found) return;

      const movie = found.data();
      $("editId").value = found.id;

      for (const [id, key] of [
        ["title", "title"],
        ["contentType", "type"],
        ["yearInput", "year"],
        ["genreInput", "genre"],
        ["languageInput", "language"],
        ["qualityInput", "quality"],
        ["posterInput", "poster"],
        ["descriptionInput", "description"],
        ["officialUrlInput", "officialUrl"]
      ]) {
        $(id).value = movie[key] ?? "";
      }

      $("publishedInput").checked = !!movie.published;
      titleForm.scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      saveMessage.textContent = "मूवी की जानकारी लोड नहीं हुई।";
      console.error(error);
    }
  }

  if (remove && confirm("क्या इस मूवी को हमेशा के लिए हटाना है?")) {
    try {
      await deleteDoc(doc(db, "titles", remove.dataset.delete));
      saveMessage.textContent = "मूवी डिलीट हो गई।";
      await loadAdminTitles();
    } catch (error) {
      saveMessage.textContent = "Delete नहीं हुआ। Rules जाँचें।";
      console.error(error);
    }
  }
});
