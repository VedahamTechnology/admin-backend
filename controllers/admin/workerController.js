const User = require('../../models/User');
const Booking = require('../../models/Booking');

/**
 * Get all pending worker approval requests
 */
exports.getPendingWorkers = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const workers = await User.find({
      role: 'worker',
      'worker.verificationStatus': 'pending'
    })
      .populate('vendorId', 'firstName lastName businessName phone')
      .populate('worker.serviceCategory', 'name')
      .select('-password -refreshToken')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await User.countDocuments({
      role: 'worker',
      'worker.verificationStatus': 'pending'
    });

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      workers
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get all approved workers
 */
exports.getApprovedWorkers = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const workers = await User.find({
      role: 'worker',
      'worker.verificationStatus': 'approved'
    })
      .populate('vendorId', 'firstName lastName businessName phone')
      .populate('worker.serviceCategory', 'name')
      .select('-password -refreshToken')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await User.countDocuments({
      role: 'worker',
      'worker.verificationStatus': 'approved'
    });

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      workers
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get all rejected workers
 */
exports.getRejectedWorkers = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const workers = await User.find({
      role: 'worker',
      'worker.verificationStatus': 'rejected'
    })
      .populate('vendorId', 'firstName lastName businessName phone')
      .populate('worker.serviceCategory', 'name')
      .select('-password -refreshToken')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await User.countDocuments({
      role: 'worker',
      'worker.verificationStatus': 'rejected'
    });

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      workers
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get a single worker's details
 */
exports.getWorkerById = async (req, res) => {
  try {
    const worker = await User.findOne({ _id: req.params.id, role: 'worker' })
      .populate('vendorId', 'firstName lastName businessName phone email')
      .populate('worker.serviceCategory', 'name')
      .select('-password -refreshToken');

    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    res.status(200).json({
      success: true,
      worker
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Approve a worker
 */
exports.approveWorker = async (req, res) => {
  try {
    const worker = await User.findOne({ _id: req.params.id, role: 'worker' });

    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    if (worker.worker.verificationStatus === 'approved') {
      return res.status(400).json({ success: false, message: 'Worker is already approved' });
    }

    worker.worker.verificationStatus = 'approved';
    worker.worker.rejectionReason = undefined;
    worker.isActive = true;
    await worker.save();

    res.status(200).json({
      success: true,
      message: 'Worker approved successfully',
      worker: {
        id: worker._id,
        userId: worker.userId,
        firstName: worker.firstName,
        lastName: worker.lastName,
        verificationStatus: worker.worker.verificationStatus
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Reject a worker
 */
exports.rejectWorker = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Please provide a rejection reason' });
    }

    const worker = await User.findOne({ _id: req.params.id, role: 'worker' });

    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    worker.worker.verificationStatus = 'rejected';
    worker.worker.rejectionReason = reason;
    worker.isActive = false;
    await worker.save();

    res.status(200).json({
      success: true,
      message: 'Worker rejected successfully',
      worker: {
        id: worker._id,
        verificationStatus: worker.worker.verificationStatus,
        rejectionReason: worker.worker.rejectionReason
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Toggle worker active state
 */
exports.toggleWorkerActive = async (req, res) => {
  try {
    const { isActive } = req.body;

    const worker = await User.findOne({ _id: req.params.id, role: 'worker' });

    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    worker.isActive = typeof isActive === 'boolean' ? isActive : !worker.isActive;
    if (worker.isActive && worker.worker.verificationStatus === 'rejected') {
      worker.worker.verificationStatus = 'pending';
    }
    await worker.save();

    res.status(200).json({
      success: true,
      message: 'Worker status updated successfully',
      worker: {
        id: worker._id,
        isActive: worker.isActive,
        verificationStatus: worker.worker.verificationStatus,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get all workers with optional filters
 */
exports.getAllWorkers = async (req, res) => {
  try {
    const { status, vendorId, page = 1, limit = 10 } = req.query;

    let filter = { role: 'worker' };
    if (status) filter['worker.verificationStatus'] = status;
    if (vendorId) filter.vendorId = vendorId;

    const skip = (page - 1) * limit;

    const workers = await User.find(filter)
      .populate('vendorId', 'firstName lastName businessName phone')
      .populate('worker.serviceCategory', 'name')
      .select('-password -refreshToken')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      workers
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get bookings for a specific worker
 */
exports.getWorkerBookings = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    let filter = { worker: req.params.id };
    if (status) filter.status = status;

    const bookings = await Booking.find(filter)
      .populate('customer', 'firstName lastName email phone')
      .populate('vendor', 'firstName lastName businessName phone')
      .populate('service', 'name basePrice')
      .populate('category', 'name')
      .sort({ bookingDate: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Booking.countDocuments(filter);

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      bookings
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete a worker
 */
exports.deleteWorker = async (req, res) => {
  try {
    const worker = await User.findOne({ _id: req.params.id, role: 'worker' });

    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Worker deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
