const Razorpay = require('razorpay');

const KEY_ID = process.env.RAZORPAY_KEY_ID?.trim();
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET?.trim();

if (!KEY_ID || !KEY_SECRET) {
  console.error('❌ CRITICAL: Razorpay keys are missing in environment variables');
} else {
  console.log('💳 Razorpay Loaded Key:', KEY_ID);
}

const razorpay = new Razorpay({
  key_id: KEY_ID,
  key_secret: KEY_SECRET,
});

module.exports = {
  razorpay,
  KEY_ID,
  KEY_SECRET
};
