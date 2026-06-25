const express = require('express');
const router = express.Router();
const profileController = require('../../controllers/user/profileController');
const { protect } = require('../../middleware/auth');

// All profile routes require authentication
router.use(protect);

router.get('/', profileController.getProfile);
router.put('/', profileController.updateProfile);

module.exports = router;
