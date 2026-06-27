// ===========================
// HUSTLR - Chat System
// ===========================

import {
  collection, addDoc, getDocs, getDoc, doc, updateDoc, query,
  where, orderBy, onSnapshot, serverTimestamp, Timestamp,
  setDoc, arrayUnion, limit
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

import { db, storage } from './firebase-config.js';
import { showToast, sanitizeMessage, containsLink, timeAgo } from './app.js';

// ---- Get or Create Conversation ----
export async function getOrCreateConversation(userId1, userId2) {
  try {
    // Consistent conversation ID (sorted user IDs)
    const ids = [userId1, userId2].sort();
    const conversationId = ids.join('_');
    const convRef = doc(db, 'conversations', conversationId);
    const convSnap = await getDoc(convRef);

    if (!convSnap.exists()) {
      await setDoc(convRef, {
        participants: ids,
        createdAt: serverTimestamp(),
        lastMessage: null,
        lastMessageAt: null,
        unread: { [userId1]: 0, [userId2]: 0 },
      });
    }

    return { success: true, conversationId };
  } catch (err) {
    return { success: false };
  }
}

// ---- Send Message ----
export async function sendMessage(conversationId, senderId, { text, fileUrl = null, fileName = null, fileType = null }) {
  try {
    // Link security check
    if (containsLink(text)) {
      // Submit for admin review instead of sending directly
      await addDoc(collection(db, 'linkReviews'), {
        conversationId,
        senderId,
        url: text.match(/https?:\/\/\S+/)?.[0] || '',
        originalMessage: text,
        status: 'pending',
        requestedAt: serverTimestamp(),
      });
      const sanitized = sanitizeMessage(text);

      const message = {
        conversationId,
        senderId,
        text: sanitized,
        fileUrl: null,
        fileName: null,
        fileType: null,
        hasLink: true,
        linkStatus: 'pending',
        readBy: [senderId],
        createdAt: serverTimestamp(),
      };

      const msgRef = await addDoc(collection(db, 'messages'), message);

      // Update conversation
      await updateDoc(doc(db, 'conversations', conversationId), {
        lastMessage: sanitized,
        lastMessageAt: serverTimestamp(),
      });

      showToast('Link submitted for admin review. It will appear once approved.', 'warning');
      return { success: true, id: msgRef.id };
    }

    const message = {
      conversationId,
      senderId,
      text: text || null,
      fileUrl,
      fileName,
      fileType,
      hasLink: false,
      readBy: [senderId],
      createdAt: serverTimestamp(),
    };

    const msgRef = await addDoc(collection(db, 'messages'), message);

    // Update conversation metadata
    const convRef = doc(db, 'conversations', conversationId);
    const convSnap = await getDoc(convRef);
    const conv = convSnap.data();
    const participants = conv.participants || [];
    const otherUser = participants.find(id => id !== senderId);

    const unreadUpdate = {};
    if (otherUser) unreadUpdate[`unread.${otherUser}`] = (conv.unread?.[otherUser] || 0) + 1;

    await updateDoc(convRef, {
      lastMessage: text || `📎 ${fileName || 'File'}`,
      lastMessageAt: serverTimestamp(),
      ...unreadUpdate,
    });

    return { success: true, id: msgRef.id };
  } catch (err) {
    showToast('Message failed to send.', 'error');
    return { success: false };
  }
}

// ---- Listen to Messages (Real-time) ----
export function listenToMessages(conversationId, callback) {
  const q = query(
    collection(db, 'messages'),
    where('conversationId', '==', conversationId),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(q, (snap) => {
    const messages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(messages);
  });
}

// ---- Listen to Conversations ----
export function listenToConversations(userId, callback) {
  const q = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', userId),
    orderBy('lastMessageAt', 'desc')
  );

  return onSnapshot(q, (snap) => {
    const conversations = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(conversations);
  });
}

// ---- Mark Messages as Read ----
export async function markAsRead(conversationId, userId) {
  try {
    // Update unread count
    await updateDoc(doc(db, 'conversations', conversationId), {
      [`unread.${userId}`]: 0,
    });

    // Mark individual messages as read
    const q = query(
      collection(db, 'messages'),
      where('conversationId', '==', conversationId),
      where('senderId', '!=', userId)
    );
    const snap = await getDocs(q);
    const batch = [];
    snap.docs.forEach(d => {
      const data = d.data();
      if (!data.readBy?.includes(userId)) {
        batch.push(updateDoc(d.ref, { readBy: arrayUnion(userId) }));
      }
    });
    await Promise.all(batch);
  } catch (err) {
    console.error('Error marking messages as read:', err);
  }
}

// ---- Upload Chat File ----
export async function uploadChatFile(file, conversationId, senderId) {
  try {
    // Validate file type
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp',
                     'application/pdf', 'application/zip',
                     'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                     'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                     'video/mp4'];

    if (!allowed.includes(file.type)) {
      showToast('File type not supported.', 'error');
      return { success: false };
    }

    if (file.size > 25 * 1024 * 1024) {
      showToast('File must be under 25MB.', 'error');
      return { success: false };
    }

    const storageRef = ref(storage, `chats/${conversationId}/${Date.now()}_${file.name}`);
    const snap = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snap.ref);

    const isImage = file.type.startsWith('image/');
    await sendMessage(conversationId, senderId, {
      text: null,
      fileUrl: url,
      fileName: file.name,
      fileType: isImage ? 'image' : 'file',
    });

    return { success: true, url };
  } catch (err) {
    showToast('File upload failed.', 'error');
    return { success: false };
  }
}

// ---- Get Unread Count ----
export async function getUnreadCount(userId) {
  try {
    const q = query(collection(db, 'conversations'), where('participants', 'array-contains', userId));
    const snap = await getDocs(q);
    let total = 0;
    snap.docs.forEach(d => { total += d.data().unread?.[userId] || 0; });
    return total;
  } catch (err) {
    return 0;
  }
}

// ---- Render Message ----
export function renderMessage(msg, currentUserId) {
  const isSent = msg.senderId === currentUserId;
  const time = msg.createdAt?.toDate ? timeAgo(msg.createdAt) : 'Now';

  let content = '';
  if (msg.fileType === 'image') {
    content = `<img src="${msg.fileUrl}" alt="Image" style="max-width:240px;border-radius:12px;cursor:pointer;" onclick="window.open('${msg.fileUrl}')">`;
  } else if (msg.fileType === 'file') {
    content = `
      <a href="${msg.fileUrl}" download="${msg.fileName}" class="flex items-center gap-2" style="color:inherit;text-decoration:none;padding:8px;background:rgba(0,0,0,0.1);border-radius:8px;">
        📎 <span style="font-size:0.85rem;">${msg.fileName}</span>
      </a>
    `;
  } else {
    // Escape user text to prevent XSS
    const escaped = (msg.text || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
    content = `<span>${escaped}</span>`;
    if (msg.hasLink && msg.linkStatus === 'pending') {
      content += `<br><small style="opacity:0.7;font-size:0.7rem;">🔗 Link pending admin review</small>`;
    }
  }

  const readReceipt = isSent
    ? `<small class="message-time">${msg.readBy?.length > 1 ? '✓✓' : '✓'} ${time}</small>`
    : `<small class="message-time">${time}</small>`;

  return `
    <div class="message ${isSent ? 'sent' : 'received'}">
      ${!isSent ? '<div class="avatar avatar-sm"></div>' : ''}
      <div>
        <div class="message-bubble">${content}</div>
        ${readReceipt}
      </div>
    </div>
  `;
}
