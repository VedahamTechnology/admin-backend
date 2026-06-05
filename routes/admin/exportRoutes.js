const express = require('express');
const router = express.Router();
const exportController = require('../../controllers/admin/exportController');
const { protect, authorize } = require('../../middleware/auth');

/**
 * ADMIN EXPORT ROUTES
 * All routes require admin authentication
 * Exports data as CSV files
 */

// Apply protection and admin authorization to all routes in this router
router.use(protect);
router.use(authorize('admin'));

// Export bookings as CSV
router.get('/bookings', exportController.exportBookingsCSV);

// Export users as CSV
router.get('/users', exportController.exportUsersCSV);

// Export services as CSV
router.get('/services', exportController.exportServicesCSV);

// Export revenue report as CSV
router.get('/revenue-report', exportController.exportRevenueReportCSV);

// Generic CSV export (for bookings by default)
router.get('/csv', exportController.exportBookingsCSV);

module.exports = router;
