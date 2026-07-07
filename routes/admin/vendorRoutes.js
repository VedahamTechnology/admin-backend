const express = require('express');
const router  = express.Router();

const {
  getAllVendors,
  getVendorById,
  approveVendor,
  rejectVendor,
  blockVendor,
  unblockVendor,
  deleteVendor,
  searchVendors,
  getVendorsByDistance,
} = require('../../controllers/admin/vendorController');
const { getVendorAnalytics } = require('../../controllers/admin/analyticsController');

const { protect, authorize } = require('../../middleware/auth');

router.use(protect);
router.use(authorize('admin'));

router.get   ('/',            getAllVendors);
router.get   ('/search',      searchVendors);
router.get   ('/nearby',      getVendorsByDistance);
router.get   ('/analytics',   getVendorAnalytics);
router.get   ('/:id',         getVendorById);
router.put   ('/:id/approve', approveVendor);
router.put   ('/:id/reject',  rejectVendor);
router.put   ('/:id/block',   blockVendor);
router.put   ('/:id/unblock', unblockVendor);
router.delete('/:id',         deleteVendor);

module.exports = router;
