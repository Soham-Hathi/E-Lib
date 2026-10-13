import test, { describe, before, after } from 'node:test';
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
import { newOrder, isValidEmail, isValidPhoneNumber } from '../controllers/order.controller.js';
import { authMiddleware } from '../Authenticate/AdminMiddleWare.js';

let mongoServer;
let testApp;
let server;
let baseUrl;
let verifiedUser;
let unverifiedUser;
let verifiedToken;
let unverifiedToken;
let testBook;

const JWT_SECRET = process.env.JWT_SECRET_KEY || 'fallback_jwt_secret_dev_key';

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  testApp = express();
  testApp.use(express.json());
  testApp.post('/order/placeorder', authMiddleware, newOrder);

  await new Promise((resolve) => {
    server = testApp.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });

  // Seed verified test user
  verifiedUser = await User.create({
    fullname: 'Soham Verified',
    email: 'soham.verified@example.com',
    password: 'hashedpassword123',
    isVerified: true,
  });

  // Seed unverified test user
  unverifiedUser = await User.create({
    fullname: 'Unverified Visitor',
    email: 'unverified.visitor@example.com',
    password: 'hashedpassword456',
    isVerified: false,
  });

  verifiedToken = jwt.sign(
    { userId: verifiedUser._id, email: verifiedUser.email },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  unverifiedToken = jwt.sign(
    { userId: unverifiedUser._id, email: unverifiedUser.email },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  testBook = await Book.create({
    name: 'The Great Gatsby',
    price: 0,
    category: 'Classics',
    description: 'A classic novel by F. Scott Fitzgerald.',
    rightsStatus: 'verified_public_domain',
  });
});

after(async () => {
  if (server) await new Promise((res) => server.close(res));
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('Phase 6: Strict Phone, Email & User Verification Engine', () => {

  test('VAL-01: isValidPhoneNumber accepts valid Indian mobile numbers starting with 6, 7, 8, 9', () => {
    assert.strictEqual(isValidPhoneNumber('9876543210'), true);
    assert.strictEqual(isValidPhoneNumber('8123456789'), true);
    assert.strictEqual(isValidPhoneNumber('7012345678'), true);
    assert.strictEqual(isValidPhoneNumber('6987654321'), true);
    assert.strictEqual(isValidPhoneNumber('+919876543210'), true);
    assert.strictEqual(isValidPhoneNumber('919876543210'), true);
  });

  test('VAL-02: isValidPhoneNumber strictly rejects dummy numbers like 1234565789 and sequences', () => {
    assert.strictEqual(isValidPhoneNumber('1234565789'), false, 'Should reject 1234565789 (user screenshot dummy)');
    assert.strictEqual(isValidPhoneNumber('1234567890'), false, 'Should reject 1234567890');
    assert.strictEqual(isValidPhoneNumber('0123456789'), false, 'Should reject 0123456789');
    assert.strictEqual(isValidPhoneNumber('0000000000'), false, 'Should reject repeating zeros');
    assert.strictEqual(isValidPhoneNumber('1111111111'), false, 'Should reject repeating ones');
    assert.strictEqual(isValidPhoneNumber('9999999999'), false, 'Should reject repeating nines');
    assert.strictEqual(isValidPhoneNumber('12345'), false, 'Should reject too short');
    assert.strictEqual(isValidPhoneNumber(''), false, 'Should reject empty');
    assert.strictEqual(isValidPhoneNumber(null), false, 'Should reject null');
  });

  test('VAL-03: isValidPhoneNumber strictly rejects 10-digit numbers starting with 0-5', () => {
    assert.strictEqual(isValidPhoneNumber('0987654321'), false);
    assert.strictEqual(isValidPhoneNumber('1987654321'), false);
    assert.strictEqual(isValidPhoneNumber('2987654321'), false);
    assert.strictEqual(isValidPhoneNumber('3987654321'), false);
    assert.strictEqual(isValidPhoneNumber('4987654321'), false);
    assert.strictEqual(isValidPhoneNumber('5987654321'), false);
  });

  test('VAL-04: isValidEmail accepts valid email formats and rejects malformed addresses', () => {
    assert.strictEqual(isValidEmail('hathisoham9@gmail.com'), true);
    assert.strictEqual(isValidEmail('user.name+tag@domain.co.in'), true);
    assert.strictEqual(isValidEmail('plainaddress'), false);
    assert.strictEqual(isValidEmail('@missingusername.com'), false);
    assert.strictEqual(isValidEmail('missingatsign.com'), false);
    assert.strictEqual(isValidEmail('spaces in@email.com'), false);
    assert.strictEqual(isValidEmail(''), false);
    assert.strictEqual(isValidEmail(null), false);
  });

  test('VAL-05: Order placement is blocked with 403 when user is unverified', async () => {
    const res = await fetch(`${baseUrl}/order/placeorder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${unverifiedToken}`,
      },
      body: JSON.stringify({
        productID: testBook._id.toString(),
        quantity: 1,
        phoneNumber: '9876543210',
        address: '123 Main St',
      }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 403, 'Unverified user must receive HTTP 403 Forbidden');
    assert.strictEqual(data.isUnverified, true);
    assert.ok(data.message.includes('not verified'));
  });

  test('VAL-06: Order placement is blocked with 400 when phone number is invalid dummy 1234565789', async () => {
    const res = await fetch(`${baseUrl}/order/placeorder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${verifiedToken}`,
      },
      body: JSON.stringify({
        productID: testBook._id.toString(),
        quantity: 1,
        phoneNumber: '1234565789',
        address: 'bms',
      }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 400, 'Invalid dummy phone number must return 400');
    assert.ok(data.message.includes('valid 10-digit mobile number') || data.message.includes('1234565789'));
  });

  test('VAL-07: Order placement succeeds with 201 for verified user with valid mobile number', async () => {
    const res = await fetch(`${baseUrl}/order/placeorder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${verifiedToken}`,
      },
      body: JSON.stringify({
        productID: testBook._id.toString(),
        quantity: 1,
        phoneNumber: '9876543210',
        address: 'Digital Library Access',
        paymentMethod: 'Free Access',
      }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 201, 'Verified user with valid phone must succeed with 201');
    assert.strictEqual(data.order.email, 'soham.verified@example.com');
    assert.strictEqual(data.order.phoneNumber, '9876543210');
    assert.strictEqual(data.order.totalPrice, 0);
  });

  test('VAL-08: Order placement is blocked with 401 when token is missing', async () => {
    const res = await fetch(`${baseUrl}/order/placeorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productID: testBook._id.toString(),
        quantity: 1,
        phoneNumber: '9876543210',
      }),
    });

    assert.strictEqual(res.status, 401);
  });

  test('VAL-09: Order placement is blocked with 404 when token user ID does not exist in DB', async () => {
    const fakeToken = jwt.sign(
      { userId: new mongoose.Types.ObjectId(), email: 'nonexistent@example.com' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const res = await fetch(`${baseUrl}/order/placeorder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${fakeToken}`,
      },
      body: JSON.stringify({
        productID: testBook._id.toString(),
        quantity: 1,
        phoneNumber: '9876543210',
      }),
    });

    assert.strictEqual(res.status, 404);
  });
});
