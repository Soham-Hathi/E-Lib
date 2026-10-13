# API Reference Specification

## Overview
All API endpoints are hosted under the root `/api/v1` (with backward-compatible fallbacks for legacy endpoints). Requests and responses use `application/json` unless handling multipart uploads or raw webhook payloads.

---

## Authentication & User Management

### `POST /user/signup`
Registers a new customer.
* **Payload**: `{ "fullname": "string", "email": "string", "password": "string" }`
* **Response (201)**: `{ "message": "User created successfully. Verification email sent." }`

### `POST /user/login`
Authenticates a user and returns a signed JWT session.
* **Payload**: `{ "email": "string", "password": "string" }`
* **Response (200)**: `{ "token": "string", "user": { "_id": "id", "fullname": "string", "email": "string", "isAdmin": false } }`

### `POST /user/emailotp`
Sends a 6-digit cryptographic OTP for password recovery.
* **Payload**: `{ "email": "string" }`
* **Response (200)**: `{ "message": "OTP sent to your email" }`

### `POST /user/verify-otp`
Verifies OTP and returns a single-use password reset token.
* **Payload**: `{ "email": "string", "otp": "string" }`
* **Response (200)**: `{ "token": "string", "message": "OTP verified successfully" }`

### `POST /user/reset-password`
Resets password using token. Hashes password using bcrypt.
* **Payload**: `{ "token": "string", "newPassword": "string" }`
* **Response (200)**: `{ "message": "Password reset successfully" }`

---

## Catalog & Books

### `GET /book/getbook`
Fetches catalog with server-side pagination, category, and text search.
* **Query Params**: `page=1&limit=12&category=Fiction&search=gatsby&rightsStatus=verified_public_domain`
* **Response (200)**: `{ "books": [...], "pagination": { "total": 120, "page": 1, "pages": 10 } }`

### `GET /book/getonebook/:id`
Returns single book details with verified format URLs.
* **Response (200)**: Book document object.

### `POST /book/uploadbook` (Admin Only)
Uploads custom book with cover image to Cloudinary.
* **Headers**: `Authorization: Bearer <token>`, `Content-Type: multipart/form-data`
* **Form Data**: `name`, `price`, `category`, `description`, `image` (file)

---

## Digital Reader & Bookshelf

### `GET /reader/progress/:bookId` (Auth Required)
Retrieves user's reading position and progress percentage.
* **Response (200)**: `{ "cfi": "string", "percentage": 42.5, "updatedAt": "timestamp" }`

### `POST /reader/progress` (Auth Required)
Saves reading progress.
* **Payload**: `{ "bookId": "string", "cfi": "string", "percentage": number }`

### `GET /reader/annotations/:bookId` (Auth Required)
Fetches user bookmarks, highlights, and study notes for a specific book.

### `POST /reader/annotations` (Auth Required)
Creates a bookmark, highlight, or note.

---

## Payments & Subscriptions (Razorpay)

### `POST /payment/create-order` (Auth Required)
Creates an internal pending payment and generates a Razorpay Order ID.
* **Payload**: `{ "planId": "pro_monthly" | "pro_annual" }`
* **Response (200)**: `{ "orderId": "order_xyz", "amount": 9900, "currency": "INR", "keyId": "rzp_test_..." }`

### `POST /payment/verify` (Auth Required)
Validates checkout signature using HMAC SHA256 timing-safe comparison.
* **Payload**: `{ "razorpay_order_id": "string", "razorpay_payment_id": "string", "razorpay_signature": "string" }`
* **Response (200)**: `{ "success": true, "message": "Payment verified and Pro subscription activated." }`

### `POST /payment/webhook` (Provider Webhook)
Receives and validates `X-Razorpay-Signature` over raw request body. Handles `payment.captured` and `subscription.charged` idempotently.

---

## AI Study Copilot & Tools

### `POST /ai/chat` (Auth Required)
Conversational study assistant grounded on catalog and retrieved book passages.
* **Payload**: `{ "message": "string", "bookId": "optional_id", "history": [] }`
* **Response (200)**: `{ "reply": "string", "citations": [ { "book": "string", "chapter": "string" } ] }`

### `POST /ai/study-tools` (Auth Required)
Generates chapter summaries, flashcards, or practice quizzes.
* **Payload**: `{ "bookId": "string", "toolType": "summary" | "flashcards" | "quiz", "chapter": "string" }`
* **Response (200)**: Structured study artifact.

---

## System & Diagnostics

### `GET /health`
Returns system health, database connection state, and uptime.
* **Response (200)**: `{ "status": "healthy", "database": "connected", "uptime": 3600 }`
