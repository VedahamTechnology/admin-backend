const Razorpay = require('razorpay');
const crypto = require('crypto');
const Booking = require('../models/Booking');

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

    // Verify signature
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    // Update Booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    booking.payment.status = 'completed';
    booking.payment.transactionId = razorpay_payment_id;
    booking.payment.paidAt = new Date();
    // Use the actual payment method from Razorpay if possible, otherwise default
    booking.payment.method = req.body.method || 'upi';

    // Mark booking as completed
    booking.status = 'completed';

    await booking.save();

    // Notify parties
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
