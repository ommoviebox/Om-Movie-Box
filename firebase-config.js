
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

import {
  getAuth
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyA9o_v_OtZiNivu57yaHLDZOaRRETXu9Ew",
  authDomain: "om-movie-box.firebaseapp.com",
  projectId: "om-movie-box",
  storageBucket: "om-movie-box.firebasestorage.app",
  messagingSenderId: "726664420965",
  appId: "1:726664420965:web:d2fb1c57828a006ac7708c",
  measurementId: "G-HWZ0318VEH"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
