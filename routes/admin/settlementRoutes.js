const express = require('express');
const router = express.Router();

const {
  getVendorSettlements,
  getPendingSettlements,
  settleVendor,
  blockVendor,
  unblockVendor,
  getSettlementHistory,
  getWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
} = require('../../controllers/admin/settlementController');

const { protect, authorize } = require('../../middleware/auth');

router.use(protect);
router.use(authorize('admin'));

router.get('/vendors', getVendorSettlements);
router.get('/pending', getPendingSettlements);
router.get('/history', getSettlementHistory);
router.post('/:vendorId/settle', settleVendor);
router.patch('/:vendorId/block', blockVendor);
router.patch('/:vendorId/unblock', unblockVendor);
router.get('/withdrawals', getWithdrawals);
router.patch('/withdrawals/:id/approve', approveWithdrawal);
router.patch('/withdrawals/:id/reject', rejectWithdrawal);

module.exports = router;
