const { Parser } = require('json2csv');
const Booking = require('../../models/Booking');
const Payment = require('../../models/Payment');
const Transaction = require('../../models/Transaction');

function buildDateFilter(query) {
  const filter = {};

  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) {
      filter.createdAt.$gte = new Date(query.from);
    }
    if (query.to) {
      filter.createdAt.$lte = new Date(query.to);
    }
  }

  return filter;
}

exports.getPaymentOverview = async (req, res) => {
  try {
    const paymentSummary = await Payment.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: {
              $cond: [{ $eq: ['$status', 'success'] }, '$amount', 0],
            },
          },
          totalRefunds: {
            $sum: {
              $cond: [{ $eq: ['$status', 'refunded'] }, '$refund.refundAmount', 0],
            },
          },
          successCount: {
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] },
          },
          failedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
          },
          refundedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, 1, 0] },
          },
        },
      },
    ]);

    const transactionSummary = await Transaction.aggregate([
      {
        $group: {
          _id: '$type',
          amount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const breakdown = transactionSummary.reduce((acc, item) => {
      acc[item._id] = {
        amount: item.amount,
        count: item.count,
      };
      return acc;
    }, {});

    const totals = paymentSummary[0] || {};
    const netRevenue = (totals.totalRevenue || 0) - (totals.totalRefunds || 0);

    return res.status(200).json({
      success: true,
      data: {
        totalRevenue: totals.totalRevenue || 0,
        totalRefunds: totals.totalRefunds || 0,
        netRevenue,
        successCount: totals.successCount || 0,
        failedCount: totals.failedCount || 0,
        refundedCount: totals.refundedCount || 0,
        transactions: breakdown,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const {
      type,
      status,
      entityType,
      bookingId,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {
      ...buildDateFilter(req.query),
    };

    if (type) filter.type = type;
    if (status) filter.status = status;
    if (entityType) filter.entityType = entityType;
    if (bookingId) filter.booking = bookingId;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 20, 1);
    const skip = (pageNum - 1) * limitNum;

    const transactions = await Transaction.find(filter)
      .populate('booking', 'status bookingDate totalAmount pricing payment')
      .populate('entity', 'firstName lastName email phone role vendor worker')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Transaction.countDocuments(filter);

    return res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPaymentReports = async (req, res) => {
  try {
    const filter = buildDateFilter(req.query);

    const payments = await Payment.find(filter)
      .populate('booking', 'bookingDate status pricing')
      .populate('customer', 'firstName lastName email phone')
      .populate('vendor', 'firstName lastName email phone businessName')
      .sort({ createdAt: -1 })
      .lean();

    const summary = payments.reduce(
      (acc, payment) => {
        if (payment.status === 'success') {
          acc.totalRevenue += payment.amount || 0;
          acc.successCount += 1;
        }
        if (payment.status === 'refunded') {
          acc.totalRefunds += payment.refund?.refundAmount || 0;
          acc.refundedCount += 1;
        }
        if (payment.status === 'failed') {
          acc.failedCount += 1;
        }
        return acc;
      },
      { totalRevenue: 0, totalRefunds: 0, successCount: 0, failedCount: 0, refundedCount: 0 }
    );

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          ...summary,
          netRevenue: summary.totalRevenue - summary.totalRefunds,
        },
        payments,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.exportPayments = async (req, res) => {
  try {
    const filter = buildDateFilter(req.query);
    const payments = await Payment.find(filter)
      .populate('booking', 'bookingDate status')
      .populate('customer', 'firstName lastName email phone')
      .populate('vendor', 'firstName lastName email phone businessName')
      .sort({ createdAt: -1 })
      .lean();

    const rows = payments.map((payment) => ({
      id: payment._id.toString(),
      bookingId: payment.booking?._id?.toString() || '',
      customer: payment.customer ? `${payment.customer.firstName || ''} ${payment.customer.lastName || ''}`.trim() : '',
      vendor: payment.vendor?.businessName || `${payment.vendor?.firstName || ''} ${payment.vendor?.lastName || ''}`.trim(),
      amount: payment.amount,
      status: payment.status,
      method: payment.method || '',
      gateway: payment.gateway || '',
      paidAt: payment.paidAt || '',
      createdAt: payment.createdAt,
    }));

    const parser = new Parser();
    const csv = parser.parse(rows);

    res.header('Content-Type', 'text/csv');
    res.attachment('payments-export.csv');
    return res.send(csv);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.refundPayment = async (req, res) => {
  try {
    const { paymentId, bookingId, reason, amount } = req.body;

    let payment = null;
    if (paymentId) {
      payment = await Payment.findById(paymentId);
    } else if (bookingId) {
      payment = await Payment.findOne({ booking: bookingId }).sort({ createdAt: -1 });
    }

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    if (payment.status === 'refunded') {
      return res.status(400).json({ success: false, message: 'Payment is already refunded' });
    }

    const refundAmount = Number(amount || payment.amount || 0);
    payment.status = 'refunded';
    payment.refund = {
      isRefunded: true,
      refundAmount,
      reason: reason || 'Admin initiated refund',
      refundedAt: new Date(),
    };
    await payment.save();

    await Transaction.create({
      booking: payment.booking,
      entityType: payment.vendor ? 'vendor' : 'user',
      entity: payment.vendor || payment.customer,
      type: 'refund',
      amount: -Math.abs(refundAmount),
      status: 'completed',
      refId: payment._id.toString(),
      metadata: { reason: reason || 'Admin initiated refund' },
    });

    if (payment.booking) {
      const booking = await Booking.findById(payment.booking);
      if (booking) {
        booking.payment.status = 'refunded';
        await booking.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Payment refunded successfully',
      data: payment,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
