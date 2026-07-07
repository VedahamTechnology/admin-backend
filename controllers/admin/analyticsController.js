const User = require('../../models/User');
const Booking = require('../../models/Booking');
const Payment = require('../../models/Payment');
const Transaction = require('../../models/Transaction');
const Settlement = require('../../models/Settlement');

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

exports.getUserAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const currentStart = new Date(now);
    currentStart.setDate(now.getDate() - 30);
    const previousStart = new Date(now);
    previousStart.setDate(now.getDate() - 60);
    const previousEnd = new Date(now);
    previousEnd.setDate(now.getDate() - 31);

    const totalUsers = await User.countDocuments({ role: 'customer' });
    const currentUsers = await User.countDocuments({ role: 'customer', createdAt: { $gte: currentStart, $lte: now } });
    const previousUsers = await User.countDocuments({ role: 'customer', createdAt: { $gte: previousStart, $lte: previousEnd } });
    const growthPercent = previousUsers === 0 ? (currentUsers > 0 ? 100 : 0) : Number((((currentUsers - previousUsers) / previousUsers) * 100).toFixed(2));

    const topUsers = await Booking.aggregate([
      { $match: { customer: { $ne: null } } },
      {
        $group: {
          _id: '$customer',
          bookings: { $sum: 1 },
          totalSpent: { $sum: '$pricing.totalAmount' },
          lastBookingAt: { $max: '$createdAt' },
        },
      },
      { $sort: { bookings: -1, totalSpent: -1 } },
      { $limit: 5 },
    ]);

    const trend = await User.aggregate([
      { $match: { role: 'customer', createdAt: { $gte: currentStart, $lte: now } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        currentPeriodUsers: currentUsers,
        previousPeriodUsers: previousUsers,
        growthPercent,
        topUsers,
        registrationTrend: trend,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getVendorAnalytics = async (req, res) => {
  try {
    const totalVendors = await User.countDocuments({ role: 'vendor' });
    const approvedVendors = await User.countDocuments({ role: 'vendor', 'vendor.verificationStatus': 'approved' });
    const pendingVendors = await User.countDocuments({ role: 'vendor', 'vendor.verificationStatus': 'pending' });
    const rejectedVendors = await User.countDocuments({ role: 'vendor', 'vendor.verificationStatus': 'rejected' });
    const activeVendors = await User.countDocuments({ role: 'vendor', isActive: true, isBanned: false, 'vendor.verificationStatus': 'approved' });

    const topVendors = await Booking.aggregate([
      { $match: { vendor: { $ne: null } } },
      {
        $group: {
          _id: '$vendor',
          bookings: { $sum: 1 },
          completedBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          revenue: { $sum: '$pricing.totalAmount' },
        },
      },
      { $sort: { bookings: -1, revenue: -1 } },
      { $limit: 5 },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalVendors,
        approvedVendors,
        pendingVendors,
        rejectedVendors,
        activeVendors,
        topVendors,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getWorkerAnalytics = async (req, res) => {
  try {
    const totalWorkers = await User.countDocuments({ role: 'worker' });
    const approvedWorkers = await User.countDocuments({ role: 'worker', 'worker.verificationStatus': 'approved' });
    const pendingWorkers = await User.countDocuments({ role: 'worker', 'worker.verificationStatus': 'pending' });
    const rejectedWorkers = await User.countDocuments({ role: 'worker', 'worker.verificationStatus': 'rejected' });
    const activeWorkers = await User.countDocuments({ role: 'worker', isActive: true, isBanned: false, 'worker.verificationStatus': 'approved' });

    const topWorkers = await Booking.aggregate([
      { $match: { worker: { $ne: null } } },
      {
        $group: {
          _id: '$worker',
          jobs: { $sum: 1 },
          completedJobs: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
        },
      },
      { $sort: { jobs: -1, completedJobs: -1 } },
      { $limit: 5 },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalWorkers,
        approvedWorkers,
        pendingWorkers,
        rejectedWorkers,
        activeWorkers,
        topWorkers,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBookingAnalytics = async (req, res) => {
  try {
    const { city_id, from, to } = req.query;
    const filter = {};

    if (city_id) {
      filter.city = city_id;
    }

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const statusBreakdown = await Booking.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.totalAmount' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const monthlyTrend = await Booking.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          bookings: { $sum: 1 },
          revenue: { $sum: '$pricing.totalAmount' },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 12 },
    ]);

    const totalBookings = await Booking.countDocuments(filter);
    const completedBookings = await Booking.countDocuments({ ...filter, status: 'completed' });
    const cancelledBookings = await Booking.countDocuments({ ...filter, status: 'cancelled' });
    const pendingBookings = await Booking.countDocuments({ ...filter, status: 'pending' });
    const totalRevenue = await Booking.aggregate([
      { $match: filter },
      { $group: { _id: null, revenue: { $sum: '$pricing.totalAmount' } } },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalBookings,
        completedBookings,
        cancelledBookings,
        pendingBookings,
        totalRevenue: totalRevenue[0]?.revenue || 0,
        statusBreakdown,
        monthlyTrend,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPaymentAnalytics = async (req, res) => {
  try {
    const { city_id, from, to } = req.query;
    const bookingFilter = {};

    if (city_id) bookingFilter.city = city_id;
    if (from || to) {
      bookingFilter.createdAt = {};
      if (from) bookingFilter.createdAt.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        bookingFilter.createdAt.$lte = end;
      }
    }

    const bookingIds = await Booking.distinct('_id', bookingFilter);
    const filter = { booking: { $in: bookingIds } };

    const paymentStats = await Payment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          amount: { $sum: '$amount' },
          refunds: { $sum: '$refund.refundAmount' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const methodBreakdown = await Payment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$method',
          count: { $sum: 1 },
          amount: { $sum: '$amount' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const transactionBreakdown = await Transaction.aggregate([
      { $match: { booking: { $in: bookingIds } } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          amount: { $sum: '$amount' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const totals = await Payment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, '$amount', 0] },
          },
          totalRefunds: {
            $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, '$refund.refundAmount', 0] },
          },
          successCount: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
          failedCount: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalRevenue: totals[0]?.totalRevenue || 0,
        totalRefunds: totals[0]?.totalRefunds || 0,
        netRevenue: (totals[0]?.totalRevenue || 0) - (totals[0]?.totalRefunds || 0),
        successCount: totals[0]?.successCount || 0,
        failedCount: totals[0]?.failedCount || 0,
        paymentStats,
        methodBreakdown,
        transactionBreakdown,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSettlementAnalytics = async (req, res) => {
  try {
    const { city_id } = req.query;
    const vendorFilter = { role: 'vendor' };
    if (city_id) {
      vendorFilter['vendor.serviceAreas.city'] = city_id;
    }

    const vendors = await User.find(vendorFilter).select('_id firstName lastName businessName email phone isActive isBanned').lean();
    const vendorIds = vendors.map((vendor) => vendor._id);

    const settlements = await Settlement.find({ vendor: { $in: vendorIds } })
      .populate('vendor', 'firstName lastName businessName email phone isActive isBanned')
      .lean();

    const settlementSummary = settlements.reduce((acc, item) => {
      acc.totalAmountDue += item.amountDue || 0;
      acc.blocked += item.status === 'blocked' ? 1 : 0;
      acc.overLimit += item.status === 'over_limit' ? 1 : 0;
      acc.ok += item.status === 'ok' ? 1 : 0;
      return acc;
    }, { totalAmountDue: 0, blocked: 0, overLimit: 0, ok: 0 });

    const recentTransactions = await Transaction.find({
      entityType: 'vendor',
      entity: { $in: vendorIds },
      type: { $in: ['settlement', 'withdrawal', 'earnings_credit'] },
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        totalVendors: vendorIds.length,
        settlementSummary,
        settlements,
        recentTransactions,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
