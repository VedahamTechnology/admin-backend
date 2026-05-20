const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
  brandId:     { type: String, unique: true },
  name:        { type: String, required: true, trim: true },
  slug:        { type: String, unique: true, lowercase: true },
  description: { type: String },
  logo:        { type: String },
  category: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'Category',
    required: true,
  },
  isActive:    { type: Boolean, default: true },
  displayOrder:{ type: Number, default: 0 },
}, { timestamps: true });

brandSchema.pre('save', async function(next) {
  if (!this.brandId) {
    const count = await mongoose.model('Brand').countDocuments();
    this.brandId = `BRD-${String(count + 1).padStart(3, '0')}`;
  }
  if (!this.slug) {
    this.slug = this.name.toLowerCase().replace(/\s+/g, '-');
  }
  next();
});

brandSchema.index({ category: 1 });
brandSchema.index({ slug: 1 });

module.exports = mongoose.model('Brand', brandSchema);