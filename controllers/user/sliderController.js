const Slider = require('../../models/Slider');

/**
 * Get all active slider offers for users
 * @route GET /api/user/sliders
 */
exports.getActiveSliders = async (req, res) => {
  try {
    const today = new Date();

    // Find sliders that are active and within the date range
    const sliders = await Slider.find({
      isActive: true,
      startDate: { $lte: today },
      endDate: { $gte: today }
    }).sort({ priority: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: sliders.length,
      data: sliders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching slider offers',
      error: error.message
    });
  }
};
