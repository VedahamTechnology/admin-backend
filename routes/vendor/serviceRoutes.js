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
} = require('../../controllers/vendor/serviceController');

const { protect, authorize, verifyVendorApproval } = require('../../middleware/auth');

// All routes require vendor authentication and approval
router.use(protect);
router.use(authorize('vendor'));
router.use(verifyVendorApproval);

// Service management routes
router.post('/', createService);
router.get('/', getMyServices);
router.get('/search', searchServices);
router.get('/:id', getServiceById);
router.put('/:id', updateService);
router.put('/:id/availability', updateServiceAvailability);
router.delete('/:id', deleteService);

module.exports = router;
