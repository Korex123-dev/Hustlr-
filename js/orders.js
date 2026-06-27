// ===========================
// HUSTLR - Orders & Escrow
// ===========================

import {
  collection, addDoc, getDocs, getDoc, doc, updateDoc,
  query, where, orderBy, serverTimestamp, runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

import { db, storage } from './firebase-config.js';
import { showToast, formatCurrency, COMMISSION_RATE } from './app.js';

// ---- Place Order ----
export async function placeOrder({ gigId, gigTitle, sellerId, buyerId, packageIndex, packageDetails, requirements }) {
  try {
    const price = packageDetails.price;
    const commission = Math.round(price * COMMISSION_RATE);
    const sellerEarning = price - commission;

    const order = {
      gigId,
      gigTitle,
      sellerId,
      buyerId,
      packageIndex,
      packageName: packageDetails.name,
      price,
      commission,
      sellerEarning,
      requirements,
      status: 'pending',
      escrowHeld: true,
      escrowReleasedAt: null,
      deliveryDays: packageDetails.deliveryDays || 3,
      deadline: new Date(Date.now() + (packageDetails.deliveryDays || 3) * 86400000),
      files: { buyer: [], seller: [] },
      revisionCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'orders'), order);

    // Log transaction
    await addDoc(collection(db, 'transactions'), {
      orderId: docRef.id,
      type: 'payment',
      amount: price,
      buyerId,
      sellerId,
      status: 'held',
      createdAt: serverTimestamp(),
    });

    showToast('Order placed! Awaiting seller acceptance.', 'success');
    return { success: true, orderId: docRef.id };
  } catch (err) {
    showToast('Failed to place order. Please try again.', 'error');
    return { success: false, error: err.message };
  }
}

// ---- Accept Order (Seller) ----
export async function acceptOrder(orderId) {
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      status: 'accepted',
      acceptedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    showToast('Order accepted! Time to get to work 💪', 'success');
    return { success: true };
  } catch (err) {
    showToast('Failed to accept order.', 'error');
    return { success: false };
  }
}

// ---- Start Order ----
export async function startOrder(orderId) {
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      status: 'in_progress',
      startedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (err) {
    return { success: false };
  }
}

// ---- Submit Delivery (Seller) ----
export async function submitDelivery(orderId, { message, files = [] }) {
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      status: 'submitted',
      deliveryMessage: message,
      deliveryFiles: files,
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    showToast('Work submitted! Waiting for buyer approval.', 'success');
    return { success: true };
  } catch (err) {
    showToast('Delivery submission failed.', 'error');
    return { success: false };
  }
}

// ---- Request Revision (Buyer) ----
export async function requestRevision(orderId, reason) {
  try {
    const orderRef = doc(db, 'orders', orderId);
    const snap = await getDoc(orderRef);
    const current = snap.data();

    await updateDoc(orderRef, {
      status: 'revision',
      revisionReason: reason,
      revisionCount: (current.revisionCount || 0) + 1,
      updatedAt: serverTimestamp(),
    });
    showToast('Revision requested.', 'info');
    return { success: true };
  } catch (err) {
    showToast('Failed to request revision.', 'error');
    return { success: false };
  }
}

// ---- Approve Delivery & Release Escrow (Buyer) ----
export async function approveDelivery(orderId) {
  try {
    await runTransaction(db, async (transaction) => {
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await transaction.get(orderRef);
      const order = orderSnap.data();

      // Update order
      transaction.update(orderRef, {
        status: 'completed',
        escrowHeld: false,
        escrowReleasedAt: serverTimestamp(),
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update seller earnings
      const sellerRef = doc(db, 'users', order.sellerId);
      const sellerSnap = await transaction.get(sellerRef);
      const seller = sellerSnap.data();
      const currentEarnings = seller.sellerProfile?.earnings || 0;

      transaction.update(sellerRef, {
        'sellerProfile.earnings': currentEarnings + order.sellerEarning,
        'sellerProfile.completedOrders': (seller.sellerProfile?.completedOrders || 0) + 1,
      });

      // Log payout transaction
      const txRef = doc(collection(db, 'transactions'));
      transaction.set(txRef, {
        orderId,
        type: 'payout',
        amount: order.sellerEarning,
        commission: order.commission,
        buyerId: order.buyerId,
        sellerId: order.sellerId,
        status: 'completed',
        createdAt: serverTimestamp(),
      });
    });

    showToast('Delivery approved! Funds released to seller 🎉', 'success');
    return { success: true };
  } catch (err) {
    showToast('Failed to approve delivery.', 'error');
    return { success: false };
  }
}

// ---- Dispute Order (Buyer) ----
export async function disputeOrder(orderId, reason) {
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      status: 'disputed',
      disputeReason: reason,
      disputedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    showToast('Dispute submitted. Admin will review within 24 hours.', 'warning');
    return { success: true };
  } catch (err) {
    showToast('Failed to submit dispute.', 'error');
    return { success: false };
  }
}

// ---- Upload Order File ----
export async function uploadOrderFile(file, orderId, role) {
  try {
    const storageRef = ref(storage, `orders/${orderId}/${role}/${file.name}`);
    const snap = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snap.ref);

    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);
    const current = orderSnap.data();
    const files = current.files?.[role] || [];

    await updateDoc(orderRef, {
      [`files.${role}`]: [...files, { name: file.name, url, uploadedAt: new Date().toISOString() }],
      updatedAt: serverTimestamp(),
    });

    return { success: true, url };
  } catch (err) {
    showToast('File upload failed.', 'error');
    return { success: false };
  }
}

// ---- Get Orders for Buyer ----
export async function getBuyerOrders(buyerId) {
  try {
    const q = query(collection(db, 'orders'), where('buyerId', '==', buyerId), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    return [];
  }
}

// ---- Get Orders for Seller ----
export async function getSellerOrders(sellerId) {
  try {
    const q = query(collection(db, 'orders'), where('sellerId', '==', sellerId), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    return [];
  }
}

// ---- Get Single Order ----
export async function getOrder(orderId) {
  try {
    const snap = await getDoc(doc(db, 'orders', orderId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (err) {
    return null;
  }
}

// ---- Submit Review ----
export async function submitReview(orderId, { gigId, sellerId, buyerId, rating, categories, comment }) {
  try {
    await runTransaction(db, async (transaction) => {
      // Add review
      const reviewRef = doc(collection(db, 'reviews'));
      transaction.set(reviewRef, {
        orderId, gigId, sellerId, buyerId,
        rating, categories, comment,
        createdAt: serverTimestamp(),
      });

      // Update gig rating
      const gigRef = doc(db, 'gigs', gigId);
      const gigSnap = await transaction.get(gigRef);
      const gig = gigSnap.data();
      const newCount = (gig.reviewCount || 0) + 1;
      const newRating = ((gig.rating || 0) * (gig.reviewCount || 0) + rating) / newCount;

      transaction.update(gigRef, { rating: newRating, reviewCount: newCount });

      // Update seller rating
      const sellerRef = doc(db, 'users', sellerId);
      const sellerSnap = await transaction.get(sellerRef);
      const seller = sellerSnap.data();
      const sCount = (seller.sellerProfile?.reviewCount || 0) + 1;
      const sRating = ((seller.sellerProfile?.rating || 0) * (seller.sellerProfile?.reviewCount || 0) + rating) / sCount;

      transaction.update(sellerRef, {
        'sellerProfile.rating': sRating,
        'sellerProfile.reviewCount': sCount,
      });

      // Mark order as reviewed
      transaction.update(doc(db, 'orders', orderId), { reviewed: true });
    });

    showToast('Review submitted! Thank you 🙏', 'success');
    return { success: true };
  } catch (err) {
    showToast('Failed to submit review.', 'error');
    return { success: false };
  }
}

// ---- Get Seller Earnings ----
export async function getSellerEarnings(sellerId) {
  try {
    const q = query(collection(db, 'transactions'), where('sellerId', '==', sellerId), where('type', '==', 'payout'));
    const snap = await getDocs(q);
    const transactions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const total = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    return { total, transactions };
  } catch (err) {
    return { total: 0, transactions: [] };
  }
}

// ---- Request Withdrawal ----
export async function requestWithdrawal(sellerId, { amount, bankAccount }) {
  try {
    await addDoc(collection(db, 'withdrawals'), {
      sellerId,
      amount,
      bankAccount: {
        bankName: bankAccount.bankName,
        accountNumber: bankAccount.accountNumber,
        accountName: bankAccount.accountName,
      },
      status: 'pending',
      requestedAt: serverTimestamp(),
    });

    showToast('Withdrawal request submitted! Admin will process within 24-48 hours.', 'success');
    return { success: true };
  } catch (err) {
    showToast('Withdrawal request failed.', 'error');
    return { success: false };
  }
}
