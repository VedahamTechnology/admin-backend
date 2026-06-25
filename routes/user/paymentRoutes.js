const express = require('express');
const router = express.Router();
const { createOrder, verifyPayment } = require('../../controllers/paymentController');
const { protect, authorize } = require('../../middleware/auth');

router.use(protect);
router.use(authorize('customer'));

router.post('/create-order', createOrder);
router.post('/verify-payment', verifyPayment);

module.exports = router;