// ===========================
// HUSTLR - Buyer Utilities
// ===========================

import {
  collection, query, where, getDocs, doc, getDoc, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from './firebase-config.js';
import { formatCurrency, timeAgo } from './app.js';

// ---- Get Buyer Stats ----
export async function getBuyerStats(buyerId) {
  try {
    const q = query(collection(db, 'orders'), where('buyerId', '==', buyerId));
    const snap = await getDocs(q);
    const orders = snap.docs.map(d => d.data());

    return {
      totalOrders: orders.length,
      activeOrders: orders.filter(o => !['completed','refunded'].includes(o.status)).length,
      completedOrders: orders.filter(o => o.status === 'completed').length,
      totalSpent: orders.filter(o => o.status === 'completed').reduce((s, o) => s + (o.price || 0), 0),
    };
  } catch (err) {
    return { totalOrders: 0, activeOrders: 0, completedOrders: 0, totalSpent: 0 };
  }
}

// ---- Search Freelancers ----
export async function searchFreelancers(query_str) {
  try {
    const snap = await getDocs(
      query(collection(db, 'users'),
        where('accountType', '==', 'seller'),
        where('status', '==', 'active')
      )
    );
    const sellers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (!query_str) return sellers;
    const q = query_str.toLowerCase();
    return sellers.filter(s =>
      s.fullName?.toLowerCase().includes(q) ||
      s.bio?.toLowerCase().includes(q) ||
      s.sellerProfile?.skills?.some(skill => skill.toLowerCase().includes(q))
    );
  } catch (err) {
    return [];
  }
}

// ---- Get Recommended Gigs (for buyer) ----
export async function getRecommendedGigs(limit_count = 8) {
  try {
    const { collection: col, query: q, getDocs: gd, where: w, orderBy: ob, limit: lm } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const snap = await getDocs(
      query(collection(db, 'gigs'),
        where('status', '==', 'active'),
        orderBy('rating', 'desc'),
        lm(limit_count)
      )
    );
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    return [];
  }
}

// ---- Get Buyer Notifications ----
export async function getBuyerNotifications(buyerId) {
  try {
    // Check for submitted orders awaiting review
    const q = query(collection(db, 'orders'),
      where('buyerId', '==', buyerId),
      where('status', '==', 'submitted')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({
      id: d.id,
      type: 'delivery_ready',
      title: 'Work Ready for Review',
      message: `${d.data().gigTitle} — The seller has submitted work for your approval.`,
      orderId: d.id,
      createdAt: d.data().submittedAt,
    }));
  } catch (err) {
    return [];
  }
}
