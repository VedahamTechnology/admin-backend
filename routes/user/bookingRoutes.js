const express = require('express');
const router = express.Router();

const {
  createBooking,
  getMyBookings,
  getBookingDetails,
  cancelBooking,
  rescheduleBooking,
  getBookingStats,
  searchBookings,
  getVendorAvailability,
} = require('../../controllers/user/bookingController');

const { protect, authorize } = require('../../middleware/auth');

// All routes require user authentication
router.use(protect);
router.use(authorize('customer'));

// Booking routes
router.post('/', createBooking);
router.get('/', getMyBookings);
router.get('/search', searchBookings);
router.get('/stats', getBookingStats);
router.get('/vendor-availability/:vendorId', getVendorAvailability);
router.get('/:bookingId', getBookingDetails);
router.put('/:bookingId/cancel', cancelBooking);
router.put('/:bookingId/reschedule', rescheduleBooking);

module.exports = router;
