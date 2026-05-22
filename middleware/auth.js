const jwt  = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user      = await User.findById(decoded.id);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists',
      });
    }

    // Store the role from token for fallback in case database doesn't have it
    if (!req.user.role && decoded.role) {
      req.user.role = decoded.role;
    }

    return next();
  } catch (error) {
    console.error('Token verification error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Token is invalid or expired',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        success: false,
        message: 'User role not found',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not allowed to access this route. Required roles: ${roles.join(', ')}`,
      });
    }
    return next();
  };
};

/**
 * Middleware to check if vendor is approved
 * Must be used after protect and authorize('vendor') middleware
 */
exports.verifyVendorApproval = async (req, res, next) => {
  try {
    // Ensure user is a vendor
    if (req.user.role !== 'vendor') {
      return res.status(403).json({
        success: false,
        message: 'Only vendors can access this route',
      });
    }

    // Check if vendor is banned
    if (req.user.isBanned) {
      return res.status(403).json({
        success: false,
        message: 'Your vendor account has been banned. Contact admin for support.',
      });
    }

    // Check vendor verification status
    if (req.user.vendor.verificationStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        message: `Your vendor account is currently '${req.user.vendor.verificationStatus}'. You must be approved to access this feature.`,
        verificationStatus: req.user.vendor.verificationStatus,
      });
    }

    return next();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Middleware to check if vendor is approved
 */
exports.verifyVendor = async (req, res, next) => {
  try {
    // First ensure user is a vendor
    if (req.user.role !== 'vendor') {
      return res.status(403).json({
        success: false,
        message: 'Only vendors can access this route',
      });
    }

    // Check vendor verification status
    if (req.user.vendor.verificationStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        message: `Your vendor account is currently ${req.user.vendor.verificationStatus}. You must be approved to perform this action.`,
        verificationStatus: req.user.vendor.verificationStatus,
      });
    }

    // Check if vendor is banned
    if (req.user.isBanned) {
      return res.status(403).json({
        success: false,
        message: 'Your vendor account has been banned',
      });
    }

    return next();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};