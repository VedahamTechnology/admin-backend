const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  description: String,
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  durationMonths: {
    type: Number,
    required: true,
    min: 1,
  },
  benefits: [{
    type: String,
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Plan', planSchema);
