const mongoose = require('mongoose');

const scrapItemSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  applianceType: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  photos: [{
    type: String,
  }],
  status: {
    type: String,
    enum: ['pending', 'scheduled', 'picked_up', 'cancelled', 'closed'],
    default: 'pending',
  },
  pickupDate: Date,
  notes: String,
}, { timestamps: true });

scrapItemSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('ScrapItem', scrapItemSchema);
