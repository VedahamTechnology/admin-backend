const express = require('express');
const router = express.Router();
const bookingController = require('../../controllers/admin/bookingController');
const { protect, authorize } = require('../../middleware/auth');

/**
 * ADMIN BOOKING ROUTES
 * All routes require admin authentication
 */

// Apply protection and admin authorization to all routes in this router
router.use(protect);
router.use(authorize('admin'));

// Get recent bookings
router.get('/recent', bookingController.getRecentBookings);

// Get pending bookings (awaiting vendor confirmation)
router.get('/pending', bookingController.getPendingBookings);

// Get confirmed bookings (in progress)
router.get('/confirmed', bookingController.getConfirmedBookings);

// Get completed bookings
router.get('/completed', bookingController.getCompletedBookings);

// Get cancelled bookings
router.get('/cancelled', bookingController.getCancelledBookings);

// Get booking statistics and analytics
router.get('/stats', bookingController.getBookingStats);

// Search bookings
router.get('/search', bookingController.searchBookings);

// Get all bookings with filtering and pagination
router.get('/', bookingController.getAllBookings);

// Get specific booking details
router.get('/:id', bookingController.getBookingById);

// Update booking status (PATCH)
router.patch('/:id/status', bookingController.updateBookingStatus);

// Admin manually complete a booking
router.put('/:id/complete', bookingController.adminCompleteBooking);

// Admin cancel a booking
router.put('/:id/cancel', bookingController.adminCancelBooking);

module.exports = router;
