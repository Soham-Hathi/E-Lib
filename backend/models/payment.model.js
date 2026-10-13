import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  planId: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true, // in paise (e.g., 14900 for Rs. 149)
  },
  currency: {
    type: String,
    default: 'INR',
  },
  status: {
    type: String,
    enum: ['created', 'captured', 'failed', 'refunded'],
    default: 'created',
    index: true,
  },
  provider: {
    type: String,
    default: 'razorpay',
  },
  razorpayOrderId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  razorpayPaymentId: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
  },
  webhookEventsProcessed: {
    type: [String], // Stores processed event IDs to guarantee idempotency
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
