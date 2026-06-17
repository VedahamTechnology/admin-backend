const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({

  firstName: { type: String, required: true, trim: true },
  lastName:  { type: String, required: false, trim: true },
  email:     { type: String, required: true, unique: true, lowercase: true },
  phone:     { type: String, required: true, unique: true },
  password:  { type: String, required: true, minlength: 8, select: false },
  gender:    { type: String, enum: ['male', 'female', 'other'] },

  refreshToken: { type: String },

  role: {
    type:     String,
    enum:     ['customer', 'vendor', 'worker', 'admin'],
    default:  'customer',
    required: true,
  },

  isActive: { type: Boolean, default: true },
  isBanned: { type: Boolean, default: false },

  // For workers: linked to their vendor
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() { return this.role === 'worker'; }
  },

  worker: {
    aadharNumber: { type: String },
    panNumber:    { type: String },
    serviceCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    verificationStatus: {
      type:    String,
      enum:    ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: { type: String },
    registeredOn:    { type: Date, default: Date.now },
    documents: {
      aadharFront: { url: { type: String }, isVerified: { type: Boolean, default: false } },
    },
  },

  location: {
    type: {
      type:    String,
      enum:    ['Point'],
      default: 'Point',
    },
    coordinates: {
      type:    [Number],
      default: [0, 0],
    },
    city:    { type: String },
    pincode: { type: String },
    address: { type: String },
  },

  vendor: {
    businessName: { type: String },
    ownerName:    { type: String },
    experience:   { type: Number },

    skills:            [{ type: String }],
    serviceCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    serviceAreas:      [{ city: String, pincode: String }],

    currentLocation: {
      type: {
        type:    String,
        enum:    ['Point'],
        default: 'Point',
      },
      coordinates: {
        type:    [Number],
        default: [0, 0],
      },
    },

    verificationStatus: {
      type:    String,
      enum:    ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: { type: String },

    registeredOn: { type: Date, default: Date.now },
    isAvailable:  { type: Boolean, default: true },

    documents: {
      aadharFront: { url: { type: String }, isVerified: { type: Boolean, default: false } },
      aadharBack:  { url: { type: String }, isVerified: { type: Boolean, default: false } },
      panCard:     { url: { type: String }, isVerified: { type: Boolean, default: false } },
    },
  },

}, { timestamps: true });

userSchema.pre('save', async function() {
  try {
    if (this.isModified('password')) {
      const salt    = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
  } catch (error) {
    throw error;
  }
});

userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.index({ role: 1 });
userSchema.index({ vendorId: 1 });
userSchema.index({ location: '2dsphere' });
userSchema.index({ 'vendor.currentLocation': '2dsphere' });
userSchema.index({ 'vendor.verificationStatus': 1 });
userSchema.index({ 'vendor.serviceAreas.pincode': 1 });

module.exports = mongoose.model('User', userSchema);