const mongoose = require('mongoose');
const Booking = require('../../models/Booking');
const User = require('../../models/User');

/**
 * Get all bookings for the vendor
 */
exports.getMyBookings = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    let filter = { vendor: req.user._id };

    if (status) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;

    const bookings = await Booking.find(filter)
      .populate('customer', 'firstName lastName email phone')
      .populate('service', 'name basePrice estimatedDuration')
      .populate('category', 'name')
      .sort({ bookingDate: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Booking.countDocuments(filter);

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      bookings,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get a specific booking by ID
 */
exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      vendor: req.user._id,
    })
      .populate('customer', 'firstName lastName email phone address')
      .populate('service', 'name basePrice estimatedDuration features includes')
      .populate('category', 'name');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or you do not have permission to view it',
      });
    }

    res.status(200).json({
      success: true,
      booking,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Accept/Confirm a booking
 * Updates booking status and notifies customer and admin
 */
exports.acceptBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      vendor: req.user._id,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Booking cannot be accepted as it is already ${booking.status}`,
      });
    }

    booking.status = 'confirmed';
    booking.vendorAcceptedAt = new Date();
    await booking.save();

    // Send notifications to customer and admin
    try {
      const NotificationService = require('../../utils/notificationService');
      const io = req.app.get('io');
      await NotificationService.notifyBookingConfirmed(booking._id, io);
    } catch (notificationError) {
      console.warn('Notification sending failed (non-critical):', notificationError.message);
    }

    await booking.populate([
      { path: 'customer', select: 'firstName lastName email' },
      { path: 'vendor', select: 'businessName firstName lastName email' },
      { path: 'service', select: 'name' },
    ]);

    res.status(200).json({
      success: true,
      message: 'Booking confirmed successfully. Customer and admin have been notified.',
      booking: {
        id: booking._id,
        bookingId: booking.bookingId,
        status: booking.status,
        vendorAcceptedAt: booking.vendorAcceptedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Reject a booking
 * Updates booking status and notifies customer and admin with rejection reason
 */
exports.rejectBooking = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a rejection reason',
      });
    }

    const booking = await Booking.findOne({
      _id: req.params.id,
      vendor: req.user._id,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Booking cannot be rejected as it is already ${booking.status}`,
      });
    }

    booking.status = 'cancelled';
    booking.cancellation = {
      cancelledBy: 'vendor',
      reason: reason,
      cancelledAt: new Date(),
    };
    await booking.save();

    // Send notifications to customer and admin
    try {
      const NotificationService = require('../../utils/notificationService');
      const io = req.app.get('io');
      await NotificationService.notifyBookingRejected(booking._id, reason, io);
    } catch (notificationError) {
      console.warn('Notification sending failed (non-critical):', notificationError.message);
    }

    await booking.populate([
      { path: 'customer', select: 'firstName lastName email' },
      { path: 'vendor', select: 'businessName firstName lastName' },
    ]);

    res.status(200).json({
      success: true,
      message: 'Booking rejected successfully. Customer and admin have been notified.',
      booking: {
        id: booking._id,
        bookingId: booking.bookingId,
        status: booking.status,
        cancellation: booking.cancellation,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Mark booking as completed
 * Updates booking status to completed and notifies all parties
 */
exports.completeBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      vendor: req.user._id,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: `Only confirmed bookings can be marked as completed. Current status: ${booking.status}`,
      });
    }

    booking.status = 'completed';
    booking.completedAt = new Date();
    await booking.save();

    // Send notifications to customer and admin
    try {
      const NotificationService = require('../../utils/notificationService');
      const io = req.app.get('io');
      await NotificationService.notifyBookingCompleted(booking._id, io);
    } catch (notificationError) {
      console.warn('Notification sending failed (non-critical):', notificationError.message);
    }

    await booking.populate([
      { path: 'customer', select: 'firstName lastName email' },
      { path: 'vendor', select: 'businessName firstName lastName' },
      { path: 'service', select: 'name' },
    ]);

    res.status(200).json({
      success: true,
      message: 'Booking marked as completed successfully. Customer and admin have been notified.',
      booking: {
        id: booking._id,
        bookingId: booking.bookingId,
        status: booking.status,
        completedAt: booking.completedAt,
        customerEmail: booking.customer.email,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Cancel a booking by vendor
 * Notifies customer and admin with cancellation reason
 */
exports.cancelBooking = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a cancellation reason',
      });
    }

    const booking = await Booking.findOne({
      _id: req.params.id,
      vendor: req.user._id,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Only confirmed bookings can be cancelled (not pending)
    if (!['confirmed'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Booking with status '${booking.status}' cannot be cancelled. Only confirmed bookings can be cancelled.`,
      });
    }

    booking.status = 'cancelled';
    booking.cancellation = {
      cancelledBy: 'vendor',
      reason: reason,
      cancelledAt: new Date(),
    };
    await booking.save();

    // Send notifications to customer and admin
    try {
      const NotificationService = require('../../utils/notificationService');
      const io = req.app.get('io');
      await NotificationService.notifyBookingRejected(booking._id, reason, io);
    } catch (notificationError) {
      console.warn('Notification sending failed (non-critical):', notificationError.message);
    }

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully. Customer and admin have been notified.',
      booking: {
        id: booking._id,
        bookingId: booking.bookingId,
        status: booking.status,
        cancellation: booking.cancellation,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get booking statistics for vendor
 */
exports.getBookingStats = async (req, res) => {
  try {
    const stats = await Booking.aggregate([
      {
        $match: { vendor: new mongoose.Types.ObjectId(req.user._id) },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$pricing.totalAmount' },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Search bookings by vendor
 */
exports.searchBookings = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;

    if (!search) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a search term',
      });
    }

    const skip = (page - 1) * limit;

    const bookings = await Booking.find({
      vendor: req.user._id,
      $or: [
        { bookingId: { $regex: search, $options: 'i' } },
        { 'serviceAddress.city': { $regex: search, $options: 'i' } },
      ],
    })
      .populate('customer', 'firstName lastName email phone')
      .populate('service', 'name')
      .skip(skip)
      .limit(Number(limit));

    const total = await Booking.countDocuments({
      vendor: req.user._id,
      $or: [
        { bookingId: { $regex: search, $options: 'i' } },
        { 'serviceAddress.city': { $regex: search, $options: 'i' } },
      ],
    });

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      bookings,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Submit proof of work (photos and notes from vendor after completion)
 */
exports.submitProofOfWork = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { beforeImages, afterImages, vendorNotes } = req.body;

    if (!beforeImages || !afterImages || beforeImages.length === 0 || afterImages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide before and after images',
      });
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Check if vendor is making this request
    if (booking.vendor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the assigned vendor can submit proof of work',
      });
    }

    // Check if booking is completed
    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Can only submit proof of work for completed bookings',
      });
    }

    // Update proof of work
    booking.proofOfWork = {
      beforeImages,
      afterImages,
      vendorNotes: vendorNotes || '',
      completedAt: new Date(),
    };

    await booking.save();

    await booking.populate([
      { path: 'customer', select: 'firstName lastName email' },
      { path: 'vendor', select: 'firstName lastName email' },
      { path: 'service', select: 'name' },
    ]);

    return res.status(200).json({
      success: true,
      message: 'Proof of work submitted successfully',
      data: booking,
    });
  } catch (error) {
    console.error('Submit proof of work error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error submitting proof of work',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Verify vendor start OTP (vendor arrival at service location)
 */
exports.verifyStartOtp = async (req, res) => {
  try {
    const { id: bookingId } = req.params;
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide OTP',
      });
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Check if vendor is making this request
    if (booking.vendor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the assigned vendor can verify arrival',
      });
    }

    // Verify OTP
    const isValidOtp = await booking.verifyStartOtp(otp);

    if (!isValidOtp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }

    // Update booking
    booking.otp.startVerifiedAt = new Date();
    booking.status = 'on_the_way';
    await booking.save();

    await booking.populate([
      { path: 'customer', select: 'firstName lastName phone' },
      { path: 'vendor', select: 'firstName lastName phone' },
      { path: 'service', select: 'name' },
    ]);

    return res.status(200).json({
      success: true,
      message: 'Vendor arrival verified successfully',
      data: booking,
    });
  } catch (error) {
    console.error('Verify start OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error verifying OTP',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Verify vendor end OTP (service completion)
 */
exports.verifyEndOtp = async (req, res) => {
  try {
    const { id: bookingId } = req.params;
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide OTP',
      });
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Check if vendor is making this request
    if (booking.vendor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the assigned vendor can verify completion',
      });
    }

    // Verify OTP
    const isValidOtp = await booking.verifyEndOtp(otp);

    if (!isValidOtp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }

    // Update booking
    booking.otp.endVerifiedAt = new Date();
    booking.status = 'completed';
    booking.payment.status = 'completed';
    booking.payment.paidAt = new Date();
    await booking.save();

    await booking.populate([
      { path: 'customer', select: 'firstName lastName phone' },
      { path: 'vendor', select: 'firstName lastName phone' },
      { path: 'service', select: 'name' },
    ]);

    return res.status(200).json({
      success: true,
      message: 'Service completion verified successfully',
      data: booking,
    });
  } catch (error) {
    console.error('Verify end OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error verifying OTP',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
