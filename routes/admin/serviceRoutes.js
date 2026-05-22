const express = require('express');
const router = express.Router();

const {
  createService,
  getAllServices,
  getServiceById,
  updateService,
  deleteService,
  removeVendorFromService,
  getServicesByCategory,
  bulkUpdateServiceStatus,
} = require('../../controllers/admin/serviceController');

const { protect, authorize } = require('../../middleware/auth');

router.use(protect);
router.use(authorize('admin'));

router.post('/', createService);
router.post('/bulk/status', bulkUpdateServiceStatus);
router.get('/', getAllServices);
router.get('/category/:categoryId', getServicesByCategory);
router.get('/:id', getServiceById);
router.put('/:id', updateService);
router.delete('/:id', deleteService);
router.put('/:id/remove-vendor', removeVendorFromService);

module.exports = router;
