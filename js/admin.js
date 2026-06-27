// ===========================
// HUSTLR - Admin Functions
// ===========================

import {
  collection, getDocs, getDoc, doc, updateDoc, deleteDoc,
  query, where, orderBy, limit, startAfter, serverTimestamp,
  runTransaction, addDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { db } from './firebase-config.js';
import { showToast } from './app.js';

// ---- Admin Guard ----
export async function verifyAdmin(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists() || snap.data().accountType !== 'admin') {
    showToast('Access denied. Admin only.', 'error');
    window.location.href = '/';
    return false;
  }
  return true;
}

// ---- Users ----
export async function getAllUsers({ type, status, search } = {}) {
  try {
    let q = collection(db, 'users');
    const constraints = [];
    if (type) constraints.push(where('accountType', '==', type));
    if (status) constraints.push(where('status', '==', status));
    constraints.push(orderBy('createdAt', 'desc'));

    const snap = await getDocs(query(q, ...constraints));
    let users = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (search) {
      const s = search.toLowerCase();
      users = users.filter(u =>
        u.fullName?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s)
      );
    }
    return users;
  } catch (err) {
    return [];
  }
}

export async function updateUserStatus(uid, status) {
  try {
    await updateDoc(doc(db, 'users', uid), { status, updatedAt: serverTimestamp() });
    showToast(`User ${status === 'active' ? 'activated' : 'suspended'}.`, 'success');
    return { success: true };
  } catch (err) {
    showToast('Failed to update user status.', 'error');
    return { success: false };
  }
}

export async function verifyFreelancer(uid) {
  try {
    await updateDoc(doc(db, 'users', uid), { verified: true, verifiedAt: serverTimestamp() });
    showToast('Freelancer verified! ✅', 'success');
    return { success: true };
  } catch (err) {
    showToast('Verification failed.', 'error');
    return { success: false };
  }
}

export async function deleteUser(uid) {
  try {
    await updateDoc(doc(db, 'users', uid), { status: 'deleted', deletedAt: serverTimestamp() });
    showToast('User account deleted.', 'info');
    return { success: true };
  } catch (err) {
    showToast('Failed to delete user.', 'error');
    return { success: false };
  }
}

// ---- Gig Moderation ----
export async function getAllGigs({ status, category } = {}) {
  try {
    const constraints = [];
    if (status) constraints.push(where('status', '==', status));
    if (category) constraints.push(where('category', '==', category));
    constraints.push(orderBy('createdAt', 'desc'));

    const snap = await getDocs(query(collection(db, 'gigs'), ...constraints));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    return [];
  }
}

export async function updateGigStatus(gigId, status) {
  try {
    await updateDoc(doc(db, 'gigs', gigId), { status, moderatedAt: serverTimestamp() });
    showToast(`Gig ${status}.`, 'success');
    return { success: true };
  } catch (err) {
    showToast('Failed to update gig.', 'error');
    return { success: false };
  }
}

// ---- Orders ----
export async function getAllOrders({ status } = {}) {
  try {
    const constraints = [];
    if (status) constraints.push(where('status', '==', status));
    constraints.push(orderBy('createdAt', 'desc'));

    const snap = await getDocs(query(collection(db, 'orders'), ...constraints));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    return [];
  }
}

// ---- Dispute Resolution ----
export async function getDisputes() {
  try {
    const q = query(collection(db, 'orders'), where('status', '==', 'disputed'), orderBy('disputedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    return [];
  }
}

export async function resolveDispute(orderId, { resolution, refundBuyer }) {
  try {
    await runTransaction(db, async (transaction) => {
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await transaction.get(orderRef);
      const order = orderSnap.data();

      if (refundBuyer) {
        transaction.update(orderRef, {
          status: 'refunded',
          resolution,
          resolvedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Log refund transaction
        const txRef = doc(collection(db, 'transactions'));
        transaction.set(txRef, {
          orderId,
          type: 'refund',
          amount: order.price,
          buyerId: order.buyerId,
          sellerId: order.sellerId,
          status: 'processed',
          resolution,
          createdAt: serverTimestamp(),
        });
      } else {
        // Release funds to seller
        transaction.update(orderRef, {
          status: 'completed',
          escrowHeld: false,
          escrowReleasedAt: serverTimestamp(),
          resolution,
          resolvedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        const sellerRef = doc(db, 'users', order.sellerId);
        const sellerSnap = await transaction.get(sellerRef);
        const seller = sellerSnap.data();

        transaction.update(sellerRef, {
          'sellerProfile.earnings': (seller.sellerProfile?.earnings || 0) + order.sellerEarning,
        });
      }
    });

    showToast('Dispute resolved.', 'success');
    return { success: true };
  } catch (err) {
    showToast('Failed to resolve dispute.', 'error');
    return { success: false };
  }
}

// ---- Withdrawals ----
export async function getPendingWithdrawals() {
  try {
    const q = query(collection(db, 'withdrawals'), where('status', '==', 'pending'), orderBy('requestedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    return [];
  }
}

export async function approveWithdrawal(withdrawalId) {
  try {
    const wRef = doc(db, 'withdrawals', withdrawalId);
    const wSnap = await getDoc(wRef);
    const withdrawal = wSnap.data();

    await runTransaction(db, async (transaction) => {
      // Mark withdrawal as approved
      transaction.update(wRef, {
        status: 'approved',
        approvedAt: serverTimestamp(),
      });

      // Deduct from seller earnings
      const sellerRef = doc(db, 'users', withdrawal.sellerId);
      const sellerSnap = await transaction.get(sellerRef);
      const seller = sellerSnap.data();

      transaction.update(sellerRef, {
        'sellerProfile.earnings': Math.max(0, (seller.sellerProfile?.earnings || 0) - withdrawal.amount),
      });
    });

    showToast('Withdrawal approved and processed!', 'success');
    return { success: true };
  } catch (err) {
    showToast('Failed to approve withdrawal.', 'error');
    return { success: false };
  }
}

export async function rejectWithdrawal(withdrawalId, reason) {
  try {
    await updateDoc(doc(db, 'withdrawals', withdrawalId), {
      status: 'rejected',
      rejectionReason: reason,
      rejectedAt: serverTimestamp(),
    });
    showToast('Withdrawal rejected.', 'info');
    return { success: true };
  } catch (err) {
    showToast('Failed to reject withdrawal.', 'error');
    return { success: false };
  }
}

// ---- Link Reviews ----
export async function getPendingLinks() {
  try {
    const q = query(collection(db, 'linkReviews'), where('status', '==', 'pending'), orderBy('requestedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    return [];
  }
}

export async function reviewLink(linkId, approved) {
  try {
    await updateDoc(doc(db, 'linkReviews', linkId), {
      status: approved ? 'approved' : 'rejected',
      reviewedAt: serverTimestamp(),
    });
    showToast(`Link ${approved ? 'approved' : 'rejected'}.`, approved ? 'success' : 'info');
    return { success: true };
  } catch (err) {
    showToast('Failed to review link.', 'error');
    return { success: false };
  }
}

// ---- Analytics ----
export async function getAnalytics() {
  try {
    const [usersSnap, gigsSnap, ordersSnap, txSnap] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(query(collection(db, 'gigs'), where('status', '==', 'active'))),
      getDocs(collection(db, 'orders')),
      getDocs(query(collection(db, 'transactions'), where('type', '==', 'payout'))),
    ]);

    const orders = ordersSnap.docs.map(d => d.data());
    const transactions = txSnap.docs.map(d => d.data());

    const totalRevenue = transactions.reduce((sum, t) => sum + (t.commission || 0), 0);
    const completedOrders = orders.filter(o => o.status === 'completed').length;
    const activeOrders = orders.filter(o => !['completed', 'refunded', 'disputed'].includes(o.status)).length;

    const users = usersSnap.docs.map(d => d.data());
    const buyers = users.filter(u => u.accountType === 'buyer').length;
    const sellers = users.filter(u => u.accountType === 'seller').length;

    return {
      totalUsers: usersSnap.size,
      buyers, sellers,
      activeGigs: gigsSnap.size,
      totalOrders: ordersSnap.size,
      completedOrders,
      activeOrders,
      totalRevenue,
    };
  } catch (err) {
    console.error('Analytics error:', err);
    return {};
  }
}
