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
  submitProofOfWork,
  verifyStartOtp,
  verifyEndOtp,
  assignWorker,
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
router.put('/:id/assign-worker', assignWorker);
router.post('/:id/verify-start-otp', verifyStartOtp);
router.post('/:id/verify-end-otp', verifyEndOtp);
router.post('/:id/proof-of-work', submitProofOfWork);
router.put('/:id/cancel', cancelBooking);

module.exports = router;
