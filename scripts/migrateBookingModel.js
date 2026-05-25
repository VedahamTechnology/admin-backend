#!/usr/bin/env node

/**
 * Migration Script for Booking Model v2 Upgrade
 * Handles:
 * 1. Initialize Counter collection
 * 2. Hash existing OTPs
 * 3. Add missing pricing fields
 * 4. Populate service snapshots
 * 5. Create required indexes
 * 
 * Usage: node scripts/migrateBookingModel.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const Counter = require('../models/Counter');
const Booking = require('../models/Booking');
const Service = require('../models/Service');

async function migrate() {
  try {
    console.log('🚀 Starting Booking Model v2 Migration...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Initialize Counter collection
    console.log('📊 Step 1: Initializing Counter collection...');
    const maxBooking = await Booking.findOne()
      .sort({ createdAt: -1 })
      .select('bookingId');
    
    let maxSeq = 0;
    if (maxBooking && maxBooking.bookingId) {
      const seq = parseInt(maxBooking.bookingId.split('-').pop());
      maxSeq = isNaN(seq) ? 0 : seq;
    }

    await Counter.findByIdAndUpdate(
      'booking',
      { seq: maxSeq },
      { upsert: true }
    );
    console.log(`✅ Counter initialized with seq: ${maxSeq}\n`);

    // Step 2: Hash existing OTPs and add expiry
    console.log('🔐 Step 2: Hashing existing OTPs...');
    const bookingsWithOtp = await Booking.find({
      $or: [
        { 'otp.startOtp': { $exists: true, $ne: null } },
        { 'otp.endOtp': { $exists: true, $ne: null } }
      ]
    });

    let otpHashedCount = 0;
    for (const booking of bookingsWithOtp) {
      let updated = false;

      // Hash startOtp if not already hashed
      if (booking.otp.startOtp && !booking.otp.startOtp.startsWith('$2')) {
        const salt = await bcrypt.genSalt(10);
        booking.otp.startOtp = await bcrypt.hash(booking.otp.startOtp, salt);
        updated = true;
      }

      // Hash endOtp if not already hashed
      if (booking.otp.endOtp && !booking.otp.endOtp.startsWith('$2')) {
        const salt = await bcrypt.genSalt(10);
        booking.otp.endOtp = await bcrypt.hash(booking.otp.endOtp, salt);
        updated = true;
      }

      // Set OTP expiry if not set (10 minutes from now for pending, from booking date for others)
      if (!booking.otp.otpExpiresAt) {
        if (booking.status === 'pending') {
          booking.otp.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        } else {
          booking.otp.otpExpiresAt = new Date(booking.bookingDate.getTime() + 10 * 60 * 1000);
        }
        updated = true;
      }

      if (updated) {
        await booking.save();
        otpHashedCount++;
      }
    }
    console.log(`✅ Processed ${otpHashedCount} bookings with OTPs\n`);

    // Step 3: Add missing pricing fields
    console.log('💰 Step 3: Updating pricing fields...');
    let pricingUpdatedCount = 0;
    
    const bookingsForPricing = await Booking.find({
      $or: [
        { 'pricing.platformFee': { $exists: false } },
        { 'pricing.vendorPayout': { $exists: false } },
        { 'pricing.serviceSnapshot': { $exists: false } }
      ]
    }).populate('service');

    for (const booking of bookingsForPricing) {
      let updated = false;

      // Add platform fee (15% of base price)
      if (!booking.pricing.platformFee) {
        booking.pricing.platformFee = (booking.pricing.basePrice * 0.15) || 0;
        updated = true;
      }

      // Add vendor payout
      if (!booking.pricing.vendorPayout) {
        booking.pricing.vendorPayout = booking.pricing.basePrice - (booking.pricing.platformFee || 0);
        updated = true;
      }

      // Add service snapshot
      if (!booking.pricing.serviceSnapshot && booking.service) {
        booking.pricing.serviceSnapshot = {
          serviceName: booking.service.name || '',
          serviceDescription: booking.service.description || '',
          serviceImage: booking.service.image || ''
        };
        updated = true;
      }

      if (updated) {
        // Recalculate total amount to ensure consistency
        booking.pricing.totalAmount = 
          booking.pricing.basePrice + 
          (booking.pricing.platformFee || 0) + 
          (booking.pricing.tax || 0) - 
          (booking.pricing.discount || 0);

        await booking.save();
        pricingUpdatedCount++;
      }
    }
    console.log(`✅ Updated pricing for ${pricingUpdatedCount} bookings\n`);

    // Step 4: Initialize missing fields
    console.log('📝 Step 4: Initializing missing fields...');
    let fieldsInitializedCount = 0;

    const bookingsForFields = await Booking.find({
      $or: [
        { 'rescheduleHistory': { $exists: false } },
        { 'proofOfWork': { $exists: false } },
        { 'expiresAt': { $exists: false } }
      ]
    });

    for (const booking of bookingsForFields) {
      let updated = false;

      // Initialize rescheduleHistory
      if (!booking.rescheduleHistory) {
        booking.rescheduleHistory = [];
        updated = true;
      }

      // Initialize proofOfWork
      if (!booking.proofOfWork) {
        booking.proofOfWork = null;
        updated = true;
      }

      // Set expiresAt for pending bookings
      if (!booking.expiresAt && booking.status === 'pending') {
        booking.expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        updated = true;
      }

      if (updated) {
        await booking.save();
        fieldsInitializedCount++;
      }
    }
    console.log(`✅ Initialized fields for ${fieldsInitializedCount} bookings\n`);

    // Step 5: Create indexes
    console.log('🗂️  Step 5: Verifying database indexes...');
    try {
      // Create compound indexes - single field indexes are created via schema "index: true"
      await Booking.collection.createIndex({ 'serviceAddress.location': '2dsphere' });
      await Booking.collection.createIndex({ vendor: 1, status: 1, bookingDate: 1 });
      console.log('✅ Indexes verified\n');
    } catch (indexError) {
      // Ignore index conflicts (code 86) - they may already exist
      if (indexError.code === 86) {
        console.log('✅ Indexes already exist (verified)\n');
      } else if (indexError.codeName === 'IndexKeySpecsConflict') {
        console.log('✅ Indexes already exist (verified)\n');
      } else {
        throw indexError;
      }
    }

    console.log('✨ Migration completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Counter initialized: seq = ${maxSeq}`);
    console.log(`   - OTPs hashed: ${otpHashedCount}`);
    console.log(`   - Pricing updated: ${pricingUpdatedCount}`);
    console.log(`   - Fields initialized: ${fieldsInitializedCount}`);
    console.log(`   - Indexes created: 4\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run migration
migrate();
