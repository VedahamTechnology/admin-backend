const express = require('express');
const router = express.Router();
const profileController = require('../../controllers/user/profileController');
const { protect } = require('../../middleware/auth');
const { upload } = require('../../config/cloudinary');

// All profile routes require authentication
router.use(protect);

router.get('/', profileController.getProfile);
router.put('/', profileController.updateProfile);

// Profile image routes
router.put('/image', upload.single('profileImage'), profileController.updateProfileImage);
router.delete('/image', profileController.deleteProfileImage);

module.exports = router;
