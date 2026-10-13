import buffer from 'node:buffer';
buffer.SlowBuffer = buffer.Buffer;
if (typeof globalThis.SlowBuffer === 'undefined') {
  globalThis.SlowBuffer = buffer.Buffer;
}

import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { MongoMemoryServer } from 'mongodb-memory-server';

import bookRoute from './routes/book.route.js';
import userRoute from './routes/user.route.js';
import orderRoute from './routes/order.route.js';
import aiRoute from './routes/ai.route.js';
import paymentRoute from './routes/payment.route.js';
import readerRoute from './routes/reader.route.js';
import reviewRoute from './routes/review.route.js';
import bookshelfRoute from './routes/bookshelf.route.js';
import { seedBooksFromAPI } from './seed.js';

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;
const URI = process.env.MONGODB_URI;

// Security Headers (configured to allow Cloudinary cross-origin images)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
}));

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Rate Limiters
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  message: { message: "Too many requests from this IP. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // 30 attempts per 15 min
  message: { message: "Too many authentication attempts. Please try again in 15 minutes." },
});

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: { message: "AI rate limit reached. Please wait a few minutes before asking more questions." },
});

app.use(globalLimiter);

// Database connection
let isDbConnected = false;
(async () => {
  try {
    if (!URI) throw new Error("No MONGODB_URI provided");
    await mongoose.connect(URI);
    console.log("Database Connected to MongoDB Atlas");
    isDbConnected = true;
  } catch (error) {
    console.log("MongoDB Atlas connection failed: ", error.message);
    console.log("Attempting connection to local MongoDB database...");
    try {
      await mongoose.connect("mongodb://127.0.0.1:27017/bookstore");
      console.log("Database Connected to Local MongoDB (localhost:27017)");
      isDbConnected = true;
    } catch (localError) {
      console.log("Local MongoDB connection failed: ", localError.message);
      console.log("Falling back to In-Memory MongoDB for local development...");
      try {
        const mongoServer = await MongoMemoryServer.create();
        const fallbackUri = mongoServer.getUri();
        await mongoose.connect(fallbackUri);
        console.log("Database Connected to Local In-Memory MongoDB");
        isDbConnected = true;
      } catch (fallbackError) {
        console.log("Fallback In-Memory DB Error: ", fallbackError.message);
      }
    }
  }

  if (isDbConnected) {
    // Non-destructive seed check: only seeds if collection is empty
    await seedBooksFromAPI(false);
  }
})();

// Middleware for JSON body parsing with rawBody capture for webhook verification
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  },
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Root API Welcome & Navigation Endpoint
app.get('/', (req, res) => {
  if (req.accepts('html')) {
    return res.status(200).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>E-Library API Server</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 40px 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; box-sizing: border-box; }
          .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 36px; max-width: 580px; width: 100%; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); text-align: center; }
          .badge { display: inline-block; background: #065f46; color: #34d399; font-weight: 600; font-size: 12px; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px; }
          h1 { margin: 0 0 12px; font-size: 28px; color: #ffffff; }
          p { color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 0 0 28px; }
          .btn-group { display: flex; flex-direction: column; gap: 12px; }
          .btn { display: block; padding: 12px 20px; border-radius: 10px; font-weight: 600; font-size: 14px; text-decoration: none; transition: 0.2s; }
          .btn-primary { background: #2563eb; color: #ffffff; }
          .btn-primary:hover { background: #1d4ed8; }
          .btn-secondary { background: #334155; color: #f1f5f9; }
          .btn-secondary:hover { background: #475569; }
          .api-links { margin-top: 24px; padding-top: 20px; border-top: 1px solid #334155; font-size: 13px; color: #64748b; }
          .api-links a { color: #38bdf8; text-decoration: none; margin: 0 8px; }
          .api-links a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="card">
          <span class="badge">&#9679; Server Online</span>
          <h1>E-Library API Server</h1>
          <p>The Node.js & Express REST API server is actively running on port 3000 and connected to the database.</p>
          <div class="btn-group">
            <a href="http://localhost:5174/" class="btn btn-primary" target="_blank">Open Admin Panel (Port 5174) &rarr;</a>
            <a href="http://localhost:5173/" class="btn btn-secondary" target="_blank">Open Customer Storefront (Port 5173) &rarr;</a>
          </div>
          <div class="api-links">
            <a href="/health">Health Check</a> &bull;
            <a href="/book/getbook">Book Catalog</a> &bull;
            <a href="/book/discover?query=science">Global Discovery</a>
          </div>
        </div>
      </body>
      </html>
    `);
  }
  res.status(200).json({
    name: "E-Library API",
    status: "online",
    message: "Welcome to the E-Library REST API",
    health: "/health",
    applications: {
      frontend: "http://localhost:5173",
      admin: "http://localhost:5174"
    },
    endpoints: {
      books: "/book/getbook",
      discover: "/book/discover",
      user: "/user",
      order: "/order",
      payment: "/payment"
    }
  });
});

// System Health Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    database: isDbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Mounted Routes
app.use('/book', bookRoute);
app.use('/user', authLimiter, userRoute);
app.use('/order', orderRoute);
app.use('/payment', paymentRoute);
app.use('/reader', readerRoute);
app.use('/review', reviewRoute);
app.use('/bookshelf', bookshelfRoute);
app.use('/ai', aiLimiter, aiRoute);

// Centralized 404 handler
app.use((req, res, next) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[Internal Error]', err.stack || err.message);
  res.status(err.status || 500).json({
    message: err.message || 'An unexpected internal server error occurred.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

app.listen(port, () => {
  console.log(`E-Library API listening on port ${port}`);
});
