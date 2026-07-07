const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  amountDue: {
    type: Number,
    default: 0,
  },
  cashLimit: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['ok', 'over_limit', 'blocked'],
    default: 'ok',
  },
  lastSettledAt: Date,
  blockedAt: Date,
  notes: String,
}, { timestamps: true });

settlementSchema.index({ status: 1, amountDue: -1 });

module.exports = mongoose.model('Settlement', settlementSchema);
