const Settlement = require('../../models/Settlement');
const Transaction = require('../../models/Transaction');
const Withdrawal = require('../../models/Withdrawal');
const User = require('../../models/User');

async function recalculateSettlement(vendorId) {
  const summary = await Transaction.aggregate([
    {
      $match: {
        entityType: 'vendor',
        entity: vendorId,
        status: 'completed',
      },
    },
    {
      $group: {
        _id: '$entity',
        amountDue: { $sum: '$amount' },
      },
    },
  ]);

  const settlement = await Settlement.findOneAndUpdate(
    { vendor: vendorId },
    {
      $setOnInsert: { vendor: vendorId },
      $set: {
        amountDue: summary[0]?.amountDue || 0,
      },
    },
    { new: true, upsert: true }
  );

  if (settlement.status !== 'blocked') {
    settlement.status = settlement.cashLimit > 0 && settlement.amountDue >= settlement.cashLimit
      ? 'over_limit'
      : 'ok';
  }

  await settlement.save();
  return settlement;
}

exports.getVendorSettlements = async (req, res) => {
  try {
    const vendors = await User.find({ role: 'vendor' })
      .select('firstName lastName email phone businessName vendor isActive isBanned')
      .lean();

    const data = [];
    for (const vendor of vendors) {
      const settlement = await recalculateSettlement(vendor._id);
      data.push({
        vendor,
        settlement,
        utilization: settlement.cashLimit > 0
          ? Number(((settlement.amountDue / settlement.cashLimit) * 100).toFixed(2))
          : null,
      });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPendingSettlements = async (req, res) => {
  try {
    const settlements = await Settlement.find({
      status: { $in: ['over_limit', 'blocked'] },
    })
      .populate('vendor', 'firstName lastName email phone businessName isActive isBanned')
      .sort({ amountDue: -1 })
      .lean();

    return res.status(200).json({ success: true, data: settlements });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.settleVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { amount, notes } = req.body;

    const settlement = await recalculateSettlement(vendorId);
    const settledAmount = Math.min(Number(amount || settlement.amountDue), settlement.amountDue);

    if (settledAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Nothing to settle' });
    }

    await Transaction.create({
      entityType: 'vendor',
      entity: vendorId,
      type: 'settlement',
      amount: -Math.abs(settledAmount),
      status: 'completed',
      refId: settlement._id.toString(),
      metadata: { notes: notes || 'Manual settlement' },
    });

    settlement.amountDue -= settledAmount;
    settlement.lastSettledAt = new Date();
    settlement.status = settlement.cashLimit > 0 && settlement.amountDue >= settlement.cashLimit
      ? 'over_limit'
      : 'ok';
    settlement.notes = notes || settlement.notes;
    await settlement.save();

    return res.status(200).json({
      success: true,
      message: 'Settlement recorded successfully',
      data: settlement,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.blockVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { notes } = req.body;

    const settlement = await recalculateSettlement(vendorId);
    settlement.status = 'blocked';
    settlement.blockedAt = new Date();
    settlement.notes = notes || settlement.notes;
    await settlement.save();

    await User.findByIdAndUpdate(vendorId, {
      isActive: false,
      isBanned: true,
    });

    return res.status(200).json({
      success: true,
      message: 'Vendor blocked successfully',
      data: settlement,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.unblockVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const settlement = await recalculateSettlement(vendorId);
    settlement.status = settlement.cashLimit > 0 && settlement.amountDue >= settlement.cashLimit
      ? 'over_limit'
      : 'ok';
    settlement.blockedAt = undefined;
    await settlement.save();

    await User.findByIdAndUpdate(vendorId, {
      isActive: true,
      isBanned: false,
    });

    return res.status(200).json({
      success: true,
      message: 'Vendor unblocked successfully',
      data: settlement,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSettlementHistory = async (req, res) => {
  try {
    const settlements = await Settlement.find()
      .populate('vendor', 'firstName lastName email phone businessName')
      .sort({ updatedAt: -1 })
      .lean();

    const transactions = await Transaction.find({
      type: { $in: ['cash_collected', 'earnings_credit', 'settlement', 'withdrawal', 'refund'] },
    })
      .populate('entity', 'firstName lastName email phone businessName')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        settlements,
        transactions,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getWithdrawals = async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find()
      .populate('entity', 'firstName lastName email phone businessName role')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ success: true, data: withdrawals });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.approveWithdrawal = async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id);
    if (!withdrawal) {
      return res.status(404).json({ success: false, message: 'Withdrawal not found' });
    }

    withdrawal.status = 'approved';
    withdrawal.processedAt = new Date();
    await withdrawal.save();

    await Transaction.create({
      entityType: withdrawal.entityType,
      entity: withdrawal.entity,
      type: 'withdrawal',
      amount: -Math.abs(withdrawal.amount),
      status: 'completed',
      refId: withdrawal._id.toString(),
    });

    if (withdrawal.entityType === 'vendor') {
      await recalculateSettlement(withdrawal.entity);
    }

    return res.status(200).json({
      success: true,
      message: 'Withdrawal approved',
      data: withdrawal,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.rejectWithdrawal = async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id);
    if (!withdrawal) {
      return res.status(404).json({ success: false, message: 'Withdrawal not found' });
    }

    withdrawal.status = 'rejected';
    withdrawal.processedAt = new Date();
    withdrawal.reason = req.body.reason || withdrawal.reason;
    await withdrawal.save();

    return res.status(200).json({
      success: true,
      message: 'Withdrawal rejected',
      data: withdrawal,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports._recalculateSettlement = recalculateSettlement;
