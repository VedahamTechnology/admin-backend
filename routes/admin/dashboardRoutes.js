const express = require('express');
const router = express.Router();
const dashboardController = require('../../controllers/admin/dashboardController');
const { protect, authorize } = require('../../middleware/auth');

/**
 * ADMIN DASHBOARD ROUTES
 * All routes require admin authentication
 */

// Apply protection and admin authorization to all routes in this router
router.use(protect);
router.use(authorize('admin'));

// Get dashboard statistics
router.get('/stats', dashboardController.getStats);

// Charts endpoints
router.get('/charts/revenue-trend', dashboardController.getRevenueTrend);
router.get('/charts/booking-volume', dashboardController.getBookingVolume);
router.get('/charts/booking-status', dashboardController.getBookingStatus);
router.get('/charts/worker-payment', dashboardController.getWorkerPayment);
router.get('/charts/revenue-vs-bookings', dashboardController.getRevenueVsBookings);
router.get('/charts/customer-growth', dashboardController.getCustomerGrowth);

module.exports = router;
