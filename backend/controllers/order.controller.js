import Order from "../models/order.model.js";
import Book from "../models/book.model.js";
import User from "../models/user.model.js";
import Coupon from "../models/coupon.model.js";
import { emailService } from "../services/email.service.js";
import dotenv from "dotenv";
import Stripe from 'stripe';

dotenv.config();

// Helper to validate email format
export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim().toLowerCase());
};

// Helper to validate phone number format (Indian mobile 6-9xxxxxxxx or international 10-14 digits)
export const isValidPhoneNumber = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  const clean = phone.replace(/[\s\-\(\)\+]/g, '');

  // Reject sequential or repeating dummy phone numbers
  const dummyNumbers = new Set([
    '1234567890', '0123456789', '1234565789', '0987654321',
    '0000000000', '1111111111', '2222222222', '3333333333', '4444444444',
    '5555555555', '6666666666', '7777777777', '8888888888', '9999999999',
  ]);
  if (dummyNumbers.has(clean)) return false;

  const indianMobileRegex = /^[6-9]\d{9}$/;
  const indianWithCodeRegex = /^91[6-9]\d{9}$/;
  const intlRegex = /^[1-9]\d{9,13}$/;

  // If exactly 10 digits, strictly require Indian mobile format (starts with 6, 7, 8, or 9)
  if (clean.length === 10) {
    return indianMobileRegex.test(clean);
  }

  // If 12 digits starting with 91, validate country code prefix
  if (clean.length === 12 && clean.startsWith('91')) {
    return indianWithCodeRegex.test(clean);
  }

  return intlRegex.test(clean);
};

/**
 * Create a new order with server-authoritative price validation
 * Supports both multi-item cart checkouts and single-book purchases.
 */
export const newOrder = async (req, res) => {
  const {
    items,
    productID,
    productName,
    quantity = 1,
    phoneNumber,
    address,
    paymentMethod = 'cash_on_delivery',
  } = req.body;

  try {
    const currentUserId = req.user?._id || req.body.userID;
    if (!currentUserId) {
      return res.status(401).json({ message: "Authentication required to place an order. Please log in." });
    }

    // 1. Verify User exists and is valid
    const user = await User.findById(currentUserId);
    if (!user) {
      return res.status(404).json({ message: "User account not found or is invalid. Please log in again." });
    }

    // 2. Check if user's email is verified
    if (user.isVerified === false) {
      return res.status(403).json({
        message: `Your account email (${user.email}) is not verified. Please verify your email before placing orders.`,
        isUnverified: true,
        email: user.email,
      });
    }

    // Strictly prioritize authoritative database fields
    const customerEmail = user.email;
    const customerName = user.fullname || req.body.name || 'Customer';

    // 3. Validate Email format
    if (!isValidEmail(customerEmail)) {
      return res.status(400).json({ message: "The account email associated with this user is invalid." });
    }

    // 4. Validate Phone Number
    if (!phoneNumber || !phoneNumber.trim()) {
      return res.status(400).json({ message: "A contact phone number is required." });
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      return res.status(400).json({
        message: "Please enter a valid 10-digit mobile number (e.g. 9876543210). Numbers like 1234565789 or starting with 0-5 are not accepted.",
      });
    }

    // CASE 1: Cart Checkout (Array of items)
    if (items && Array.isArray(items) && items.length > 0) {
      const createdOrders = [];
      let totalCartPrice = 0;
      const purchasedBookNames = [];

      for (const item of items) {
        if (!item.productID) {
          return res.status(400).json({ message: "Each cart item must specify a valid productID." });
        }

        const book = await Book.findById(item.productID);
        if (!book) {
          return res.status(404).json({ message: `Book not found: ${item.productID}` });
        }

        if (book.rightsStatus === 'blocked') {
          return res.status(400).json({ message: `"${book.name}" is not currently available for purchase.` });
        }

        const itemQty = Math.max(1, parseInt(item.quantity, 10) || 1);
        // Server-authoritative price calculation (ignoring any client-dictated price)
        const itemAuthoritativePrice = (book.price || 0) * itemQty;
        totalCartPrice += itemAuthoritativePrice;
        purchasedBookNames.push(book.name);

        const order = new Order({
          name: customerName,
          userID: currentUserId,
          email: customerEmail,
          productID: book._id,
          productName: book.name,
          quantity: itemQty,
          totalPrice: itemAuthoritativePrice,
          phoneNumber: phoneNumber.trim(),
          address: address?.trim() || 'Digital Library Access',
          paymentMethod,
        });

        const savedOrder = await order.save();
        createdOrders.push(savedOrder);
      }

      // Safely dispatch asynchronous order confirmation email
      emailService.sendOrderConfirmationEmail({
        email: customerEmail,
        name: customerName,
        orderId: createdOrders[0]._id,
        productName: purchasedBookNames.join(', '),
        quantity: items.reduce((acc, i) => acc + (parseInt(i.quantity, 10) || 1), 0),
        totalPrice: totalCartPrice,
        phoneNumber: phoneNumber.trim(),
        address: address?.trim() || 'Digital Library Access',
      }).catch(emailErr => {
        console.warn('[Order Confirmation Email Warning]', emailErr.message);
      });

      return res.status(201).json({
        message: "Orders placed successfully",
        orders: createdOrders,
        totalPrice: totalCartPrice,
      });
    }

    // CASE 2: Single Book Checkout (Buy Now)
    if (!productID) {
      return res.status(400).json({ message: "productID is required to place an order." });
    }

    const book = await Book.findById(productID);
    if (!book) {
      return res.status(404).json({ message: "Book not found." });
    }

    if (book.rightsStatus === 'blocked') {
      return res.status(400).json({ message: `"${book.name}" is not currently available for purchase.` });
    }

    const parsedQty = Math.max(1, parseInt(quantity, 10) || 1);
    // Server-authoritative calculation: book.price * quantity
    const authoritativeTotalPrice = (book.price || 0) * parsedQty;

    const order = new Order({
      name: customerName,
      userID: currentUserId,
      email: customerEmail,
      productID: book._id,
      productName: book.name || productName,
      quantity: parsedQty,
      totalPrice: authoritativeTotalPrice,
      phoneNumber: phoneNumber.trim(),
      address: address?.trim() || 'Digital Library Access',
      paymentMethod,
    });

    const savedOrder = await order.save();

    emailService.sendOrderConfirmationEmail({
      email: customerEmail,
      name: customerName,
      orderId: savedOrder._id,
      productName: book.name,
      quantity: parsedQty,
      totalPrice: authoritativeTotalPrice,
      phoneNumber: phoneNumber.trim(),
      address: address?.trim() || 'Digital Library Access',
    }).catch(emailErr => {
      console.warn('[Order Confirmation Email Warning]', emailErr.message);
    });

    return res.status(201).json({
      message: "Order created successfully",
      order: savedOrder,
    });
  } catch (error) {
    console.error("Error creating order:", error.message);
    if (!res.headersSent) {
      return res.status(500).json({
        message: "Failed to create order",
        error: error.message,
      });
    }
  }
};

/**
 * Admin: Get all orders across the system
 */
export const allOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching all orders:", error.message);
    res.status(500).json({ message: "Failed to get all orders", error: error.message });
  }
};

/**
 * Admin: Update order delivery or payment status
 */
export const updateOrder = async (req, res) => {
  const { id } = req.params;
  const { deliveryStatus, paymentMethod } = req.body;

  try {
    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      {
        ...(deliveryStatus && { deliveryStatus }),
        ...(paymentMethod && { paymentMethod }),
      },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json({ message: "Order updated successfully", order: updatedOrder });
  } catch (error) {
    console.error("Error updating order:", error.message);
    res.status(500).json({ message: "Failed to update order", error: error.message });
  }
};

/**
 * Authenticated User: Get orders belonging to the requesting user
 */
export const myOrders = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required to view orders." });
    }

    const userOrders = await Order.find({ userID: userId }).sort({ createdAt: -1 });
    // Return empty array with 200 OK when user has no orders
    res.status(200).json(userOrders);
  } catch (error) {
    console.error("Error fetching user orders:", error.message);
    res.status(500).json({ message: "Failed to fetch user orders", error: error.message });
  }
};

/**
 * Authenticated User / Admin: Cancel an order with strict ownership verification
 */
export const cancelOrder = async (req, res) => {
  const { id } = req.params;

  try {
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const currentUserId = req.user?._id ? req.user._id.toString() : '';
    const orderUserId = order.userID ? (order.userID._id ? order.userID._id.toString() : order.userID.toString()) : '';
    const isOwner = orderUserId && orderUserId === currentUserId;
    const isEmailOwner = order.email && req.user?.email && order.email.toLowerCase() === req.user.email.toLowerCase();
    const isAdmin = req.user?.isAdmin === true;

    if (!isOwner && !isEmailOwner && !isAdmin) {
      return res.status(403).json({ message: "Access denied. You can only cancel your own orders." });
    }

    if (order.isCancelled) {
      return res.status(400).json({ message: "This order has already been cancelled." });
    }

    order.isCancelled = true;
    const updatedOrder = await order.save();

    res.status(200).json({
      message: "Order cancelled successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error cancelling order:", error.message);
    res.status(500).json({
      message: "Failed to cancel the order",
      error: error.message,
    });
  }
};

/**
 * Stripe Checkout Session with server-authoritative book pricing
 */
export const createCheckoutSession = async (req, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: "Stripe Secret Key is not configured." });
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { productID, quantity = 1 } = req.body;

    const book = await Book.findById(productID);
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    const unitPricePaise = Math.round((book.price || 0) * 100);

    const lineItems = [{
      price_data: {
        currency: 'inr',
        product_data: {
          name: book.name,
          images: book.image ? [book.image] : [],
        },
        unit_amount: unitPricePaise,
      },
      quantity: qty,
    }];

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `http://localhost:5173/success`,
      cancel_url: `http://localhost:5173/cancel`,
    });

    res.status(200).json({ id: session.id, url: session.url });
  } catch (error) {
    console.error("Stripe Checkout Error: ", error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Validate discount coupon code and calculate savings
 */
export const validateCoupon = async (req, res) => {
  try {
    const { code, amount } = req.body;
    if (!code) {
      return res.status(400).json({ message: 'Coupon code is required' });
    }
    const orderAmount = Number(amount) || 0;
    const cleanCode = code.trim().toUpperCase();

    // Auto-seed default coupons if collection empty
    const count = await Coupon.countDocuments();
    if (count === 0) {
      await Coupon.create([
        { code: 'READ20', discountType: 'percentage', discountValue: 20, minOrderAmount: 0, maxDiscountAmount: 200 },
        { code: 'WELCOME50', discountType: 'fixed', discountValue: 50, minOrderAmount: 149 },
        { code: 'STUDENT30', discountType: 'percentage', discountValue: 30, minOrderAmount: 299, maxDiscountAmount: 300 },
      ]);
    }

    const coupon = await Coupon.findOne({ code: cleanCode, isActive: true });
    if (!coupon) {
      return res.status(404).json({ message: 'Invalid or expired coupon code' });
    }

    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      return res.status(400).json({ message: 'This coupon has expired' });
    }

    if (orderAmount < coupon.minOrderAmount) {
      return res.status(400).json({
        message: `Minimum order amount of ₹${coupon.minOrderAmount} required to use coupon ${cleanCode}`,
      });
    }

    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = Math.round((orderAmount * coupon.discountValue) / 100);
      if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
        discount = coupon.maxDiscountAmount;
      }
    } else {
      discount = Math.min(coupon.discountValue, orderAmount);
    }

    const finalAmount = Math.max(0, orderAmount - discount);

    res.status(200).json({
      valid: true,
      code: coupon.code,
      discount,
      finalAmount,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      message: `Coupon ${coupon.code} applied! Saved ₹${discount}`,
    });
  } catch (error) {
    console.error('Coupon validation error:', error);
    res.status(500).json({ message: 'Error validating coupon', error: error.message });
  }
};

/**
 * Export all customer orders as standard CSV for Admin financial accounting
 */
export const exportOrdersCsv = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });

    const headers = [
      'Order ID',
      'Customer Name',
      'Customer Email',
      'Customer Phone',
      'Book Title',
      'Quantity',
      'Total Price (INR)',
      'Payment Method',
      'Delivery Status',
      'Is Cancelled',
      'Order Date'
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = orders.map((order) => [
      order._id,
      order.name,
      order.email,
      order.phoneNumber,
      order.productName,
      order.quantity,
      order.totalPrice,
      order.paymentMethod,
      order.deliveryStatus,
      order.isCancelled ? 'Yes' : 'No',
      new Date(order.createdAt).toISOString()
    ].map(escapeCsv).join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="elibrary_orders_export.csv"');
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error('Error exporting orders CSV:', error);
    res.status(500).json({ message: 'Failed to export CSV', error: error.message });
  }
};

