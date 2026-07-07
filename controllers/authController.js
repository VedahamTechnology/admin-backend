const User = require('../models/User');
const Category = require('../models/Category');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const OtpCode = require('../models/OtpCode');

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

const issueTokens = async (res, user) => {
  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
  user.refreshToken = hashedRefreshToken;
  await user.save();

  setRefreshTokenCookie(res, refreshToken);
  return accessToken;
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

    const accessToken = await issueTokens(res, customer);

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

    const accessToken = await issueTokens(res, vendor);

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

    const accessToken = await issueTokens(res, user);

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

exports.registerWorker = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      gender,
      vendorId,
      serviceCategory,
      aadharNumber,
      panNumber,
    } = req.body;

    if (!firstName || !lastName || !email || !phone || !password || !vendorId || !serviceCategory) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields including vendorId and serviceCategory',
      });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email ? 'Email already registered' : 'Phone already registered',
      });
    }

    const vendor = await User.findOne({ _id: vendorId, role: 'vendor' });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    const category = await Category.findById(serviceCategory);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Service category not found',
      });
    }

    const aadharFrontUrl = req.files && req.files['aadharFront'] ? req.files['aadharFront'][0].path : null;

    const worker = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password,
      gender,
      role: 'worker',
      isActive: false,
      vendorId,
      worker: {
        aadharNumber,
        panNumber,
        serviceCategory,
        verificationStatus: 'pending',
        documents: {
          aadharFront: { url: aadharFrontUrl },
        },
      },
    });

    const accessToken = await issueTokens(res, worker);

    res.status(201).json({
      success: true,
      message: 'Worker registered successfully. Waiting for admin approval.',
      accessToken,
      user: {
        id: worker._id,
        firstName: worker.firstName,
        lastName: worker.lastName,
        email: worker.email,
        phone: worker.phone,
        role: worker.role,
        verificationStatus: worker.worker.verificationStatus,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.adminLogin = async (req, res) => {
  req.body.role = 'admin';
  return exports.login(req, res);
};

exports.requestOtp = async (req, res) => {
  try {
    const { phone, role } = req.body;

    if (!phone || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide phone and role',
      });
    }

    const user = await User.findOne({ phone, role });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found for the provided phone and role',
      });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = crypto.createHash('sha256').update(`${phone}:${role}:${otp}`).digest('hex');

    await OtpCode.findOneAndUpdate(
      { phone, role },
      {
        phone,
        role,
        otpHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        attempts: 0,
        verifiedAt: null,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const response = {
      success: true,
      message: 'OTP sent successfully',
    };

    if (process.env.NODE_ENV !== 'production') {
      response.otp = otp;
    }

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { phone, role, otp } = req.body;

    if (!phone || !role || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide phone, role and otp',
      });
    }

    const otpRecord = await OtpCode.findOne({ phone, role }).sort({ createdAt: -1 });
    if (!otpRecord) {
      return res.status(404).json({
        success: false,
        message: 'OTP not found. Please request a new one.',
      });
    }

    if (otpRecord.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.',
      });
    }

    const expectedHash = crypto.createHash('sha256').update(`${phone}:${role}:${otp}`).digest('hex');
    if (expectedHash !== otpRecord.otpHash) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP',
      });
    }

    const user = await User.findOne({ phone, role });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found for OTP login',
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

    if (user.role === 'worker' && user.worker.verificationStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        message: `Your account is ${user.worker.verificationStatus}. Wait for admin approval.`,
      });
    }

    otpRecord.verifiedAt = new Date();
    await otpRecord.save();

    const accessToken = await issueTokens(res, user);

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      accessToken,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
