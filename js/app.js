// ===========================
// HUSTLR - App Utilities
// ===========================

// ---- Theme Management ----
const THEME_KEY = 'hustlr-theme';

export function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(THEME_KEY, next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  const btn = document.querySelector('.theme-toggle');
  if (btn) btn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
}

// ---- Toast Notifications ----
export function showToast(message, type = 'info', duration = 4000) {
  const container = document.querySelector('.toast-container') || createToastContainer();
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function createToastContainer() {
  const el = document.createElement('div');
  el.className = 'toast-container';
  document.body.appendChild(el);
  return el;
}

// ---- Modal Helpers ----
export function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

export function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
    document.body.style.overflow = '';
  }
});

// ---- Navbar Scroll Effect ----
export function initNavbar() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 10);
  });
}

// ---- Mobile Nav ----
export function initMobileNav() {
  const hamburger = document.querySelector('.hamburger');
  const mobileNav = document.querySelector('.mobile-nav');
  if (!hamburger || !mobileNav) return;

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    mobileNav.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!hamburger.contains(e.target) && !mobileNav.contains(e.target)) {
      hamburger.classList.remove('open');
      mobileNav.classList.remove('open');
    }
  });
}

// ---- Scroll Reveal ----
export function initScrollReveal() {
  const elements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  elements.forEach(el => observer.observe(el));
}

// ---- Scroll To Top ----
export function initScrollTop() {
  const btn = document.querySelector('.scroll-top');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('show', window.scrollY > 400);
  });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ---- Dropdown ----
export function initDropdowns() {
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-dropdown]');
    const allMenus = document.querySelectorAll('.dropdown-menu');

    if (trigger) {
      const menuId = trigger.dataset.dropdown;
      const menu = document.getElementById(menuId);
      allMenus.forEach(m => { if (m !== menu) m.classList.remove('open'); });
      menu?.classList.toggle('open');
      e.stopPropagation();
    } else {
      allMenus.forEach(m => m.classList.remove('open'));
    }
  });
}

// ---- Tabs ----
export function initTabs(container = document) {
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabGroup = btn.closest('[data-tabs]')?.dataset.tabs;
      const targetId = btn.dataset.tab;

      container.querySelectorAll(`[data-tabs="${tabGroup}"] .tab-btn`).forEach(b => b.classList.remove('active'));
      container.querySelectorAll(`[data-tab-content="${tabGroup}"] .tab-content`).forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      container.querySelector(`#${targetId}`)?.classList.add('active');
    });
  });
}

// ---- Format Currency ----
export function formatCurrency(amount, currency = '₦') {
  return `${currency}${Number(amount).toLocaleString('en-NG')}`;
}

// ---- Format Date ----
export function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function timeAgo(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const seconds = Math.floor((Date.now() - date) / 1000);

  const intervals = [
    { label: 'year', secs: 31536000 },
    { label: 'month', secs: 2592000 },
    { label: 'week', secs: 604800 },
    { label: 'day', secs: 86400 },
    { label: 'hour', secs: 3600 },
    { label: 'minute', secs: 60 },
  ];

  for (const { label, secs } of intervals) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) return `${count} ${label}${count > 1 ? 's' : ''} ago`;
  }
  return 'Just now';
}

// ---- Stars ----
export function renderStars(rating, max = 5) {
  let html = '<span class="stars">';
  for (let i = 1; i <= max; i++) {
    html += `<span class="star${i > rating ? ' empty' : ''}">★</span>`;
  }
  html += '</span>';
  return html;
}

// ---- Get User Initials ----
export function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// ---- Debounce ----
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ---- Ripple Effect ----
export function addRipple(btn) {
  btn.addEventListener('click', (e) => {
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    const ripple = document.createElement('span');
    ripple.className = 'ripple-effect';
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px;`;
    btn.classList.add('ripple-container');
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 700);
  });
}

// ---- Counter Animation ----
export function animateCounter(el, target, duration = 1500) {
  const start = 0;
  const startTime = performance.now();
  const update = (currentTime) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * target).toLocaleString();
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

// ---- File size formatter ----
export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

// ---- Order Status ----
export const ORDER_STATUSES = {
  pending: { label: 'Pending', class: 'status-pending' },
  accepted: { label: 'Accepted', class: 'status-accepted' },
  in_progress: { label: 'In Progress', class: 'status-in-progress' },
  submitted: { label: 'Submitted', class: 'status-submitted' },
  revision: { label: 'Revision Requested', class: 'status-revision' },
  completed: { label: 'Completed', class: 'status-completed' },
  disputed: { label: 'Disputed', class: 'status-disputed' },
  refunded: { label: 'Refunded', class: 'badge-gray' },
};

export function renderOrderStatus(status) {
  const s = ORDER_STATUSES[status] || { label: status, class: 'badge-gray' };
  return `<span class="order-status ${s.class}">${s.label}</span>`;
}

// ---- Platform Commission ----
export const COMMISSION_RATE = 0.10;

export function calculateEarnings(price) {
  const commission = price * COMMISSION_RATE;
  const sellerEarning = price - commission;
  return { price, commission, sellerEarning };
}

// ---- Services Data ----
export const SERVICE_CATEGORIES = [
  { id: 'web-dev', name: 'Website Development', icon: '🌐', packages: [
    { name: 'Starter', price: 2500 }, { name: 'Basic', price: 5000 },
    { name: 'Standard', price: 10000 }, { name: 'Premium', price: 20000 }
  ]},
  { id: 'graphic-design', name: 'Graphic Design', icon: '🎨', packages: [
    { name: 'Starter', price: 1500 }, { name: 'Basic', price: 3000 },
    { name: 'Standard', price: 7000 }, { name: 'Premium', price: 15000 }
  ]},
  { id: 'ppt-design', name: 'PowerPoint Design', icon: '📊', packages: [
    { name: 'Starter', price: 1000 }, { name: 'Basic', price: 2500 },
    { name: 'Standard', price: 5000 }, { name: 'Premium', price: 10000 }
  ]},
  { id: 'cv-writing', name: 'CV Writing', icon: '📄', packages: [
    { name: 'Starter', price: 0 }, { name: 'Basic', price: 1500 },
    { name: 'Standard', price: 3000 }, { name: 'Premium', price: 5000 }
  ]},
  { id: 'programming', name: 'Programming Assistance', icon: '💻', packages: [
    { name: 'Starter', price: 2000 }, { name: 'Basic', price: 5000 },
    { name: 'Standard', price: 10000 }, { name: 'Premium', price: 20000 }
  ]},
];

// ---- Auth Guard ----
export function requireAuth(redirectUrl = '/auth/login.html') {
  import('./firebase-config.js').then(({ auth }) => {
    auth.onAuthStateChanged(user => {
      if (!user) window.location.href = redirectUrl;
    });
  });
}

// ---- Link Security ----
const URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/gi;

export function sanitizeMessage(text) {
  return text.replace(URL_REGEX, '[🔗 Link pending admin review]');
}

export function containsLink(text) {
  return URL_REGEX.test(text);
}

// ---- Initialize All ----
export function initApp() {
  initTheme();
  initNavbar();
  initMobileNav();
  initScrollReveal();
  initScrollTop();
  initDropdowns();

  // Theme toggle
  document.querySelector('.theme-toggle')?.addEventListener('click', toggleTheme);

  // Add ripple to all buttons
  document.querySelectorAll('.btn').forEach(addRipple);
}
