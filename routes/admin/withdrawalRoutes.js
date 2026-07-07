const express = require('express');
const router = express.Router();

const {
  getWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
} = require('../../controllers/admin/settlementController');

const { protect, authorize } = require('../../middleware/auth');

router.use(protect);
router.use(authorize('admin'));

router.get('/', getWithdrawals);
router.patch('/:id/approve', approveWithdrawal);
router.patch('/:id/reject', rejectWithdrawal);

module.exports = router;
