// ===========================
// HUSTLR - Authentication
// ===========================

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  doc, setDoc, getDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { auth, googleProvider, db } from './firebase-config.js';
import { showToast } from './app.js';

// ---- Auth State Observer ----
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser() {
  return auth.currentUser;
}

// ---- Register with Email ----
export async function registerWithEmail({ email, password, fullName, accountType }) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: fullName });

    // Create user profile in Firestore
    await setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid,
      email,
      fullName,
      accountType, // 'buyer' | 'seller' | 'admin'
      avatar: '',
      bio: '',
      verified: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: 'active',
      // Seller-specific
      ...(accountType === 'seller' ? {
        sellerProfile: {
          rating: 0,
          reviewCount: 0,
          completedOrders: 0,
          earnings: 0,
          skills: [],
          portfolioSamples: [],
        }
      } : {}),
      // Buyer-specific
      ...(accountType === 'buyer' ? {
        buyerProfile: {
          totalSpent: 0,
          orderCount: 0,
        }
      } : {}),
    });

    showToast('Account created successfully! Welcome to Hustlr 🎉', 'success');
    return { success: true, user: cred.user };
  } catch (err) {
    const message = getAuthError(err.code);
    showToast(message, 'error');
    return { success: false, error: message };
  }
}

// ---- Login with Email ----
export async function loginWithEmail({ email, password }) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    showToast(`Welcome back, ${cred.user.displayName || 'User'}! 👋`, 'success');
    return { success: true, user: cred.user };
  } catch (err) {
    const message = getAuthError(err.code);
    showToast(message, 'error');
    return { success: false, error: message };
  }
}

// ---- Login with Google ----
export async function loginWithGoogle(accountType = 'buyer') {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Check if user profile exists
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // Create new profile for Google users
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        fullName: user.displayName || 'User',
        accountType,
        avatar: user.photoURL || '',
        bio: '',
        verified: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'active',
        ...(accountType === 'seller' ? {
          sellerProfile: { rating: 0, reviewCount: 0, completedOrders: 0, earnings: 0, skills: [], portfolioSamples: [] }
        } : {
          buyerProfile: { totalSpent: 0, orderCount: 0 }
        }),
      });
      showToast('Welcome to Hustlr! 🎉', 'success');
    } else {
      showToast(`Welcome back, ${user.displayName}! 👋`, 'success');
    }

    return { success: true, user, isNew: !userSnap.exists() };
  } catch (err) {
    const message = getAuthError(err.code);
    showToast(message, 'error');
    return { success: false, error: message };
  }
}

// ---- Logout ----
export async function logout() {
  try {
    await signOut(auth);
    showToast('You have been logged out.', 'info');
    window.location.href = '/';
  } catch (err) {
    showToast('Logout failed. Please try again.', 'error');
  }
}

// ---- Reset Password ----
export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    showToast('Password reset email sent! Check your inbox.', 'success');
    return { success: true };
  } catch (err) {
    const message = getAuthError(err.code);
    showToast(message, 'error');
    return { success: false, error: message };
  }
}

// ---- Get User Profile ----
export async function getUserProfile(uid) {
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (err) {
    console.error('Error getting user profile:', err);
    return null;
  }
}

// ---- Redirect After Login ----
export function redirectAfterLogin(user, profile) {
  const accountType = profile?.accountType || 'buyer';
  const redirectMap = {
    buyer: '/buyer/dashboard.html',
    seller: '/seller/dashboard.html',
    admin: '/admin/dashboard.html',
  };
  window.location.href = redirectMap[accountType] || '/buyer/dashboard.html';
}

// ---- Validate Password ----
export function validatePassword(password) {
  const errors = [];
  if (password.length < 8) errors.push('At least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
  if (!/[0-9]/.test(password)) errors.push('One number');
  return errors;
}

// ---- Error Messages ----
function getAuthError(code) {
  const errors = {
    'auth/email-already-in-use': 'This email is already registered. Please log in.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-credential': 'Invalid email or password. Please try again.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
  };
  return errors[code] || 'An error occurred. Please try again.';
}

// ---- Check if Admin ----
export async function isAdmin(uid) {
  const profile = await getUserProfile(uid);
  return profile?.accountType === 'admin';
}
