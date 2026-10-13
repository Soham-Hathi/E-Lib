import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  planId: {
    type: String,
    enum: ['pro_monthly', 'pro_annual'],
    default: 'pro_monthly',
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled', 'pending'],
    default: 'pending',
    index: true,
  },
  amount: {
    type: Number,
    required: true, // in INR (e.g. 149)
  },
  currency: {
    type: String,
    default: 'INR',
  },
  startDate: {
    type: Date,
  },
  endDate: {
    type: Date,
    index: true,
  },
  provider: {
    type: String,
    default: 'razorpay',
  },
  razorpayOrderId: {
    type: String,
    index: true,
  },
  razorpayPaymentId: {
    type: String,
    unique: true,
    sparse: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Subscription = mongoose.model('Subscription', subscriptionSchema);

export default Subscription;
