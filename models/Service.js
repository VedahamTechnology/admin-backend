const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  serviceId:   { type: String, unique: true },
  name:        { type: String, required: true, trim: true },
  slug:        { type: String, unique: true, lowercase: true },
  description: { type: String, required: true },

  category: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'Category',
    required: true,
  },
  brand: {
    type: mongoose.Schema.Types.ObjectId,
    ref:  'Brand',
  },

  // Pricing Details
  basePrice:         { type: Number, required: true, min: 0 },
  discountedPrice:   { type: Number, default: 0, min: 0 },
  minPrice:          { type: Number, default: 0 }, // Minimum price
  priceUnit:         { type: String, enum: ['per_service', 'per_hour', 'per_day', 'per_item'], default: 'per_service' },
  taxPercentage:     { type: Number, default: 0, min: 0, max: 100 }, // For GST calculations
  
  estimatedDuration: { type: Number, required: true }, // in minutes
  durationUnit:      { type: String, enum: ['minutes', 'hours', 'days'], default: 'minutes' },

  // Media
  image:    { type: String },
  images:   [{ type: String }],
  
  // Service Details
  features: [{ type: String }],
  includes: [{ type: String }],
  excludes: [{ type: String }],

  // Vendor Information
  vendors: [{
    vendorId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    vendorPrice: { type: Number },
    isAvailable: { type: Boolean, default: true },
  }],

  // Ratings
  ratings: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count:   { type: Number, default: 0 },
  },

  // Availability
  availability: {
    availableFrom: { type: String }, // e.g., "8:00 AM"
    availableTo:   { type: String }, // e.g., "10:00 PM"
    daysOfWeek:    [{ type: Number, min: 0, max: 6 }], // 0 = Sunday, 6 = Saturday
  },

  // Status
  isActive:    { type: Boolean, default: true },
  displayOrder:{ type: Number, default: 0 },

  // Approval Status
  isApproved: { type: Boolean, default: false },
  approvalStatus: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvalDate: { type: Date },
  rejectionReason: { type: String },

  // Vendor who created the service
  createdByVendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

}, { timestamps: true });

serviceSchema.pre('save', async function(next) {
  try {
    if (!this.serviceId) {
      const Counter = require('./Counter');
      const counter = await Counter.findByIdAndUpdate(
        'service',
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.serviceId = `SRV-${String(counter.seq).padStart(4, '0')}`;
    }
    if (!this.slug) {
      this.slug = this.name.toLowerCase().replace(/\s+/g, '-');
    }
    next();
  } catch (error) {
    next(error);
  }
});

serviceSchema.index({ category: 1, isActive: 1, approvalStatus: 1 });
serviceSchema.index({ brand: 1 });
// Note: slug index is already created by unique: true constraint
serviceSchema.index({ 'ratings.average': -1 }); // For sorting by ratings
serviceSchema.index({ basePrice: 1 }); // For price range filtering
serviceSchema.index({ approvalStatus: 1 }); // For admin approval view
serviceSchema.index({ createdByVendor: 1, approvalStatus: 1 }); // For vendor's pending services

module.exports = mongoose.model('Service', serviceSchema);