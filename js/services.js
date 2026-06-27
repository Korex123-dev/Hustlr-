// ===========================
// HUSTLR - Services / Gigs
// ===========================

import {
  collection, addDoc, getDocs, getDoc, doc, updateDoc,
  query, where, orderBy, limit, startAfter,
  serverTimestamp, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  ref, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

import { db, storage } from './firebase-config.js';
import { showToast, formatCurrency, renderStars } from './app.js';

// ---- Create a Gig ----
export async function createGig(gigData, sellerId) {
  try {
    const gig = {
      sellerId,
      title: gigData.title,
      description: gigData.description,
      tagline: gigData.tagline || '',
      keywords: gigData.keywords || [],
      category: gigData.category,
      packages: gigData.packages, // [{name, price, description, deliveryDays}]
      imageUrl: gigData.imageUrl || '',
      portfolioSamples: gigData.portfolioSamples || [],
      status: 'active',
      rating: 0,
      reviewCount: 0,
      orderCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'gigs'), gig);
    showToast('Your gig has been created! 🎉', 'success');
    return { success: true, id: docRef.id };
  } catch (err) {
    showToast('Failed to create gig. Please try again.', 'error');
    return { success: false, error: err.message };
  }
}

// ---- Get All Gigs (Browse) ----
export async function getGigs({ category, search, sortBy = 'createdAt', pageSize = 12, lastDoc = null } = {}) {
  try {
    let q = collection(db, 'gigs');
    const constraints = [where('status', '==', 'active')];

    if (category) constraints.push(where('category', '==', category));
    constraints.push(orderBy(sortBy, 'desc'));
    constraints.push(limit(pageSize));
    if (lastDoc) constraints.push(startAfter(lastDoc));

    const snap = await getDocs(query(q, ...constraints));
    const gigs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Client-side search filter
    const filtered = search
      ? gigs.filter(g =>
          g.title?.toLowerCase().includes(search.toLowerCase()) ||
          g.description?.toLowerCase().includes(search.toLowerCase()) ||
          g.keywords?.some(k => k.toLowerCase().includes(search.toLowerCase()))
        )
      : gigs;

    return { success: true, gigs: filtered, lastDoc: snap.docs[snap.docs.length - 1] };
  } catch (err) {
    console.error('Error fetching gigs:', err);
    return { success: false, gigs: [] };
  }
}

// ---- Get Single Gig ----
export async function getGig(gigId) {
  try {
    const snap = await getDoc(doc(db, 'gigs', gigId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (err) {
    console.error('Error fetching gig:', err);
    return null;
  }
}

// ---- Get Seller's Gigs ----
export async function getSellerGigs(sellerId) {
  try {
    const q = query(collection(db, 'gigs'), where('sellerId', '==', sellerId), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    return [];
  }
}

// ---- Update Gig ----
export async function updateGig(gigId, data) {
  try {
    await updateDoc(doc(db, 'gigs', gigId), { ...data, updatedAt: serverTimestamp() });
    showToast('Gig updated successfully!', 'success');
    return { success: true };
  } catch (err) {
    showToast('Failed to update gig.', 'error');
    return { success: false };
  }
}

// ---- Delete Gig ----
export async function deleteGig(gigId) {
  try {
    await updateDoc(doc(db, 'gigs', gigId), { status: 'deleted' });
    showToast('Gig deleted.', 'info');
    return { success: true };
  } catch (err) {
    showToast('Failed to delete gig.', 'error');
    return { success: false };
  }
}

// ---- Upload Gig Image ----
export async function uploadGigImage(file, gigId) {
  try {
    const storageRef = ref(storage, `gigs/${gigId}/cover`);
    const snap = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snap.ref);
    return { success: true, url };
  } catch (err) {
    showToast('Image upload failed.', 'error');
    return { success: false };
  }
}

// ---- Upload Portfolio Sample ----
export async function uploadPortfolioSample(file, sellerId, index) {
  try {
    const storageRef = ref(storage, `portfolio/${sellerId}/${index}_${file.name}`);
    const snap = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snap.ref);
    return { success: true, url };
  } catch (err) {
    showToast('Portfolio upload failed.', 'error');
    return { success: false };
  }
}

// ---- Get Reviews for Gig ----
export async function getGigReviews(gigId) {
  try {
    const q = query(collection(db, 'reviews'), where('gigId', '==', gigId), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    return [];
  }
}

// ---- Render Gig Card ----
export function renderGigCard(gig, seller) {
  const startingPrice = gig.packages?.[0]?.price ?? 0;
  const imageHtml = gig.imageUrl
    ? `<img src="${gig.imageUrl}" class="gig-card-image" alt="${gig.title}">`
    : `<div class="gig-card-image-placeholder">🎨</div>`;

  return `
    <div class="gig-card hover-lift" onclick="window.location.href='/gig/index.html?id=${gig.id}'">
      ${imageHtml}
      <div class="gig-card-body">
        <div class="gig-seller">
          <div class="avatar avatar-sm" style="background: linear-gradient(135deg, #2563EB, #7C3AED)">
            ${seller?.avatar ? `<img src="${seller.avatar}" alt="">` : (seller?.fullName?.[0] || 'S')}
          </div>
          <span class="gig-seller-name">${seller?.fullName || 'Freelancer'}</span>
          ${seller?.verified ? '<span class="badge badge-accent" style="font-size:0.65rem;padding:1px 6px;">✓ Verified</span>' : ''}
        </div>
        <div class="gig-title">${gig.title}</div>
        <div class="gig-meta">
          <div class="gig-rating">
            ★ <span>${gig.rating?.toFixed(1) || '0.0'}</span>
            <span class="text-muted">(${gig.reviewCount || 0})</span>
          </div>
          <div class="gig-price">
            ${formatCurrency(startingPrice)} <span>starting</span>
          </div>
        </div>
      </div>
      <div class="gig-card-footer">
        <span class="text-muted text-xs">📦 ${gig.orderCount || 0} orders</span>
        <span class="badge badge-primary text-xs">${gig.category || 'Service'}</span>
      </div>
    </div>
  `;
}

// ---- Search Suggestions ----
export function getSearchSuggestions(query, gigs) {
  const q = query.toLowerCase();
  const matches = new Set();
  gigs.forEach(g => {
    if (g.title?.toLowerCase().includes(q)) matches.add(g.title);
    g.keywords?.forEach(k => { if (k.toLowerCase().includes(q)) matches.add(k); });
  });
  return Array.from(matches).slice(0, 5);
}
