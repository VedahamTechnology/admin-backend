const User = require('../../models/User');

exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, isActive } = req.query;

    let filter = { role: 'customer' };
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const skip = (page - 1) * limit;

    const users = await User.find(filter)
      .select('-password -refreshToken')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      total,
      page:    Number(page),
      pages:   Math.ceil(total / limit),
      users,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, role: 'customer' })
      .select('-password -refreshToken');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.blockUser = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, role: 'customer' });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.isBanned) {
      return res.status(400).json({ success: false, message: 'User is already blocked' });
    }

    user.isBanned = true;
    user.isActive = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User blocked successfully',
      user: {
        id:       user._id,
        userId:   user.userId,
        email:    user.email,
        isBanned: user.isBanned,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.unblockUser = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, role: 'customer' });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.isBanned) {
      return res.status(400).json({ success: false, message: 'User is not blocked' });
    }

    user.isBanned = false;
    user.isActive = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User unblocked successfully',
      user: {
        id:       user._id,
        userId:   user.userId,
        email:    user.email,
        isBanned: user.isBanned,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, role: 'customer' });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.searchUsers = async (req, res) => {
  try {
    const { query, page = 1, limit = 10 } = req.query;

    if (!query) {
      return res.status(400).json({ success: false, message: 'Please provide a search query' });
    }

    const skip = (page - 1) * limit;

    const searchFilter = {
      role: 'customer',
      $or: [
        { firstName: { $regex: query, $options: 'i' } },
        { lastName:  { $regex: query, $options: 'i' } },
        { email:     { $regex: query, $options: 'i' } },
        { phone:     { $regex: query, $options: 'i' } },
        { userId:    { $regex: query, $options: 'i' } },
        { gender:    { $regex: query, $options: 'i' } },
        { 'location.city':    { $regex: query, $options: 'i' } },
        { 'location.pincode': { $regex: query, $options: 'i' } },
      ],
    };

    const users = await User.find(searchFilter)
      .select('-password -refreshToken')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await User.countDocuments(searchFilter);

    if (total === 0) {
      return res.status(404).json({ success: false, message: 'No users found' });
    }

    res.status(200).json({
      success: true,
      query,
      total,
      page:  Number(page),
      pages: Math.ceil(total / limit),
      users,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};