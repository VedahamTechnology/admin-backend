const Service = require('../../models/Service');
const Category = require('../../models/Category');
const Brand = require('../../models/Brand');
const NotificationService = require('../../utils/notificationService');
const Booking = require('../../models/Booking');

/**
 * Get pending services awaiting approval
 */
exports.getPendingServices = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;

    let filter = { approvalStatus: 'pending' };
    
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
      .populate('createdByVendor', 'firstName lastName businessName email phone')
      .populate('vendor', 'firstName lastName businessName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Service.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: 'Pending services retrieved successfully',
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
 * Approve a service
 * Once approved, the service becomes visible to customers
 */
exports.approveService = async (req, res) => {
  try {
    const { serviceId } = req.params;

    let service = await Service.findById(serviceId);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    if (service.approvalStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Service is not pending approval',
      });
    }

    // Update approval status
    service.isApproved = true;
    service.approvalStatus = 'approved';
    service.approvedBy = req.user._id;
    service.approvalDate = new Date();
    
    await service.save();

    await service.populate('category', 'name');
    await service.populate('createdByVendor', 'firstName lastName email');
    if (service.brand) {
      await service.populate('brand', 'name');
    }

    // Notify vendor about approval
    if (service.createdByVendor) {
      try {
        await NotificationService.notifyServiceApproved(
          service._id,
          service.name,
          service.createdByVendor._id
        );
      } catch (notificationError) {
        console.error('Error sending approval notification:', notificationError);
        // Don't fail the request if notification fails
      }
    }

    res.status(200).json({
      success: true,
      message: 'Service approved successfully and is now visible to customers',
      service,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Reject a service
 * Service will not be visible to customers until approved
 */
exports.rejectService = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason || rejectionReason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required',
      });
    }

    let service = await Service.findById(serviceId);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    if (service.approvalStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Service is not pending approval',
      });
    }

    // Update rejection status
    service.isApproved = false;
    service.approvalStatus = 'rejected';
    service.rejectionReason = rejectionReason;
    
    await service.save();

    await service.populate('category', 'name');
    await service.populate('createdByVendor', 'firstName lastName email');
    if (service.brand) {
      await service.populate('brand', 'name');
    }

    // Notify vendor about rejection
    if (service.createdByVendor) {
      try {
        await NotificationService.notifyServiceRejected(
          service._id,
          service.name,
          service.createdByVendor._id,
          rejectionReason
        );
      } catch (notificationError) {
        console.error('Error sending rejection notification:', notificationError);
        // Don't fail the request if notification fails
      }
    }

    res.status(200).json({
      success: true,
      message: 'Service rejected successfully. Vendor has been notified.',
      service,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

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
      city_id,
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
    if (!name || !category || !basePrice || !estimatedDuration || !city_id) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, category, city_id, basePrice, estimatedDuration',
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
    const existingService = await Service.findOne({
      name: { $regex: `^${name}$`, $options: 'i' },
      city: city_id,
    });
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
      city: city_id,
      vendor: req.user._id, // Assign to admin or require a vendorId in body
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
    const { category, city_id, isActive = 'true', page = 1, limit = 10, search, approvalStatus } = req.query;

    let filter = {};
    if (isActive !== 'all') {
      filter.isActive = isActive === 'true';
    }
    if (category) {
      filter.category = category;
    }
    if (approvalStatus && approvalStatus !== 'all') {
      filter.approvalStatus = approvalStatus;
    }
    if (city_id) {
      filter.city = city_id;
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
      .populate('createdByVendor', 'firstName lastName businessName')
      .populate('vendor', 'firstName lastName businessName')
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
      .populate('vendor', 'firstName lastName businessName email');

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
      city_id,
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
    if (city_id !== undefined) service.city = city_id;
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
    await service.populate('vendor', 'firstName lastName businessName');

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
      .populate('vendor', 'firstName lastName businessName')
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

/**
 * Get top booked services
 */
exports.getTopBookedServices = async (req, res) => {
  try {
    const { limit = 5, period = 'month' } = req.query;

    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    const topServices = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: now },
          status: { $in: ['completed', 'confirmed', 'pending'] },
        },
      },
      {
        $group: {
          _id: '$service',
          bookingCount: { $sum: 1 },
          completedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          revenue: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$pricing.totalAmount', 0] },
          },
        },
      },
      { $sort: { bookingCount: -1 } },
      { $limit: Number(limit) },
      {
        $lookup: {
          from: 'services',
          localField: '_id',
          foreignField: '_id',
          as: 'serviceDetails',
        },
      },
      { $unwind: '$serviceDetails' },
      {
        $lookup: {
          from: 'categories',
          localField: 'serviceDetails.category',
          foreignField: '_id',
          as: 'categoryDetails',
        },
      },
      { $unwind: { path: '$categoryDetails', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          bookingCount: 1,
          completedCount: 1,
          revenue: 1,
          serviceName: '$serviceDetails.name',
          serviceImage: '$serviceDetails.image',
          basePrice: '$serviceDetails.basePrice',
          rating: '$serviceDetails.ratings.average',
          categoryName: '$categoryDetails.name',
          avgBookingValue: { $divide: ['$revenue', '$completedCount'] },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      period,
      total: topServices.length,
      data: topServices,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
