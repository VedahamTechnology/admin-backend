const Category = require('../../models/Category');

/**
 * Create a new category
 * Admin only
 */
exports.createCategory = async (req, res) => {
  try {
    const { name, description, image, icon, displayOrder } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required',
      });
    }

    // Check if category already exists
    const existingCategory = await Category.findOne({ name: { $regex: `^${name}$`, $options: 'i' } });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category already exists',
      });
    }

    const category = await Category.create({
      name,
      description,
      image,
      icon,
      displayOrder: displayOrder || 0,
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get all categories
 * Admin & Vendor can view (vendors to select)
 */
exports.getAllCategories = async (req, res) => {
  try {
    const { isActive = 'true', page = 1, limit = 10 } = req.query;

    let filter = {};
    if (isActive !== 'all') {
      filter.isActive = isActive === 'true';
    }

    const skip = (page - 1) * limit;

    const categories = await Category.find(filter)
      .sort({ displayOrder: 1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Category.countDocuments(filter);

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      categories,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get category by ID
 */
exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.status(200).json({ success: true, category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update category
 * Admin only
 */
exports.updateCategory = async (req, res) => {
  try {
    const { name, description, image, icon, isActive, displayOrder } = req.body;

    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Check if new name already exists (if name is being changed)
    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({ 
        name: { $regex: `^${name}$`, $options: 'i' },
        _id: { $ne: req.params.id }
      });
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists',
        });
      }
    }

    // Update fields
    if (name) category.name = name;
    if (description !== undefined) category.description = description;
    if (image !== undefined) category.image = image;
    if (icon !== undefined) category.icon = icon;
    if (isActive !== undefined) category.isActive = isActive;
    if (displayOrder !== undefined) category.displayOrder = displayOrder;

    await category.save();

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      category,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete category
 * Admin only
 */
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Check if category has services
    const Service = require('../../models/Service');
    const serviceCount = await Service.countDocuments({ category: req.params.id });

    if (serviceCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. It has ${serviceCount} service(s) associated with it.`,
      });
    }

    await Category.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Bulk update category status
 */
exports.bulkUpdateCategoryStatus = async (req, res) => {
  try {
    const { categoryIds, isActive } = req.body;

    if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide categoryIds array',
      });
    }

    if (isActive === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide isActive boolean value',
      });
    }

    const result = await Category.updateMany(
      { _id: { $in: categoryIds } },
      { isActive }
    );

    res.status(200).json({
      success: true,
      message: 'Categories updated successfully',
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
