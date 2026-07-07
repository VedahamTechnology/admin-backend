const Razorpay = require('razorpay');
const crypto = require('crypto');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Transaction = require('../models/Transaction');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Create a Razorpay Order for a booking
 */
exports.createOrder = async (req, res) => {
  try {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Only the customer who made the booking can pay
    if (booking.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to pay for this booking' });
    }

    if (booking.payment.status === 'completed') {
      return res.status(400).json({ success: false, message: 'This booking is already paid' });
    }

    // Work should be in progress or completed to pay (after work done)
    if (!['in_progress', 'completed', 'on_the_way'].includes(booking.status)) {
       return res.status(400).json({ success: false, message: 'Payment can only be made once the service has started or is completed' });
    }

    const options = {
      amount: Math.round(booking.pricing.totalAmount * 100), // amount in paise
      currency: 'INR',
      receipt: `receipt_${booking._id}`,
      notes: {
        bookingId: booking._id.toString(),
        customerName: req.user.firstName + ' ' + (req.user.lastName || ''),
      }
    };

    const order = await razorpay.orders.create(options);

    // Update booking with Razorpay Order ID
    booking.payment.razorpayOrderId = order.id;
    await booking.save();

    await Payment.findOneAndUpdate(
      { booking: booking._id },
      {
        booking: booking._id,
        customer: booking.customer,
        vendor: booking.vendor,
        amount: booking.pricing.totalAmount,
        platformFee: booking.pricing.platformFee || 0,
        tax: booking.pricing.tax || 0,
        vendorEarning: booking.pricing.vendorPayout || 0,
        method: booking.payment.method || 'cash',
        gateway: 'razorpay',
        gatewayOrderId: order.id,
        status: 'initiated',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      success: true,
      order,
      key: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Razorpay Create Order Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Verify Razorpay Payment and update booking status
 */
exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingId
    } = req.body;

    // 1. Find the booking first to update status even on failure
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // 2. Verify signature
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      booking.payment.status = 'failed';
      await booking.save();
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    // 3. Fetch actual payment details from Razorpay
    const paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);

    // Map Razorpay methods to our Enum
    const methodMapping = {
      'card': paymentDetails.card && paymentDetails.card.type === 'debit' ? 'debit_card' : 'credit_card',
      'netbanking': 'netbanking',
      'wallet': 'wallet',
      'upi': 'upi',
      'cash': 'cash'
    };

    // 4. Update Booking with verified data
    booking.payment.status = 'completed';
    booking.payment.transactionId = razorpay_payment_id;
    booking.payment.paidAt = new Date();
    booking.payment.method = methodMapping[paymentDetails.method] || 'other';

    // Mark booking as completed
    booking.status = 'completed';

    await booking.save();

    const payment = await Payment.findOneAndUpdate(
      { booking: booking._id },
      {
        booking: booking._id,
        customer: booking.customer,
        vendor: booking.vendor,
        amount: booking.pricing.totalAmount,
        platformFee: booking.pricing.platformFee || 0,
        tax: booking.pricing.tax || 0,
        vendorEarning: booking.pricing.vendorPayout || 0,
        method: booking.payment.method,
        gateway: 'razorpay',
        gatewayOrderId: razorpay_order_id,
        gatewayPaymentId: razorpay_payment_id,
        gatewaySignature: razorpay_signature,
        status: 'success',
        paidAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await Transaction.create({
      booking: booking._id,
      entityType: 'vendor',
      entity: booking.vendor,
      type: 'earnings_credit',
      amount: -Math.abs(booking.pricing.platformFee || 0),
      status: 'completed',
      refId: payment._id.toString(),
      metadata: {
        paymentMethod: booking.payment.method,
        gateway: 'razorpay',
      },
    });

    // 5. Notify parties
    try {
      const NotificationService = require('../utils/notificationService');
      const io = req.app.get('io');
      await NotificationService.notifyBookingCompleted(booking._id, io);
    } catch (notifErr) {
      console.warn('Notification failed:', notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully. Booking completed.',
      data: booking
    });
  } catch (error) {
    console.error('Razorpay Verify Payment Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
