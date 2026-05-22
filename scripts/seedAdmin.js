const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/User');
const connectDB = require('../config/database');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const seedAdmin = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const adminUser = new User({
      firstName: 'Admin',
      lastName: '',
      email: 'admin@homster.com',
      phone: '1234567890',
      password: 'admin@123',
      gender: 'male',
      role: 'admin',
      isActive: true,
      isBanned: false,
    });

    await adminUser.save();
    console.log('Admin user seeded successfully');
    console.log(`Admin ID: ${adminUser.userId}`);
    console.log(`Admin Email: ${adminUser.email}`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error.message);
    process.exit(1);
  }
};

seedAdmin();
