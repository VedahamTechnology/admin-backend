const Plan = require('../models/Plan');

exports.getPlans = async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ price: 1 }).lean();

    return res.status(200).json({
      success: true,
      data: plans,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.createPlan = async (req, res) => {
  try {
    const { name, description, price, durationMonths, benefits, isActive } = req.body;

    if (!name || price === undefined || !durationMonths) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, price, and durationMonths',
      });
    }

    const plan = await Plan.create({
      name,
      description,
      price: Number(price),
      durationMonths: Number(durationMonths),
      benefits: Array.isArray(benefits) ? benefits : (benefits ? [].concat(benefits) : []),
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    return res.status(201).json({
      success: true,
      message: 'Plan created successfully',
      data: plan,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
