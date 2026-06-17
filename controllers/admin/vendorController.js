const User = require('../../models/User');

exports.getAllVendors = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    let filter = { role: 'vendor' };
    if (status) filter['vendor.verificationStatus'] = status;

    const skip = (page - 1) * limit;

    const vendors = await User.find(filter)
      .select('-password -refreshToken')
      .populate('vendor.serviceCategories', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      total,
      page:    Number(page),
      pages:   Math.ceil(total / limit),
      vendors,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getVendorById = async (req, res) => {
  try {
    const vendor = await User.findOne({ _id: req.params.id, role: 'vendor' })
      .select('-password -refreshToken')
      .populate('vendor.serviceCategories', 'name');

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    res.status(200).json({ success: true, vendor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.approveVendor = async (req, res) => {
  try {
    const vendor = await User.findOne({ _id: req.params.id, role: 'vendor' });

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    if (vendor.vendor.verificationStatus === 'approved') {
      return res.status(400).json({ success: false, message: 'Vendor is already approved' });
    }

    vendor.vendor.verificationStatus = 'approved';
    vendor.vendor.rejectionReason    = undefined;
    await vendor.save();

    res.status(200).json({
      success: true,
      message: 'Vendor approved successfully',
      vendor: {
        id:                 vendor._id,
        firstName:          vendor.firstName,
        lastName:           vendor.lastName,
        email:              vendor.email,
        verificationStatus: vendor.vendor.verificationStatus,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.rejectVendor = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Please provide a rejection reason' });
    }

    const vendor = await User.findOne({ _id: req.params.id, role: 'vendor' });

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    if (vendor.vendor.verificationStatus === 'rejected') {
      return res.status(400).json({ success: false, message: 'Vendor is already rejected' });
    }

    vendor.vendor.verificationStatus = 'rejected';
    vendor.vendor.rejectionReason    = reason;
    await vendor.save();

    res.status(200).json({
      success: true,
      message: 'Vendor rejected',
      vendor: {
        id:                 vendor._id,
        verificationStatus: vendor.vendor.verificationStatus,
        rejectionReason:    vendor.vendor.rejectionReason,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.blockVendor = async (req, res) => {
  try {
    const vendor = await User.findOne({ _id: req.params.id, role: 'vendor' });

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    if (vendor.isBanned) {
      return res.status(400).json({ success: false, message: 'Vendor is already blocked' });
    }

    vendor.isBanned = true;
    vendor.isActive = false;
    await vendor.save();

    res.status(200).json({
      success: true,
      message: 'Vendor blocked successfully',
      vendor: {
        id:       vendor._id,
        email:    vendor.email,
        isBanned: vendor.isBanned,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.unblockVendor = async (req, res) => {
  try {
    const vendor = await User.findOne({ _id: req.params.id, role: 'vendor' });

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    if (!vendor.isBanned) {
      return res.status(400).json({ success: false, message: 'Vendor is not blocked' });
    }

    vendor.isBanned = false;
    vendor.isActive = true;
    await vendor.save();

    res.status(200).json({
      success: true,
      message: 'Vendor unblocked successfully',
      vendor: {
        id:       vendor._id,
        email:    vendor.email,
        isBanned: vendor.isBanned,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteVendor = async (req, res) => {
  try {
    const vendor = await User.findOne({ _id: req.params.id, role: 'vendor' });

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Vendor deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.searchVendors = async (req, res) => {
  try {
    const { query, page = 1, limit = 10 } = req.query;

    if (!query) {
      return res.status(400).json({ success: false, message: 'Please provide a search query' });
    }

    const skip = (page - 1) * limit;

    const searchFilter = {
      role: 'vendor',
      $or: [
        { firstName:                     { $regex: query, $options: 'i' } },
        { lastName:                      { $regex: query, $options: 'i' } },
        { email:                         { $regex: query, $options: 'i' } },
        { phone:                         { $regex: query, $options: 'i' } },
        { 'vendor.businessName':         { $regex: query, $options: 'i' } },
        { 'vendor.ownerName':            { $regex: query, $options: 'i' } },
        { 'vendor.skills':               { $regex: query, $options: 'i' } },
        { 'vendor.serviceAreas.city':    { $regex: query, $options: 'i' } },
        { 'vendor.serviceAreas.pincode': { $regex: query, $options: 'i' } },
        { 'vendor.verificationStatus':   { $regex: query, $options: 'i' } },
      ],
    };

    const vendors = await User.find(searchFilter)
      .select('-password -refreshToken')
      .populate('vendor.serviceCategories', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await User.countDocuments(searchFilter);

    if (total === 0) {
      return res.status(404).json({ success: false, message: 'No vendors found' });
    }

    res.status(200).json({
      success: true,
      query,
      total,
      page:  Number(page),
      pages: Math.ceil(total / limit),
      vendors,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getVendorsByDistance = async (req, res) => {
  try {
    const { longitude, latitude, distance = 10, page = 1, limit = 10 } = req.query;

    if (!longitude || !latitude) {
      return res.status(400).json({ success: false, message: 'Please provide longitude and latitude' });
    }

    const radiusInMeters = Number(distance) * 1000;
    const skip = (page - 1) * limit;

    const vendors = await User.find({
      role:                        'vendor',
      'vendor.verificationStatus': 'approved',
      'vendor.isAvailable':        true,
      isBanned:                    false,
      'vendor.currentLocation': {
        $nearSphere: {
          $geometry: {
            type:        'Point',
            coordinates: [Number(longitude), Number(latitude)],
          },
          $maxDistance: radiusInMeters,
        },
      },
    })
      .select('-password -refreshToken')
      .populate('vendor.serviceCategories', 'name')
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      success:  true,
      total:    vendors.length,
      distance: `${distance}km`,
      vendors,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};