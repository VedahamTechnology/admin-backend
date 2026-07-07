const express = require('express');
const router = express.Router();
const workerController = require('../../controllers/admin/workerController');
const { protect, authorize } = require('../../middleware/auth');
const { getWorkerAnalytics } = require('../../controllers/admin/analyticsController');

// All routes require admin authentication
router.use(protect);
router.use(authorize('admin'));

// Get all pending workers
router.get('/pending', workerController.getPendingWorkers);

// Get all approved workers
router.get('/approved', workerController.getApprovedWorkers);

// Get all rejected workers
router.get('/rejected', workerController.getRejectedWorkers);

// Worker analytics
router.get('/analytics', getWorkerAnalytics);

// Get bookings for a specific worker
router.get('/:id/bookings', workerController.getWorkerBookings);

// Approve a worker
router.patch('/:id/approve', workerController.approveWorker);

// Reject a worker
router.patch('/:id/reject', workerController.rejectWorker);

// Get all workers (with filters)
router.get('/', workerController.getAllWorkers);

// Get a single worker's details
router.get('/:id', workerController.getWorkerById);

// Toggle worker active state
router.patch('/:id/toggle-active', workerController.toggleWorkerActive);

// Delete a worker
router.delete('/:id', workerController.deleteWorker);

module.exports = router;
