const User = require('../../models/User');
const Category = require('../../models/Category');
const Service = require('../../models/Service');

/**
 * Get vendor profile
 */
exports.getProfile = async (req, res) => {
  try {
    const vendor = await User.findById(req.user._id)
      .select('-password -refreshToken')
      .populate('vendor.serviceCategories', 'name');

    if (!vendor || vendor.role !== 'vendor') {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    res.status(200).json({
      success: true,
      vendor,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update vendor profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      gender,
      businessName,
      ownerName,
      experience,
      skills,
      address,
      city,
      pincode,
    } = req.body;

    const vendor = await User.findById(req.user._id);

    if (!vendor || vendor.role !== 'vendor') {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    // Update basic info
    if (firstName) vendor.firstName = firstName;
    if (lastName) vendor.lastName = lastName;
    if (phone) vendor.phone = phone;
    if (gender) vendor.gender = gender;

    // Update location
    if (address || city || pincode) {
      vendor.location.address = address || vendor.location.address;
      vendor.location.city = city || vendor.location.city;
      vendor.location.pincode = pincode || vendor.location.pincode;
    }

    // Update vendor-specific info
    if (businessName) vendor.vendor.businessName = businessName;
    if (ownerName) vendor.vendor.ownerName = ownerName;
    if (experience) vendor.vendor.experience = experience;
    if (skills) vendor.vendor.skills = skills;

    await vendor.save();

    // Populate categories before sending response
    await vendor.populate('vendor.serviceCategories', 'name');

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      vendor: {
        id: vendor._id,
        userId: vendor.userId,
        firstName: vendor.firstName,
        lastName: vendor.lastName,
        email: vendor.email,
        phone: vendor.phone,
        businessName: vendor.vendor.businessName,
        ownerName: vendor.vendor.ownerName,
        experience: vendor.vendor.experience,
        location: vendor.location,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get available services for vendor to select
 * Vendors can browse all active services by category
 */
exports.getAvailableServices = async (req, res) => {
  try {
    const { categoryId, page = 1, limit = 10, search } = req.query;

    let filter = { isActive: true };
    
    if (categoryId) {
      filter.category = categoryId;
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
      .select('-vendors')
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
 * Get all available categories
 * Vendors can browse categories to find services
 */
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ displayOrder: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Select/Add a service with vendor-specific pricing
 * Vendors select from available services and set their own price
 */
exports.selectService = async (req, res) => {
  try {
    const { serviceId, vendorPrice } = req.body;
    const vendorId = req.user._id;

    // Validate required fields
    if (!serviceId || vendorPrice === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide serviceId and vendorPrice',
      });
    }

    // Validate vendor is approved
    if (req.user.vendor.verificationStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        message: `Your vendor account is currently '${req.user.vendor.verificationStatus}'. You must be approved to select services.`,
      });
    }

    // Check if service exists and is active
    const service = await Service.findOne({ _id: serviceId, isActive: true });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found or is inactive',
      });
    }

    // Check if vendor already has this service
    const vendorServiceExists = service.vendors.some(v => v.vendorId.toString() === vendorId.toString());

    if (vendorServiceExists) {
      return res.status(400).json({
        success: false,
        message: 'You have already selected this service',
      });
    }

    // Add vendor to service with their custom pricing
    service.vendors.push({
      vendorId,
      vendorPrice,
    });

    await service.save();
    await service.populate('vendors.vendorId', 'firstName lastName businessName');

    res.status(200).json({
      success: true,
      message: 'Service selected successfully',
      service: {
        _id: service._id,
        name: service.name,
        category: service.category,
        basePrice: service.basePrice,
        vendorPrice,
        estimatedDuration: service.estimatedDuration,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get vendor's selected services with their custom pricing
 */
exports.getMySelectedServices = async (req, res) => {
  try {
    const { page = 1, limit = 10, categoryId } = req.query;
    const vendorId = req.user._id;

    let filter = {
      'vendors.vendorId': vendorId,
    };

    if (categoryId) {
      filter.category = categoryId;
    }

    const skip = (page - 1) * limit;

    const services = await Service.find(filter)
      .populate('category', 'name')
      .populate('brand', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Transform response to show vendor-specific pricing
    const vendorServices = services.map(service => {
      const vendorData = service.vendors.find(v => v.vendorId.toString() === vendorId.toString());
      return {
        _id: service._id,
        name: service.name,
        slug: service.slug,
        description: service.description,
        category: service.category,
        brand: service.brand,
        basePrice: service.basePrice,
        discountedPrice: service.discountedPrice,
        vendorPrice: vendorData?.vendorPrice,
        isAvailable: vendorData?.isAvailable,
        estimatedDuration: service.estimatedDuration,
        features: service.features,
        includes: service.includes,
        excludes: service.excludes,
        image: service.image,
        images: service.images,
        ratings: service.ratings,
        createdAt: service.createdAt,
      };
    });

    const total = await Service.countDocuments(filter);

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      services: vendorServices,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update vendor's service pricing and availability
 */
exports.updateMyServicePricing = async (req, res) => {
  try {
    const { serviceId, vendorPrice, isAvailable } = req.body;
    const vendorId = req.user._id;

    if (!serviceId) {
      return res.status(400).json({
        success: false,
        message: 'Service ID is required',
      });
    }

    const service = await Service.findById(serviceId);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    // Find vendor in service
    const vendorIndex = service.vendors.findIndex(v => v.vendorId.toString() === vendorId.toString());

    if (vendorIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'You have not selected this service',
      });
    }

    // Update vendor's pricing/availability
    if (vendorPrice !== undefined) {
      service.vendors[vendorIndex].vendorPrice = vendorPrice;
    }
    if (isAvailable !== undefined) {
      service.vendors[vendorIndex].isAvailable = isAvailable;
    }

    await service.save();

    res.status(200).json({
      success: true,
      message: 'Service pricing updated successfully',
      service: {
        _id: service._id,
        name: service.name,
        basePrice: service.basePrice,
        vendorPrice: service.vendors[vendorIndex].vendorPrice,
        isAvailable: service.vendors[vendorIndex].isAvailable,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Unselect/Remove a service
 */
exports.removeMyService = async (req, res) => {
  try {
    const { serviceId } = req.body;
    const vendorId = req.user._id;

    if (!serviceId) {
      return res.status(400).json({
        success: false,
        message: 'Service ID is required',
      });
    }

    const service = await Service.findByIdAndUpdate(
      serviceId,
      { $pull: { vendors: { vendorId } } },
      { new: true }
    ).populate('category', 'name');

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Service removed successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update availability status
 */
exports.updateAvailability = async (req, res) => {
  try {
    const { isAvailable } = req.body;

    if (isAvailable === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide availability status',
      });
    }

    const vendor = await User.findById(req.user._id);

    if (!vendor || vendor.role !== 'vendor') {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    vendor.vendor.isAvailable = isAvailable;
    await vendor.save();

    res.status(200).json({
      success: true,
      message: 'Availability updated successfully',
      isAvailable: vendor.vendor.isAvailable,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update current location (for geo-location based search)
 */
exports.updateCurrentLocation = async (req, res) => {
  try {
    const { longitude, latitude } = req.body;

    if (longitude === undefined || latitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide longitude and latitude',
      });
    }

    const vendor = await User.findById(req.user._id);

    if (!vendor || vendor.role !== 'vendor') {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    vendor.vendor.currentLocation = {
      type: 'Point',
      coordinates: [longitude, latitude],
    };

    await vendor.save();

    res.status(200).json({
      success: true,
      message: 'Current location updated successfully',
      location: vendor.vendor.currentLocation,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get vendor statistics
 */
exports.getStats = async (req, res) => {
  try {
    const Service = require('../../models/Service');
    const Booking = require('../../models/Booking');

    const totalServices = await Service.countDocuments({
      'vendors.vendorId': req.user._id,
      isActive: true,
    });

    const totalBookings = await Booking.countDocuments({
      vendor: req.user._id,
    });

    const completedBookings = await Booking.countDocuments({
      vendor: req.user._id,
      status: 'completed',
    });

    const pendingBookings = await Booking.countDocuments({
      vendor: req.user._id,
      status: 'pending',
    });

    const acceptedBookings = await Booking.countDocuments({
      vendor: req.user._id,
      status: 'accepted',
    });

    const totalEarnings = await Booking.aggregate([
      { $match: { vendor: require('mongoose').Types.ObjectId(req.user._id), status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$pricing.totalAmount' } } },
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalServices,
        totalBookings,
        completedBookings,
        pendingBookings,
        acceptedBookings,
        totalEarnings: totalEarnings[0]?.total || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Add service categories to vendor profile
 * This is for profile management, separate from service selection
 */
exports.addServiceCategories = async (req, res) => {
  try {
    const { categoryIds } = req.body;
    const vendorId = req.user._id;

    if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide categoryIds array',
      });
    }

    // Validate all categories exist
    const categories = await Category.find({ _id: { $in: categoryIds }, isActive: true });

    if (categories.length !== categoryIds.length) {
      return res.status(404).json({
        success: false,
        message: 'One or more categories not found or inactive',
      });
    }

    // Update vendor profile
    const vendor = await User.findByIdAndUpdate(
      vendorId,
      { 'vendor.serviceCategories': categoryIds },
      { new: true }
    ).populate('vendor.serviceCategories', 'name');

    res.status(200).json({
      success: true,
      message: 'Service categories added successfully',
      categories: vendor.vendor.serviceCategories,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
