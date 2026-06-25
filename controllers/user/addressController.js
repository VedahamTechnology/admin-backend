const User = require('../../models/User');

/**
 * Add a new address to user profile
 */
exports.addAddress = async (req, res) => {
  try {
    const { label, street, city, state, pincode, latitude, longitude, isDefault } = req.body;

    if (!street || !city || !state || !pincode || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: street, city, state, pincode, latitude, longitude',
      });
    }

    const user = await User.findById(req.user._id);

    const newAddress = {
      label: label || 'Home',
      street,
      city,
      state,
      pincode,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      },
      isDefault: isDefault || false,
    };

    // If this is set as default, unset other defaults
    if (newAddress.isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    } else if (user.addresses.length === 0) {
      // First address is default by default
      newAddress.isDefault = true;
    }

    user.addresses.push(newAddress);
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Address added successfully',
      addresses: user.addresses,
    });
  } catch (error) {
    console.error('Add address error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get all saved addresses
 */
exports.getAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('addresses');
    res.status(200).json({
      success: true,
      addresses: user.addresses,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update an existing address
 */
exports.updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const { label, street, city, state, pincode, latitude, longitude, isDefault } = req.body;

    const user = await User.findById(req.user._id);
    const address = user.addresses.id(addressId);

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
      });
    }

    if (label) address.label = label;
    if (street) address.street = street;
    if (city) address.city = city;
    if (state) address.state = state;
    if (pincode) address.pincode = pincode;
    if (latitude !== undefined && longitude !== undefined) {
      address.location = {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      };
    }

    if (isDefault !== undefined) {
      address.isDefault = isDefault;
      if (isDefault) {
        user.addresses.forEach(addr => {
          if (addr._id.toString() !== addressId) {
            addr.isDefault = false;
          }
        });
      }
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Address updated successfully',
      addresses: user.addresses,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete an address
 */
exports.deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const user = await User.findById(req.user._id);

    const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === addressId);

    if (addressIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
      });
    }

    const wasDefault = user.addresses[addressIndex].isDefault;
    user.addresses.splice(addressIndex, 1);

    // If we deleted the default address, make another one default
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Address deleted successfully',
      addresses: user.addresses,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Set an address as default
 */
exports.setDefaultAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const user = await User.findById(req.user._id);

    let found = false;
    user.addresses.forEach(addr => {
      if (addr._id.toString() === addressId) {
        addr.isDefault = true;
        found = true;
      } else {
        addr.isDefault = false;
      }
    });

    if (!found) {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
      });
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Default address updated successfully',
      addresses: user.addresses,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
