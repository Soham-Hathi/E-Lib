# Security Audit Report

**Date**: October 2026  
**Auditor**: Principal Application Security Engineer  
**Scope**: Full repository (`backend/`, `frontend/`, `admin/`)

---

## 1. Executive Summary

A comprehensive line-by-line static audit of the existing codebase revealed **8 Critical/High Severity Vulnerabilities** that prevent safe public deployment. Primary risks include plaintext password storage, broken authentication authorization logic, denial-of-service risks in file handling, unverified client-driven payment state transitions, and sensitive credential exposure paths.

---

## 2. Vulnerability Findings & Severity Matrix

| ID | Location | Vulnerability Description | Severity | Remediation |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | `backend/controllers/user.controller.js:260` | **Plaintext Password Storage on Reset**<br>`user.password = newPassword` stores unhashed password directly in MongoDB. Future logins via `bcrypt.compare` fail or require plain text matching. | **CRITICAL** | Hash new password with `bcrypt.hash(newPassword, 12)` before saving. |
| **SEC-02** | `backend/controllers/user.controller.js:191` | **Broken Email OTP Authorization Check**<br>`if (!user || !email.isVerified)` attempts to read `.isVerified` from a string variable (`email`), evaluating to `undefined` and always rejecting legitimate OTP requests. | **HIGH** | Change condition to check `!user.isVerified`. |
| **SEC-03** | `backend/controllers/user.controller.js:239, 253` | **Inconsistent JWT Signing Keys**<br>Password reset and OTP logic uses `process.env.JWT_SECRET`, whereas login and admin middleware verify `process.env.JWT_SECRET_KEY`. Causes token verification failures or allows signature bypass if one key is empty. | **HIGH** | Unify secret key access under a single validated configuration token (`JWT_SECRET_KEY`). |
| **SEC-04** | `backend/routes/book.route.js:12` | **Unauthenticated File Upload & Denial of Service**<br>`router.post('/uploadbook', upload.single('image'), isAdminMiddleware, ...)` executes Cloudinary upload storage before authenticating the user. Malicious users can flood Cloudinary storage and exhaust quotas without credentials. | **HIGH** | Invert middleware pipeline: run `isAdminMiddleware` before `upload.single('image')`. |
| **SEC-05** | `backend/controllers/order.controller.js:205` / `PaymentSuccess.jsx:23` | **Client-Authoritative Payment Completion (No Webhooks)**<br>Orders are placed only after client redirect to `/success`, passing cached order details from `localStorage`. If user navigates away, network drops, or inspects request, payments are captured without records or orders are forged with mock amounts. | **CRITICAL** | Implement server-side Razorpay webhook signature verification (`X-Razorpay-Signature`) with idempotent event processing. |
| **SEC-06** | `backend/index.js:50` / `seed.js:53` | **Destructive Auto-Seeding on Startup**<br>`Book.deleteMany({})` is executed unconditionally every time the backend initializes, destroying all production catalog and admin edits. | **HIGH** | Execute seeding only if `(await Book.countDocuments()) === 0`, or through explicit CLI tasks. |
| **SEC-07** | `frontend/src/components/Navbar.jsx:28` / `OneBook.jsx:45` | **Unsafe JSON Deserialization / Null Pointer Crash**<br>`JSON.parse(localStorage.getItem('Book-User-Data'))` executes without null/error checking, triggering browser crashes when guests visit protected or shop routes. | **MEDIUM** | Implement safe parsing utilities with fallback defaults. |
| **SEC-08** | `backend/models/order.model.js:20` | **Broken Schema Reference**<br>`ref: 'Product'` instead of `ref: 'Book'`, causing failures when attempting Mongoose population on orders. | **MEDIUM** | Correct schema reference to `ref: 'Book'`. |

---

## 3. Recommended Remediation & Hardening Roadmap

1. **Authentication & Password Recovery**: Enforce bcrypt work factor 12, rate limit password recovery and login attempts, expire OTPs after 10 minutes, and use single-use cryptographic tokens.
2. **Server-Side Authorization**: Ensure `isAdminMiddleware` is applied as the outermost barrier on all sensitive endpoints. Protect user reading notes, bookmarks, and orders with ownership checks (`order.userID.toString() === req.user._id.toString()`).
3. **HTTP & API Security**:
   - Integrate `helmet` for defense against MIME-sniffing, clickjacking, and XSS.
   - Configure a strict CORS allowlist.
   - Introduce `express-rate-limit` across auth routes (`/user/login`, `/user/signup`, `/user/emailotp`) and AI generation routes (`/ai/chat`, `/ai/summarize`).
   - Validate request payloads with Zod schemas.
