# 📚 E-Library & Digital Reading Platform (Enterprise MERN Stack)

[![CI & Quality Gate](https://github.com/Soham-Hathi/E-Lib/actions/workflows/ci.yml/badge.svg)](https://github.com/Soham-Hathi/E-Lib/actions/workflows/ci.yml)
[![Tests Passing](https://img.shields.io/badge/tests-61%2F61%20passing-brightgreen.svg)](https://github.com/Soham-Hathi/E-Lib)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61dafb.svg)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-339933.svg)](https://nodejs.org)
[![Database](https://img.shields.io/badge/Database-MongoDB%20Atlas-47a248.svg)](https://www.mongodb.com/atlas)
[![Docker](https://img.shields.io/badge/Containers-Docker%20Compose-2496ed.svg)](https://www.docker.com)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

An enterprise-ready, full-stack digital bookstore and interactive e-reading platform built with the MERN stack (MongoDB, Express, React, Node.js). Features **160 authentic real books**, an in-browser distraction-free e-reader with Web Speech audio narration, personal bookshelf cloud sync, VIP reader subscriptions, Gemini AI book tutoring, verified reviews, commercial discount coupons, and an executive telemetry admin panel.

---

## 🌟 Key Platform Features

### 📖 1. Authentic Real Book Catalog
- **160 Verified Books**: 52 Public Domain Classics (Project Gutenberg covers, genuine ePub3 download links, verbatim reading text) + 108 Modern Technical & Commercial Bestsellers (Open Library ISBN covers and official bibliographic archives).
- Zero dummy placeholder assets. High-resolution cover images with fallback redundancy.

### 👓 2. In-Browser Interactive E-Reader (`/reader/:id`)
- **Reading Themes**: Paper White (Light), Cozy Sepia, and Midnight OLED (Dark).
- **Typography & Font Controls**: Real-time font scaling (14px to 26px), customizable line heights, and margins.
- **Web Speech Audio Narration**: Built-in text-to-speech engine with play, pause, stop, and speed rate controls (0.75x, 1.0x, 1.25x, 1.5x, 2.0x).
- **Cloud Reading Progress**: Real-time progress percentage bar with cross-device sync.
- **Smart Bookmarks**: Save favorite passages to your personal account with single-click resumption.

### 📚 3. Personal Bookshelf & Reading Hub (`/bookshelf`)
- Categorized shelf tabs: **Currently Reading**, **Want to Read**, **Completed**, **Favorites**, and **Wishlist**.
- Visual progress meters, active book counts, and direct one-click launch into the E-Reader.

### ⭐ 4. Customer Reviews & 5-Star Ratings
- Verified reader review system with 1-to-5 star selector and review commentary.
- Unique compound index `{ userId: 1, bookId: 1 }` prevents duplicate review manipulation.
- Aggregated rating summary badges (Average score, total verified reviews).

### 👑 5. VIP Reader Membership (`/membership`)
- **Kindle Unlimited Style All-Access Pass**:
  - **VIP Reader Monthly** (₹149/mo)
  - **VIP Scholar Annual** (₹1,199/yr — Save 33% with 2 Months Free)
- Full Razorpay checkout flow with sandbox simulator support and cryptographic HMAC-SHA256 signature verification.
- Unlocks all 160 books for free online reading, unlimited ePub downloads, and permanent 20% discounts on physical book orders.
- Profile and Navbar **👑 VIP Member** badges.

### 🤖 6. AI Book Companion & Chapter Tutor
- Grounded in local catalog documents via Retrieval-Augmented Grounding (RAG).
- Answers questions about reading passages, provides vocabulary assistance, and creates study summaries.

### 🎟️ 7. Commercial Coupon Engine
- Cart coupon validation with instant price reductions:
  - `READ20`: 20% discount on book orders.
  - `WELCOME50`: Flat ₹50 off first purchase.
  - `STUDENT30`: 30% academic discount (capped at ₹150).

### 📊 8. Executive Admin Dashboard (`:5174`)
- Glassmorphic telemetry with Chart.js visualizations (Sales Growth, Inventory Composition, Payment Methods, Order Velocity).
- 5 Primary KPI Cards (Total Revenue, Catalog Inventory, Purchases, Verified Users, **VIP Subscribers & MRR**).
- **1-Click CSV Order Export**: Downloads complete order logs in standard RFC-4180 CSV format.
- User management with 1-click **Grant / Revoke VIP Pass** toggle.

---

## 🛠️ Architecture & Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend (Customer)** | React 18, Vite, Tailwind CSS, React Router v6, React Icons, Axios |
| **Admin Panel** | React 18, Vite, Tailwind CSS, Chart.js, React-Chartjs-2 |
| **Backend API** | Node.js (ES Modules), Express.js, Mongoose, SlowBuffer Polyfill |
| **Database** | MongoDB Atlas (9 Collections with unique compound relational indexes) |
| **Security** | Helmet, Express Rate Limiting, BCrypt, JWT, HMAC-SHA256 Signatures |
| **Payments** | Razorpay Gateway (UPI, Cards, NetBanking) + Dev Test Simulator |
| **AI Integration** | Google Gemini Generative AI (RAG Grounding) |
| **Orchestration** | Multi-container Docker & Docker Compose |

---

## 🚀 Quick Start Guide (Local Development)

### Prerequisites
- Node.js v18 or v20+ (Node v25 supported via `--import ./polyfill.js`)
- MongoDB Atlas connection string (or local MongoDB on `:27017`)

### 1. Clone Repository
```bash
git clone https://github.com/Soham-Hathi/E-Lib.git
cd E-Lib
```

### 2. Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB Atlas URI, JWT secret, etc.
npm install
node --import ./polyfill.js index.js
```
API server runs on `http://localhost:3000`.

### 3. Customer Frontend Setup
```bash
cd ../frontend
cp .env.example .env
npm install
npm run dev
```
Customer Storefront runs on `http://localhost:5173`.

### 4. Admin Panel Setup
```bash
cd ../admin
cp .env.example .env
npm install
npm run dev
```
Admin Dashboard runs on `http://localhost:5174`.

---

## 🐳 Docker Container Deployment

To launch all three tiers in isolated production containers with one command:

```bash
docker compose up --build -d
```

- **Customer Frontend**: `http://localhost:5173`
- **Admin Dashboard**: `http://localhost:5174`
- **Backend API**: `http://localhost:3000`

---

## 🧪 Automated Testing

Run the full 61-test backend test suite:

```bash
cd backend
node --import ./polyfill.js --test test/*.test.js
```

```
ℹ tests 61
ℹ suites 5
ℹ pass 61
ℹ fail 0
```

---

## 🚢 Production Cloud Deployment

### 1. Backend (Render / Railway / AWS ECS)
- Deploy `./backend` as a Web Service.
- Set environment variables (`PORT=3000`, `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET_KEY`, `ALLOWED_ORIGINS`).
- Start command: `node --import ./polyfill.js index.js`.

### 2. Frontends (Vercel / Netlify / Cloudflare Pages)
- **Customer Storefront (`./frontend`)**:
  - Build command: `npm run build`
  - Output directory: `dist`
  - Environment variable: `VITE_API_URL=https://your-api-domain.com`
- **Admin Panel (`./admin`)**:
  - Build command: `npm run build`
  - Output directory: `dist`
  - Environment variable: `VITE_API_URL=https://your-api-domain.com`

---

## 📄 License
This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
