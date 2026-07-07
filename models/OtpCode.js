const mongoose = require('mongoose');

const otpCodeSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    index: true,
  },
  role: {
    type: String,
    enum: ['customer', 'vendor', 'worker', 'admin'],
    required: true,
    index: true,
  },
  otpHash: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  verifiedAt: Date,
}, { timestamps: true });

otpCodeSchema.index({ phone: 1, role: 1, createdAt: -1 });
otpCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OtpCode', otpCodeSchema);
