
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

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_UID = "psgRupW3EfRUe61pcJzjqo36dNc2";
const $ = id => document.getElementById(id);

const loginPanel = $("loginPanel");
const loginForm = $("loginForm");
const dashboard = $("dashboard");
const authMessage = $("authMessage");
const saveMessage = $("saveMessage");
const titleForm = $("titleForm");
const list = $("adminTitles") || $("titleList") || $("list");

let editId = null;
let currentUser = null;

const fields = [
  ["title", "title"],
  ["contentType", "type"],
  ["yearInput", "year"],
  ["genreInput", "genre"],
  ["languageInput", "language"],
  ["qualityInput", "quality"],
  ["badgeInput", "badge"],
  ["trendBadgeInput", "trendBadge"],
  ["posterInput", "poster"],
  ["descriptionInput", "description"],
  ["officialUrlInput", "officialUrl"],

  ["watch480Input", "watch480"],
  ["download480Input", "download480"],
  ["watch480TextInput", "watch480Text"],
  ["watch480SizeInput", "watch480Size"],
  ["download480TextInput", "download480Text"],
  ["download480SizeInput", "download480Size"],

  ["watch720Input", "watch720"],
  ["download720Input", "download720"],
  ["watch720TextInput", "watch720Text"],
  ["watch720SizeInput", "watch720Size"],
  ["download720TextInput", "download720Text"],
  ["download720SizeInput", "download720Size"],

  ["watch1080Input", "watch1080"],
  ["download1080Input", "download1080"],
  ["watch1080TextInput", "watch1080Text"],
  ["watch1080SizeInput", "watch1080Size"],
  ["download1080TextInput", "download1080Text"],
  ["download1080SizeInput", "download1080Size"],

  ["watch2160Input", "watch2160"],
  ["download2160Input", "download2160"],
  ["watch2160TextInput", "watch2160Text"],
  ["watch2160SizeInput", "watch2160Size"],
  ["download2160TextInput", "download2160Text"],
  ["download2160SizeInput", "download2160Size"],

  ["customButtonTypeInput", "customButtonType"],
  ["customButtonNameInput", "customButtonName"],
  ["customButtonUrlInput", "customButtonUrl"],

  ["screenshot1Input", "screenshot1"],
  ["tutorialUrlInput", "tutorialUrl"]
];

const urlFields = [
  "poster",
  "officialUrl",
  "watch480",
  "download480",
  "watch720",
  "download720",
  "watch1080",
  "download1080",
  "watch2160",
  "download2160",
  "customButtonUrl",
  "screenshot1",
  "tutorialUrl"
];

function valueOf(id) {
  const element = $(id);
  return element ? element.value.trim() : "";
}

function showMessage(element, message, isError = false) {
  if (!element) return;
  element.textContent = message;
  element.style.color = isError ? "#ff6b6b" : "#55e6a5";
}

function resetForm(clearMessage = true) {
  if (titleForm) titleForm.reset();

  editId = null;

  const year = $("yearInput");
  if (year) year.value = new Date().getFullYear();

  const quality = $("qualityInput");
  if (quality) quality.value = "HD";

  const badge = $("badgeInput");
  if (badge) badge.value = "None";

  const trendBadge = $("trendBadgeInput");
  if (trendBadge) trendBadge.value = "None";

  const customType = $("customButtonTypeInput");
  if (customType) customType.value = "download";

  const preview = $("posterPreview");
  if (preview) {
    preview.removeAttribute("src");
    preview.style.display = "none";
  }

  const previewMessage = $("posterPreviewMessage");
  if (previewMessage) previewMessage.textContent = "";

  const submitButton = titleForm?.querySelector(
    'button[type="submit"], input[type="submit"]'
  );

  if (submitButton) {
    if (submitButton.tagName === "INPUT") {
      submitButton.value = "SAVE TITLE";
    } else {
      submitButton.textContent = "SAVE TITLE";
    }
  }

  if (clearMessage) showMessage(saveMessage, "");
}

function getPayload() {
  const payload = {};

  for (const [inputId, fieldName] of fields) {
    const element = $(inputId);
    if (element) payload[fieldName] = element.value.trim();
  }

  for (const fieldName of urlFields) {
    const url = payload[fieldName];
    if (!url) continue;

    try {
      const parsed = new URL(url);

      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("Invalid URL");
      }
    } catch {
      throw new Error(
        "Galat URL: " + fieldName +
        ". Sahi image ya link URL daalein."
      );
    }
  }

  const yearValue = valueOf("yearInput");

  if (yearValue) {
    const yearNumber = Number(yearValue);

    if (
      !Number.isFinite(yearNumber) ||
      yearNumber < 1888 ||
      yearNumber > 2100
    ) {
      throw new Error("Movie ka year 1888 se 2100 ke beech daalein.");
    }

    payload.year = yearNumber;
  }

  payload.quality = valueOf("qualityInput") || "HD";
  payload.badge = valueOf("badgeInput") || "None";
  payload.trendBadge = valueOf("trendBadgeInput") || "None";

  const customName = valueOf("customButtonNameInput");
  const customUrl = valueOf("customButtonUrlInput");

  if (customName && !customUrl) {
    throw new Error("Custom Button ka URL bhi daalein.");
  }

  if (customUrl && !customName) {
    throw new Error("Custom Button ka naam bhi daalein.");
  }

  payload.customButtonType =
    valueOf("customButtonTypeInput") || "download";

  const publishedInput = $("publishedInput") || $("published");

  payload.published = publishedInput
    ? publishedInput.checked
    : true;

  payload.updatedAt = serverTimestamp();

  if (currentUser) {
    payload.updatedBy = currentUser.uid;
  }

  return payload;
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function getTitleName(data) {
  return data.title || data.name || "Untitled";
}

function renderTitleCard(id, data) {
  const title = escapeHTML(getTitleName(data));
  const year = escapeHTML(data.year || "");
  const type = escapeHTML(data.type || data.contentType || "Movie");
  const poster = escapeHTML(data.poster || "");
  const badge = escapeHTML(data.badge || "None");
  const trendBadge = escapeHTML(data.trendBadge || "None");
  const status = data.published === false ? "Unpublished" : "Published";

  return `
    <article class="admin-title-item" data-id="${escapeHTML(id)}"
      style="display:flex;gap:12px;align-items:center;padding:12px;
      margin:10px 0;border:1px solid #493651;border-radius:12px;">

      ${poster ? `<img src="${poster}" alt=""
        style="width:65px;height:90px;object-fit:cover;border-radius:8px;"
        onerror="this.style.display='none'">` : ""}

      <div style="flex:1;min-width:0;">
        <strong>${title}</strong>
        <div>${type} ${year ? "• " + year : ""}</div>
        <small>${status} · Quality: ${badge} · Highlight: ${trendBadge}</small>

        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
          <button type="button" data-action="edit"
            data-id="${escapeHTML(id)}">Edit</button>

          <button type="button" data-action="delete"
            data-id="${escapeHTML(id)}">Delete</button>
        </div>
      </div>
    </article>
  `;
}

async function loadTitles() {
  if (!list) {
    console.error("admin.html mein title list element nahi mila.");
    return;
  }

  list.innerHTML = "<p>Titles load ho rahe hain...</p>";

  try {
    const snapshot = await getDocs(collection(db, "titles"));

    const titles = snapshot.docs.map(item => ({
      id: item.id,
      data: item.data()
    }));

    titles.sort((a, b) =>
      getTitleName(a.data).localeCompare(getTitleName(b.data))
    );

    if (!titles.length) {
      list.innerHTML = "<p>Abhi koi title upload nahi hai.</p>";
      return;
    }

    list.innerHTML = titles
      .map(item => renderTitleCard(item.id, item.data))
      .join("");
  } catch (error) {
    console.error("Load titles error:", error);

    list.innerHTML = `
      <p style="color:#ff6b6b;">
        Titles load nahi hue.
        Error: ${escapeHTML(error.code || error.message || "Unknown error")}
      </p>
    `;
  }
}

function fillForm(data, id) {
  editId = id;

  for (const [inputId, fieldName] of fields) {
    const element = $(inputId);
    if (element) {
      element.value = data[fieldName] ?? "";
    }
  }

  const badge = $("badgeInput");
  if (badge) badge.value = data.badge || "None";

  const trendBadge = $("trendBadgeInput");
  if (trendBadge) trendBadge.value = data.trendBadge || "None";

  const customType = $("customButtonTypeInput");
  if (customType) {
    customType.value = data.customButtonType || "download";
  }

  const publishedInput = $("publishedInput") || $("published");

  if (publishedInput) {
    publishedInput.checked = data.published !== false;
  }

  const submitButton = titleForm?.querySelector(
    'button[type="submit"], input[type="submit"]'
  );

  if (submitButton) {
    if (submitButton.tagName === "INPUT") {
      submitButton.value = "UPDATE TITLE";
    } else {
      submitButton.textContent = "UPDATE TITLE";
    }
  }

  const posterInput = $("posterInput");
  const preview = $("posterPreview");

  if (posterInput && preview && posterInput.value.trim()) {
    preview.onload = () => {
      preview.style.display = "block";
    };

    preview.onerror = () => {
      preview.style.display = "none";
    };

    preview.src = posterInput.value.trim();
  }

  showMessage(saveMessage, "Title edit ho rahi hai.");

  titleForm?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

if (loginForm) {
  loginForm.addEventListener("submit", async event => {
    event.preventDefault();

    const email = valueOf("emailInput") || valueOf("email");
    const passwordElement = $("passwordInput") || $("password");
    const password = passwordElement?.value || "";

    if (!email || !password) {
      showMessage(authMessage, "Email aur password daalein.", true);
      return;
    }

    showMessage(authMessage, "Login ho raha hai...");

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Login error:", error);

      showMessage(
        authMessage,
        "Login nahi hua. Email, password aur Firebase Auth check karein.",
        true
      );
    }
  });
}

const logoutButton = $("logoutBtn") || $("logoutButton");

if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
      alert("Logout nahi hua. Dobara try karein.");
    }
  });
}

if (titleForm) {
  titleForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!currentUser || currentUser.uid !== ADMIN_UID) {
      showMessage(saveMessage, "Aapko admin permission nahi hai.", true);
      return;
    }

    try {
      const payload = getPayload();

      showMessage(saveMessage, "Title save ho raha hai...");

      if (editId) {
        await updateDoc(doc(db, "titles", editId), payload);
        resetForm(false);
        showMessage(saveMessage, "Title successfully update ho gaya!");
      } else {
        payload.createdAt = serverTimestamp();
        await addDoc(collection(db, "titles"), payload);
        resetForm(false);
        showMessage(saveMessage, "Title successfully upload ho gaya!");
      }

      await loadTitles();
    } catch (error) {
      console.error("Save title error:", error);

      showMessage(
        saveMessage,
        error.message || "Title save nahi hua. Firestore Rules check karein.",
        true
      );
    }
  });
}

if (list) {
  list.addEventListener("click", async event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = button.dataset.id;
    const action = button.dataset.action;

    if (!id) return;

    if (action === "edit") {
      try {
        const snapshot = await getDocs(collection(db, "titles"));
        const item = snapshot.docs.find(entry => entry.id === id);

        if (!item) {
          alert("Title nahi mila. List reload karein.");
          return;
        }

        fillForm(item.data(), id);
      } catch (error) {
        console.error("Edit title error:", error);
        alert("Title edit nahi hua: " + (error.code || error.message));
      }
    }

    if (action === "delete") {
      const confirmed = confirm(
        "Kya aap sach mein is title ko delete karna chahte hain?"
      );

      if (!confirmed) return;

      if (!currentUser || currentUser.uid !== ADMIN_UID) {
        alert("Aapko admin permission nahi hai.");
        return;
      }

      try {
        await deleteDoc(doc(db, "titles", id));
        showMessage(saveMessage, "Title delete ho gaya.");
        await loadTitles();
      } catch (error) {
        console.error("Delete title error:", error);
        alert("Title delete nahi hua: " + (error.code || error.message));
      }
    }
  });
}

onAuthStateChanged(auth, async user => {
  currentUser = user;

  if (!user) {
    if (loginPanel) loginPanel.hidden = false;
    if (loginForm) loginForm.hidden = false;
    if (dashboard) dashboard.hidden = true;

    showMessage(authMessage, "");
    return;
  }

  if (user.uid !== ADMIN_UID) {
    if (dashboard) dashboard.hidden = true;
    if (loginPanel) loginPanel.hidden = false;

    showMessage(
      authMessage,
      "Is account ko admin permission nahi hai. Sahi admin account se login karein.",
      true
    );

    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign out error:", error);
    }

    return;
  }

  if (loginPanel) loginPanel.hidden = true;
  if (loginForm) loginForm.hidden = true;
  if (dashboard) dashboard.hidden = false;

  showMessage(authMessage, "");
  await loadTitles();
});

const resetButton = $("resetForm") || $("resetBtn") || $("clearFormBtn");

if (resetButton) {
  resetButton.addEventListener("click", () => resetForm());
}

resetForm();
