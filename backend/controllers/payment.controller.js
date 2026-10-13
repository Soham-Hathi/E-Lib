import Payment from '../models/payment.model.js';
import Subscription from '../models/subscription.model.js';
import User from '../models/user.model.js';
import Book from '../models/book.model.js';
import Order from '../models/order.model.js';
import { paymentProvider } from '../services/paymentProvider.service.js';
import { emailService } from '../services/email.service.js';
import { isValidEmail, isValidPhoneNumber } from './order.controller.js';

// Server-authoritative plan pricing (Never trust prices sent by client)
export const PLANS = {
  pro_monthly: {
    id: 'pro_monthly',
    name: 'VIP Reader Monthly',
    amount: 14900, // Rs. 149 in paise
    durationDays: 30,
    priceRupees: 149,
    badge: 'Popular Choice',
    billingCycle: 'Billed monthly',
    features: [
      'Unlimited In-Browser E-Reader Access to All 160 Real Books',
      'Instant ePub & Full-Text Downloads for Offline Reading',
      'Interactive AI Book Tutor & Reading Companion',
      'Personal Bookshelf Cloud Sync & Cross-Device Progress',
      '20% Auto-Discount on all Physical Book Orders',
      'Exclusive Golden VIP Member Crown Badge',
    ],
  },
  pro_annual: {
    id: 'pro_annual',
    name: 'VIP Scholar Annual',
    amount: 119900, // Rs. 1199 in paise (~Rs. 99/month)
    durationDays: 365,
    priceRupees: 1199,
    badge: 'Best Value (Save 33%)',
    billingCycle: 'Billed annually (~₹99/mo)',
    monthlyEquivalent: 99,
    savingsText: 'Save ₹589 compared to monthly billing',
    features: [
      'Everything in VIP Reader Monthly',
      'Full 365 Days Uncapped All-You-Can-Read Access',
      'Priority Access to New Releases & Curated Masterpieces',
      'Enhanced AI Chapter Quizzes & In-Depth Concept Explanations',
      'Permanent 25% Auto-Discount on all Physical Book Orders',
      'Distinguished Golden Scholar Crown Badge on Profile',
    ],
  },
};

/**
 * Get available subscription plans (Public)
 */
export const getSubscriptionPlans = (req, res) => {
  res.status(200).json({
    success: true,
    plans: Object.values(PLANS),
  });
};

/**
 * Create a server-authoritative Razorpay order for subscription checkout
 */
export const createSubscriptionOrder = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required. Please log in." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User account not found or is invalid. Please log in again." });
    }

    if (user.isVerified === false) {
      return res.status(403).json({
        message: `Your account email (${user.email}) is not verified. Please verify your email before subscribing.`,
        isUnverified: true,
        email: user.email,
      });
    }

    const { planId = 'pro_monthly' } = req.body;

    const plan = PLANS[planId];
    if (!plan) {
      return res.status(400).json({ message: `Invalid plan specified. Available plans: ${Object.keys(PLANS).join(', ')}` });
    }

    // 1. Create preliminary payment record in database
    const payment = new Payment({
      userId,
      planId: plan.id,
      amount: plan.amount,
      currency: 'INR',
      status: 'created',
      razorpayOrderId: `pending_${Date.now()}`,
    });

    // 2. Request order from payment provider
    const rzpOrder = await paymentProvider.createOrder({
      amount: plan.amount,
      currency: 'INR',
      receipt: payment._id.toString(),
      notes: { userId: userId.toString(), planId: plan.id },
    });

    // 3. Update payment record with real Razorpay Order ID
    payment.razorpayOrderId = rzpOrder.id;
    await payment.save();

    res.status(200).json({
      orderId: rzpOrder.id,
      amount: plan.amount,
      currency: 'INR',
      keyId: rzpOrder.isSimulated ? 'rzp_test_placeholder' : (process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder'),
      isSimulated: Boolean(rzpOrder.isSimulated),
      planName: plan.name,
      planId: plan.id,
    });
  } catch (error) {
    console.error('[Create Order Error]:', error);
    res.status(500).json({ message: 'Failed to initiate secure checkout order.', error: error.message });
  }
};

/**
 * Verify client payment signature and activate Pro subscription
 */
export const verifyPayment = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Incomplete payment verification payload.' });
    }

    // Timing-safe cryptographic signature check
    const isValid = paymentProvider.verifySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      return res.status(400).json({ message: 'Cryptographic payment signature mismatch. Verification failed.' });
    }

    // Lookup payment transaction
    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!payment) {
      return res.status(404).json({ message: 'Payment record not found for this order ID.' });
    }

    // Update payment record
    payment.status = 'captured';
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.updatedAt = new Date();
    await payment.save();

    // Activate subscription
    const plan = PLANS[payment.planId] || PLANS.pro_monthly;
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

    let subscription = await Subscription.findOne({ userId });
    if (!subscription) {
      subscription = new Subscription({
        userId,
        planId: plan.id,
        amount: plan.amount / 100,
        status: 'active',
        startDate,
        endDate,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
      });
    } else {
      // Extend or reactivate existing subscription
      subscription.planId = plan.id;
      subscription.status = 'active';
      subscription.startDate = startDate;
      subscription.endDate = endDate;
      subscription.razorpayOrderId = razorpay_order_id;
      subscription.razorpayPaymentId = razorpay_payment_id;
    }
    await subscription.save();

    // Update user document
    await User.findByIdAndUpdate(userId, { isPro: true });

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully! Welcome to E-Library Pro.',
      subscription: {
        status: 'active',
        plan: plan.name,
        expiresAt: endDate,
      },
    });
  } catch (error) {
    console.error('[Payment Verification Error]:', error);
    res.status(500).json({ message: 'Payment verification failed.', error: error.message });
  }
};

/**
 * Authoritative Server-to-Server Razorpay Webhook Handler
 */
export const handleWebhook = async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const rawBody = req.rawBody || JSON.stringify(req.body);

  if (!signature) {
    return res.status(400).json({ message: 'Missing X-Razorpay-Signature header' });
  }

  const isValid = paymentProvider.verifyWebhookSignature(rawBody, signature);
  if (!isValid) {
    return res.status(400).json({ message: 'Invalid webhook signature' });
  }

  const event = req.body;
  const eventId = event?.event_id || event?.id;

  try {
    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const entity = event.payload?.payment?.entity || event.payload?.order?.entity;
      const orderId = entity?.order_id || entity?.id;
      const paymentId = entity?.id;

      if (orderId) {
        const payment = await Payment.findOne({ razorpayOrderId: orderId });
        if (payment) {
          // Idempotency check: skip already processed event
          if (eventId && payment.webhookEventsProcessed.includes(eventId)) {
            return res.status(200).json({ status: 'already_processed' });
          }

          payment.status = 'captured';
          payment.razorpayPaymentId = paymentId;
          if (eventId) payment.webhookEventsProcessed.push(eventId);
          payment.updatedAt = new Date();
          await payment.save();

          // Grant Pro status to user
          await User.findByIdAndUpdate(payment.userId, { isPro: true });
        }
      }
    }

    res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('[Webhook Processing Error]:', err);
    res.status(500).json({ message: 'Webhook processing error', error: err.message });
  }
};

/**
 * Get current user subscription details
 */
export const getSubscriptionStatus = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const subscription = await Subscription.findOne({ userId });

    if (!subscription || subscription.status !== 'active' || subscription.endDate < new Date()) {
      if (subscription && subscription.endDate < new Date() && subscription.status === 'active') {
        subscription.status = 'expired';
        await subscription.save();
        await User.findByIdAndUpdate(userId, { isPro: false });
      }
      return res.status(200).json({
        isPro: false,
        status: subscription?.status || 'none',
        message: 'No active subscription. Standard Free tier limits apply.',
      });
    }

    const plan = PLANS[subscription.planId] || PLANS.pro_monthly;
    const daysRemaining = Math.max(0, Math.ceil((new Date(subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24)));

    res.status(200).json({
      isPro: true,
      status: 'active',
      planId: subscription.planId,
      planName: plan.name,
      amount: subscription.amount,
      startDate: subscription.startDate,
      expiresAt: subscription.endDate,
      daysRemaining,
      orderId: subscription.razorpayOrderId,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve subscription status.', error: error.message });
  }
};

/**
 * Get all subscriptions with statistics (Admin only)
 */
export const getAllSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find()
      .populate('userId', 'fullname email isVerified isPro')
      .sort({ createdAt: -1 });

    const totalActive = subscriptions.filter(s => s.status === 'active' && new Date(s.endDate) >= new Date()).length;
    const totalRevenue = subscriptions.reduce((sum, s) => sum + (s.amount || 0), 0);

    res.status(200).json({
      success: true,
      totalCount: subscriptions.length,
      totalActive,
      totalRevenue,
      subscriptions,
    });
  } catch (error) {
    console.error('[Admin Get Subscriptions Error]:', error);
    res.status(500).json({ message: 'Failed to fetch subscriptions.', error: error.message });
  }
};

/**
 * Create a Razorpay Order for purchasing books (single book or cart items)
 */
export const createBookPaymentOrder = async (req, res) => {
  try {
    const userId = req.user?._id || req.body.userID;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required to initiate checkout. Please log in." });
    }

    // 1. Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User account not found. Please log in again." });
    }

    // 2. Verify user's email is verified
    if (user.isVerified === false) {
      return res.status(403).json({
        message: `Your account email (${user.email}) is not verified. Please verify your email before placing orders.`,
        isUnverified: true,
        email: user.email,
      });
    }

    const { items, productID, quantity = 1, phoneNumber, address } = req.body;

    // 3. Validate email format
    if (!isValidEmail(user.email)) {
      return res.status(400).json({ message: "Please provide a valid account email." });
    }

    // 4. Validate phone number
    if (!phoneNumber || !phoneNumber.trim()) {
      return res.status(400).json({ message: "A contact phone number is required." });
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      return res.status(400).json({
        message: "Please enter a valid 10-digit mobile number (e.g. 9876543210). Numbers like 1234565789 or starting with 0-5 are not accepted.",
      });
    }

    let validatedItems = [];
    let totalAuthoritativeAmount = 0;

    if (items && Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const book = await Book.findById(item.productID);
        if (!book) {
          return res.status(404).json({ message: `Book not found: ${item.productID}` });
        }
        if (book.rightsStatus === 'blocked') {
          return res.status(400).json({ message: `"${book.name}" is not currently available for purchase.` });
        }
        const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
        const itemTotal = (book.price || 0) * qty;
        totalAuthoritativeAmount += itemTotal;
        validatedItems.push({
          bookId: book._id,
          name: book.name,
          price: book.price || 0,
          quantity: qty,
          total: itemTotal,
        });
      }
    } else if (productID) {
      const book = await Book.findById(productID);
      if (!book) {
        return res.status(404).json({ message: "Book not found." });
      }
      if (book.rightsStatus === 'blocked') {
        return res.status(400).json({ message: `"${book.name}" is not currently available for purchase.` });
      }
      const qty = Math.max(1, parseInt(quantity, 10) || 1);
      const itemTotal = (book.price || 0) * qty;
      totalAuthoritativeAmount = itemTotal;
      validatedItems.push({
        bookId: book._id,
        name: book.name,
        price: book.price || 0,
        quantity: qty,
        total: itemTotal,
      });
    } else {
      return res.status(400).json({ message: "Cart items or productID is required." });
    }

    // Amount in paise (1 INR = 100 paise)
    const amountInPaise = Math.round(totalAuthoritativeAmount * 100);

    // 1. Create preliminary payment record in database
    const payment = new Payment({
      userId,
      planId: 'book_order',
      amount: amountInPaise,
      currency: 'INR',
      status: 'created',
      razorpayOrderId: `pending_${Date.now()}`,
    });

    // 2. Request order from payment provider (Razorpay / simulated test provider)
    const rzpOrder = await paymentProvider.createOrder({
      amount: amountInPaise,
      currency: 'INR',
      receipt: payment._id.toString(),
      notes: {
        userId: userId.toString(),
        type: 'book_order',
        itemCount: validatedItems.length.toString(),
      },
    });

    // 3. Update payment record with real/test Razorpay Order ID
    payment.razorpayOrderId = rzpOrder.id;
    await payment.save();

    res.status(200).json({
      orderId: rzpOrder.id,
      amount: amountInPaise,
      totalAmount: totalAuthoritativeAmount,
      currency: 'INR',
      keyId: rzpOrder.isSimulated ? 'rzp_test_placeholder' : (process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder'),
      isSimulated: Boolean(rzpOrder.isSimulated),
      customer: {
        name: req.user?.fullname || 'Customer',
        email: req.user?.email || '',
        phoneNumber: phoneNumber || '',
      },
      items: validatedItems,
    });
  } catch (error) {
    console.error('[Create Book Payment Error]:', error);
    res.status(500).json({ message: 'Failed to initiate secure payment order.', error: error.message });
  }
};

/**
 * Verify Razorpay payment signature for book orders and create confirmed Order records
 */
export const verifyBookPayment = async (req, res) => {
  try {
    const userId = req.user?._id;
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      items,
      productID,
      quantity = 1,
      phoneNumber = '',
      address = 'Digital Delivery Access',
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Incomplete payment verification payload.' });
    }

    // 1. Verify timing-safe cryptographic signature
    const isValid = paymentProvider.verifySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      return res.status(400).json({ message: 'Cryptographic payment signature mismatch. Verification failed.' });
    }

    // 2. Lookup payment transaction
    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!payment) {
      return res.status(404).json({ message: 'Payment transaction record not found.' });
    }

    // Idempotency: If already captured, return existing orders
    if (payment.status === 'captured') {
      const existingOrders = await Order.find({ userID: userId }).sort({ createdAt: -1 }).limit(10);
      return res.status(200).json({
        success: true,
        message: 'Payment already processed and verified.',
        orders: existingOrders,
      });
    }

    // 3. Mark payment as captured
    payment.status = 'captured';
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.updatedAt = new Date();
    await payment.save();

    // 4. Create authoritative Order records in MongoDB
    const createdOrders = [];
    const purchasedBookNames = [];
    let calculatedTotal = 0;

    if (items && Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const book = await Book.findById(item.productID || item.bookId);
        if (!book) continue;
        const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
        const itemAuthoritativePrice = (book.price || 0) * qty;
        calculatedTotal += itemAuthoritativePrice;
        purchasedBookNames.push(book.name);

        const order = new Order({
          name: req.user?.fullname || 'Customer',
          userID: userId,
          email: req.user?.email || '',
          productID: book._id,
          productName: book.name,
          quantity: qty,
          totalPrice: itemAuthoritativePrice,
          phoneNumber: phoneNumber || 'N/A',
          address: address || 'Digital Library Access',
          paymentMethod: 'Paid (Razorpay)',
          deliveryStatus: 'Completed',
        });
        const savedOrder = await order.save();
        createdOrders.push(savedOrder);
      }
    } else if (productID) {
      const book = await Book.findById(productID);
      if (book) {
        const qty = Math.max(1, parseInt(quantity, 10) || 1);
        const itemAuthoritativePrice = (book.price || 0) * qty;
        calculatedTotal = itemAuthoritativePrice;
        purchasedBookNames.push(book.name);

        const order = new Order({
          name: req.user?.fullname || 'Customer',
          userID: userId,
          email: req.user?.email || '',
          productID: book._id,
          productName: book.name,
          quantity: qty,
          totalPrice: itemAuthoritativePrice,
          phoneNumber: phoneNumber || 'N/A',
          address: address || 'Digital Library Access',
          paymentMethod: 'Paid (Razorpay)',
          deliveryStatus: 'Completed',
        });
        const savedOrder = await order.save();
        createdOrders.push(savedOrder);
      }
    }

    // 5. Send order confirmation email asynchronously
    if (createdOrders.length > 0) {
      emailService.sendOrderConfirmationEmail({
        email: req.user?.email || '',
        name: req.user?.fullname || 'Customer',
        orderId: createdOrders[0]._id,
        productName: purchasedBookNames.join(', '),
        quantity: createdOrders.reduce((acc, o) => acc + o.quantity, 0),
        totalPrice: calculatedTotal,
        phoneNumber: phoneNumber?.trim() || '',
        address: address?.trim() || 'Digital Library Access',
      }).catch(err => {
        console.warn('[Payment Confirmation Email Warning]:', err.message);
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully! Your order has been placed.',
      orders: createdOrders,
      paymentId: razorpay_payment_id,
    });
  } catch (error) {
    console.error('[Verify Book Payment Error]:', error);
    res.status(500).json({ message: 'Payment verification failed.', error: error.message });
  }
};

/**
 * Create a payment order for an existing unpaid order (from My Orders page)
 */
export const createPaymentForExistingOrder = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    const orderUserId = order.userID ? (order.userID._id ? order.userID._id.toString() : order.userID.toString()) : '';
    if (orderUserId !== userId.toString()) {
      return res.status(403).json({ message: "Unauthorized to pay for this order." });
    }

    if (order.paymentMethod === 'Paid' || order.paymentMethod.startsWith('Paid')) {
      return res.status(400).json({ message: "This order is already paid." });
    }

    if (order.isCancelled) {
      return res.status(400).json({ message: "Cannot pay for a cancelled order." });
    }

    const amountInPaise = Math.round(order.totalPrice * 100);

    const payment = new Payment({
      userId,
      planId: 'book_order_existing',
      amount: amountInPaise,
      currency: 'INR',
      status: 'created',
      razorpayOrderId: `pending_${Date.now()}`,
    });

    const rzpOrder = await paymentProvider.createOrder({
      amount: amountInPaise,
      currency: 'INR',
      receipt: payment._id.toString(),
      notes: { orderId: order._id.toString(), userId: userId.toString() },
    });

    payment.razorpayOrderId = rzpOrder.id;
    await payment.save();

    res.status(200).json({
      orderId: rzpOrder.id,
      amount: amountInPaise,
      totalAmount: order.totalPrice,
      currency: 'INR',
      keyId: rzpOrder.isSimulated ? 'rzp_test_placeholder' : (process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder'),
      isSimulated: Boolean(rzpOrder.isSimulated),
      customer: {
        name: req.user?.fullname || order.name,
        email: req.user?.email || order.email,
        phoneNumber: order.phoneNumber,
      },
    });
  } catch (error) {
    console.error('[Existing Order Payment Error]:', error);
    res.status(500).json({ message: 'Failed to initiate payment for order.', error: error.message });
  }
};

/**
 * Verify payment for an existing unpaid order
 */
export const verifyExistingOrderPayment = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { orderId } = req.params;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const isValid = paymentProvider.verifySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      return res.status(400).json({ message: 'Cryptographic signature mismatch.' });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    order.paymentMethod = 'Paid (Razorpay)';
    order.deliveryStatus = 'Completed';
    await order.save();

    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (payment) {
      payment.status = 'captured';
      payment.razorpayPaymentId = razorpay_payment_id;
      await payment.save();
    }

    res.status(200).json({
      success: true,
      message: 'Payment completed successfully!',
      order,
    });
  } catch (error) {
    console.error('[Verify Existing Order Payment Error]:', error);
    res.status(500).json({ message: 'Failed to verify payment.', error: error.message });
  }
};
