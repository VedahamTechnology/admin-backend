const Service = require('../../models/Service');
const User = require('../../models/User');
const Category = require('../../models/Category');
const NotificationService = require('../../utils/notificationService');

/**
 * Create a new service
 * Only vendors can create services
 * Service will be in pending status and requires admin approval
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
      features,
      includes,
      excludes,
    } = req.body;

    // Validate required fields
    if (!name || !description || !category || !basePrice || !estimatedDuration) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: title (name), description, category, basePrice (price), and estimatedDuration',
      });
    }

    // Extract file URLs from Cloudinary upload
    const imageUrl = req.files && req.files['image'] ? req.files['image'][0].path : null;
    const imagesArray = req.files && req.files['images'] ? req.files['images'].map(file => file.path) : [];

    // Get vendor's current location to store with service
    const vendor = await User.findById(req.user._id);
    const serviceLocation = vendor.vendor?.currentLocation || vendor.location || { type: 'Point', coordinates: [0, 0] };

    // Create service object - handle empty optional ObjectIds
    const serviceData = {
      name,
      description,
      category,
      basePrice,
      discountedPrice: discountedPrice || basePrice,
      estimatedDuration,
      image: imageUrl,
      images: imagesArray,
      features: features || [],
      includes: includes || [],
      excludes: excludes || [],
      vendor: req.user._id,
      isApproved: false,
      approvalStatus: 'pending',
      createdByVendor: req.user._id,
      location: serviceLocation,
    };

    // Only add brand if it's a non-empty string
    if (brand && brand.trim() !== '') {
      serviceData.brand = brand;
    }

    const service = await Service.create(serviceData);

    // Populate category information
    await service.populate('category', 'name');

    // Notify admin about new service pending approval
    const adminUser = await User.findOne({ role: 'admin' });
    if (adminUser) {
      try {
        await NotificationService.notifyServicePendingApproval(
          service._id,
          service.name,
          req.user._id,
          adminUser._id
        );
      } catch (notificationError) {
        console.error('Error sending notification to admin:', notificationError);
        // Don't fail the request if notification fails
      }
    }

    res.status(201).json({
      success: true,
      message: 'Service created successfully and is pending admin approval',
      service,
      status: 'pending_approval'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get all services created by the vendor
 * Shows services with all approval statuses
 */
exports.getMyServices = async (req, res) => {
  try {
    const { page = 1, limit = 10, isActive, approvalStatus } = req.query;

    // Find services created by this vendor
    let filter = {
      createdByVendor: req.user._id,
    };

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    if (approvalStatus) {
      filter.approvalStatus = approvalStatus;
    }

    const skip = (page - 1) * limit;

    const services = await Service.find(filter)
      .populate('category', 'name')
      .populate('brand', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Service.countDocuments(filter);

    // Count services by approval status for summary
    const statusCounts = {
      pending: await Service.countDocuments({ createdByVendor: req.user._id, approvalStatus: 'pending' }),
      approved: await Service.countDocuments({ createdByVendor: req.user._id, approvalStatus: 'approved' }),
      rejected: await Service.countDocuments({ createdByVendor: req.user._id, approvalStatus: 'rejected' }),
    };

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
      statusCounts,
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
      .populate('vendor', 'firstName lastName email phone businessName');

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    // Check if requesting vendor owns this service
    if (service.vendor._id.toString() !== req.user._id.toString()) {
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
    if (service.vendor.toString() !== req.user._id.toString()) {
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
    if (service.vendor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this service',
      });
    }

    // Soft delete the service
    service.isActive = false;
    await service.save();

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
    if (service.vendor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this service',
      });
    }

    // Update availability
    service.isActive = isAvailable;
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
      vendor: req.user._id,
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
      vendor: req.user._id,
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

/**
 * Get all categories (for browsing)
 * Vendors can browse categories to view other services
 */
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .select('_id name slug image description totalServices avgRating')
      .sort({ displayOrder: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Categories retrieved successfully',
      data: categories,
    });
  } catch (error) {
    console.error('Get categories error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get services by category
 * Vendors can browse services in a category
 */
exports.getServicesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const {
      page = 1,
      limit = 10,
      sortBy = 'displayOrder',
      sortOrder = 'asc',
      minPrice,
      maxPrice,
      search,
    } = req.query;

    // Validate category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    // Build filter
    const filter = {
      category: categoryId,
      isActive: true,
    };

    // Price range filter
    if (minPrice || maxPrice) {
      filter.basePrice = {};
      if (minPrice) {
        filter.basePrice.$gte = parseFloat(minPrice);
      }
      if (maxPrice) {
        filter.basePrice.$lte = parseFloat(maxPrice);
      }
    }

    // Search filter
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build sort object
    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const services = await Service.find(filter)
      .populate('category', 'name slug')
      .populate('brand', 'name')
      .populate('vendor', 'firstName lastName businessName profileImage rating')
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Service.countDocuments(filter);

    return res.status(200).json({
      success: true,
      message: 'Services retrieved successfully',
      data: services,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get services by category error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching services',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};