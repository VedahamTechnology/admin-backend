const mongoose = require('mongoose');

const sliderSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add an offer title'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Please add an offer description'],
  },
  image: {
    type: String,
    required: [true, 'Please add an offer image'],
  },
  startDate: {
    type: Date,
    required: [true, 'Please add a start date'],
  },
  endDate: {
    type: Date,
    required: [true, 'Please add an end date'],
  },
  redirectUrl: {
    type: String,
    trim: true,
  },
  priority: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Index for performance
sliderSchema.index({ isActive: 1, startDate: 1, endDate: 1, priority: -1 });

module.exports = mongoose.model('Slider', sliderSchema);
