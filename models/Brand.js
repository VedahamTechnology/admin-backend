const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
  brandId:     { type: String, unique: true },
  name:        { type: String, required: true, trim: true }, // unique within category
  slug:        { type: String, unique: true, lowercase: true },
  description: { type: String },
  logo:        { type: String },
  
  category: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'Category',
    required: true,
  },
  
  // Contact & Verification Info
  website:     { type: String },
  email:       { type: String },
  phone:       { type: String },
  
  // Ratings & Reviews
  ratings: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count:   { type: Number, default: 0 },
  },
  
  // Brand Metrics
  totalServices: { type: Number, default: 0 },
  totalBookings: { type: Number, default: 0 },
  
  isActive:    { type: Boolean, default: true },
  displayOrder:{ type: Number, default: 0 },
}, { timestamps: true });

brandSchema.pre('save', async function() {
  if (!this.brandId) {
    const count = await mongoose.model('Brand').countDocuments();
    this.brandId = `BRD-${String(count + 1).padStart(3, '0')}`;
  }
  if (!this.slug) {
    this.slug = this.name.toLowerCase().replace(/\s+/g, '-');
  }
});

brandSchema.index({ category: 1 });
brandSchema.index({ isActive: 1, displayOrder: 1 });
// Note: slug index is already created by unique: true constraint
brandSchema.index({ 'ratings.average': -1 }); // For sorting by ratings

module.exports = mongoose.model('Brand', brandSchema);