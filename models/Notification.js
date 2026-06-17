const mongoose = require('mongoose');

/**
 * Notification Model
 * Tracks all notifications sent to users (customers, vendors, admins)
 * Supports real-time notifications via Socket.IO and push notifications
 */
const notificationSchema = new mongoose.Schema({
  /**
   * RECIPIENT INFO
   */
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  recipientRole: {
    type: String,
    enum: ['customer', 'vendor', 'admin'],
    required: true,
  },

  /**
   * NOTIFICATION TYPE & CONTENT
   */
  type: {
    type: String,
    enum: [
      'booking_created',      // Vendor: New booking received
      'booking_confirmed',    // Customer: Booking confirmed by vendor
      'booking_cancelled',    // Both: Booking cancelled
      'vendor_arrived',       // Customer: Vendor arrived (OTP verified)
      'service_completed',    // Customer: Service completed
      'payment_received',     // Vendor: Payment received
      'review_posted',        // Vendor: Customer posted review
      'booking_rescheduled',  // Both: Booking rescheduled
      'otp_sent',             // Vendor: OTP sent for verification
      'message',              // Generic message
      'service_pending_approval',
      'service_approved',
      'service_rejected',
      'worker_assigned',
      'work_done',
      'booking_completed',
    ],
    required: true,
    index: true,
  },

  /**
   * NOTIFICATION CONTENT
   */
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000,
  },
  description: String,

  /**
   * RELATED DATA
   */
  relatedData: {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    amount: Number,
  },

  /**
   * NOTIFICATION STATUS
   */
  isRead: {
    type: Boolean,
    default: false,
    index: true,
  },
  readAt: Date,

  /**
   * DELIVERY STATUS
   */
  delivery: {
    inApp: {
      sent: { type: Boolean, default: true },
      sentAt: Date,
    },
    push: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      deviceTokens: [String],
      pushId: String,
    },
    email: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      emailAddress: String,
    },
    sms: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      phoneNumber: String,
    },
  },

  /**
   * METADATA
   */
  metadata: {
    action: String,           // URL or action to perform on click
    actionLabel: String,      // "View Booking", "Accept", etc
    icon: String,             // Icon name/URL
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    tags: [String],
  },

  /**
   * TIMESTAMPS
   */
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  },

}, { timestamps: true });

/**
 * INDEXES
 */
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1, createdAt: -1 });
notificationSchema.index({ 'relatedData.bookingId': 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL

/**
 * INSTANCE METHODS
 */
notificationSchema.methods.markAsRead = async function() {
  this.isRead = true;
  this.readAt = new Date();
  await this.save();
  return this;
};

notificationSchema.methods.markAsUnread = async function() {
  this.isRead = false;
  this.readAt = null;
  await this.save();
  return this;
};

/**
 * STATIC METHODS
 */
notificationSchema.statics.createBookingNotification = async function(bookingId, booking) {
  try {
    const Booking = require('./Booking');
    const User = require('./User');
    
    // Populate booking details
    const populatedBooking = await Booking.findById(bookingId)
      .populate('vendor', 'firstName lastName email phone')
      .populate('service', 'name basePrice')
      .populate('customer', 'firstName lastName');

    if (!populatedBooking) {
      throw new Error('Booking not found');
    }

    const vendor = populatedBooking.vendor;
    const customer = populatedBooking.customer;
    const service = populatedBooking.service;

    // Create notification for vendor
    const vendorNotification = await this.create({
      recipient: vendor._id,
      recipientRole: 'vendor',
      type: 'booking_created',
      title: '🔔 New Booking Received!',
      message: `${customer.firstName} ${customer.lastName} booked ${service.name}`,
      description: `Booking ID: ${populatedBooking.bookingId}\nAmount: ₹${populatedBooking.pricing.totalAmount}`,
      relatedData: {
        bookingId: populatedBooking._id,
        serviceId: service._id,
        userId: customer._id,
        amount: populatedBooking.pricing.totalAmount,
      },
      metadata: {
        action: `/vendor/bookings/${bookingId}`,
        actionLabel: 'View Booking',
        icon: 'calendar-check',
        priority: 'high',
      },
      delivery: {
        inApp: {
          sent: true,
          sentAt: new Date(),
        },
      },
    });

    // Create notification for customer
    const customerNotification = await this.create({
      recipient: customer._id,
      recipientRole: 'customer',
      type: 'booking_created',
      title: '✅ Booking Confirmed!',
      message: `Your booking for ${service.name} has been confirmed`,
      description: `Booking ID: ${populatedBooking.bookingId}\nScheduled for ${new Date(populatedBooking.bookingDate).toLocaleString()}`,
      relatedData: {
        bookingId: populatedBooking._id,
        serviceId: service._id,
        userId: vendor._id,
        amount: populatedBooking.pricing.totalAmount,
      },
      metadata: {
        action: `/customer/bookings/${bookingId}`,
        actionLabel: 'View Details',
        icon: 'check-circle',
        priority: 'normal',
      },
      delivery: {
        inApp: {
          sent: true,
          sentAt: new Date(),
        },
      },
    });

    return {
      vendorNotification,
      customerNotification,
    };
  } catch (error) {
    console.error('Error creating booking notification:', error);
    throw error;
  }
};

module.exports = mongoose.model('Notification', notificationSchema);
