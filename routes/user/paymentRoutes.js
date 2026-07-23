const express = require('express');
const router = express.Router();
const { createOrder, verifyPayment, handleWebhook } = require('../../controllers/paymentController');
const { protect, authorize } = require('../../middleware/auth');

// Webhook endpoint - must be public for Razorpay to call it
// It verifies the signature internally using RAZORPAY_WEBHOOK_SECRET
router.post('/webhook', handleWebhook);

router.use(protect);
router.use(authorize('customer'));

router.post('/create-order', createOrder);
router.post('/verify-payment', verifyPayment);

module.exports = router;
