const User = require('../../models/User');

/**
 * Add a new worker (Request sent to Admin)
 */
exports.addWorker = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      gender,
      aadharNumber,
      panNumber,
      serviceCategory
    } = req.body;

    // Check if worker already exists
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or phone already exists',
      });
    }

    // Extract file URL from Cloudinary upload
    const aadharFrontUrl = req.files && req.files['aadharFront'] ? req.files['aadharFront'][0].path : null;

    const worker = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password,
      gender,
      role: 'worker',
      vendorId: req.user._id,
      worker: {
        aadharNumber,
        panNumber,
        serviceCategory,
        verificationStatus: 'pending',
        documents: {
          aadharFront: { url: aadharFrontUrl }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Worker add request sent to admin for approval',
      worker: {
        id: worker._id,
        fullName: `${worker.firstName} ${worker.lastName}`,
        status: worker.worker.verificationStatus
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get all workers for the logged-in vendor
 */
exports.getMyWorkers = async (req, res) => {
  try {
    const workers = await User.find({ vendorId: req.user._id, role: 'worker' })
      .populate('worker.serviceCategory', 'name')
      .select('-password -refreshToken');

    res.status(200).json({
      success: true,
      count: workers.length,
      workers
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get specific worker details
 */
exports.getWorkerDetails = async (req, res) => {
  try {
    const worker = await User.findOne({
      _id: req.params.id,
      vendorId: req.user._id,
      role: 'worker'
    })
      .populate('worker.serviceCategory', 'name')
      .select('-password -refreshToken');

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    res.status(200).json({
      success: true,
      worker
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
