const Booking = require('../../models/Booking');
const Service = require('../../models/Service');
const User = require('../../models/User');
const Category = require('../../models/Category');
const NotificationService = require('../../utils/notificationService');

/**
 * Create a new booking
 */
exports.createBooking = async (req, res) => {
  try {
    const {
      serviceId,
      vendorId,
      bookingDate,
      timeSlot,
      serviceAddress,
      paymentMethod,
    } = req.body;

    // Validate required fields
    if (!serviceId || !vendorId || !bookingDate || !timeSlot || !serviceAddress) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: serviceId, vendorId, bookingDate, timeSlot, serviceAddress',
      });
    }

    // Validate coordinates presence
    const { latitude, longitude } = serviceAddress;
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Exact location (latitude and longitude) is required for booking',
      });
    }

    // Validate service exists and is APPROVED
    const service = await Service.findById(serviceId);
    if (!service || !service.isActive || service.approvalStatus !== 'approved') {
      return res.status(404).json({
        success: false,
        message: service && service.approvalStatus !== 'approved' 
          ? 'Service is not approved by admin yet. Please wait for approval.'
          : 'Service not found or is not available',
      });
    }

    // Validate vendor exists and is approved
    const vendor = await User.findById(vendorId);
    if (!vendor || vendor.role !== 'vendor' || !vendor.isApproved || vendor.isBanned) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found or is not available',
      });
    }

    // Check if vendor offers this service
    if (service.vendor.toString() !== vendorId) {
      return res.status(400).json({
        success: false,
        message: 'This service does not belong to the specified vendor',
      });
    }

    // Validate booking date is in future
    const bookingDateTime = new Date(bookingDate);
    if (bookingDateTime < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Booking date must be in the future',
      });
    }

    // Validate timeSlot format
    if (!timeSlot.startTime || !timeSlot.endTime) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid startTime and endTime',
      });
    }

    // Check for overlapping bookings to prevent double booking
    const overlappingBooking = await Booking.findOne({
      vendor: vendorId,
      bookingDate: bookingDateTime,
      status: { $in: ['pending', 'confirmed', 'on_the_way', 'in_progress'] },
      $or: [
        {
          'timeSlot.startTime': { $lt: timeSlot.endTime },
          'timeSlot.endTime': { $gt: timeSlot.startTime },
        },
      ],
    });

    if (overlappingBooking) {
      return res.status(400).json({
        success: false,
        message: 'Vendor is already booked for this time slot. Please choose another time.',
      });
    }

    // Calculate pricing with proper breakdown
    const basePrice = service.basePrice;
    const platformFeePercentage = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE) || 15;
    const platformFee = (basePrice * (platformFeePercentage / 100)) || 0;
    const tax = (basePrice * (service.taxPercentage || 0)) / 100;
    const discount = 0;  // Can be applied via promo codes
    const totalAmount = basePrice + platformFee + tax - discount;
    const vendorPayout = basePrice - platformFee;

    // Extract request body
    const { customerNotes } = req.body;

    // Create booking with comprehensive pricing snapshot
    const booking = await Booking.create({
      customer: req.user._id,
      vendor: vendorId,
      service: serviceId,
      category: service.category,
      bookingDate: bookingDateTime,
      timeSlot,
      serviceAddress: {
        label: serviceAddress.label || 'Home',
        street: serviceAddress.street,
        city: serviceAddress.city,
        state: serviceAddress.state,
        pincode: serviceAddress.pincode,
        location: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        },
        instructions: serviceAddress.instructions,
      },
      pricing: {
        basePrice,
        platformFee,
        tax,
        discount,
        totalAmount,
        vendorPayout,
        serviceSnapshot: {
          serviceName: service.name,
          serviceDescription: service.description,
          serviceImage: service.image,
        },
      },
      payment: {
        method: paymentMethod || 'cash',
        status: 'pending',
      },
      customerNotes,
    });

    // Populate booking details
    await booking.populate([
      { path: 'customer', select: 'firstName lastName email phone profileImage' },
      { path: 'vendor', select: 'firstName lastName email phone businessName profileImage' },
      { path: 'service', select: 'name description image basePrice estimatedDuration' },
      { path: 'category', select: 'name' },
    ]);

    // Send notifications to vendor and customer
    try {
      // Get Socket.IO instance from request if available (passed via middleware)
      const io = req.app.get('io');
      await NotificationService.notifyBookingCreated(booking._id, booking, io);
    } catch (notificationError) {
      console.warn('Notification sending failed (non-critical):', notificationError.message);
      // Don't fail the booking creation if notification fails
    }

    return res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: booking,
    });
  } catch (error) {
    console.error('Create booking error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating booking',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get user's bookings
 */
exports.getMyBookings = async (req, res) => {
  try {
    const {
      status,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Build filter
    const filter = { customer: req.user._id };

    if (status) {
      filter.status = status;
    }

    // Pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Fetch bookings
    const bookings = await Booking.find(filter)
      .populate('vendor', 'firstName lastName email phone businessName profileImage rating')
      .populate('worker', 'firstName lastName phone profileImage')
      .populate('service', 'name description image basePrice estimatedDuration')
      .populate('category', 'name')
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get total count
    const total = await Booking.countDocuments(filter);

    return res.status(200).json({
      success: true,
      message: 'Bookings retrieved successfully',
      data: bookings,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get my bookings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching bookings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get booking details
 */
exports.getBookingDetails = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId)
      .populate('customer', 'firstName lastName email phone profileImage')
      .populate('vendor', 'firstName lastName email phone businessName profileImage rating')
      .populate('worker', 'firstName lastName phone profileImage')
      .populate('service', 'name description image basePrice estimatedDuration features includes')
      .populate('category', 'name')
      .lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Check if user is the customer of this booking
    if (booking.customer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this booking',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Booking details retrieved successfully',
      data: booking,
    });
  } catch (error) {
    console.error('Get booking details error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching booking details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Cancel booking
 */
exports.cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Check if user is the customer
    if (booking.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to cancel this booking',
      });
    }

    // Check if booking can be cancelled
    if (['completed', 'cancelled'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel booking with status: ${booking.status}`,
      });
    }

    // Check if booking is within window
    const bookingTime = new Date(booking.bookingDate);
    const now = new Date();
    const hoursUntilBooking = (bookingTime - now) / (1000 * 60 * 60);
    const cancellationWindow = parseFloat(process.env.CANCELLATION_WINDOW_HOURS) || 2;
    const cancellationRefundPercentage = parseFloat(process.env.CANCELLATION_REFUND_PERCENTAGE) || 50;

    let refundAmount = booking.pricing.totalAmount;
    if (hoursUntilBooking < cancellationWindow) {
      refundAmount = booking.pricing.totalAmount * (cancellationRefundPercentage / 100); // Configurable partial refund if cancelled within window
    }

    // Update booking
    booking.status = 'cancelled';
    booking.cancellation = {
      cancelledBy: 'customer',
      reason: reason || 'Customer initiated cancellation',
      cancelledAt: new Date(),
      refundAmount,
    };

    await booking.save();

    await booking.populate([
      { path: 'vendor', select: 'firstName lastName email' },
      { path: 'service', select: 'name' },
    ]);

    return res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: {
        booking,
        refundAmount,
        refundMessage: hoursUntilBooking < cancellationWindow ? `You will receive ${cancellationRefundPercentage}% refund for cancellation within ${cancellationWindow} hours of booking` : 'You will receive full refund',
      },
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error cancelling booking',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get booking statistics for user
 */
exports.getBookingStats = async (req, res) => {
  try {
    const stats = await Booking.aggregate([
      { $match: { customer: req.user._id } },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          completedBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          cancelledBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
          },
          pendingBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
          },
          totalSpent: { $sum: '$pricing.totalAmount' },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: 'Booking statistics retrieved successfully',
      data: stats[0] || {
        totalBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        pendingBookings: 0,
        totalSpent: 0,
      },
    });
  } catch (error) {
    console.error('Get booking stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching booking statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Search user's bookings
 */
exports.searchBookings = async (req, res) => {
  try {
    const { query = '', status, page = 1, limit = 10 } = req.query;

    const filter = { customer: req.user._id };

    if (status) {
      filter.status = status;
    }

    if (query) {
      filter.$or = [
        { _id: { $regex: query, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const bookings = await Booking.find(filter)
      .populate('vendor', 'firstName lastName email businessName')
      .populate('service', 'name image')
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Booking.countDocuments(filter);

    return res.status(200).json({
      success: true,
      message: 'Search results retrieved successfully',
      data: bookings,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Search bookings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error searching bookings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Reschedule booking with history tracking
 * Enhanced version with proper history tracking
 */
exports.rescheduleBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { bookingDate, timeSlot, reason } = req.body;

    if (!bookingDate || !timeSlot) {
      return res.status(400).json({
        success: false,
        message: 'Please provide bookingDate and timeSlot',
      });
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Check if user is the customer
    if (booking.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to reschedule this booking',
      });
    }

    // Check if booking can be rescheduled
    if (['completed', 'cancelled', 'in_progress', 'on_the_way'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot reschedule booking with status: ${booking.status}`,
      });
    }

    // Validate new booking date is in future
    const newBookingDate = new Date(bookingDate);
    if (newBookingDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'New booking date must be in the future',
      });
    }

    // Check for overlapping bookings to prevent double booking during reschedule
    const overlappingBooking = await Booking.findOne({
      _id: { $ne: booking._id }, // Exclude the current booking itself
      vendor: booking.vendor,
      bookingDate: newBookingDate,
      status: { $in: ['pending', 'confirmed', 'on_the_way', 'in_progress'] },
      $or: [
        {
          'timeSlot.startTime': { $lt: timeSlot.endTime },
          'timeSlot.endTime': { $gt: timeSlot.startTime },
        },
      ],
    });

    if (overlappingBooking) {
      return res.status(400).json({
        success: false,
        message: 'Vendor is already booked for this time slot. Please choose another time.',
      });
    }

    // Store previous date/slot in history before updating
    booking.addRescheduleHistory(
      booking.bookingDate,
      booking.timeSlot,
      'customer',
      reason || 'Customer initiated reschedule'
    );

    // Update booking
    booking.bookingDate = newBookingDate;
    booking.timeSlot = timeSlot;
    await booking.save();

    await booking.populate([
      { path: 'vendor', select: 'firstName lastName email' },
      { path: 'service', select: 'name' },
    ]);

    return res.status(200).json({
      success: true,
      message: 'Booking rescheduled successfully',
      data: booking,
    });
  } catch (error) {
    console.error('Reschedule booking error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error rescheduling booking',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get vendor availability for a specific date
 */
exports.getVendorAvailability = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a date (YYYY-MM-DD)',
      });
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const busyBookings = await Booking.find({
      vendor: vendorId,
      bookingDate: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      status: { $in: ['pending', 'confirmed', 'on_the_way', 'in_progress'] },
    })
      .select('timeSlot')
      .lean();

    const busySlots = busyBookings.map((b) => b.timeSlot);

    return res.status(200).json({
      success: true,
      message: 'Vendor availability retrieved successfully',
      data: {
        vendorId,
        date,
        busySlots,
      },
    });
  } catch (error) {
    console.error('Get vendor availability error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching vendor availability',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get reschedule history for a booking
 */

