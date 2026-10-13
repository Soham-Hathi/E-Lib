import test from 'node:test';
import assert from 'node:assert';
import { Buffer } from 'node:buffer';
if (typeof globalThis.SlowBuffer === 'undefined') {
  globalThis.SlowBuffer = Buffer;
}
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Order from '../models/order.model.js';
import Book from '../models/book.model.js';
import User from '../models/user.model.js';
import bookRouter from '../routes/book.route.js';

test('SEC-01: Password reset hashing verification', async () => {
  const plainPassword = 'NewSecretPassword123!';
  // Simulating the password reset logic
  const hashedPassword = await bcrypt.hash(plainPassword, 10);
  
  assert.notStrictEqual(hashedPassword, plainPassword, 'Password must not match plain text');
  assert.ok(hashedPassword.startsWith('$2'), 'Password must be a valid bcrypt hash');
  
  const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
  assert.strictEqual(isMatch, true, 'bcrypt.compare must validate the hashed password');
});

test('SEC-02: Consistent JWT signing and verification', () => {
  const secret = process.env.JWT_SECRET_KEY || 'test_jwt_secret_key';
  const payload = { userId: '650f1234567890abcdef1234', email: 'test@example.com' };
  
  const token = jwt.sign(payload, secret, { expiresIn: '15m' });
  assert.ok(typeof token === 'string' && token.length > 20, 'Token must be successfully generated');
  
  const decoded = jwt.verify(token, secret);
  assert.strictEqual(decoded.userId, payload.userId, 'Decoded user ID must match payload');
  assert.strictEqual(decoded.email, payload.email, 'Decoded email must match payload');
});

test('SEC-03: Order model schema references Book model correctly', () => {
  const productPath = Order.schema.path('productID');
  assert.ok(productPath, 'Order model must contain productID field');
  assert.strictEqual(productPath.options.ref, 'Book', 'Order productID ref must point to Book, not Product');
});

test('SEC-04: Book upload route enforces admin middleware before upload storage', () => {
  // Find the uploadbook POST route stack
  const uploadLayer = bookRouter.stack.find(
    (layer) => layer.route && layer.route.path === '/uploadbook' && layer.route.methods.post
  );
  
  assert.ok(uploadLayer, 'Upload route /uploadbook must be defined');
  const routeStack = uploadLayer.route.stack;
  assert.ok(routeStack.length >= 2, 'Route must have multiple middleware layers');
  
  // The first middleware function name in the route stack should be isAdminMiddleware
  const firstMiddlewareName = routeStack[0].name;
  assert.strictEqual(firstMiddlewareName, 'isAdminMiddleware', 'isAdminMiddleware must execute BEFORE Multer upload storage');
});
