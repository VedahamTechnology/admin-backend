const express = require('express');
const router  = express.Router();

const { registerCustomer, registerVendor, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register/customer', registerCustomer);
router.post('/register/vendor',   registerVendor);
router.post('/login',             login);
router.get('/me', protect,        getMe);

module.exports = router;