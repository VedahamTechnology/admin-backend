const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({

  userId: { type: String, unique: true },

  firstName: { type: String, required: true, trim: true },
  lastName:  { type: String, required: true, trim: true },
  email:     { type: String, required: true, unique: true, lowercase: true },
  phone:     { type: String, required: true, unique: true },
  password:  { type: String, required: true, minlength: 8, select: false },
  gender:    { type: String, enum: ['male', 'female', 'other'] },

  role: {
    type:    String,
    enum:    ['customer', 'vendor', 'admin'],
    default: 'customer',
    required: true,
  },

  isActive: { type: Boolean, default: true },
  isBanned: { type: Boolean, default: false },

  vendor: {
    businessName: { type: String },
    experience:   { type: Number },
    skills:       [{ type: String }],
    serviceAreas: [{ city: String, pincode: String }],
    verificationStatus: {
      type:    String,
      enum:    ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
  },

}, { timestamps: true });

userSchema.pre('save', async function() {
  if (!this.userId) {
    const count = await mongoose.model('User').countDocuments({ role: this.role });
    const prefix = this.role === 'customer' ? 'UC'
                 : this.role === 'vendor'   ? 'UV'
                 : 'UA';
    this.userId = `${prefix}-${String(count + 1).padStart(5, '0')}`;
  }

  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
});

userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);