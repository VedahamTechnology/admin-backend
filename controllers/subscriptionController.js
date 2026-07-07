const Plan = require('../models/Plan');
const Subscription = require('../models/Subscription');

exports.createSubscription = async (req, res) => {
  try {
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({ success: false, message: 'Please provide planId' });
    }

    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + Number(plan.durationMonths));

    const subscription = await Subscription.create({
      user: req.user._id,
      plan: plan._id,
      startDate,
      endDate,
      status: 'active',
    });

    return res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      data: subscription,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getUserSubscriptions = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view these subscriptions',
      });
    }

    const subscriptions = await Subscription.find({ user: id })
      .populate('plan')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: subscriptions,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
