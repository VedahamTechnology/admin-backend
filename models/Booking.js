const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const bookingSchema = new mongoose.Schema({
  /**
   * BOOKING IDENTIFICATION
   */
  customer: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
    index: true,
  },
  vendor: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
    index: true,
  },
  worker: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    index: true,
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

  // City scoping
  city: {
    type: String,
    trim: true,
    index: true,
  },

  /**
   * BOOKING TIMELINE
   */
  bookingDate: {
    type: Date,
    required: true,
    index: true,
  },
  timeSlot: {
    startTime: { type: String, required: true },
    endTime:   { type: String, required: true },
  },
  expiresAt: {
    type: Date,
    index: true,
  },

  /**
   * SERVICE LOCATION
   */
  serviceAddress: {
    label:   { type: String, default: 'Home' },
    street:  { type: String, required: true },
    city:    { type: String, required: true },
    state:   { type: String, required: true },
    pincode: { type: String, required: true },
    location: {
      type:        { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0], validate: {
        validator: (val) => val.length === 2 && val[0] >= -180 && val[0] <= 180 && val[1] >= -90 && val[1] <= 90,
        message: 'Invalid coordinates: must be [longitude, latitude]',
      }},
    },
    instructions: String,
  },

  /**
   * PRICING (with validation and breakdowns)
   * Stores complete price snapshot at time of booking
   */
  pricing: {
    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    platformFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    vendorPayout: {
      type: Number,
      min: 0,
      description: 'Amount paid to vendor after platform fees',
    },
    // Snapshot of service details at booking time
    serviceSnapshot: {
      serviceName: String,
      serviceDescription: String,
      serviceImage: String,
    },
  },

  /**
   * PAYMENT PROCESSING
   */
  payment: {
    method: {
      type: String,
      enum: ['credit_card', 'debit_card', 'upi', 'wallet', 'cash', 'netbanking', 'other'],
      required: function() {
        return this.status === 'completed';  // Required only on completion
      },
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded', 'on_hold'],
      default: 'pending',
      index: true,
    },
    transactionId: String,
    razorpayOrderId: String,
    paidAt: Date,
  },

  /**
   * BOOKING STATUS WORKFLOW
   */
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'on_the_way', 'in_progress', 'work_done', 'completed', 'cancelled'],
    default: 'pending',
    index: true,
  },

  /**
   * CANCELLATION TRACKING
   */
  cancellation: {
    cancelledBy: { type: String, enum: ['customer', 'vendor', 'admin'] },
    reason: String,
    cancelledAt: Date,
    refundAmount: { type: Number, default: 0, min: 0 },
  },

  /**
   * OTP VERIFICATION (for vendor arrival & service completion)
   * OTPs are bcrypt-hashed and have expiry times
   */
  otp: {
    startOtp: {
      type: String,
      description: 'Bcrypt hashed OTP for vendor arrival verification',
    },
    endOtp: {
      type: String,
      description: 'Bcrypt hashed OTP for service completion verification',
    },
    otpExpiresAt: {
      type: Date,
      description: 'Expiry time for both OTPs (typically 10 minutes after generation)',
    },
    startVerifiedAt: {
      type: Date,
      description: 'When vendor arrival was verified',
    },
    endVerifiedAt: {
      type: Date,
      description: 'When service completion was verified',
    },
  },

  /**
   * CUSTOMER NOTES & SPECIAL INSTRUCTIONS
   */
  customerNotes: {
    type: String,
    maxlength: 500,
    description: 'Special instructions or notes from customer before service',
  },

  /**
   * PROOF OF WORK (uploaded by vendor on completion)
   */
  proofOfWork: {
    beforeImages: [{
      type: String,
      description: 'URLs of photos taken before service started',
    }],
    afterImages: [{
      type: String,
      description: 'URLs of photos taken after service completed',
    }],
    vendorNotes: {
      type: String,
      maxlength: 500,
      description: 'Notes from vendor about work completed',
    },
    completedAt: Date,
  },

  /**
   * RESCHEDULE HISTORY (track all rescheduling)
   */
  rescheduleHistory: [{
    previousDate: Date,
    previousSlot: {
      startTime: String,
      endTime: String,
    },
    rescheduledBy: {
      type: String,
      enum: ['customer', 'vendor', 'admin'],
    },
    rescheduledAt: Date,
    reason: String,
  }],

  /**
   * REVIEW & RATINGS
   */
  review: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review',
  },

}, { timestamps: true });

/**
 * PRE-SAVE MIDDLEWARE
 */
bookingSchema.pre('save', async function() {
  // Validate pricing: totalAmount should equal basePrice + platformFee + tax - discount
  if (this.pricing) {
    const expected = this.pricing.basePrice + (this.pricing.platformFee || 0) + (this.pricing.tax || 0) - (this.pricing.discount || 0);
    const tolerance = 0.01;  // Account for floating-point precision

    if (Math.abs(this.pricing.totalAmount - expected) > tolerance) {
      throw new Error(
        `Pricing mismatch: totalAmount (${this.pricing.totalAmount}) != basePrice (${this.pricing.basePrice}) + platformFee (${this.pricing.platformFee || 0}) + tax (${this.pricing.tax || 0}) - discount (${this.pricing.discount || 0})`
      );
    }
  }

  // Set TTL expiry for pending bookings (1 hour from now)
  if (this.status === 'pending' && !this.expiresAt) {
    const expiresIn = 60 * 60 * 1000;  // 1 hour
    this.expiresAt = new Date(Date.now() + expiresIn);
  }

  // Hash OTPs if provided and not already hashed
  if (this.otp && this.otp.startOtp && !this.otp.startOtp.startsWith('$2')) {
    const salt = await bcrypt.genSalt(10);
    this.otp.startOtp = await bcrypt.hash(this.otp.startOtp, salt);
  }

  if (this.otp && this.otp.endOtp && !this.otp.endOtp.startsWith('$2')) {
    const salt = await bcrypt.genSalt(10);
    this.otp.endOtp = await bcrypt.hash(this.otp.endOtp, salt);
  }
});

/**
 * INSTANCE METHOD: Verify OTP
 */
bookingSchema.methods.verifyStartOtp = async function(providedOtp) {
  if (!this.otp || !this.otp.startOtp || !providedOtp) {
    return false;
  }
  if (this.otp.otpExpiresAt && new Date() > this.otp.otpExpiresAt) {
    return false;
  }
  return bcrypt.compare(providedOtp, this.otp.startOtp);
};

bookingSchema.methods.verifyEndOtp = async function(providedOtp) {
  if (!this.otp || !this.otp.endOtp || !providedOtp) {
    return false;
  }
  if (this.otp.otpExpiresAt && new Date() > this.otp.otpExpiresAt) {
    return false;
  }
  return bcrypt.compare(providedOtp, this.otp.endOtp);
};

/**
 * INSTANCE METHOD: Add to reschedule history
 */
bookingSchema.methods.addRescheduleHistory = function(previousDate, previousSlot, rescheduledBy, reason) {
  this.rescheduleHistory.push({
    previousDate,
    previousSlot,
    rescheduledBy,
    reason,
    rescheduledAt: new Date(),
  });
};

/**
 * INDEXES
 */
bookingSchema.index({ customer: 1, createdAt: -1 });
bookingSchema.index({ customer: 1, status: 1, createdAt: -1 });
bookingSchema.index({ vendor: 1, createdAt: -1 });
bookingSchema.index({ vendor: 1, status: 1, bookingDate: 1 });
bookingSchema.index({ 'serviceAddress.location': '2dsphere' });

module.exports = mongoose.model('Booking', bookingSchema);
