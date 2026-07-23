const express = require('express');
const router = express.Router();
const workerController = require('../../controllers/admin/workerController');
const { protect, authorize } = require('../../middleware/auth');
const { getWorkerAnalytics } = require('../../controllers/admin/analyticsController');

router.use(protect);
router.use(authorize('admin'));

router.get('/pending', workerController.getPendingWorkers);
router.get('/approved', workerController.getApprovedWorkers);
router.get('/rejected', workerController.getRejectedWorkers);
router.get('/analytics', getWorkerAnalytics);
router.get('/:id/bookings', workerController.getWorkerBookings);
router.patch('/:id/approve', workerController.approveWorker);
router.patch('/:id/reject', workerController.rejectWorker);
router.get('/', workerController.getAllWorkers);
router.get('/:id', workerController.getWorkerById);
router.patch('/:id/toggle-active', workerController.toggleWorkerActive);
router.delete('/:id', workerController.deleteWorker);

module.exports = router;
