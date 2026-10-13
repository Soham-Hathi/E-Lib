import express from 'express';
import {
  createSubscriptionOrder,
  verifyPayment,
  handleWebhook,
  getSubscriptionStatus,
  getSubscriptionPlans,
  getAllSubscriptions,
  createBookPaymentOrder,
  verifyBookPayment,
  createPaymentForExistingOrder,
  verifyExistingOrderPayment,
} from '../controllers/payment.controller.js';
import { authMiddleware, isAdminMiddleware } from '../Authenticate/AdminMiddleWare.js';

const router = express.Router();

// Customer Subscription endpoints
router.get('/plans', getSubscriptionPlans);
router.post('/create-order', authMiddleware, createSubscriptionOrder);
router.post('/verify', authMiddleware, verifyPayment);
router.get('/subscription', authMiddleware, getSubscriptionStatus);
router.get('/all-subscriptions', isAdminMiddleware, getAllSubscriptions);

// Customer Book / Cart Checkout Payment endpoints
router.post('/create-book-order', authMiddleware, createBookPaymentOrder);
router.post('/verify-book-payment', authMiddleware, verifyBookPayment);

// Pay for existing unpaid orders
router.post('/pay-order/:orderId', authMiddleware, createPaymentForExistingOrder);
router.post('/verify-order-payment/:orderId', authMiddleware, verifyExistingOrderPayment);

// Provider Webhook Endpoint (processed raw or parsed)
router.post('/webhook', handleWebhook);

export default router;
