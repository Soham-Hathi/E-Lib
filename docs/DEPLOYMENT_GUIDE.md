# Production Deployment Guide

## 1. Environment Topology

The E-Library architecture is packaged into decoupled containerized services for deployment to container hosts (e.g., Render, Railway, AWS ECS, or DigitalOcean App Platform):

```
+-------------------------------------------------------------+
|                     Edge / Reverse Proxy                    |
|                Cloudflare / Managed CDN (HTTPS)             |
+------------------------------+------------------------------+
                               |
       +-----------------------+-----------------------+
       |                                               |
       v                                               v
+-----------------------------+         +-----------------------------+
|    Storefront & Admin       |         |       Node.js REST API      |
|    Static Web Hosting       |         |       Container Service     |
|   (Vite Production Build)   |         |      (Port 3000 / 8080)     |
+-----------------------------+         +--------------+--------------+
                                                       |
                             +-------------------------+-------------------------+
                             |                         |                         |
                             v                         v                         v
                    +-----------------+       +-----------------+       +-----------------+
                    |  MongoDB Atlas  |       | Razorpay Webhook|       | Cloudinary CDN  |
                    | Managed Cluster |       | Live API Keys   |       | Asset Hosting   |
                    +-----------------+       +-----------------+       +-----------------+
```

---

## 2. Environment Variables Configuration

### Backend (`backend/.env`)
```bash
# Server & Port
PORT=3000
NODE_ENV=production

# Database
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/elibrary?retryWrites=true&w=majority

# Authentication Security
JWT_SECRET_KEY=generate_a_64_character_random_hex_string_here
JWT_EXPIRES_IN=7d

# CORS Allowed Origins (Comma-separated)
ALLOWED_ORIGINS=https://elibrary.yourdomain.com,https://admin.elibrary.yourdomain.com

# Razorpay (India Payments)
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret_here
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret_here

# AI / Google Gemini
GEMINI_API_KEY=your_gemini_api_key_here

# Cloudinary Storage
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email Transporter (SMTP / Nodemailer)
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=your_smtp_key_here
EMAIL_FROM="E-Library <noreply@yourdomain.com>"
```

### Frontend (`frontend/.env.production`)
```bash
VITE_API_URL=https://api.elibrary.yourdomain.com
VITE_RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxx
```

### Admin (`admin/.env.production`)
```bash
VITE_API_URL=https://api.elibrary.yourdomain.com
```

---

## 3. Pre-Deployment Staging Checklist

- [ ] All sensitive credentials removed from git tracking and local files.
- [ ] Database backup taken prior to any production migration.
- [ ] Non-destructive startup verified: auto-wiping disabled in seed scripts.
- [ ] Rate limits and Helmet security headers validated.
- [ ] Razorpay webhook registered with endpoint `https://api.elibrary.yourdomain.com/payment/webhook`.
- [ ] Cloudinary upload restrictions and signed presets verified.
- [ ] SSL/TLS certificates active on all client and API subdomains.
