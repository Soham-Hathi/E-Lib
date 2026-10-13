import test, { describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import { Buffer } from 'node:buffer';
if (typeof globalThis.SlowBuffer === 'undefined') {
  globalThis.SlowBuffer = Buffer;
}

import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import Book from '../models/book.model.js';
import User from '../models/user.model.js';
import Order from '../models/order.model.js';
import { newOrder, myOrders, cancelOrder } from '../controllers/order.controller.js';
import { authMiddleware } from '../Authenticate/AdminMiddleWare.js';

let mongoServer;
let testApp;
let server;
let baseUrl;
let testUser1;
let testUser2;
let token1;
let token2;
let testBook1;
let testBook2;

const JWT_SECRET = process.env.JWT_SECRET_KEY || 'fallback_jwt_secret_dev_key';

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  testApp = express();
  testApp.use(express.json());
  testApp.post('/order/placeorder', authMiddleware, newOrder);
  testApp.get('/order/myorders', authMiddleware, myOrders);
  testApp.put('/order/cancelorder/:id', authMiddleware, cancelOrder);

  await new Promise((resolve) => {
    server = testApp.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });

  // Seed test users
  testUser1 = await User.create({
    fullname: 'Alice Student',
    email: 'alice@example.com',
    password: 'hashedpassword123',
    isVerified: true,
  });

  testUser2 = await User.create({
    fullname: 'Bob Reader',
    email: 'bob@example.com',
    password: 'hashedpassword456',
    isVerified: true,
  });

  token1 = jwt.sign({ userId: testUser1._id }, JWT_SECRET, { expiresIn: '1h' });
  token2 = jwt.sign({ userId: testUser2._id }, JWT_SECRET, { expiresIn: '1h' });

  // Seed test books
  testBook1 = await Book.create({
    name: 'Introduction to Algorithms',
    price: 499,
    category: 'Computer Science',
    description: 'Comprehensive textbook on algorithms.',
    rightsStatus: 'verified_open_license',
  });

  testBook2 = await Book.create({
    name: 'Principles of Physics',
    price: 299,
    category: 'Physics',
    description: 'Foundational physics concepts.',
    rightsStatus: 'verified_public_domain',
  });
});

after(async () => {
  if (server) await new Promise((r) => server.close(r));
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('Phase 2: Cart & Server-Authoritative Order Tests', () => {
  test('ORD-01: Server calculates authoritative price and rejects client-tampered price', async () => {
    // Client attempts to pass a spoofed totalPrice of 10 instead of 499 * 2 = 998
    const res = await fetch(`${baseUrl}/order/placeorder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({
        productID: testBook1._id.toString(),
        quantity: 2,
        totalPrice: 10, // Tampered client price!
        phoneNumber: '9876543210',
      }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.order.totalPrice, 998, 'Server must enforce 499 * 2 = 998');
    assert.strictEqual(data.order.quantity, 2);
  });

  test('ORD-02: Multi-item cart checkout calculates authoritative prices for each book', async () => {
    const res = await fetch(`${baseUrl}/order/placeorder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({
        items: [
          { productID: testBook1._id.toString(), quantity: 1 }, // 499
          { productID: testBook2._id.toString(), quantity: 2 }, // 299 * 2 = 598
        ],
        phoneNumber: '9876543210',
      }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.orders.length, 2);
    // Total should be 499 + 598 = 1097
    assert.strictEqual(data.totalPrice, 1097, 'Total cart price must equal sum of server items');
  });

  test('ORD-03: User cannot cancel another user\'s order (Strict 403 Authorization)', async () => {
    // Alice creates an order
    const orderRes = await fetch(`${baseUrl}/order/placeorder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({
        productID: testBook2._id.toString(),
        quantity: 1,
        phoneNumber: '9876543210',
      }),
    });
    const orderData = await orderRes.json();
    const aliceOrderId = orderData.order._id;

    // Bob tries to cancel Alice's order
    const cancelRes = await fetch(`${baseUrl}/order/cancelorder/${aliceOrderId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token2}`, // Bob's token
      },
    });

    const cancelData = await cancelRes.json();
    assert.strictEqual(cancelRes.status, 403, 'Must return 403 when cancelling another user order');
    assert.match(cancelData.message, /only cancel your own orders/i);
  });

  test('ORD-04: Order owner can successfully cancel their own order', async () => {
    // Alice creates an order
    const orderRes = await fetch(`${baseUrl}/order/placeorder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({
        productID: testBook1._id.toString(),
        quantity: 1,
        phoneNumber: '9876543210',
      }),
    });
    const orderData = await orderRes.json();
    const orderId = orderData.order._id;

    // Alice cancels her own order
    const cancelRes = await fetch(`${baseUrl}/order/cancelorder/${orderId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token1}`,
      },
    });

    const cancelData = await cancelRes.json();
    assert.strictEqual(cancelRes.status, 200);
    assert.strictEqual(cancelData.order.isCancelled, true);
  });

  test('ORD-05: Authenticated myorders returns orders belonging exclusively to the user', async () => {
    const res = await fetch(`${baseUrl}/order/myorders`, {
      headers: {
        Authorization: `Bearer ${token1}`,
      },
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(data));
    assert.ok(data.length >= 1);
    for (const ord of data) {
      assert.strictEqual(ord.userID.toString(), testUser1._id.toString());
    }
  });
});
