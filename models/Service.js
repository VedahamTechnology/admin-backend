const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  serviceId:   { type: String, unique: true },
  name:        { type: String, required: true, trim: true },
  slug:        { type: String, unique: true, lowercase: true },
  description: { type: String },

  category: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'Category',
    required: true,
  },
  brand: {
    type: mongoose.Schema.Types.ObjectId,
    ref:  'Brand',
  },

  basePrice:         { type: Number, required: true, min: 0 },
  discountedPrice:   { type: Number, default: 0 },
  estimatedDuration: { type: Number, required: true },

  image:    { type: String },
  images:   [{ type: String }],
  features: [{ type: String }],
  includes: [{ type: String }],
  excludes: [{ type: String }],

  vendors: [{
    vendorId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    vendorPrice: { type: Number },
    isAvailable: { type: Boolean, default: true },
  }],

  ratings: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count:   { type: Number, default: 0 },
  },

  isActive:    { type: Boolean, default: true },
  displayOrder:{ type: Number, default: 0 },

}, { timestamps: true });

serviceSchema.pre('save', async function(next) {
  if (!this.serviceId) {
    const count = await mongoose.model('Service').countDocuments();
    this.serviceId = `SRV-${String(count + 1).padStart(4, '0')}`;
  }
  if (!this.slug) {
    this.slug = this.name.toLowerCase().replace(/\s+/g, '-');
  }
  next();
});

serviceSchema.index({ category: 1, isActive: 1 });
serviceSchema.index({ brand: 1 });
serviceSchema.index({ slug: 1 });

module.exports = mongoose.model('Service', serviceSchema);