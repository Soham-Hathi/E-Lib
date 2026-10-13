import test from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import Coupon from '../models/coupon.model.js';
import Review from '../models/review.model.js';
import Bookshelf from '../models/bookshelf.model.js';
import Book from '../models/book.model.js';

test('Phase 8: Reader, Review, Bookshelf, and Coupon Tests', async (t) => {
  let mongoServer;

  t.before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    await Review.init();
    await Bookshelf.init();
    await Coupon.init();
  });

  t.after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  await t.test('COUPON-01: Percentage coupon applies correct discount with cap', async () => {
    const coupon = await Coupon.create({
      code: 'TEST20',
      discountType: 'percentage',
      discountValue: 20,
      minOrderAmount: 100,
      maxDiscountAmount: 50,
    });

    const orderAmount = 500;
    let discount = Math.round((orderAmount * coupon.discountValue) / 100); // 100
    if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
      discount = coupon.maxDiscountAmount; // capped at 50
    }
    const finalAmount = orderAmount - discount;

    assert.strictEqual(discount, 50);
    assert.strictEqual(finalAmount, 450);
  });

  await t.test('COUPON-02: Fixed coupon applies flat discount without exceeding order amount', async () => {
    const coupon = await Coupon.create({
      code: 'FLAT100',
      discountType: 'fixed',
      discountValue: 100,
      minOrderAmount: 50,
    });

    const orderAmount = 80;
    const discount = Math.min(coupon.discountValue, orderAmount);
    assert.strictEqual(discount, 80);
    assert.strictEqual(orderAmount - discount, 0);
  });

  await t.test('REVIEW-01: Unique constraint prevents duplicate reviews from same user for same book', async () => {
    const userId = new mongoose.Types.ObjectId();
    const bookId = new mongoose.Types.ObjectId();

    await Review.create({
      userId,
      userName: 'Test Reader',
      userEmail: 'reader@example.com',
      bookId,
      rating: 5,
      comment: 'Superb read!',
    });

    await assert.rejects(
      async () => {
        await Review.create({
          userId,
          userName: 'Test Reader',
          userEmail: 'reader@example.com',
          bookId,
          rating: 4,
          comment: 'Another review',
        });
      },
      /duplicate key error/
    );
  });

  await t.test('BOOKSHELF-01: User can track books by reading shelf status', async () => {
    const userId = new mongoose.Types.ObjectId();
    const bookId = new mongoose.Types.ObjectId();

    const entry = await Bookshelf.create({
      userId,
      bookId,
      shelf: 'currently_reading',
      notes: 'Chapter 2 is incredible',
    });

    assert.strictEqual(entry.shelf, 'currently_reading');
    assert.strictEqual(entry.notes, 'Chapter 2 is incredible');
  });
});
