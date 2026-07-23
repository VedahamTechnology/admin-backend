const express = require('express');
const router = express.Router();

const {
  getProfile,
  updateProfile,
  updateProfileImage,
  deleteProfileImage,
  addServiceCategories,
  updateAvailability,
  updateCurrentLocation,
  getStats,
  getAvailableServices,
  getCategories,
  selectService,
  getMySelectedServices,
  updateMyServicePricing,
  removeMyService,
} = require('../../controllers/vendor/profileController');

const { protect, authorize, verifyVendorApproval } = require('../../middleware/auth');
const { upload } = require('../../config/cloudinary');

// All routes require vendor authentication
router.use(protect);
router.use(authorize('vendor'));

router.get('/', getProfile);
router.put('/', updateProfile);

router.put('/image', upload.single('profileImage'), updateProfileImage);
router.delete('/image', deleteProfileImage);

router.put('/location', updateCurrentLocation);

// Routes that require approval
router.use(verifyVendorApproval);

router.get('/stats', getStats);
router.get('/services/available', getAvailableServices);
router.get('/services/categories', getCategories);
router.get('/services/my-services', getMySelectedServices);
router.post('/services/select', selectService);
router.put('/services/pricing', updateMyServicePricing);
router.post('/services/remove', removeMyService);
router.post('/categories', addServiceCategories);
router.put('/availability', updateAvailability);

module.exports = router;
