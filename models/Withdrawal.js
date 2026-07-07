const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
  entityType: {
    type: String,
    enum: ['vendor', 'worker'],
    required: true,
  },
  entity: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'paid'],
    default: 'pending',
  },
  requestedAt: {
    type: Date,
    default: Date.now,
  },
  processedAt: Date,
  reason: String,
  notes: String,
}, { timestamps: true });

withdrawalSchema.index({ entityType: 1, entity: 1, status: 1 });

module.exports = mongoose.model('Withdrawal', withdrawalSchema);
