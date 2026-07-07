const Withdrawal = require('../models/Withdrawal');

exports.requestWithdrawal = async (req, res) => {
  try {
    const { amount, reason } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Please provide a valid withdrawal amount' });
    }

    const withdrawal = await Withdrawal.create({
      entityType: req.user.role,
      entity: req.user._id,
      amount: Number(amount),
      reason,
      status: 'pending',
    });

    return res.status(201).json({
      success: true,
      message: 'Withdrawal request created successfully',
      data: withdrawal,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
