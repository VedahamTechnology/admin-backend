const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const generateAccessToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || '15m',
    }
  );
};

const generateRefreshToken = (id) => {
  return jwt.sign(
    { id },
    process.env.REFRESH_SECRET,
    {
      expiresIn: process.env.REFRESH_EXPIRE || '7d',
    }
  );
};

const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
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

    const accessToken = generateAccessToken(customer._id, customer.role);
    const refreshToken = generateRefreshToken(customer._id);

    // Hash and store refresh token
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    customer.refreshToken = hashedRefreshToken;
    await customer.save();

    // Set HttpOnly cookie
    setRefreshTokenCookie(res, refreshToken);

    res.status(201).json({
      success: true,
      message: 'Customer registered successfully',
      accessToken,
      user: {
        id:        customer._id,
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
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      gender,
      businessName,
      ownerName,
      experience,
      skills,
      serviceAreas,
      aadharNumber,
      panNumber
    } = req.body;

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

    // Extract file URLs from Cloudinary upload
    const aadharFrontUrl = req.files && req.files['aadharFront'] ? req.files['aadharFront'][0].path : null;
    const aadharBackUrl  = req.files && req.files['aadharBack']  ? req.files['aadharBack'][0].path  : null;
    const panCardUrl     = req.files && req.files['panCard']     ? req.files['panCard'][0].path     : null;

    // Format skills and serviceAreas for Mongoose schema (especially for multipart/form-data)
    const formattedSkills = Array.isArray(skills)
      ? skills
      : (typeof skills === 'string' ? skills.split(',').map(s => s.trim()).filter(s => s !== '') : []);

    const formattedServiceAreas = Array.isArray(serviceAreas)
      ? serviceAreas.map(area => typeof area === 'string' ? { city: area.trim() } : area)
      : (typeof serviceAreas === 'string' ? serviceAreas.split(',').map(s => ({ city: s.trim() })).filter(a => a.city !== '') : []);

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
        ownerName: ownerName || `${firstName} ${lastName}`,
        aadharNumber,
        panNumber,
        experience:   Number(experience) || 0,
        skills:       formattedSkills,
        serviceAreas: formattedServiceAreas,
        verificationStatus: 'pending',
        documents: {
          aadharFront: { url: aadharFrontUrl },
          aadharBack:  { url: aadharBackUrl },
          panCard:     { url: panCardUrl },
        },
      },
    });

    const accessToken = generateAccessToken(vendor._id, vendor.role);
    const refreshToken = generateRefreshToken(vendor._id);

    // Hash and store refresh token
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    vendor.refreshToken = hashedRefreshToken;
    await vendor.save();

    // Set HttpOnly cookie
    setRefreshTokenCookie(res, refreshToken);

    res.status(201).json({
      success: true,
      message: 'Vendor registered successfully. Waiting for admin approval.',
      accessToken,
      user: {
        id:                 vendor._id,
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

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Hash and store refresh token
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    user.refreshToken = hashedRefreshToken;
    await user.save();

    // Set HttpOnly cookie
    setRefreshTokenCookie(res, refreshToken);

    res.status(200).json({
      success: true,
      message: `${user.role.charAt(0).toUpperCase() + user.role.slice(1)} logged in successfully`,
      accessToken,
      user: {
        id:        user._id,
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

exports.refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required',
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    // Compare provided refresh token with hashed token in DB
    const isValidRefreshToken = await bcrypt.compare(refreshToken, user.refreshToken);
    
    if (!isValidRefreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token',
      });
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(user._id, user.role);
    const newRefreshToken = generateRefreshToken(user._id);

    // Hash and rotate refresh token in DB
    const hashedNewRefreshToken = await bcrypt.hash(newRefreshToken, 10);
    user.refreshToken = hashedNewRefreshToken;
    await user.save();

    // Set new HttpOnly cookie
    setRefreshTokenCookie(res, newRefreshToken);

    res.status(200).json({
      success: true,
      message: 'Access token refreshed successfully',
      accessToken: newAccessToken,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token refresh failed: ' + error.message,
    });
  }
};

exports.logout = async (req, res) => {
  try {
    // Clear refresh token from database if user is authenticated
    if (req.user) {
      const user = await User.findById(req.user.id);
      if (user) {
        user.refreshToken = null;
        await user.save();
      }
    }

    // Clear the refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};