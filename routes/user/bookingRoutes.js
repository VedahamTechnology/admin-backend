const express = require('express');
const router = express.Router();
const bookingController = require('../../controllers/user/bookingController');
const { protect, authorize } = require('../../middleware/auth');

router.use(protect);
router.use(authorize('customer'));

router.post('/', bookingController.createBooking);
router.get('/', bookingController.getMyBookings);
router.get('/:bookingId', bookingController.getBookingDetails);
router.patch('/:bookingId/cancel', bookingController.cancelBooking);

module.exports = router;
