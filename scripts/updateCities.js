const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars from root
dotenv.config({ path: path.join(__dirname, '../.env') });

const Service = require('../models/Service');
const User = require('../models/User');

const updateServiceCities = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected...');

    // 1. Find all services where city is missing, null, or empty
    const services = await Service.find({
      $or: [
        { city: { $exists: false } },
        { city: null },
        { city: '' }
      ]
    });

    console.log(`Found ${services.length} services to update.`);

    let updatedCount = 0;

    for (const service of services) {
      // Logic: Try to find the vendor's city first, otherwise fallback to "Mathura"
      const vendor = await User.findById(service.vendor);

      let targetCity = 'Mathura'; // Default Fallback

      if (vendor) {
        if (vendor.location && vendor.location.city) {
          targetCity = vendor.location.city;
        } else if (vendor.vendor && vendor.vendor.serviceAreas && vendor.vendor.serviceAreas.length > 0) {
          targetCity = vendor.vendor.serviceAreas[0].city;
        }
      }

      // Update the service
      service.city = targetCity;
      await service.save();
      updatedCount++;

      console.log(`Updated Service: "${service.name}" with City: "${targetCity}"`);
    }

    console.log(`Successfully updated ${updatedCount} services.`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

updateServiceCities();
