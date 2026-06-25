const User = require('../../models/User');

/**
 * Get user profile
 */
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-refreshToken');
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update user profile
 * Email is immutable as per requirement
 */
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, gender } = req.body;

    // Fields that are allowed to be updated
    const updates = {};
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (phone) updates.phone = phone;
    if (gender) updates.gender = gender;

    // Check if phone is already taken by another user if it's being updated
    if (phone) {
      const existingUser = await User.findOne({ phone, _id: { $ne: req.user._id } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is already in use by another account',
        });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
