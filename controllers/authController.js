const User = require('../models/User');
const jwt  = require('jsonwebtoken');

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

exports.registerCustomer = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, gender } = req.body;

    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email ? 'Email already registered' : 'Phone already registered',
      });
    }

    const customer = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password,
      gender,
      role: 'customer',
    });

    const token = generateToken(customer._id, customer.role);

    res.status(201).json({
      success: true,
      message: 'Customer registered successfully',
      token,
      user: {
        id:        customer._id,
        userId:    customer.userId,
        firstName: customer.firstName,
        lastName:  customer.lastName,
        email:     customer.email,
        phone:     customer.phone,
        role:      customer.role,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.registerVendor = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, gender, businessName, experience, skills, serviceAreas } = req.body;

    if (!firstName || !lastName || !email || !phone || !password || !businessName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields including business name',
      });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email ? 'Email already registered' : 'Phone already registered',
      });
    }

    const vendor = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password,
      gender,
      role: 'vendor',
      vendor: {
        businessName,
        experience:   experience || 0,
        skills:       skills      || [],
        serviceAreas: serviceAreas || [],
        verificationStatus: 'pending',
      },
    });

    const token = generateToken(vendor._id, vendor.role);

    res.status(201).json({
      success: true,
      message: 'Vendor registered successfully. Waiting for admin approval.',
      token,
      user: {
        id:                 vendor._id,
        userId:             vendor.userId,
        firstName:          vendor.firstName,
        lastName:           vendor.lastName,
        email:              vendor.email,
        phone:              vendor.phone,
        role:               vendor.role,
        verificationStatus: vendor.vendor.verificationStatus,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, password and role',
      });
    }

    const user = await User.findOne({ email, role }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account is deactivated. Contact support.',
      });
    }

    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        message: 'Your account is banned. Contact support.',
      });
    }

    if (user.role === 'vendor' && user.vendor.verificationStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        message: `Your account is ${user.vendor.verificationStatus}. Wait for admin approval.`,
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: `${user.role.charAt(0).toUpperCase() + user.role.slice(1)} logged in successfully`,
      token,
      user: {
        id:        user._id,
        userId:    user.userId,
        firstName: user.firstName,
        lastName:  user.lastName,
        email:     user.email,
        phone:     user.phone,
        role:      user.role,
        ...(user.role === 'vendor' && {
          verificationStatus: user.vendor.verificationStatus,
        }),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};