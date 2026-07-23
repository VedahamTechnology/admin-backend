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
  getPendingServices,
  approveService,
  rejectService,
  getTopBookedServices,
} = require('../../controllers/admin/serviceController');

const { protect, authorize } = require('../../middleware/auth');

router.use(protect);
router.use(authorize('admin'));

router.get('/approval/pending', getPendingServices);
router.put('/approval/:serviceId/approve', approveService);
router.put('/approval/:serviceId/reject', rejectService);

router.post('/', createService);
router.get('/', getAllServices);

router.post('/bulk/status', bulkUpdateServiceStatus);
router.get('/top-booked', getTopBookedServices);
router.get('/category/:categoryId', getServicesByCategory);

router.get('/:id', getServiceById);
router.put('/:id', updateService);
router.delete('/:id', deleteService);

router.put('/:id/remove-vendor', removeVendorFromService);

module.exports = router;
