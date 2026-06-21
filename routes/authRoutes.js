const express = require('express');
const router  = express.Router();

const { registerCustomer, registerVendor, login, logout, getMe, refreshAccessToken } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

router.post('/register/customer', registerCustomer);
router.post('/register/vendor', upload.fields([
  { name: 'aadharFront', maxCount: 1 },
  { name: 'aadharBack', maxCount: 1 },
  { name: 'panCard', maxCount: 1 }
]), registerVendor);
router.post('/login',             login);
router.post('/refresh',           refreshAccessToken);
router.post('/logout',            protect, logout);
router.get('/me', protect,        getMe);

module.exports = router;