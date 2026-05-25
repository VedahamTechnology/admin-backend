const Service = require('../../models/Service');
const Category = require('../../models/Category');

/**
 * Get all services with filtering by category and search
 * Query parameters:
 * - category: Filter by category ID
 * - search: Search by service name or description
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 * - sortBy: Sort field (name, basePrice, ratings.average) (default: createdAt)
 * - sortOrder: asc or desc (default: desc)
 * - minPrice: Minimum price filter
 * - maxPrice: Maximum price filter
 */
exports.getAllServices = async (req, res) => {
  try {
    const {
      category,
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      minPrice,
      maxPrice,
    } = req.query;

    // Build filter object
    const filter = { isActive: true };

    // Filter by category
    if (category) {
      filter.category = category;
    }

    // Filter by price range
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
        { slug: { $regex: search, $options: 'i' } },
      ];
    }

    // Calculate pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build sort object
    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Fetch services
    const services = await Service.find(filter)
      .populate('category', 'name slug')
      .populate('brand', 'name')
      .populate('vendors.vendorId', 'firstName lastName businessName profileImage rating')
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get total count for pagination
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
    console.error('Get all services error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching services',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get all categories for service browsing
 */
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .select('_id name slug image description')
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
 * URL parameter: categoryId
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

    // Filter by price range
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

    // Pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Fetch services
    const services = await Service.find(filter)
      .populate('category', 'name slug')
      .populate('brand', 'name')
      .populate('vendors.vendorId', 'firstName lastName businessName profileImage rating')
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get total count
    const total = await Service.countDocuments(filter);

    return res.status(200).json({
      success: true,
      message: 'Services retrieved successfully',
      data: {
        category,
        services,
      },
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

/**
 * Get service details
 * URL parameter: serviceId
 */
exports.getServiceDetails = async (req, res) => {
  try {
    const { serviceId } = req.params;

    const service = await Service.findById(serviceId)
      .populate('category', 'name slug')
      .populate('brand', 'name')
      .populate('vendors.vendorId', 'firstName lastName businessName profileImage rating email phone')
      .lean();

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    if (!service.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Service is not available',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Service details retrieved successfully',
      data: service,
    });
  } catch (error) {
    console.error('Get service details error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching service details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Search services
 * Query parameters:
 * - query: Search query string (searches in name, description, slug)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 */
exports.searchServices = async (req, res) => {
  try {
    const { query = '', page = 1, limit = 10 } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters',
      });
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const filter = {
      isActive: true,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { slug: { $regex: query, $options: 'i' } },
        { 'features': { $regex: query, $options: 'i' } },
      ],
    };

    const services = await Service.find(filter)
      .populate('category', 'name slug')
      .populate('brand', 'name')
      .populate('vendors.vendorId', 'firstName lastName businessName profileImage rating')
      .sort({ 'ratings.average': -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Service.countDocuments(filter);

    return res.status(200).json({
      success: true,
      message: 'Search results retrieved successfully',
      data: services,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Search services error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error searching services',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get top rated services
 */
exports.getTopRatedServices = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const limitNum = parseInt(limit, 10);

    const services = await Service.find({ isActive: true })
      .populate('category', 'name slug')
      .populate('brand', 'name')
      .populate('vendors.vendorId', 'firstName lastName businessName profileImage rating')
      .sort({ 'ratings.average': -1, 'ratings.count': -1 })
      .limit(limitNum)
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Top rated services retrieved successfully',
      data: services,
    });
  } catch (error) {
    console.error('Get top rated services error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching top rated services',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
