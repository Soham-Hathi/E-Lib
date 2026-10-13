import test, { describe, before, after } from 'node:test';
import assert from 'node:assert';
import { Buffer } from 'node:buffer';
if (typeof globalThis.SlowBuffer === 'undefined') {
  globalThis.SlowBuffer = Buffer;
}

import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import { getUserProfile, updateUserProfile, changeUserPassword, deleteUserAccount } from '../controllers/user.controller.js';
import { authMiddleware } from '../Authenticate/AdminMiddleWare.js';

let mongoServer;
let testApp;
let server;
let baseUrl;
let testUser;
let token;

const JWT_SECRET = process.env.JWT_SECRET_KEY || 'fallback_jwt_secret_dev_key';

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  testApp = express();
  testApp.use(express.json());
  testApp.get('/user/profile', authMiddleware, getUserProfile);
  testApp.put('/user/profile', authMiddleware, updateUserProfile);
  testApp.put('/user/change-password', authMiddleware, changeUserPassword);
  testApp.delete('/user/account', authMiddleware, deleteUserAccount);

  await new Promise((resolve) => {
    server = testApp.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });

  const hashedPassword = await bcrypt.hash('OriginalPass123', 10);
  testUser = await User.create({
    fullname: 'John Scholar',
    email: 'scholar@example.com',
    password: hashedPassword,
    isVerified: true,
  });

  token = jwt.sign({ userId: testUser._id }, JWT_SECRET, { expiresIn: '1h' });
});

after(async () => {
  if (server) await new Promise((r) => server.close(r));
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('Phase 3: User Profile & Account Settings Tests', () => {
  test('PROF-01: Get user profile returns user info without exposing password hash', async () => {
    const res = await fetch(`${baseUrl}/user/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.user.email, 'scholar@example.com');
    assert.strictEqual(data.user.fullname, 'John Scholar');
    assert.strictEqual(data.user.password, undefined, 'Password hash must never be returned');
  });

  test('PROF-02: Update user profile modifies fullname and persists changes in MongoDB', async () => {
    const res = await fetch(`${baseUrl}/user/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fullname: 'Dr. John Scholar PhD' }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.user.fullname, 'Dr. John Scholar PhD');

    const dbUser = await User.findById(testUser._id);
    assert.strictEqual(dbUser.fullname, 'Dr. John Scholar PhD');
  });

  test('PROF-03: Change password validates current password before updating', async () => {
    // Attempt with incorrect current password
    const failRes = await fetch(`${baseUrl}/user/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        currentPassword: 'WrongPassword',
        newPassword: 'BrandNewSecurePass456',
      }),
    });

    assert.strictEqual(failRes.status, 400);

    // Attempt with valid current password
    const successRes = await fetch(`${baseUrl}/user/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        currentPassword: 'OriginalPass123',
        newPassword: 'BrandNewSecurePass456',
      }),
    });

    assert.strictEqual(successRes.status, 200);

    const updatedUser = await User.findById(testUser._id);
    const isNewValid = await bcrypt.compare('BrandNewSecurePass456', updatedUser.password);
    assert.strictEqual(isNewValid, true, 'New password hash must match');
  });

  test('PROF-04: Delete account requires password confirmation and removes user from database', async () => {
    // Attempt deletion with wrong password
    const failRes = await fetch(`${baseUrl}/user/account`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ password: 'IncorrectPassword' }),
    });

    assert.strictEqual(failRes.status, 400);

    // Attempt deletion with correct password (updated in PROF-03)
    const successRes = await fetch(`${baseUrl}/user/account`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ password: 'BrandNewSecurePass456' }),
    });

    assert.strictEqual(successRes.status, 200);

    const deletedUser = await User.findById(testUser._id);
    assert.strictEqual(deletedUser, null, 'User should be removed from database');
  });
});
