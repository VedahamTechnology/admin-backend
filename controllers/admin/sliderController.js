const Slider = require('../../models/Slider');

/**
 * Get all slider images (Admin view)
 * @route GET /api/admin/sliders
 */
exports.getAllSliders = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, isActive } = req.query;

    let filter = {};
    if (isActive !== undefined && isActive !== 'all') {
      filter.isActive = isActive === 'true';
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const sliders = await Slider.find(filter)
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Slider.countDocuments(filter);

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      sliders,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Create a new slider offer
 * @route POST /api/admin/sliders
 */
exports.createSlider = async (req, res) => {
  try {
    const {
      title,
      description,
      image,
      startDate,
      endDate,
      redirectUrl,
      priority,
      isActive,
    } = req.body;

    const slider = await Slider.create({
      title,
      description,
      image,
      startDate,
      endDate,
      redirectUrl,
      priority: priority || 0,
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json({
      success: true,
      message: 'Slider created successfully',
      slider,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get slider by ID
 * @route GET /api/admin/sliders/:id
 */
exports.getSliderById = async (req, res) => {
  try {
    const slider = await Slider.findById(req.params.id);

    if (!slider) {
      return res.status(404).json({ success: false, message: 'Slider not found' });
    }

    res.status(200).json({ success: true, slider });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update slider
 * @route PUT /api/admin/sliders/:id
 */
exports.updateSlider = async (req, res) => {
  try {
    const {
      title,
      description,
      image,
      startDate,
      endDate,
      redirectUrl,
      priority,
      isActive,
    } = req.body;

    let slider = await Slider.findById(req.params.id);

    if (!slider) {
      return res.status(404).json({ success: false, message: 'Slider not found' });
    }

    // Update fields
    if (title) slider.title = title;
    if (description) slider.description = description;
    if (image) slider.image = image;
    if (startDate) slider.startDate = startDate;
    if (endDate) slider.endDate = endDate;
    if (redirectUrl !== undefined) slider.redirectUrl = redirectUrl;
    if (priority !== undefined) slider.priority = priority;
    if (isActive !== undefined) slider.isActive = isActive;

    await slider.save();

    res.status(200).json({
      success: true,
      message: 'Slider updated successfully',
      slider,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete slider
 * @route DELETE /api/admin/sliders/:id
 */
exports.deleteSlider = async (req, res) => {
  try {
    const slider = await Slider.findById(req.params.id);

    if (!slider) {
      return res.status(404).json({ success: false, message: 'Slider not found' });
    }

    await Slider.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Slider deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
