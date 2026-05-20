const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  categoryId: { type: String, unique: true },
  name:        { type: String, required: true, unique: true, trim: true },
  slug:        { type: String, unique: true, lowercase: true },
  description: { type: String },
  image:       { type: String },
  icon:        { type: String },
  isActive:    { type: Boolean, default: true },
  displayOrder:{ type: Number, default: 0 },
}, { timestamps: true });

categorySchema.pre('save', async function(next) {
  if (!this.categoryId) {
    const count = await mongoose.model('Category').countDocuments();
    this.categoryId = `CAT-${String(count + 1).padStart(3, '0')}`;
  }
  if (!this.slug) {
    this.slug = this.name.toLowerCase().replace(/\s+/g, '-');
  }
  next();
});

categorySchema.index({ slug: 1 });

module.exports = mongoose.model('Category', categorySchema);