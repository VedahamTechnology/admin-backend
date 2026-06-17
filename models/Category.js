const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name:        { type: String, required: true, unique: true, trim: true },
  slug:        { type: String, unique: true, lowercase: true },
  description: { type: String },
  image:       { type: String },
  icon:        { type: String },
  
  // Additional fields for better categorization
  estimatedDuration: { type: String }, // e.g., "30 mins", "1-2 hours"
  
  // For filtering and search
  tags:        [{ type: String }], // e.g., ['home-cleaning', 'professional']
  
  // Pricing information
  basePrice:   { type: Number, min: 0 }, // Average starting price
  
  // Status management
  isActive:    { type: Boolean, default: true },
  displayOrder:{ type: Number, default: 0 },
  
  // Metadata
  totalServices: { type: Number, default: 0 }, // Count of services in this category
  avgRating:     { type: Number, default: 0, min: 0, max: 5 },
  
}, { timestamps: true });

categorySchema.pre('save', async function() {
  if (!this.slug) {
    this.slug = this.name.toLowerCase().replace(/\s+/g, '-');
  }
});

// Index for faster queries
// Note: slug index is already created by unique: true constraint
categorySchema.index({ isActive: 1, displayOrder: 1 });
categorySchema.index({ tags: 1 });

module.exports = mongoose.model('Category', categorySchema);