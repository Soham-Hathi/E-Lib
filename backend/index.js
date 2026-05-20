import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bookRoute from './routes/book.route.js';
import userRoute from './routes/user.route.js';
import orderRoute from './routes/order.route.js';
import aiRoute from './routes/ai.route.js';
import cors from 'cors';

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;
const URI = process.env.MONGODB_URI;

import { MongoMemoryServer } from 'mongodb-memory-server';

import { seedBooksFromAPI } from './seed.js';

// Database connection
(async () => {
  let isConnected = false;
  try {
    if (!URI) throw new Error("No MONGODB_URI provided");
    await mongoose.connect(URI);
    console.log("Database Connected to MongoDB Atlas");
    isConnected = true;
  } catch (error) {
    console.log("MongoDB Atlas connection failed: ", error.message);
    console.log("Attempting connection to local MongoDB database...");
    try {
      await mongoose.connect("mongodb://127.0.0.1:27017/bookstore");
      console.log("Database Connected to Local MongoDB (localhost:27017)");
      isConnected = true;
    } catch (localError) {
      console.log("Local MongoDB connection failed: ", localError.message);
      console.log("Falling back to In-Memory MongoDB for local development...");
      try {
        const mongoServer = await MongoMemoryServer.create();
        const fallbackUri = mongoServer.getUri();
        await mongoose.connect(fallbackUri);
        console.log("Database Connected to Local In-Memory MongoDB");
        isConnected = true;
      } catch (fallbackError) {
        console.log("Fallback In-Memory DB Error: ", fallbackError.message);
      }
    }
  }

  if (isConnected) {
    await seedBooksFromAPI();
  }
})();

// Enable CORS for cross-origin requests from your frontend
// const allowedOrigins = [
//   'https://mega-bookstore-frontend.onrender.com', 
//   'https://mega-bookstore.onrender.com',
//   'http://localhost:3000'
// ];

// app.use(cors({
//   origin: function (origin, callback) {
//     // Allow requests with no origin (like mobile apps, Postman, etc.)
//     if (!origin || allowedOrigins.indexOf(origin) !== -1) {
//       callback(null, true);
//     } else {
//       callback(new Error('Not allowed by CORS'));
//     }
//   },
//   credentials: true,  // Allows sending cookies and authentication headers
//   methods: "GET, POST, PUT, DELETE",  // Allow specific HTTP methods
//   allowedHeaders: ['Content-Type', 'Authorization'] // Allow specific headers
// }));

app.use(cors());
// Add middleware for JSON
app.use(express.json());

// Define routes
app.use('/book', bookRoute);
app.use('/user', userRoute);
app.use('/order', orderRoute);
app.use('/ai', aiRoute);

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
