# Implementation Plan

## Overview
This phased roadmap details the enterprise transformation of the E-Library codebase into an AI-powered digital library, student study companion, and subscription platform.

---

## Phase Breakdown & Acceptance Criteria

### Phase 0 — Baseline Audit & Documentation (Completed)
* **Tasks**: Complete code audit across backend, admin, and frontend; dependency conflict resolutions; baseline verification; create full documentation suite.
* **Deliverables**: Architecture, Security Audit, Implementation Plan, API Reference, AI Architecture, Deployment Guide, Operations Runbook.
* **Status**: In progress / baseline confirmed.

---

### Phase 1 — Security, Auth Hardening & Core Reliability
* **Tasks**:
  1. Fix password hashing on reset (`bcrypt.hash(newPassword, 12)`).
  2. Fix email OTP verification condition (`!user.isVerified`).
  3. Align JWT secret keys across all controllers (`process.env.JWT_SECRET_KEY`).
  4. Fix upload route middleware order (`isAdminMiddleware` before `multer.single()`).
  5. Replace destructive DB wipe on startup with conditional seeding.
  6. Fix `Order` model reference (`ref: 'Book'`).
  7. Add Helmet, CORS allowlist, and rate limiting (`express-rate-limit`).
  8. Secure frontend JSON parsing in `Navbar.jsx` and `OneBook.jsx`.
* **Acceptance Criteria**: All automated auth tests pass, no plaintext passwords in database, no crashes on guest navigation, non-destructive startup.

---

### Phase 2 — Legal Free-Book Catalog & Provenance Ingestion
* **Tasks**:
  1. Extend Book schema with canonical metadata: `rightsStatus`, `license`, `sourceProvider`, `sourceId`, `formats` (epub, pdf, txt), and `downloadMetrics`.
  2. Implement Gutendex / Project Gutenberg API collector for verified public domain literature in India.
  3. Implement Open Library metadata discovery client with rate limiting and identifiable User-Agent.
  4. Implement an idempotent, batch-controlled catalog sync service.
  5. Enforce rights-state checks: block downloads for `rights_pending` or `external_preview_only` content.
* **Acceptance Criteria**: Imported books contain verifiable provenance; duplicates are eliminated; catalog items have verified public domain or open licenses.

---

### Phase 3 — In-Browser Digital Reader & Personal Bookshelf
* **Tasks**:
  1. Integrate lightweight responsive EPUB/PDF reader components.
  2. Implement reading progress synchronization endpoint (`/reader/progress`).
  3. Implement personal bookmarks, highlights, and annotations with user data isolation.
  4. Create "My Bookshelf" personal library dashboard with reading goals and resume-reading cards.
  5. Secure content access: provide authorized reading streams or short-lived signed URLs.
* **Acceptance Criteria**: Users can resume reading from any device; unauthorized users cannot download premium or restricted files; user notes remain private.

---

### Phase 4 — India-First Monetization (Razorpay & Subscriptions)
* **Tasks**:
  1. Build modular payment provider abstraction (`PaymentProvider` interface).
  2. Implement Razorpay Order creation with server-validated pricing (Pro tier: ₹99–₹199/month).
  3. Implement Razorpay client checkout integration.
  4. Build server-side signature verification with timing-safe comparison.
  5. Implement dedicated webhook endpoint (`/payment/webhook`) with raw-body signature validation (`X-Razorpay-Signature`).
  6. Model `Subscription` schema with entitlements, renewal, and cancellation states.
  7. Implement idempotent webhook handling (support `payment.captured`, `subscription.charged`).
* **Acceptance Criteria**: End-to-end payment verification succeeds in Razorpay test mode; duplicate webhooks do not duplicate entitlements; no pricing trusted from frontend.

---

### Phase 5 — Advanced AI Study Copilot & RAG Pipeline
* **Tasks**:
  1. Implement document text chunker and Gemini embedding pipeline (`text-embedding-004`).
  2. Implement semantic vector retrieval with metadata filtering.
  3. Grounded Study Copilot: generate responses with strict source citations (chapter/section).
  4. Build study tools: chapter summaries, flashcard generator, multiple-choice quizzes, and revision schedules.
  5. Implement AI safety guardrails, prompt-injection sanitization, and per-user token quotas (Free vs Pro).
  6. Track AI usage and estimated API cost per user.
* **Acceptance Criteria**: Answers cite specific passages; prompt injection attempts are blocked; usage limits are strictly enforced.

---

### Phase 6 — Free vs Pro Unified Experience & Modern UI
* **Tasks**:
  1. Polish public landing page, pricing table, and feature comparison.
  2. Unify frontend navigation and eliminate `window.location.reload()` hacks.
  3. Centralize API client with environment variables (`VITE_API_BASE_URL`).
  4. Implement toast notifications (`react-hot-toast`) replacing browser alerts.
  5. Build Admin moderation console: rights review, subscription metrics, AI usage dashboard.
* **Acceptance Criteria**: Consistent UX across desktop/mobile; responsive dark/light theme; clean toast feedback.

---

### Phase 7 — Production Engineering, Docker & CI/CD
* **Tasks**:
  1. Centralized error-handling middleware and structured JSON logging.
  2. Health check endpoints (`/health`, `/readiness`).
  3. Multi-stage `Dockerfile` and `docker-compose.yml` for backend, frontend, and admin.
  4. Automated integration test suites (Supertest, Vitest).
  5. Comprehensive backup and disaster recovery runbooks.
* **Acceptance Criteria**: Docker containers build cleanly; test suites pass; health checks report status.
