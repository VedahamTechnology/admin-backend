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
      .populate('category', 'name')
      .populate('payment');

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
 * Accept a booking
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

    booking.status = 'accepted';
    booking.vendorAcceptedAt = new Date();
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Booking accepted successfully',
      booking: {
        id: booking._id,
        bookingId: booking.bookingId,
        status: booking.status,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Reject a booking
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

    booking.status = 'rejected';
    booking.rejectionReason = reason;
    booking.rejectedAt = new Date();
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Booking rejected successfully',
      booking: {
        id: booking._id,
        bookingId: booking.bookingId,
        status: booking.status,
        reason,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Mark booking as completed
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

    if (booking.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: `Only accepted bookings can be marked as completed`,
      });
    }

    booking.status = 'completed';
    booking.completedAt = new Date();
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Booking marked as completed successfully',
      booking: {
        id: booking._id,
        bookingId: booking.bookingId,
        status: booking.status,
        completedAt: booking.completedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Cancel a booking by vendor
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

    // Only pending or accepted bookings can be cancelled
    if (!['pending', 'accepted'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Booking with status '${booking.status}' cannot be cancelled`,
      });
    }

    booking.status = 'cancelled';
    booking.cancellationReason = reason;
    booking.cancelledAt = new Date();
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      booking: {
        id: booking._id,
        bookingId: booking.bookingId,
        status: booking.status,
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
        $match: { vendor: require('mongoose').Types.ObjectId(req.user._id) },
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
