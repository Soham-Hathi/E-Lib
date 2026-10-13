import express from 'express';
import {
  allOrders,
  cancelOrder,
  myOrders,
  newOrder,
  updateOrder,
  createCheckoutSession,
  validateCoupon,
  exportOrdersCsv,
} from '../controllers/order.controller.js';
import { authMiddleware, isAdminMiddleware } from '../Authenticate/AdminMiddleWare.js';

const router = express.Router();

router.post('/placeorder', authMiddleware, newOrder);
router.post('/create-checkout-session', authMiddleware, createCheckoutSession);
router.post('/validate-coupon', authMiddleware, validateCoupon);
router.get('/export-csv', isAdminMiddleware, exportOrdersCsv);
router.get('/allorders', isAdminMiddleware, allOrders);
router.put('/updateorder/:id', isAdminMiddleware, updateOrder);
router.put('/updateOrder/:id', isAdminMiddleware, updateOrder);
router.get('/myorders', authMiddleware, myOrders);
router.put('/cancelorder/:id', authMiddleware, cancelOrder);

export default router;