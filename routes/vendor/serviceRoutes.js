const express = require('express');
const router = express.Router();

const {
  createService,
  getMyServices,
  getServiceById,
  updateService,
  deleteService,
  updateServiceAvailability,
  searchServices,
  getCategories,
  getServicesByCategory,
} = require('../../controllers/vendor/serviceController');

const { protect, authorize, verifyVendorApproval } = require('../../middleware/auth');
const { upload } = require('../../config/cloudinary');

// Public browsing routes - no authentication required
router.get('/browse/categories', getCategories);
router.get('/browse/category/:categoryId', getServicesByCategory);

// All routes below require vendor authentication and approval
router.use(protect);
router.use(authorize('vendor'));
router.use(verifyVendorApproval);

// Service management routes
router.post('/', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: 5 }
]), createService);
router.get('/', getMyServices);
router.get('/search', searchServices);
router.get('/:id', getServiceById);
router.put('/:id', updateService);
router.put('/:id/availability', updateServiceAvailability);
router.delete('/:id', deleteService);

module.exports = router;
