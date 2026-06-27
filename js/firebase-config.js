// ===========================
// HUSTLR - Firebase Configuration
// ===========================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyDi8FCqUU4H-b9YoYdUfwN32uSwSC5f_dQ",
  authDomain: "hustlr-c2625.firebaseapp.com",
  projectId: "hustlr-c2625",
  storageBucket: "hustlr-c2625.firebasestorage.app",
  messagingSenderId: "943453905505",
  appId: "1:943453905505:web:113035734e76ef9c444020",
  measurementId: "G-8T8JCGLKLB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Firestore
export const db = getFirestore(app);

// Storage
export const storage = getStorage(app);

export default app;
