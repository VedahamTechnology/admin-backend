const Service = require('../../models/Service');
const Category = require('../../models/Category');
const Brand = require('../../models/Brand');

/**
 * Create a new service (Admin creates base service)
 * Vendors will select from these and set their own prices
 */
exports.createService = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      brand,
      basePrice,
      discountedPrice,
      estimatedDuration,
      image,
      images,
      features,
      includes,
      excludes,
      displayOrder,
    } = req.body;

    // Validate required fields
    if (!name || !category || !basePrice || !estimatedDuration) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, category, basePrice, estimatedDuration',
      });
    }

    // Validate category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    // Validate brand if provided
    if (brand) {
      const brandExists = await Brand.findById(brand);
      if (!brandExists) {
        return res.status(404).json({
          success: false,
          message: 'Brand not found',
        });
      }
    }

    // Check if service already exists
    const existingService = await Service.findOne({ name: { $regex: `^${name}$`, $options: 'i' } });
    if (existingService) {
      return res.status(400).json({
        success: false,
        message: 'Service with this name already exists',
      });
    }

    const service = await Service.create({
      name,
      description,
      category,
      brand,
      basePrice,
      discountedPrice: discountedPrice || basePrice,
      estimatedDuration,
      image,
      images: images || [],
      features: features || [],
      includes: includes || [],
      excludes: excludes || [],
      displayOrder: displayOrder || 0,
      vendors: [], // No vendors initially, vendors will select this service
    });

    await service.populate('category', 'name');
    if (brand) {
      await service.populate('brand', 'name');
    }

    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      service,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get all services (Admin view)
 */
exports.getAllServices = async (req, res) => {
  try {
    const { category, isActive = 'true', page = 1, limit = 10, search } = req.query;

    let filter = {};
    if (isActive !== 'all') {
      filter.isActive = isActive === 'true';
    }
    if (category) {
      filter.category = category;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const services = await Service.find(filter)
      .populate('category', 'name')
      .populate('brand', 'name')
      .populate('vendors.vendorId', 'firstName lastName businessName')
      .sort({ displayOrder: 1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Service.countDocuments(filter);

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      services,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get service by ID
 */
exports.getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate('category', 'name')
      .populate('brand', 'name')
      .populate('vendors.vendorId', 'firstName lastName businessName email');

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    res.status(200).json({ success: true, service });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update service (Admin only)
 */
exports.updateService = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      brand,
      basePrice,
      discountedPrice,
      estimatedDuration,
      image,
      images,
      features,
      includes,
      excludes,
      isActive,
      displayOrder,
    } = req.body;

    let service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    // Validate category if being updated
    if (category && category !== service.category.toString()) {
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(404).json({
          success: false,
          message: 'Category not found',
        });
      }
    }

    // Validate brand if being updated
    if (brand && brand !== service.brand?.toString()) {
      const brandExists = await Brand.findById(brand);
      if (!brandExists) {
        return res.status(404).json({
          success: false,
          message: 'Brand not found',
        });
      }
    }

    // Update fields
    if (name) service.name = name;
    if (description !== undefined) service.description = description;
    if (category) service.category = category;
    if (brand !== undefined) service.brand = brand || null;
    if (basePrice) service.basePrice = basePrice;
    if (discountedPrice !== undefined) service.discountedPrice = discountedPrice;
    if (estimatedDuration) service.estimatedDuration = estimatedDuration;
    if (image !== undefined) service.image = image;
    if (images) service.images = images;
    if (features) service.features = features;
    if (includes) service.includes = includes;
    if (excludes) service.excludes = excludes;
    if (isActive !== undefined) service.isActive = isActive;
    if (displayOrder !== undefined) service.displayOrder = displayOrder;

    await service.save();

    await service.populate('category', 'name');
    if (service.brand) {
      await service.populate('brand', 'name');
    }
    await service.populate('vendors.vendorId', 'firstName lastName businessName');

    res.status(200).json({
      success: true,
      message: 'Service updated successfully',
      service,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete service (Admin only)
 */
exports.deleteService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    // Check if service has active vendor associations
    if (service.vendors && service.vendors.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete service. It has ${service.vendors.length} vendor(s) offering it. Remove vendors first.`,
      });
    }

    await Service.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Service deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Remove vendor from service
 */
exports.removeVendorFromService = async (req, res) => {
  try {
    const { vendorId } = req.body;
    const serviceId = req.params.id;

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: 'Vendor ID is required',
      });
    }

    const service = await Service.findByIdAndUpdate(
      serviceId,
      { $pull: { vendors: { vendorId } } },
      { new: true }
    ).populate('vendors.vendorId', 'firstName lastName businessName');

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Vendor removed from service successfully',
      service,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get services by category
 */
exports.getServicesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { isActive = 'true', page = 1, limit = 10 } = req.query;

    let filter = { category: categoryId };
    if (isActive !== 'all') {
      filter.isActive = isActive === 'true';
    }

    const skip = (page - 1) * limit;

    const services = await Service.find(filter)
      .populate('category', 'name')
      .populate('brand', 'name')
      .populate('vendors.vendorId', 'firstName lastName businessName')
      .sort({ displayOrder: 1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Service.countDocuments(filter);

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      services,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Bulk update service status
 */
exports.bulkUpdateServiceStatus = async (req, res) => {
  try {
    const { serviceIds, isActive } = req.body;

    if (!serviceIds || !Array.isArray(serviceIds) || serviceIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide serviceIds array',
      });
    }

    if (isActive === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide isActive boolean value',
      });
    }

    const result = await Service.updateMany(
      { _id: { $in: serviceIds } },
      { isActive }
    );

    res.status(200).json({
      success: true,
      message: 'Services updated successfully',
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
