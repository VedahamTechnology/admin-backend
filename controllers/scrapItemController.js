const ScrapItem = require('../models/ScrapItem');

exports.createScrapItem = async (req, res) => {
  try {
    const { applianceType, description, photos, pickupDate, notes } = req.body;

    if (!applianceType || !description) {
      return res.status(400).json({
        success: false,
        message: 'Please provide applianceType and description',
      });
    }

    const scrapItem = await ScrapItem.create({
      user: req.user._id,
      applianceType,
      description,
      photos: Array.isArray(photos) ? photos : (photos ? [photos] : []),
      pickupDate,
      notes,
    });

    return res.status(201).json({
      success: true,
      message: 'Scrap item created successfully',
      data: scrapItem,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllScrapItems = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 20, 1);
    const skip = (pageNum - 1) * limitNum;

    const items = await ScrapItem.find(filter)
      .populate('user', 'firstName lastName email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await ScrapItem.countDocuments(filter);

    return res.status(200).json({
      success: true,
      data: items,
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

exports.updateScrapItemStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, pickupDate, notes } = req.body;

    const scrapItem = await ScrapItem.findById(id);
    if (!scrapItem) {
      return res.status(404).json({ success: false, message: 'Scrap item not found' });
    }

    if (status) scrapItem.status = status;
    if (pickupDate !== undefined) scrapItem.pickupDate = pickupDate;
    if (notes !== undefined) scrapItem.notes = notes;

    await scrapItem.save();

    return res.status(200).json({
      success: true,
      message: 'Scrap item updated successfully',
      data: scrapItem,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
