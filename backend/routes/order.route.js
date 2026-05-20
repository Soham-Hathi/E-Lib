import express from 'express';
import { allOrders, cancelOrder, myOrders, newOrder, updateOrder, createCheckoutSession } from '../controllers/order.controller.js';
import { isAdminMiddleware } from '../Authenticate/AdminMiddleWare.js';

const router=express.Router();

router.post('/placeorder', newOrder);
router.post('/create-checkout-session', createCheckoutSession);
router.get('/allorders',isAdminMiddleware,allOrders);
router.put('/updateorder/:id', isAdminMiddleware, updateOrder);
router.get('/myorders', myOrders);
router.put('/cancelorder/:id', cancelOrder)

export default router;