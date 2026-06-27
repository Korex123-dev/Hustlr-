# Hustlr — The Student Freelance Marketplace for Africa

**Hustlr** is Africa's leading student freelance marketplace, connecting students who need digital services with talented student freelancers. Built with HTML, CSS, and JavaScript, powered by Firebase.

🌍 **Live Site:** [https://korex123-dev.github.io/Hustlr-/](https://korex123-dev.github.io/Hustlr-/)

---

## ✨ Features

### For Buyers
- Browse verified student freelancers
- Secure escrow-protected payments
- Real-time chat with sellers
- Track order progress
- Request revisions
- Leave reviews

### For Sellers
- Create service listings (gigs) with custom packages
- Portfolio uploads
- Receive and manage orders
- Real-time earnings tracking
- Bank withdrawal requests (encrypted & private)
- Seller dashboard with analytics

### Admin
- User management & verification
- Dispute resolution
- Withdrawal approval
- Link review queue (security)
- Platform analytics

---

## 💰 Business Model

| Service | Starter | Basic | Standard | Premium |
|---------|---------|-------|----------|---------|
| Website Dev | ₦2,500 | ₦5,000 | ₦10,000 | ₦20,000 |
| Graphic Design | ₦1,500 | ₦3,000 | ₦7,000 | ₦15,000 |
| PowerPoint | ₦1,000 | ₦2,500 | ₦5,000 | ₦10,000 |
| CV Writing | FREE | ₦1,500 | ₦3,000 | ₦5,000 |
| Programming | ₦2,000 | ₦5,000 | ₦10,000 | ₦20,000 |

**Platform Commission: 10%** — Sellers keep 90%

---

## 🔐 Security

- **Escrow System**: Buyer pays → funds held for 10 days → seller delivers → buyer approves → funds released
- **Link Security**: All external links go through admin review before becoming visible (prevents scams)
- **Encrypted Bank Info**: Seller banking details are encrypted and private
- **Verified Sellers**: Admin manually reviews and verifies all freelancers

---

## 🛠 Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES Modules)
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Auth**: Email/Password + Google OAuth
- **Hosting**: GitHub Pages
- **Design**: Custom CSS with CSS Variables (Dark/Light mode)

---

## 📁 File Structure

```
/
├── index.html              # Landing page
├── 404.html                # Not found page
├── css/
│   ├── main.css            # Design system & components
│   └── animations.css      # Keyframes & animation utilities
├── js/
│   ├── firebase-config.js  # Firebase initialization
│   ├── app.js              # Utilities, theme, toasts
│   ├── auth.js             # Authentication (email + Google)
│   ├── services.js         # Gig CRUD operations
│   ├── orders.js           # Order management & escrow
│   ├── chat.js             # Real-time messaging
│   └── admin.js            # Admin functions
├── auth/
│   ├── login.html
│   └── register.html
├── buyer/
│   └── dashboard.html
├── seller/
│   └── dashboard.html
├── admin/
│   └── dashboard.html
├── browse/
│   └── index.html          # Service discovery
├── gig/
│   └── index.html          # Individual gig page
├── chat/
│   └── index.html          # Real-time messaging
├── order/
│   └── index.html          # Order tracking
└── profile/
    └── index.html          # User profile
```

---

## 🚀 GitHub Pages Deployment

1. Go to your repo → **Settings → Pages**
2. Source: **Deploy from branch**
3. Branch: **main** / **(root)**
4. Click **Save**

Your site will be live at: `https://[username].github.io/[repo-name]/`

---

## 🔥 Firebase Setup

The app is connected to Firebase project `hustlr-c2625`. Required Firestore collections:

- `users` — user profiles
- `gigs` — service listings
- `orders` — order management
- `conversations` — chat threads
- `messages` — chat messages
- `reviews` — ratings & feedback
- `transactions` — payment records
- `withdrawals` — payout requests
- `linkReviews` — external link review queue

### Firestore Security Rules

Set up security rules in Firebase Console to restrict data access appropriately.

---

## 📱 Pages

| Page | URL |
|------|-----|
| Landing | `/` |
| Login | `/auth/login.html` |
| Register | `/auth/register.html` |
| Browse Services | `/browse/index.html` |
| Gig Detail | `/gig/index.html?id=<gigId>` |
| Buyer Dashboard | `/buyer/dashboard.html` |
| Seller Dashboard | `/seller/dashboard.html` |
| Admin Dashboard | `/admin/dashboard.html` |
| Chat | `/chat/index.html` |
| Order Tracking | `/order/index.html?id=<orderId>` |
| Profile | `/profile/index.html` |

---

## 👨‍💻 Made for Africa's Student Economy

Hustlr is purpose-built for Nigerian university students — affordable pricing in Naira, Nigerian bank withdrawals, and a trust-first escrow system.

**© 2025 Hustlr. All rights reserved.**
