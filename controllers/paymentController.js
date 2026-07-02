const Razorpay = require('razorpay');
const crypto = require('crypto');
const Booking = require('../models/Booking');
const BookingIntent = require('../models/BookingIntent');
const NotificationService = require('../utils/notificationService');

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

    // Allow payment if booking is payment_pending (upfront) OR if it's in progress/completed (post-service)
    const allowPaymentStatuses = ['payment_pending', 'in_progress', 'completed', 'on_the_way', 'work_done'];
    if (!allowPaymentStatuses.includes(booking.status)) {
       return res.status(400).json({
         success: false,
         message: `Payment not allowed for booking with status: ${booking.status}`
       });
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
    res.status(500).json({ success: false, message: 'Failed to create payment order: ' + error.message });
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
      bookingId,
      intentId // Added intentId for payment-first flow
    } = req.body;

    // 1. Verify signature first
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed. If money was deducted, please contact support with Payment ID: ' + razorpay_payment_id
      });
    }

    // 2. Handle Booking Intent (Payment-First flow) or Existing Booking (Post-service flow)
    let booking;
    let isUpfrontPayment = false;

    if (intentId) {
      // Payment-First flow: Convert BookingIntent to Booking
      const intent = await BookingIntent.findById(intentId);
      if (!intent) {
        return res.status(404).json({
          success: false,
          message: 'Booking request expired or not found. If payment was successful, please contact support.'
        });
      }

      // Check for overlapping bookings AGAIN before confirming
      const overlappingBooking = await Booking.findOne({
        vendor: intent.vendor,
        bookingDate: intent.bookingDate,
        status: { $in: ['pending', 'confirmed', 'on_the_way', 'in_progress'] },
        $or: [
          {
            'timeSlot.startTime': { $lt: intent.timeSlot.endTime },
            'timeSlot.endTime': { $gt: intent.timeSlot.startTime },
          },
        ],
      });

      if (overlappingBooking) {
        return res.status(409).json({
          success: false,
          message: 'This time slot was just booked by someone else. Our support team will contact you for a refund or to reschedule.',
          data: { paymentId: razorpay_payment_id }
        });
      }

      // Map Razorpay methods
      const paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);
      const methodMapping = {
        'card': paymentDetails.card && paymentDetails.card.type === 'debit' ? 'debit_card' : 'credit_card',
        'netbanking': 'netbanking',
        'wallet': 'wallet',
        'upi': 'upi'
      };

      // Create the final booking
      booking = await Booking.create({
        customer: intent.customer,
        vendor: intent.vendor,
        service: intent.service,
        category: intent.category,
        bookingDate: intent.bookingDate,
        timeSlot: intent.timeSlot,
        serviceAddress: intent.serviceAddress,
        pricing: intent.pricing,
        customerNotes: intent.customerNotes,
        payment: {
          method: methodMapping[paymentDetails.method] || 'other',
          status: 'completed',
          transactionId: razorpay_payment_id,
          razorpayOrderId: razorpay_order_id,
          paidAt: new Date()
        },
        status: 'pending' // Ready for vendor approval
      });

      isUpfrontPayment = true;

      // Delete the intent as it's now a booking
      await BookingIntent.findByIdAndDelete(intentId);

    } else if (bookingId) {
      // Post-service payment flow for existing bookings
      booking = await Booking.findById(bookingId);
      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking record not found' });
      }

      const paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);
      const methodMapping = {
        'card': paymentDetails.card && paymentDetails.card.type === 'debit' ? 'debit_card' : 'credit_card',
        'netbanking': 'netbanking',
        'wallet': 'wallet',
        'upi': 'upi'
      };

      booking.payment.status = 'completed';
      booking.payment.transactionId = razorpay_payment_id;
      booking.payment.paidAt = new Date();
      booking.payment.method = methodMapping[paymentDetails.method] || 'other';
      booking.status = 'completed';
      booking.expiresAt = undefined;

      await booking.save();
    } else {
      return res.status(400).json({ success: false, message: 'Missing bookingId or intentId' });
    }

    // 3. Populate and Notify
    await booking.populate([
      { path: 'customer', select: 'firstName lastName email' },
      { path: 'vendor', select: 'firstName lastName email businessName' },
      { path: 'service', select: 'name' }
    ]);

    try {
      const io = req.app.get('io');
      if (isUpfrontPayment) {
        await NotificationService.notifyBookingCreated(booking._id, booking, io);
      } else {
        await NotificationService.notifyBookingCompleted(booking._id, io);
      }
    } catch (notifErr) {
      console.warn('Notification failed:', notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: isUpfrontPayment
        ? 'Payment verified. Booking request sent to vendor.'
        : 'Payment verified successfully. Booking completed.',
      data: booking
    });

  } catch (error) {
    console.error('Razorpay Verify Payment Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal error during payment verification: ' + error.message
    });
  }
};

/**
 * Handle Razorpay Webhooks (The "Auto-Call" for Payment-First Flow)
 * This ensures bookings are created even if the user's app/browser closes.
 */
exports.handleWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    // 1. Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).send('Invalid webhook signature');
    }

    const { event, payload } = req.body;
    console.log(`🔔 Razorpay Webhook Received: ${event}`);

    // 2. Handle successful payment
    if (event === 'order.paid' || event === 'payment.captured') {
      const orderId = payload.payment.entity.order_id;
      const paymentId = payload.payment.entity.id;
      const paymentMethod = payload.payment.entity.method;

      // Find if there is a BookingIntent for this order
      const intent = await BookingIntent.findOne({ razorpayOrderId: orderId });

      if (intent) {
        // Double check for overlapping bookings
        const overlapping = await Booking.findOne({
          vendor: intent.vendor,
          bookingDate: intent.bookingDate,
          status: { $in: ['pending', 'confirmed', 'on_the_way', 'in_progress'] },
          $or: [
            {
              'timeSlot.startTime': { $lt: intent.timeSlot.endTime },
              'timeSlot.endTime': { $gt: intent.timeSlot.startTime },
            },
          ],
        });

        if (overlapping) {
          console.warn(`[Webhook] Conflict detected for intent ${intent._id}. Automated refund recommended.`);
          // In a real system, you would trigger a refund via Razorpay API here
          return res.status(200).json({ status: 'conflict_pending_refund' });
        }

        // Map method
        const methodMapping = {
          'card': payload.payment.entity.card && payload.payment.entity.card.type === 'debit' ? 'debit_card' : 'credit_card',
          'netbanking': 'netbanking',
          'wallet': 'wallet',
          'upi': 'upi'
        };

        // Create the booking
        const booking = await Booking.create({
          customer: intent.customer,
          vendor: intent.vendor,
          service: intent.service,
          category: intent.category,
          bookingDate: intent.bookingDate,
          timeSlot: intent.timeSlot,
          serviceAddress: intent.serviceAddress,
          pricing: intent.pricing,
          customerNotes: intent.customerNotes,
          payment: {
            method: methodMapping[paymentMethod] || 'other',
            status: 'completed',
            transactionId: paymentId,
            razorpayOrderId: orderId,
            paidAt: new Date()
          },
          status: 'pending'
        });

        // Delete intent
        await BookingIntent.findByIdAndDelete(intent._id);

        // Notify
        try {
          const io = req.app.get('io');
          await booking.populate([
            { path: 'customer', select: 'firstName lastName email' },
            { path: 'vendor', select: 'firstName lastName email businessName' },
            { path: 'service', select: 'name' }
          ]);
          await NotificationService.notifyBookingCreated(booking._id, booking, io);
        } catch (err) {
          console.error('[Webhook] Notification Error:', err.message);
        }

        console.log(`✅ Booking ${booking._id} created automatically via Webhook`);
      }
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Razorpay Webhook Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
