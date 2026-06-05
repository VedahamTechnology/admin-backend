const Booking = require('../../models/Booking');
const User = require('../../models/User');
const Service = require('../../models/Service');
const Payment = require('../../models/Payment');

/**
 * Get dashboard statistics based on period
 * Supports: today, week, month, year
 */
exports.getStats = async (req, res) => {
  try {
    const { period = 'today' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      default:
        startDate.setHours(0, 0, 0, 0);
    }

    const dateFilter = {
      createdAt: { $gte: startDate, $lte: now },
    };

    // Revenue calculation (platform fees + taxes)
    const revenueData = await Booking.aggregate([
      { $match: { ...dateFilter, status: 'completed' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$pricing.platformFee' },
          totalTax: { $sum: '$pricing.tax' },
          totalBookings: { $sum: 1 },
        },
      },
    ]);

    // Booking status counts
    const bookingStats = await Booking.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // New users, vendors count
    const newUsers = await User.countDocuments({
      role: 'customer',
      createdAt: { $gte: startDate, $lte: now },
    });

    const newVendors = await User.countDocuments({
      role: 'vendor',
      createdAt: { $gte: startDate, $lte: now },
    });

    // Total counts (all-time)
    const totalUsers = await User.countDocuments({ role: 'customer' });
    const totalVendors = await User.countDocuments({ role: 'vendor' });
    const activeVendors = await User.countDocuments({
      role: 'vendor',
      'vendor.isAvailable': true,
    });

    // Format booking stats
    const bookingStatusBreakdown = {
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
    };

    bookingStats.forEach((stat) => {
      if (bookingStatusBreakdown.hasOwnProperty(stat._id)) {
        bookingStatusBreakdown[stat._id] = stat.count;
      }
    });

    const revenue = revenueData[0] || {
      totalRevenue: 0,
      totalTax: 0,
      totalBookings: 0,
    };

    res.status(200).json({
      success: true,
      period,
      data: {
        revenue: {
          total: revenue.totalRevenue || 0,
          tax: revenue.totalTax || 0,
          bookings: revenue.totalBookings || 0,
        },
        bookings: {
          ...bookingStatusBreakdown,
          total: bookingStatusBreakdown.pending +
            bookingStatusBreakdown.confirmed +
            bookingStatusBreakdown.completed +
            bookingStatusBreakdown.cancelled,
        },
        users: {
          new: newUsers,
          total: totalUsers,
        },
        vendors: {
          new: newVendors,
          active: activeVendors,
          total: totalVendors,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get revenue trend for charts
 */
exports.getRevenueTrend = async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    const now = new Date();
    let startDate = new Date();
    let groupBy = '%Y-%m-%d'; // daily
    let daysToShow = 30;

    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        daysToShow = 7;
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        daysToShow = 30;
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        groupBy = '%Y-%m';
        daysToShow = 365;
        break;
      default:
        startDate.setDate(now.getDate() - 7);
        daysToShow = 7;
    }

    const trendData = await Booking.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: startDate, $lte: now },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: groupBy, date: '$createdAt' },
          },
          revenue: { $sum: '$pricing.platformFee' },
          bookings: { $sum: 1 },
          totalAmount: { $sum: '$pricing.totalAmount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      period,
      data: trendData,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get booking volume chart data
 */
exports.getBookingVolume = async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    const now = new Date();
    let startDate = new Date();
    let groupBy = '%Y-%m-%d';

    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        groupBy = '%Y-%m';
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    const volumeData = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: now },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: groupBy, date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      period,
      data: volumeData,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get booking status distribution
 */
exports.getBookingStatus = async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    const statusData = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: now },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          percentage: { $sum: 1 },
        },
      },
    ]);

    const total = statusData.reduce((sum, item) => sum + item.count, 0);

    const formattedData = statusData.map((item) => ({
      status: item._id,
      count: item.count,
      percentage: ((item.count / total) * 100).toFixed(2),
    }));

    res.status(200).json({
      success: true,
      period,
      total,
      data: formattedData,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get revenue vs bookings comparison
 */
exports.getRevenueVsBookings = async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    const now = new Date();
    let startDate = new Date();
    let groupBy = '%Y-%m-%d';

    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        groupBy = '%Y-%m';
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    const comparisonData = await Booking.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: startDate, $lte: now },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: groupBy, date: '$createdAt' },
          },
          revenue: { $sum: '$pricing.platformFee' },
          bookingCount: { $sum: 1 },
          avgRevenuePerBooking: {
            $avg: '$pricing.platformFee',
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      period,
      data: comparisonData,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get customer growth chart data
 */
exports.getCustomerGrowth = async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    const now = new Date();
    let startDate = new Date();
    let groupBy = '%Y-%m-%d';

    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        groupBy = '%Y-%m';
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    const growthData = await User.aggregate([
      {
        $match: {
          role: 'customer',
          createdAt: { $gte: startDate, $lte: now },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: groupBy, date: '$createdAt' },
          },
          newCustomers: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      period,
      data: growthData,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get vendor/worker payment data
 */
exports.getWorkerPayment = async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    const now = new Date();
    let startDate = new Date();
    let groupBy = '%Y-%m-%d';

    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        groupBy = '%Y-%m';
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    const paymentData = await Booking.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: startDate, $lte: now },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: groupBy, date: '$createdAt' },
          },
          totalPayout: { $sum: '$pricing.vendorPayout' },
          vendorCount: { $addToSet: '$vendor' },
          bookingCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 1,
          totalPayout: 1,
          vendorCount: { $size: '$vendorCount' },
          bookingCount: 1,
          avgPayoutPerVendor: {
            $divide: ['$totalPayout', { $size: '$vendorCount' }],
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      period,
      data: paymentData,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
