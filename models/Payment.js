const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  paymentId: { type: String, unique: true },

  booking: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'Booking',
    required: true,
  },
  customer: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
  },
  vendor: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
  },

  amount:        { type: Number, required: true },
  platformFee:   { type: Number, default: 0 },
  tax:           { type: Number, default: 0 },
  vendorEarning: { type: Number, required: true },

  method: {
    type: String,
    enum: ['credit_card', 'debit_card', 'upi', 'wallet', 'cash'],
  },

  gateway: {
    type:    String,
    enum:    ['razorpay', 'stripe', 'manual'],
    default: 'razorpay',
  },

  gatewayOrderId:   String,
  gatewayPaymentId: String,
  gatewaySignature: String,

  status: {
    type:    String,
    enum:    ['initiated', 'success', 'failed', 'refunded'],
    default: 'initiated',
  },

  refund: {
    isRefunded:   { type: Boolean, default: false },
    refundAmount: { type: Number, default: 0 },
    refundId:     String,
    reason:       String,
    refundedAt:   Date,
  },

  paidAt: Date,

}, { timestamps: true });

paymentSchema.pre('save', async function(next) {
  if (!this.paymentId) {
    const count = await mongoose.model('Payment').countDocuments();
    this.paymentId = `PAY-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

paymentSchema.index({ booking: 1 });
paymentSchema.index({ customer: 1 });
paymentSchema.index({ vendor: 1 });
paymentSchema.index({ status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);