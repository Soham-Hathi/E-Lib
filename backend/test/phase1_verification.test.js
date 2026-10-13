import test, { describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import { Buffer } from 'node:buffer';
if (typeof globalThis.SlowBuffer === 'undefined') {
  globalThis.SlowBuffer = Buffer;
}

import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';
import User from '../models/user.model.js';
import { signup, resendVerification, verifyEmail, confirmVerifyEmail, login } from '../controllers/user.controller.js';
import { emailService } from '../services/email.service.js';

let mongoServer;
let testApp;
let server;
let baseUrl;

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  testApp = express();
  testApp.use(express.json());
  testApp.post('/user/signup', signup);
  testApp.post('/user/resend-verification', resendVerification);
  testApp.get('/user/verify-email', verifyEmail);
  testApp.post('/user/verify-email/confirm', confirmVerifyEmail);
  testApp.post('/user/login', login);

  await new Promise((resolve) => {
    server = testApp.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) await new Promise((r) => server.close(r));
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
});

describe('Phase 1: Signup, Email Verification & Identification Tests', () => {

  // 1. Successful registration
  test('1. Successful registration sets isVerified: false and dispatches token', async () => {
    const res = await fetch(`${baseUrl}/user/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullname: 'Ada Lovelace',
        email: 'ada@example.com',
        password: 'Password123!',
      }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.status, 'verification_pending');
    assert.ok(data.maskedEmail.includes('@example.com'));

    const user = await User.findOne({ email: 'ada@example.com' });
    assert.ok(user, 'User must exist in database');
    assert.strictEqual(user.isVerified, false, 'New user must be unverified');
    assert.ok(user.verificationToken, 'Hashed verification token must be stored');
    assert.ok(user.verificationTokenExpires > new Date(), 'Expiry must be in the future');
  });

  // 2. Duplicate verified email
  test('2. Duplicate verified email returns 409 Conflict', async () => {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    await User.create({
      fullname: 'Alan Turing',
      email: 'alan@example.com',
      password: passwordHash,
      isVerified: true,
      emailVerifiedAt: new Date(),
    });

    const res = await fetch(`${baseUrl}/user/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullname: 'Alan Turing Duplicate',
        email: 'alan@example.com',
        password: 'NewPassword123!',
      }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 409);
    assert.strictEqual(data.isVerified, true);
    assert.ok(data.message.includes('already exists'));
  });

  // 3. Duplicate unverified email
  test('3. Duplicate unverified email issues fresh token and avoids creating duplicate documents', async () => {
    const rawToken = emailService.generateToken();
    const hashed = emailService.hashToken(rawToken);
    const past = new Date(Date.now() - 120 * 1000); // 2 minutes ago

    await User.create({
      fullname: 'Grace Hopper',
      email: 'grace@example.com',
      password: await bcrypt.hash('OldPassword123!', 10),
      isVerified: false,
      verificationToken: hashed,
      verificationTokenExpires: new Date(Date.now() + 10000),
      lastVerificationEmailSentAt: past,
    });

    const res = await fetch(`${baseUrl}/user/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullname: 'Grace Hopper',
        email: 'grace@example.com',
        password: 'NewPassword123!',
      }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.status, 'verification_pending');

    const count = await User.countDocuments({ email: 'grace@example.com' });
    assert.strictEqual(count, 1, 'Must not duplicate user document');

    const updatedUser = await User.findOne({ email: 'grace@example.com' });
    assert.notStrictEqual(updatedUser.verificationToken, hashed, 'Must rotate verification token');
  });

  // 4. Email-provider failure
  test('4. Email provider failure is captured safely without throwing 500 error', async () => {
    const originalSend = emailService.sendVerificationEmail;
    emailService.sendVerificationEmail = async () => ({
      success: false,
      status: 'failed',
      error: 'SMTP Connection Refused',
      maskedEmail: 't***t@example.com',
    });

    try {
      const res = await fetch(`${baseUrl}/user/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullname: 'Test Failure',
          email: 'failure@example.com',
          password: 'Password123!',
        }),
      });

      const data = await res.json();
      assert.strictEqual(res.status, 201, 'Signup succeeds even if email transport warns');
      
      const user = await User.findOne({ email: 'failure@example.com' });
      assert.strictEqual(user.verificationEmailStatus, 'failed', 'Record must reflect failed email delivery attempt');
    } finally {
      emailService.sendVerificationEmail = originalSend;
    }
  });

  // 5. Missing email configuration
  test('5. Missing email credentials safely activates dev preview fallback without crashing', async () => {
    const rawToken = emailService.generateToken();
    const result = await emailService.sendVerificationEmail({
      email: 'devpreview@example.com',
      fullname: 'Dev Tester',
      rawToken,
    });

    assert.ok(result.success, 'Dev preview fallback must report success');
    assert.ok(result.previewUrl || result.status === 'sent', 'Must provide preview URL or send status');
  });

  // 6. Invalid verification token
  test('6. Invalid verification token returns 400', async () => {
    const res = await fetch(`${baseUrl}/user/verify-email?token=completely_invalid_random_token_123`, {
      headers: { 'Accept': 'application/json' },
    });

    const data = await res.json();
    assert.strictEqual(res.status, 400);
    assert.ok(data.message.includes('Invalid'));
  });

  // 7. Expired token
  test('7. Expired verification token returns 400 expired error', async () => {
    const rawToken = emailService.generateToken();
    const hashed = emailService.hashToken(rawToken);

    await User.create({
      fullname: 'Expired User',
      email: 'expired@example.com',
      password: await bcrypt.hash('Password123!', 10),
      isVerified: false,
      verificationToken: hashed,
      verificationTokenExpires: new Date(Date.now() - 3600 * 1000), // Expired 1 hour ago
    });

    const res = await fetch(`${baseUrl}/user/verify-email?token=${rawToken}`, {
      headers: { 'Accept': 'application/json' },
    });

    const data = await res.json();
    assert.strictEqual(res.status, 400);
    assert.ok(data.message.includes('expired'));
  });

  // 8. Reused token
  test('8. Reused token cannot verify an account twice', async () => {
    const rawToken = emailService.generateToken();
    const hashed = emailService.hashToken(rawToken);

    await User.create({
      fullname: 'Single Use User',
      email: 'singleuse@example.com',
      password: await bcrypt.hash('Password123!', 10),
      isVerified: false,
      verificationToken: hashed,
      verificationTokenExpires: new Date(Date.now() + 3600 * 1000),
    });

    // First use: confirmation via POST /user/verify-email/confirm
    const res1 = await fetch(`${baseUrl}/user/verify-email/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ token: rawToken }),
    });
    assert.strictEqual(res1.status, 200, 'First verification must succeed');

    // Second use with the same token
    const res2 = await fetch(`${baseUrl}/user/verify-email/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ token: rawToken }),
    });
    assert.strictEqual(res2.status, 400, 'Second verification attempt must fail');
  });

  // 9. Successful verification
  test('9. Successful verification activates account and records emailVerifiedAt', async () => {
    const rawToken = emailService.generateToken();
    const hashed = emailService.hashToken(rawToken);

    const created = await User.create({
      fullname: 'Margaret Hamilton',
      email: 'margaret@example.com',
      password: await bcrypt.hash('Apollo11Guidance', 10),
      isVerified: false,
      verificationToken: hashed,
      verificationTokenExpires: new Date(Date.now() + 3600 * 1000),
    });

    const res = await fetch(`${baseUrl}/user/verify-email/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ token: rawToken }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.isVerified, true);

    const verifiedUser = await User.findById(created._id);
    assert.strictEqual(verifiedUser.isVerified, true);
    assert.ok(verifiedUser.emailVerifiedAt instanceof Date);
    assert.strictEqual(verifiedUser.verificationToken, null);
    assert.strictEqual(verifiedUser.verificationTokenExpires, null);
  });

  // 10. Resend cooldown
  test('10. Resend cooldown enforces 60-second limit and returns 429', async () => {
    const rawToken = emailService.generateToken();
    const hashed = emailService.hashToken(rawToken);

    await User.create({
      fullname: 'Cooldown Test',
      email: 'cooldown@example.com',
      password: await bcrypt.hash('Password123!', 10),
      isVerified: false,
      verificationToken: hashed,
      verificationTokenExpires: new Date(Date.now() + 3600 * 1000),
      lastVerificationEmailSentAt: new Date(), // Sent just now
    });

    const res = await fetch(`${baseUrl}/user/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'cooldown@example.com' }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 429);
    assert.ok(data.cooldownSeconds > 0 && data.cooldownSeconds <= 60);
  });

  // 11. Rate limit enforcement (per-route check)
  test('11. Rapid resend requests respect rate limit window', async () => {
    const user = await User.create({
      fullname: 'Rate Limit User',
      email: 'ratelimit@example.com',
      password: await bcrypt.hash('Password123!', 10),
      isVerified: false,
      lastVerificationEmailSentAt: new Date(Date.now() - 100 * 1000),
    });

    // Make initial resend request
    const res1 = await fetch(`${baseUrl}/user/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ratelimit@example.com' }),
    });
    assert.strictEqual(res1.status, 200);

    // Immediate second request hits per-user 60s cooldown limit
    const res2 = await fetch(`${baseUrl}/user/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ratelimit@example.com' }),
    });
    assert.strictEqual(res2.status, 429);
  });

  // 12. Login before and after verification
  test('12. Login is blocked before verification (403) and permitted after (200)', async () => {
    const rawToken = emailService.generateToken();
    const hashed = emailService.hashToken(rawToken);
    const password = 'SecretPassword123!';
    const passwordHash = await bcrypt.hash(password, 10);

    await User.create({
      fullname: 'Login Flow User',
      email: 'loginflow@example.com',
      password: passwordHash,
      isVerified: false,
      verificationToken: hashed,
      verificationTokenExpires: new Date(Date.now() + 3600 * 1000),
    });

    // Attempt login while unverified
    const unverifiedRes = await fetch(`${baseUrl}/user/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'loginflow@example.com', password }),
    });
    assert.strictEqual(unverifiedRes.status, 403);
    const unverifiedData = await unverifiedRes.json();
    assert.strictEqual(unverifiedData.isVerified, false);

    // Verify account
    await fetch(`${baseUrl}/user/verify-email/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ token: rawToken }),
    });

    // Attempt login after verification
    const verifiedRes = await fetch(`${baseUrl}/user/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'loginflow@example.com', password }),
    });
    assert.strictEqual(verifiedRes.status, 200);
    const verifiedData = await verifiedRes.json();
    assert.ok(verifiedData.token, 'Must return JWT token upon verified login');
  });

  // 13. Case-insensitive duplicate emails
  test('13. Case-insensitive duplicate emails are normalized consistently', async () => {
    // First signup with mixed case
    const res1 = await fetch(`${baseUrl}/user/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullname: 'Case Test',
        email: 'CaseSensitive@Example.Com',
        password: 'Password123!',
      }),
    });
    assert.strictEqual(res1.status, 201);

    // Second signup with all lowercase
    const res2 = await fetch(`${baseUrl}/user/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullname: 'Case Test 2',
        email: 'casesensitive@example.com',
        password: 'Password123!',
      }),
    });
    // Since it was unverified and just sent, it triggers cooldown notice without creating duplicate
    assert.strictEqual(res2.status, 200);

    const count = await User.countDocuments({ email: 'casesensitive@example.com' });
    assert.strictEqual(count, 1, 'Only one normalized lowercase user document must exist');
  });

  // 14. Concurrent signup requests for the same email
  test('14. Concurrent signups for the same email handle race conditions safely', async () => {
    const signupPayload = {
      fullname: 'Concurrency User',
      email: 'concurrent@example.com',
      password: 'Password123!',
    };

    // Dispatch 3 concurrent requests simultaneously
    const [res1, res2, res3] = await Promise.all([
      fetch(`${baseUrl}/user/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupPayload),
      }),
      fetch(`${baseUrl}/user/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupPayload),
      }),
      fetch(`${baseUrl}/user/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupPayload),
      }),
    ]);

    const statuses = [res1.status, res2.status, res3.status];
    // At least one must succeed with 201 or 200, and no unhandled 500 crashes
    assert.ok(statuses.includes(201) || statuses.includes(200));
    assert.strictEqual(statuses.filter(s => s === 500).length, 0, 'No 500 internal server errors');

    const totalDocs = await User.countDocuments({ email: 'concurrent@example.com' });
    assert.strictEqual(totalDocs, 1, 'Only 1 user document must exist in database');
  });

  // 15. Safe handling of MongoDB duplicate-key errors
  test('15. Safe handling of MongoDB duplicate-key errors (E11000)', async () => {
    // Manually trigger a duplicate key scenario
    const userA = new User({
      fullname: 'User A',
      email: 'dupkey@example.com',
      password: 'hash',
    });
    await userA.save();

    let duplicateKeyCaught = false;
    try {
      const userB = new User({
        fullname: 'User B',
        email: 'dupkey@example.com',
        password: 'hash',
      });
      await userB.save();
    } catch (err) {
      if (err.code === 11000) {
        duplicateKeyCaught = true;
      }
    }

    assert.strictEqual(duplicateKeyCaught, true, 'Mongo unique index properly throws code 11000');
  });

});
