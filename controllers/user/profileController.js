const User = require('../../models/User');
const { cloudinary } = require('../../config/cloudinary');

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

    // Handle profile image if uploaded via this route (optional, if using multipart)
    if (req.file) {
      // Delete old image if exists
      const user = await User.findById(req.user._id);
      if (user.profileImage) {
        const publicId = user.profileImage.split('/').pop().split('.')[0];
        const folder = `homster/profiles/${req.user._id}`;
        await cloudinary.uploader.destroy(`${folder}/${publicId}`);
      }
      updates.profileImage = req.file.path;
    }

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

/**
 * Update profile image separately
 */
exports.updateProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image',
      });
    }

    const user = await User.findById(req.user._id);

    // Delete old image from Cloudinary
    if (user.profileImage) {
      try {
        // Extract public_id from URL
        // URL format: https://res.cloudinary.com/cloud_name/image/upload/v1234567/homster/profiles/userId/filename.jpg
        const parts = user.profileImage.split('/');
        const filename = parts.pop(); // filename.jpg
        const publicIdWithoutExtension = filename.split('.')[0];
        const folderPath = parts.slice(parts.indexOf('homster')).join('/');
        const fullPublicId = `${folderPath}/${publicIdWithoutExtension}`;

        await cloudinary.uploader.destroy(fullPublicId);
      } catch (cloudinaryError) {
        console.warn('Failed to delete old profile image from Cloudinary:', cloudinaryError.message);
      }
    }

    user.profileImage = req.file.path;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile image updated successfully',
      profileImage: user.profileImage,
    });
  } catch (error) {
    console.error('Update profile image error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete profile image
 */
exports.deleteProfileImage = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user.profileImage) {
      return res.status(400).json({
        success: false,
        message: 'No profile image to delete',
      });
    }

    try {
      const parts = user.profileImage.split('/');
      const filename = parts.pop();
      const publicIdWithoutExtension = filename.split('.')[0];
      const folderPath = parts.slice(parts.indexOf('homster')).join('/');
      const fullPublicId = `${folderPath}/${publicIdWithoutExtension}`;

      await cloudinary.uploader.destroy(fullPublicId);
    } catch (cloudinaryError) {
      console.warn('Failed to delete profile image from Cloudinary:', cloudinaryError.message);
    }

    user.profileImage = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile image deleted successfully',
    });
  } catch (error) {
    console.error('Delete profile image error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
