const mongoose = require('mongoose');

const bookingIntentSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
  },
  bookingDate: {
    type: Date,
    required: true,
  },
  timeSlot: {
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
  },
  serviceAddress: {
    label: String,
    street: String,
    city: String,
    state: String,
    pincode: String,
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: [Number],
    },
    instructions: String,
  },
  pricing: {
    basePrice: Number,
    platformFee: Number,
    tax: Number,
    discount: Number,
    totalAmount: Number,
    vendorPayout: Number,
    serviceSnapshot: {
      serviceName: String,
      serviceDescription: String,
      serviceImage: String,
    },
  },
  customerNotes: String,
  paymentMethod: {
    type: String,
    required: true,
  },
  razorpayOrderId: {
    type: String,
    required: true,
    index: true,
  },
  // Auto-delete after 30 minutes if not converted to a booking
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 60 * 1000),
  }
}, { timestamps: true });

// TTL index to automatically remove expired intents
bookingIntentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('BookingIntent', bookingIntentSchema);
