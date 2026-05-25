const mongoose = require('mongoose');

/**
 * Counter Collection
 * Maintains atomic sequence counters for generating unique IDs
 * Prevents race conditions in bookingId generation
 */
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },  // e.g., 'booking', 'payment', 'review'
  seq: { type: Number, default: 0 },
});

// Index for faster lookups
counterSchema.index({ _id: 1 });

module.exports = mongoose.model('Counter', counterSchema);
