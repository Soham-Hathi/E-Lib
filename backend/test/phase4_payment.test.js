import test from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';
import { paymentProvider } from '../services/paymentProvider.service.js';
import { PLANS, getSubscriptionPlans } from '../controllers/payment.controller.js';
import Payment from '../models/payment.model.js';
import Subscription from '../models/subscription.model.js';

test('PAY-01: Server-authoritative plan prices are immutable', () => {
  assert.strictEqual(PLANS.pro_monthly.amount, 14900, 'Monthly plan must be exactly Rs. 149 (14900 paise)');
  assert.strictEqual(PLANS.pro_annual.amount, 119900, 'Annual plan must be exactly Rs. 1199 (119900 paise)');
  assert.strictEqual(PLANS.pro_monthly.durationDays, 30, 'Monthly duration must be 30 days');
  assert.strictEqual(PLANS.pro_annual.durationDays, 365, 'Annual duration must be 365 days');
});

test('PAY-02: Cryptographic signature verification with timing-safe comparison', () => {
  const secret = 'rzp_test_secret_for_unit_tests_123456';
  paymentProvider.keySecret = secret;

  const orderId = 'order_test_12345';
  const paymentId = 'pay_test_67890';
  const payload = `${orderId}|${paymentId}`;

  const validSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  // Positive test: valid signature
  const isValid = paymentProvider.verifySignature({
    orderId,
    paymentId,
    signature: validSignature,
  });
  assert.strictEqual(isValid, true, 'Valid HMAC signature must verify successfully');

  // Negative test: tampered paymentId
  const isTampered = paymentProvider.verifySignature({
    orderId,
    paymentId: 'pay_tampered_99999',
    signature: validSignature,
  });
  assert.strictEqual(isTampered, false, 'Tampered payload must fail signature check');

  // Negative test: invalid signature string
  const isInvalid = paymentProvider.verifySignature({
    orderId,
    paymentId,
    signature: 'bad_signature_hash_000000000000000000000000000000000000000000000000',
  });
  assert.strictEqual(isInvalid, false, 'Invalid signature must be rejected');
});

test('PAY-03: Webhook signature verification rejects unauthorized payloads', () => {
  const webhookSecret = 'whsec_test_secret_key_888';
  paymentProvider.webhookSecret = webhookSecret;

  const rawBody = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_123' } } } });
  const validWebhookSig = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  const passes = paymentProvider.verifyWebhookSignature(rawBody, validWebhookSig);
  assert.strictEqual(passes, true, 'Valid webhook signature must pass');

  const fails = paymentProvider.verifyWebhookSignature(rawBody, 'forged_webhook_signature');
  assert.strictEqual(fails, false, 'Forged webhook signature must be rejected');
});

test('PAY-04: Payment and Subscription models have required indexes and fields', () => {
  assert.ok(Payment.schema.path('razorpayOrderId'), 'Payment must contain razorpayOrderId');
  assert.ok(Subscription.schema.path('planId'), 'Subscription must contain planId');
  assert.ok(Subscription.schema.path('status'), 'Subscription must contain status');
});

test('PAY-05: Simulated test signature verification accepts valid dev signatures', () => {
  // In dev simulated mode without keySecret
  paymentProvider.keySecret = '';
  const validDevSig = paymentProvider.verifySignature({
    orderId: 'order_test_123',
    paymentId: 'pay_test_456',
    signature: 'sig_test_789',
  });
  assert.strictEqual(validDevSig, true, 'sig_test_ prefix must pass dev signature check');

  const invalidDevSig = paymentProvider.verifySignature({
    orderId: 'order_test_123',
    paymentId: 'pay_test_456',
    signature: 'invalid_sig',
  });
  assert.strictEqual(invalidDevSig, false, 'Invalid dev signature must be rejected');
});

test('PAY-06: getSubscriptionPlans returns authoritative active plans with full feature lists', () => {
  let statusResult = null;
  let jsonResult = null;
  const res = {
    status: (code) => {
      statusResult = code;
      return res;
    },
    json: (payload) => {
      jsonResult = payload;
      return res;
    },
  };

  getSubscriptionPlans({}, res);
  assert.strictEqual(statusResult, 200);
  assert.strictEqual(jsonResult.success, true);
  assert.ok(Array.isArray(jsonResult.plans), 'plans must be an array');
  assert.strictEqual(jsonResult.plans.length, 2);
  const monthly = jsonResult.plans.find(p => p.id === 'pro_monthly');
  assert.ok(monthly, 'pro_monthly must exist');
  assert.strictEqual(monthly.amount, 14900);
  assert.ok(monthly.features.length >= 5, 'monthly plan must describe at least 5 features');
});

