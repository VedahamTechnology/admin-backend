const express = require('express');
const router = express.Router();

const { requestWithdrawal } = require('../controllers/withdrawalController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('vendor', 'worker'));

router.post('/', requestWithdrawal);

module.exports = router;
