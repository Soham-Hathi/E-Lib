# Architecture Documentation

## 1. System Overview

The E-Library platform is a full-stack digital reading, study companion, and subscription platform structured as an enterprise modular monolith. It provides access to verified open-license and public-domain literature, AI-assisted study workflows (RAG, summarization, quizzes, revision planning), and India-first monetization (Razorpay subscriptions).

```
                      +---------------------------------------+
                      |       Client Layer (React / Vite)     |
                      |  +----------------+ +---------------+ |
                      |  | Customer Store | |  Admin Portal | |
                      |  +----------------+ +---------------+ |
                      +-------------------|-------------------+
                                          | HTTPS / REST / WS
                                          v
                      +---------------------------------------+
                      |         Node.js / Express API         |
                      |  +---------------------------------+  |
                      |  | Core Middleware                 |  |
                      |  | - Helmet, CORS, RateLimiter     |  |
                      |  | - Zod Validator, Auth Guard     |  |
                      |  +---------------------------------+  |
                      |  | Modular Domains                 |  |
                      |  | - auth         - catalog        |  |
                      |  | - reader       - study/ai       |  |
                      |  | - payments     - subscriptions  |  |
                      |  | - admin        - ingestion      |  |
                      |  +---------------------------------+  |
                      +-------------------|-------------------+
                                          |
                +-------------------------+-------------------------+
                |                         |                         |
                v                         v                         v
       +-----------------+       +-----------------+       +-----------------+
       |     MongoDB     |       |    Google AI    |       |   Razorpay /    |
       |  Atlas / Mongoose|      | Gemini Flash 1.5|       |   Cloudinary    |
       | Vector Search   |       | Embeddings API  |       | Webhooks / Media|
       +-----------------+       +-----------------+       +-----------------+
```

## 2. Directory Layout & Module Structure

```
E-Library/
├── backend/
│   ├── src/ (modular domain layout)
│   │   ├── modules/
│   │   │   ├── auth/          # JWT, password reset, OTP, session management
│   │   │   ├── catalog/       # Canonical books, formats, search & filtering
│   │   │   ├── ingestion/     # Gutendex/OpenLibrary/Google Books collectors
│   │   │   ├── reader/        # Bookmarks, highlights, notes, progress sync
│   │   │   ├── ai/            # RAG pipeline, Gemini embeddings, study tools
│   │   │   ├── payments/      # Razorpay order creation, signature verification
│   │   │   ├── subscriptions/ # Pro tier entitlements, billing cycles
│   │   │   └── admin/         # Rights review, moderation, telemetry
│   │   ├── middleware/        # Security headers, auth, rate limiting, error handlers
│   │   ├── config/            # Environment, DB, Cloudinary, Razorpay
│   │   └── utils/             # Sanitizers, logger, token helpers
│   ├── package.json
│   └── index.js
├── frontend/
│   ├── src/
│   │   ├── components/        # Catalog, Reader, Library, AI Assistant, Study Hub
│   │   ├── context/           # AuthContext, ThemeContext, CartContext
│   │   ├── api/               # Centralized Axios client with interceptors
│   │   └── App.jsx
│   └── package.json
├── admin/
│   ├── src/
│   │   ├── components/        # Metrics, RightsReview, BookManager, Subscriptions
│   │   └── App.jsx
│   └── package.json
└── docs/                      # Enterprise architecture & operations documentation
```

## 3. Technology Stack & Key Decisions

| Domain | Technology | Justification |
| :--- | :--- | :--- |
| **Backend Runtime** | Node.js (LTS), Express 4.x | Lightweight, non-blocking I/O, native ESM module support. |
| **Database** | MongoDB (Mongoose ODM) | Flexible document schema for varying book metadata; native Atlas Vector Search. |
| **In-Memory Fallback** | `mongodb-memory-server` | Enables zero-config local development and reliable automated CI runs. |
| **Authentication** | JWT + HttpOnly Cookies / Bearer | Strict token validation, single-use cryptographically hashed reset OTPs. |
| **AI / RAG Engine** | Google Gemini (`gemini-1.5-flash`), `text-embedding-004` | High context window (up to 1M tokens), cost-effective, high quality reasoning. |
| **Payment Gateway** | Razorpay (India-First) | Native support for UPI, Indian debit/credit cards, NetBanking, and recurring mandates. |
| **Storage / Media** | Cloudinary CDN | Secure media delivery, responsive cover thumbnails, signed upload presets. |
| **Frontend Framework** | React 18 with Vite & Tailwind CSS | Fast HMR builds, lightweight client bundle, utility-first responsive styling. |

## 4. Rights-Aware Canonical Schema

To prevent legal and licensing violations, catalog items strictly adhere to verified rights states:
- `verified_public_domain`: Fully hosted and readable EPUB/PDF.
- `verified_open_license`: Hosted according to specific license terms (CC BY-SA, etc.).
- `external_preview_only`: Only embeds official publisher preview links without storing full texts.
- `rights_pending`: Ingested metadata queued for manual administrative verification; content download blocked.
- `blocked`: Takedown requested or copyright conflict flagged.
