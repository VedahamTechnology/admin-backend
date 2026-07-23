const express = require('express');
const router = express.Router();
const bookingController = require('../../controllers/admin/bookingController');
const { protect, authorize } = require('../../middleware/auth');

// Apply protection and admin authorization to all routes in this router
router.use(protect);
router.use(authorize('admin'));

router.get('/recent', bookingController.getRecentBookings);
router.get('/pending', bookingController.getPendingBookings);
router.get('/confirmed', bookingController.getConfirmedBookings);
router.get('/completed', bookingController.getCompletedBookings);
router.get('/cancelled', bookingController.getCancelledBookings);
router.get('/stats', bookingController.getBookingStats);
router.get('/search', bookingController.searchBookings);
router.get('/', bookingController.getAllBookings);
router.get('/:id', bookingController.getBookingById);
router.patch('/:id/status', bookingController.updateBookingStatus);
router.put('/:id/complete', bookingController.adminCompleteBooking);
router.put('/:id/cancel', bookingController.adminCancelBooking);

module.exports = router;
