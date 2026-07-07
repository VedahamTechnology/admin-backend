const express = require('express');
const router  = express.Router();

const { registerCustomer, registerVendor, registerWorker, login, adminLogin, logout, getMe, refreshAccessToken, requestOtp, verifyOtp } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

router.post('/register/customer', registerCustomer);
router.post('/register/vendor', upload.fields([
  { name: 'aadharFront', maxCount: 1 },
  { name: 'aadharBack', maxCount: 1 },
  { name: 'panCard', maxCount: 1 }
]), registerVendor);
router.post('/register/worker', upload.fields([
  { name: 'aadharFront', maxCount: 1 },
]), registerWorker);
router.post('/otp/request', requestOtp);
router.post('/otp/verify', verifyOtp);
router.post('/login',             login);
router.post('/admin/login',       adminLogin);
router.post('/refresh',           refreshAccessToken);
router.post('/logout',            protect, logout);
router.get('/me', protect,        getMe);

module.exports = router;
