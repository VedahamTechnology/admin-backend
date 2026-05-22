const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingId: { type: String, unique: true },

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
  service: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'Service',
    required: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref:  'Category',
  },

  bookingDate: { type: Date, required: true },
  timeSlot: {
    startTime: { type: String, required: true },
    endTime:   { type: String, required: true },
  },

  serviceAddress: {
    label:   String,
    street:  { type: String, required: true },
    city:    { type: String, required: true },
    state:   { type: String, required: true },
    pincode: { type: String, required: true },
    location: {
      type:        { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    instructions: String,
  },

  pricing: {
    basePrice:   { type: Number, required: true },
    tax:         { type: Number, default: 0 },
    discount:    { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
  },

  payment: {
    method: {
      type: String,
      enum: ['credit_card', 'debit_card', 'upi', 'wallet', 'cash'],
    },
    status: {
      type:    String,
      enum:    ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    transactionId: String,
    paidAt:        Date,
  },

  status: {
    type:    String,
    enum:    ['pending', 'confirmed', 'on_the_way', 'in_progress', 'completed', 'cancelled'],
    default: 'pending',
  },

  cancellation: {
    cancelledBy:     { type: String, enum: ['customer', 'vendor', 'admin'] },
    reason:          String,
    cancelledAt:     Date,
    refundAmount:    { type: Number, default: 0 },
  },

  review: {
    type: mongoose.Schema.Types.ObjectId,
    ref:  'Review',
  },

  otp: {
    startOtp:    String,
    endOtp:      String,
    isVerified:  { type: Boolean, default: false },
  },

}, { timestamps: true });

bookingSchema.pre('save', async function() {
  if (!this.bookingId) {
    const date  = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await mongoose.model('Booking').countDocuments();
    this.bookingId = `BK-${date}-${String(count + 1).padStart(5, '0')}`;
  }
});

bookingSchema.index({ customer: 1, createdAt: -1 });
bookingSchema.index({ vendor: 1, createdAt: -1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ bookingDate: 1 });

module.exports = mongoose.model('Booking', bookingSchema);