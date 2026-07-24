const Category = require('../models/Category');
const Brand = require('../models/Brand');
const Service = require('../models/Service');

function parseBool(value, defaultValue = true) {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;
  return String(value).toLowerCase() === 'true';
}

exports.getCategories = async (req, res) => {
  try {
    const { isActive = 'true', page = 1, limit = 50 } = req.query;
    const filter = {};
    if (isActive !== 'all') filter.isActive = isActive === 'true';

    const skip = (Number(page) - 1) * Number(limit);
    const categories = await Category.find(filter)
      .sort({ displayOrder: 1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Category.countDocuments(filter);

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      categories,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

async function listBrands(filter, page = 1, limit = 50) {
  const skip = (Number(page) - 1) * Number(limit);
  const brandIds = await Service.distinct('brand', filter);
  const brands = await Brand.find({
    _id: { $in: brandIds.filter(Boolean) },
    isActive: true,
  })
    .sort({ displayOrder: 1, createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .lean();

  const total = await Brand.countDocuments({
    _id: { $in: brandIds.filter(Boolean) },
    isActive: true,
  });

  return { brands, total, page: Number(page), limit: Number(limit) };
}

exports.getBrands = async (req, res) => {
  try {
    const { city_id, category_id, page = 1, limit = 50 } = req.query;

    if (!city_id) {
      return res.status(400).json({
        success: false,
        message: 'city_id is required',
      });
    }

    const serviceFilter = {
      isActive: true,
      approvalStatus: 'approved',
      city: { $regex: new RegExp(`^${city_id}$`, 'i') },
    };
    if (category_id) serviceFilter.category = category_id;

    const data = await listBrands(serviceFilter, page, limit);

    res.status(200).json({
      success: true,
      ...data,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBrandServices = async (req, res) => {
  try {
    const { id } = req.params;
    const { city_id, page = 1, limit = 50 } = req.query;

    if (!city_id) {
      return res.status(400).json({
        success: false,
        message: 'city_id is required',
      });
    }

    const filter = {
      brand: id,
      isActive: true,
      approvalStatus: 'approved',
      city: { $regex: new RegExp(`^${city_id}$`, 'i') },
    };

    const skip = (Number(page) - 1) * Number(limit);
    const services = await Service.find(filter)
      .populate('category', 'name slug')
      .populate('brand', 'name slug logo')
      .populate('vendor', 'firstName lastName businessName profileImage rating')
      .sort({ displayOrder: 1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Service.countDocuments(filter);

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      services,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllBrandsAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category_id, isActive } = req.query;
    const filter = {};
    if (search) filter.name = { $regex: search, $options: 'i' };
    if (category_id) filter.category = category_id;
    if (isActive !== undefined) filter.isActive = parseBool(isActive, true);

    const skip = (Number(page) - 1) * Number(limit);
    const brands = await Brand.find(filter)
      .populate('category', 'name slug')
      .sort({ displayOrder: 1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Brand.countDocuments(filter);

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      brands,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBrandByIdAdmin = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id).populate('category', 'name slug').lean();
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }
    res.status(200).json({ success: true, brand });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createBrand = async (req, res) => {
  try {
    const { name, description, category, website, email, phone, displayOrder, isActive } = req.body;
    if (!name || !category) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name and category',
      });
    }

    const existing = await Brand.findOne({
      name: { $regex: `^${name}$`, $options: 'i' },
      category,
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Brand already exists for this category',
      });
    }

    const logo = req.file ? req.file.path : req.body.logo;

    const brand = await Brand.create({
      name,
      description,
      logo,
      category,
      website,
      email,
      phone,
      displayOrder: displayOrder || 0,
      isActive: parseBool(isActive, true),
    });

    await brand.populate('category', 'name slug');

    res.status(201).json({
      success: true,
      message: 'Brand created successfully',
      brand,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateBrand = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }

    const { name, description, category, website, email, phone, displayOrder, isActive } = req.body;
    if (name) brand.name = name;
    if (description !== undefined) brand.description = description;
    if (category) brand.category = category;
    if (website !== undefined) brand.website = website;
    if (email !== undefined) brand.email = email;
    if (phone !== undefined) brand.phone = phone;
    if (displayOrder !== undefined) brand.displayOrder = displayOrder;
    if (isActive !== undefined) brand.isActive = parseBool(isActive, brand.isActive);
    if (req.file) brand.logo = req.file.path;
    if (req.body.logo) brand.logo = req.body.logo;

    await brand.save();
    await brand.populate('category', 'name slug');

    res.status(200).json({
      success: true,
      message: 'Brand updated successfully',
      brand,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteBrand = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }

    const serviceCount = await Service.countDocuments({ brand: req.params.id });
    if (serviceCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete brand. It has ${serviceCount} service(s) associated with it.`,
      });
    }

    await Brand.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Brand deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
