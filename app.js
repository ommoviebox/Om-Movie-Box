
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_UID = "psgRupW3EfRUe61pcJzjqo36dNc2";

const $ = (id) => document.getElementById(id);

const loginPanel = $("loginPanel");
const dashboard = $("dashboard");
const loginForm = $("loginForm");
const titleForm = $("titleForm");
const titleList = $("adminTitles");
const saveMessage = $("saveMessage");
const authMessage = $("authMessage");

let editingId = null;
let loadingTitles = false;

function message(element, text, error = false) {
  if (!element) return;
  element.textContent = text;
  element.style.color = error ? "#ff7070" : "#71e7a2";
}

function value(id) {
  return $(id)?.value?.trim() || "";
}

function setValue(id, val) {
  const el = $(id);
  if (el) el.value = val ?? "";
}

function escapeHTML(text) {
  return String(text ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

const fields = [
  ["title", "title"],
  ["contentType", "contentType"],
  ["yearInput", "year"],
  ["genreInput", "genre"],
  ["languageInput", "language"],
  ["qualityInput", "quality"],
  ["posterInput", "poster"],
  ["descriptionInput", "description"],
  ["screenshot1Input", "screenshot1"],
  ["officialUrlInput", "officialUrl"],
  ["download480Input", "download480"],
  ["download480TextInput", "download480Text"],
  ["download480SizeInput", "download480Size"],
  ["watch480Input", "watch480"],
  ["watch480TextInput", "watch480Text"],
  ["download720Input", "download720"],
  ["download720TextInput", "download720Text"],
  ["download720SizeInput", "download720Size"],
  ["watch720Input", "watch720"],
  ["watch720TextInput", "watch720Text"],
  ["download1080Input", "download1080"],
  ["download1080TextInput", "download1080Text"],
  ["download1080SizeInput", "download1080Size"],
  ["watch1080Input", "watch1080"],
  ["watch1080TextInput", "watch1080Text"],
  ["download2160Input", "download2160"],
  ["download2160TextInput", "download2160Text"],
  ["download2160SizeInput", "download2160Size"],
  ["watch2160Input", "watch2160"],
  ["watch2160TextInput", "watch2160Text"],
  ["tutorialUrlInput", "tutorialUrl"]
];

function getFormData() {
  const data = {};

  for (const [inputId, field] of fields) {
    const el = $(inputId);
    if (el) data[field] = el.value.trim();
  }

  if ($("publishedInput")) {
    data.published = $("publishedInput").checked;
  }

  data.updatedAt = serverTimestamp();

  return data;
}

function fillForm(data) {
  for (const [inputId, field] of fields) {
    setValue(inputId, data[field] ?? "");
  }

  if ($("publishedInput")) {
    $("publishedInput").checked = data.published !== false;
  }

  setValue("editId", editingId || "");
  const button = titleForm?.querySelector('[type="submit"]');

  if (button) button.textContent = editingId
    ? "UPDATE TITLE"
    : "SAVE TITLE";

  message(
    saveMessage,
    editingId ? "अब जानकारी बदलकर UPDATE TITLE दबाएँ।" : ""
  );

  titleForm?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function resetForm() {
  editingId = null;
  titleForm?.reset();
  setValue("editId", "");

  const button = titleForm?.querySelector('[type="submit"]');
  if (button) button.textContent = "SAVE TITLE";

  message(saveMessage, "");
}

function safeURL(raw) {
  if (!raw) return true;

  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function validateData(data) {
  if (!data.title) {
    return "Movie title भरें।";
  }

  const urlFields = fields.filter(([, field]) =>
    /url|poster|screenshot|download|watch/i.test(field)
  );

  for (const [, field] of urlFields) {
    if (data[field] && !safeURL(data[field])) {
      return `${field} में सही http:// या https:// URL डालें।`;
    }
  }

  return "";
}

function renderMovie(id, data) {
  const card = document.createElement("div");

  card.style.cssText = [
    "padding:14px",
    "margin:10px 0",
    "border:1px solid #493553",
    "border-radius:12px",
    "background:#1c1125",
    "color:#fff7ff"
  ].join(";");

  const title = document.createElement("div");
  title.style.cssText = "font-size:16px;font-weight:700;margin-bottom:10px";
  title.textContent = data.title || "Untitled movie";

  const details = document.createElement("div");
  details.style.cssText = "font-size:13px;opacity:.8;margin-bottom:12px";
  details.textContent =
    `${data.year || ""} ${data.language || ""} ${data.quality || ""}`.trim();

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.textContent = "✏️ Edit";
  editButton.style.cssText =
    "padding:10px 16px;margin-right:8px;border:0;border-radius:7px;background:#7c3aed;color:white;font-weight:700";
  editButton.addEventListener("click", () => editMovie(id));

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.textContent = "🗑️ Delete";
  deleteButton.style.cssText =
    "padding:10px 16px;border:0;border-radius:7px;background:#dc2626;color:white;font-weight:700";
  deleteButton.addEventListener("click", () => deleteMovie(id, data.title));

  card.append(title, details, editButton, deleteButton);
  return card;
}

async function loadTitles() {
  if (!titleList || loadingTitles) return;

  loadingTitles = true;
  titleList.replaceChildren();

  const loading = document.createElement("p");
  loading.textContent = "Movies लोड हो रही हैं...";
  titleList.append(loading);

  try {
    const snapshot = await getDocs(collection(db, "titles"));

    titleList.replaceChildren();

    if (snapshot.empty) {
      const empty = document.createElement("p");
      empty.textContent = "अभी कोई movie नहीं मिली।";
      titleList.append(empty);
      return;
    }

    snapshot.forEach((item) => {
      titleList.append(renderMovie(item.id, item.data()));
    });
  } catch (error) {
    console.error("Movie list error:", error);
    titleList.replaceChildren();

    const err = document.createElement("p");
    err.textContent =
      "Movies लोड नहीं हुईं। Firebase Firestore Rules और इंटरनेट जाँचें।";
    titleList.append(err);
  } finally {
    loadingTitles = false;
  }
}

async function editMovie(id) {
  try {
    message(saveMessage, "Movie की जानकारी लोड हो रही है...");

    const snapshot = await getDoc(doc(db, "titles", id));

    if (!snapshot.exists()) {
      message(saveMessage, "यह movie Firestore में नहीं मिली।", true);
      return;
    }

    editingId = id;
    fillForm(snapshot.data());
  } catch (error) {
    console.error("Edit error:", error);
    message(
      saveMessage,
      "Movie नहीं खुली। Firebase Rules और लॉगिन जाँचें।",
      true
    );
  }
}

async function deleteMovie(id, title) {
  const confirmed = window.confirm(
    `"${title || "यह movie"}" को हमेशा के लिए Delete करना चाहते हैं?`
  );

  if (!confirmed) return;

  try {
    await deleteDoc(doc(db, "titles", id));

    if (editingId === id) resetForm();

    message(saveMessage, "Movie Delete हो गई।");
    await loadTitles();
  } catch (error) {
    console.error("Delete error:", error);
    message(
      saveMessage,
      "Delete नहीं हुआ। Firebase Firestore Rules जाँचें।",
      true
    );
  }
}

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    message(authMessage, "Login हो रहा है...");

    try {
      const email = value("email");
      const password = $("password")?.value || "";

      const result = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      if (result.user.uid !== ADMIN_UID) {
        await signOut(auth);
        message(authMessage, "इस अकाउंट को Admin अनुमति नहीं है।", true);
        return;
      }

      message(authMessage, "Login सफल।");
    } catch (error) {
      console.error("Login error:", error);
      message(authMessage, "Login नहीं हुआ। Email और Password जाँचें।", true);
    }
  });
}

if (titleForm) {
  titleForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const user = auth.currentUser;

    if (!user || user.uid !== ADMIN_UID) {
      message(saveMessage, "पहले Admin अकाउंट से Login करें।", true);
      return;
    }

    const data = getFormData();
    const validationError = validateData(data);

    if (validationError) {
      message(saveMessage, validationError, true);
      return;
    }

    const submitButton = titleForm.querySelector('[type="submit"]');
    if (submitButton) submitButton.disabled = true;

    try {
      if (editingId) {
        await updateDoc(doc(db, "titles", editingId), data);
        message(saveMessage, "Movie की जानकारी Update हो गई!");
      } else {
        data.createdAt = serverTimestamp();
        await addDoc(collection(db, "titles"), data);
        message(saveMessage, "नई Movie Save हो गई!");
      }

      resetForm();
      await loadTitles();
    } catch (error) {
      console.error("Save error:", error);
      message(
        saveMessage,
        "Save नहीं हुआ। Firebase Firestore Rules और इंटरनेट जाँचें।",
        true
      );
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

$("resetForm")?.addEventListener("click", resetForm);

$("logoutButton")?.addEventListener("click", async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, async (user) => {
  if (user && user.uid === ADMIN_UID) {
    if (loginPanel) loginPanel.style.display = "none";
    if (dashboard) dashboard.style.display = "block";
    message(authMessage, "");
    await loadTitles();
  } else {
    if (dashboard) dashboard.style.display = "none";
    if (loginPanel) loginPanel.style.display = "block";

    if (user) {
      await signOut(auth);
      message(authMessage, "इस अकाउंट को Admin अनुमति नहीं है।", true);
    }
  }
});
