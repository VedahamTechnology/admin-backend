const express = require('express');
const router = express.Router();

const {
  getPaymentOverview,
  getTransactions,
  getPaymentReports,
  exportPayments,
  refundPayment,
} = require('../../controllers/admin/paymentController');

const { protect, authorize } = require('../../middleware/auth');

router.use(protect);
router.use(authorize('admin'));

router.get('/overview', getPaymentOverview);
router.get('/transactions', getTransactions);
router.get('/reports', getPaymentReports);
router.get('/export', exportPayments);
router.post('/refund', refundPayment);

module.exports = router;
