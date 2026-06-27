// ===========================
// HUSTLR - Seller Utilities
// ===========================

import {
  collection, query, where, getDocs, doc, getDoc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from './firebase-config.js';
import { formatCurrency, timeAgo, COMMISSION_RATE } from './app.js';

// ---- Get Seller Notifications ----
export async function getSellerNotifications(sellerId) {
  try {
    const q = query(collection(db, 'orders'),
      where('sellerId', '==', sellerId),
      where('status', '==', 'pending')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({
      id: d.id,
      type: 'new_order',
      title: 'New Order!',
      message: `New order for ${d.data().gigTitle} — ${d.data().packageName}`,
      orderId: d.id,
      amount: d.data().sellerEarning,
    }));
  } catch (err) {
    return [];
  }
}

// ---- Get Seller Dashboard Data ----
export async function getSellerDashboardData(sellerId) {
  try {
    const [ordersSnap, gigsSnap] = await Promise.all([
      getDocs(query(collection(db, 'orders'), where('sellerId', '==', sellerId))),
      getDocs(query(collection(db, 'gigs'), where('sellerId', '==', sellerId)))
    ]);

    const orders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const gigs = gigsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const completed = orders.filter(o => o.status === 'completed');
    const active = orders.filter(o => !['completed', 'refunded'].includes(o.status));
    const pending = orders.filter(o => o.status === 'pending');

    const totalEarned = completed.reduce((s, o) => s + (o.sellerEarning || 0), 0);
    const inEscrow = active.reduce((s, o) => s + (o.sellerEarning || 0), 0);

    return {
      orders, gigs,
      stats: {
        totalOrders: orders.length,
        activeOrders: active.length,
        completedOrders: completed.length,
        pendingOrders: pending.length,
        totalEarned,
        inEscrow,
        activeGigs: gigs.filter(g => g.status === 'active').length,
      }
    };
  } catch (err) {
    return { orders: [], gigs: [], stats: {} };
  }
}

// ---- Calculate Commission ----
export function calculatePayout(price) {
  const commission = Math.round(price * COMMISSION_RATE);
  const payout = price - commission;
  return { price, commission, payout, rate: COMMISSION_RATE * 100 };
}

// ---- Update Seller Profile ----
export async function updateSellerProfile(sellerId, data) {
  try {
    await updateDoc(doc(db, 'users', sellerId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (err) {
    return { success: false };
  }
}

// ---- Add Skill ----
export async function addSellerSkill(sellerId, skill, currentSkills = []) {
  try {
    const skills = [...currentSkills, skill].filter((s, i, arr) => arr.indexOf(s) === i);
    await updateDoc(doc(db, 'users', sellerId), {
      'sellerProfile.skills': skills,
      updatedAt: serverTimestamp(),
    });
    return { success: true, skills };
  } catch (err) {
    return { success: false };
  }
}

// ---- Remove Skill ----
export async function removeSellerSkill(sellerId, skill, currentSkills = []) {
  try {
    const skills = currentSkills.filter(s => s !== skill);
    await updateDoc(doc(db, 'users', sellerId), {
      'sellerProfile.skills': skills,
      updatedAt: serverTimestamp(),
    });
    return { success: true, skills };
  } catch (err) {
    return { success: false };
  }
}

// ---- Check Withdrawal Eligibility ----
export function checkWithdrawalEligibility(availableBalance, requestedAmount) {
  const MIN_WITHDRAWAL = 500;
  const errors = [];
  if (requestedAmount < MIN_WITHDRAWAL) errors.push(`Minimum withdrawal is ₦${MIN_WITHDRAWAL.toLocaleString()}`);
  if (requestedAmount > availableBalance) errors.push('Requested amount exceeds available balance');
  return { eligible: errors.length === 0, errors };
}
