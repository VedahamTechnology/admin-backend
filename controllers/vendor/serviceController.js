const Service = require('../../models/Service');
const User = require('../../models/User');

/**
 * Create a new service
 * Only vendors can create services
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
    } = req.body;

    // Validate required fields
    if (!name || !category || !basePrice || !estimatedDuration) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, category, basePrice, estimatedDuration',
      });
    }

    // Vendor existence and approval is already verified by middleware
    // Create service
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
      vendors: [
        {
          vendorId: req.user._id,
          vendorPrice: basePrice,
          isAvailable: true,
        },
      ],
    });

    // Populate category information
    await service.populate('category', 'name');

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
 * Get all services created by the vendor
 */
exports.getMyServices = async (req, res) => {
  try {
    const { page = 1, limit = 10, isActive } = req.query;

    // Find services where this vendor is in the vendors array
    let filter = {
      'vendors.vendorId': req.user._id,
    };

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const skip = (page - 1) * limit;

    const services = await Service.find(filter)
      .populate('category', 'name')
      .populate('brand', 'name')
      .sort({ createdAt: -1 })
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
 * Get a specific service by ID
 */
exports.getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate('category')
      .populate('brand')
      .populate('vendors.vendorId', 'firstName lastName email phone businessName');

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    // Check if requesting vendor owns this service
    const vendorService = service.vendors.find(
      (v) => v.vendorId._id.toString() === req.user._id.toString()
    );

    if (!vendorService) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this service',
      });
    }

    res.status(200).json({
      success: true,
      service,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update service details
 */
exports.updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      basePrice,
      discountedPrice,
      estimatedDuration,
      image,
      images,
      features,
      includes,
      excludes,
      isActive,
    } = req.body;

    const service = await Service.findById(id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    // Check if vendor owns this service
    const vendorService = service.vendors.find(
      (v) => v.vendorId.toString() === req.user._id.toString()
    );

    if (!vendorService) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this service',
      });
    }

    // Update fields
    if (name) service.name = name;
    if (description) service.description = description;
    if (basePrice) service.basePrice = basePrice;
    if (discountedPrice) service.discountedPrice = discountedPrice;
    if (estimatedDuration) service.estimatedDuration = estimatedDuration;
    if (image) service.image = image;
    if (images) service.images = images;
    if (features) service.features = features;
    if (includes) service.includes = includes;
    if (excludes) service.excludes = excludes;
    if (isActive !== undefined) service.isActive = isActive;

    // Update vendor-specific price if needed
    if (basePrice) {
      const vendorIndex = service.vendors.findIndex(
        (v) => v.vendorId.toString() === req.user._id.toString()
      );
      if (vendorIndex !== -1) {
        service.vendors[vendorIndex].vendorPrice = basePrice;
      }
    }

    await service.save();
    await service.populate('category', 'name');
    await service.populate('brand', 'name');

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
 * Delete a service (soft delete via isActive flag)
 */
exports.deleteService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    // Check if vendor owns this service
    const vendorService = service.vendors.find(
      (v) => v.vendorId.toString() === req.user._id.toString()
    );

    if (!vendorService) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this service',
      });
    }

    // If multiple vendors have this service, just remove this vendor
    if (service.vendors.length > 1) {
      service.vendors = service.vendors.filter(
        (v) => v.vendorId.toString() !== req.user._id.toString()
      );
      await service.save();
    } else {
      // If this is the only vendor, soft delete the service
      service.isActive = false;
      await service.save();
    }

    res.status(200).json({
      success: true,
      message: 'Service deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update service availability
 */
exports.updateServiceAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { isAvailable } = req.body;

    if (isAvailable === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide isAvailable status',
      });
    }

    const service = await Service.findById(id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    // Check if vendor owns this service
    const vendorIndex = service.vendors.findIndex(
      (v) => v.vendorId.toString() === req.user._id.toString()
    );

    if (vendorIndex === -1) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this service',
      });
    }

    // Update availability for this vendor
    service.vendors[vendorIndex].isAvailable = isAvailable;
    await service.save();

    res.status(200).json({
      success: true,
      message: 'Service availability updated successfully',
      service: {
        id: service._id,
        name: service.name,
        isAvailable,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Search services by vendor
 */
exports.searchServices = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;

    if (!search) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a search term',
      });
    }

    const skip = (page - 1) * limit;

    const services = await Service.find({
      'vendors.vendorId': req.user._id,
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ],
    })
      .populate('category', 'name')
      .populate('brand', 'name')
      .skip(skip)
      .limit(Number(limit));

    const total = await Service.countDocuments({
      'vendors.vendorId': req.user._id,
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ],
    });

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
