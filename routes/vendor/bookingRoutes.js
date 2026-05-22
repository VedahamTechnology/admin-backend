const express = require('express');
const router = express.Router();

const {
  getMyBookings,
  getBookingById,
  acceptBooking,
  rejectBooking,
  completeBooking,
  cancelBooking,
  getBookingStats,
  searchBookings,
} = require('../../controllers/vendor/bookingController');

const { protect, authorize, verifyVendorApproval } = require('../../middleware/auth');

// All routes require vendor authentication and approval
router.use(protect);
router.use(authorize('vendor'));
router.use(verifyVendorApproval);

// Booking management routes
router.get('/', getMyBookings);
router.get('/search', searchBookings);
router.get('/stats', getBookingStats);
router.get('/:id', getBookingById);
router.put('/:id/accept', acceptBooking);
router.put('/:id/reject', rejectBooking);
router.put('/:id/complete', completeBooking);
router.put('/:id/cancel', cancelBooking);

module.exports = router;
