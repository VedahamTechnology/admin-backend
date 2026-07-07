const Booking = require('../../models/Booking');
const User = require('../../models/User');
const NotificationService = require('../../utils/notificationService');

/**
 * Get all bookings for admin dashboard
 * Can filter by status, customer, vendor, date range
 */
exports.getAllBookings = async (req, res) => {
  try {
    const {
      status,
      vendorId,
      customerId,
      city_id,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      startDate,
      endDate,
    } = req.query;

    let filter = {};

    // Filter by status
    if (status) {
      filter.status = status;
    }

    // Filter by vendor
    if (vendorId) {
      filter.vendor = vendorId;
    }

    // Filter by customer
    if (customerId) {
      filter.customer = customerId;
    }

    if (city_id) {
      filter.city = city_id;
    }

    // Filter by date range
    if (startDate || endDate) {
      filter.bookingDate = {};
      if (startDate) {
        filter.bookingDate.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.bookingDate.$lte = end;
      }
    }

    const skip = (page - 1) * limit;
    const sortObj = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const bookings = await Booking.find(filter)
      .populate('customer', 'firstName lastName email phone')
      .populate('vendor', 'firstName lastName businessName email phone')
      .populate('service', 'name basePrice')
      .populate('category', 'name')
      .sort(sortObj)
      .skip(skip)
      .limit(Number(limit));

    const total = await Booking.countDocuments(filter);

    // Get booking statistics
    const stats = await Booking.aggregate([
      { $match: filter },
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
      message: 'Bookings retrieved successfully',
      data: bookings,
      stats,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get a specific booking with all details
 */
exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('customer', 'firstName lastName email phone address profileImage')
      .populate('vendor', 'firstName lastName businessName email phone profileImage rating')
      .populate('service', 'name description image basePrice estimatedDuration features includes')
      .populate('category', 'name')
      .populate('review');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
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
 * Get pending bookings (awaiting vendor confirmation)
 */
exports.getPendingBookings = async (req, res) => {
  try {
    const { page = 1, limit = 20, city_id } = req.query;
    const skip = (page - 1) * limit;

    const filter = { status: 'pending' };
    if (city_id) {
      filter.city = city_id;
    }

    const bookings = await Booking.find(filter)
      .populate('customer', 'firstName lastName email phone')
      .populate('vendor', 'firstName lastName businessName email')
      .populate('service', 'name basePrice')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Booking.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: 'Pending bookings retrieved successfully',
      data: bookings,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get confirmed bookings (in progress)
 */
exports.getConfirmedBookings = async (req, res) => {
  try {
    const { page = 1, limit = 20, city_id } = req.query;
    const skip = (page - 1) * limit;

    const filter = { status: 'confirmed' };
    if (city_id) {
      filter.city = city_id;
    }

    const bookings = await Booking.find(filter)
      .populate('customer', 'firstName lastName email phone')
      .populate('vendor', 'firstName lastName businessName email')
      .populate('service', 'name')
      .sort({ bookingDate: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Booking.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: 'Confirmed bookings retrieved successfully',
      data: bookings,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get completed bookings
 */
exports.getCompletedBookings = async (req, res) => {
  try {
    const { page = 1, limit = 20, customerId, vendorId, city_id } = req.query;
    const skip = (page - 1) * limit;

    let filter = { status: 'completed' };

    if (customerId) {
      filter.customer = customerId;
    }

    if (vendorId) {
      filter.vendor = vendorId;
    }

    if (city_id) {
      filter.city = city_id;
    }

    const bookings = await Booking.find(filter)
      .populate('customer', 'firstName lastName email phone')
      .populate('vendor', 'firstName lastName businessName email')
      .populate('service', 'name')
      .sort({ completedAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Booking.countDocuments(filter);

    // Calculate revenue
    const revenueData = await Booking.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$pricing.platformFee' },
          totalVendorPayouts: { $sum: '$pricing.vendorPayout' },
          totalBookings: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      message: 'Completed bookings retrieved successfully',
      data: bookings,
      revenue: revenueData[0] || { totalRevenue: 0, totalVendorPayouts: 0, totalBookings: 0 },
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get cancelled bookings
 */
exports.getCancelledBookings = async (req, res) => {
  try {
    const { page = 1, limit = 20, city_id } = req.query;
    const skip = (page - 1) * limit;

    const filter = { status: 'cancelled' };
    if (city_id) {
      filter.city = city_id;
    }

    const bookings = await Booking.find(filter)
      .populate('customer', 'firstName lastName email')
      .populate('vendor', 'firstName lastName businessName email')
      .populate('service', 'name')
      .sort({ 'cancellation.cancelledAt': -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Booking.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: 'Cancelled bookings retrieved successfully',
      data: bookings,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get booking statistics and analytics
 */
exports.getBookingStats = async (req, res) => {
  try {
    const { startDate, endDate, city_id } = req.query;

    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        dateFilter.createdAt.$gte = new Date(startDate);
      }
    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.createdAt.$lte = end;
      }
    }

    if (city_id) {
      dateFilter.city = city_id;
    }

    // Status-wise statistics
    const statusStats = await Booking.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$pricing.totalAmount' },
          platformFee: { $sum: '$pricing.platformFee' },
          vendorPayout: { $sum: '$pricing.vendorPayout' },
        },
      },
    ]);

    // Daily statistics
    const dailyStats = await Booking.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          totalAmount: { $sum: '$pricing.totalAmount' },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 30 },
    ]);

    // Top vendors
    const topVendors = await Booking.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$vendor',
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.vendorPayout' },
          completedBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
        },
      },
      { $sort: { totalBookings: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'vendorDetails',
        },
      },
      { $unwind: '$vendorDetails' },
      {
        $project: {
          vendorName: '$vendorDetails.businessName',
          vendorId: '$_id',
          totalBookings: 1,
          totalRevenue: 1,
          completedBookings: 1,
        },
      },
    ]);

    // Total statistics
    const totalStats = await Booking.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.totalAmount' },
          totalPlatformFee: { $sum: '$pricing.platformFee' },
          totalVendorPayout: { $sum: '$pricing.vendorPayout' },
          averageBookingValue: { $avg: '$pricing.totalAmount' },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      message: 'Booking statistics retrieved successfully',
      stats: {
        totalStats: totalStats[0] || {},
        statusStats,
        dailyStats,
        topVendors,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Admin can manually complete a booking (for offline bookings)
 */
exports.adminCompleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    if (booking.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already completed',
      });
    }

    if (!['confirmed', 'pending'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot complete booking with status: ${booking.status}`,
      });
    }

    booking.status = 'completed';
    booking.completedAt = new Date();
    await booking.save();

    // Send notifications
    try {
      const io = req.app.get('io');
      await NotificationService.notifyBookingCompleted(booking._id, io);
    } catch (notificationError) {
      console.warn('Notification sending failed (non-critical):', notificationError.message);
    }

    res.status(200).json({
      success: true,
      message: 'Booking completed successfully by admin',
      booking: {
        id: booking._id,
        status: booking.status,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Admin can manually cancel a booking
 */
exports.adminCancelBooking = async (req, res) => {
  try {
    const { reason, refundAmount } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Cancellation reason is required',
      });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already cancelled',
      });
    }

    if (booking.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a completed booking',
      });
    }

    booking.status = 'cancelled';
    booking.cancellation = {
      cancelledBy: 'admin',
      reason: reason,
      cancelledAt: new Date(),
      refundAmount: refundAmount || booking.pricing.totalAmount,
    };
    await booking.save();

    // Send notifications
    try {
      const io = req.app.get('io');
      await NotificationService.notifyBookingRejected(booking._id, reason, io);
    } catch (notificationError) {
      console.warn('Notification sending failed (non-critical):', notificationError.message);
    }

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully by admin',
      booking: {
        id: booking._id,
        status: booking.status,
        cancellation: booking.cancellation,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get recent bookings (latest first)
 */
exports.getRecentBookings = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const bookings = await Booking.find()
      .populate('customer', 'firstName lastName email phone')
      .populate('vendor', 'firstName lastName businessName email phone')
      .populate('service', 'name basePrice')
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      message: 'Recent bookings retrieved successfully',
      data: bookings,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update booking status (admin can change any booking status)
 * PATCH /api/admin/bookings/:id/status
 */
exports.updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required',
      });
    }

    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    const previousStatus = booking.status;
    booking.status = status;

    // Set timestamps based on status
    if (status === 'completed') {
      booking.completedAt = new Date();
    } else if (status === 'cancelled') {
      booking.cancellation = {
        cancelledBy: 'admin',
        cancelledAt: new Date(),
        reason: req.body.reason || 'Admin status change',
      };
    } else if (status === 'confirmed') {
      booking.confirmedAt = new Date();
    }

    await booking.save();

    // Send notification
    try {
      const io = req.app.get('io');
      if (status === 'completed') {
        await NotificationService.notifyBookingCompleted(booking._id, io);
      } else if (status === 'cancelled') {
        await NotificationService.notifyBookingRejected(booking._id, 'Status updated by admin', io);
      }
    } catch (notificationError) {
      console.warn('Notification sending failed (non-critical):', notificationError.message);
    }

    res.status(200).json({
      success: true,
      message: `Booking status updated from ${previousStatus} to ${status}`,
      booking: {
        id: booking._id,
        previousStatus,
        newStatus: booking.status,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Search bookings by various criteria
 */
exports.searchBookings = async (req, res) => {
  try {
    const { search, field = 'id', page = 1, limit = 20, city_id } = req.query;

    if (!search) {
      return res.status(400).json({
        success: false,
        message: 'Search term is required',
      });
    }

    const skip = (page - 1) * limit;
    let filter = {};

    // Search by different fields
    if (field === 'id') {
      filter._id = { $regex: search, $options: 'i' };
    } else if (field === 'customerEmail') {
      const customer = await User.findOne({ email: { $regex: search, $options: 'i' } });
      filter.customer = customer?._id;
    } else if (field === 'vendorName') {
      const vendor = await User.findOne({
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { businessName: { $regex: search, $options: 'i' } },
        ],
      });
      filter.vendor = vendor?._id;
    }

    if (city_id) {
      filter.city = city_id;
    }

    const bookings = await Booking.find(filter)
      .populate('customer', 'firstName lastName email')
      .populate('vendor', 'firstName lastName businessName email')
      .populate('service', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Booking.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: 'Bookings found',
      data: bookings,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
