const express = require('express');
const router = express.Router();

const { createSubscription } = require('../controllers/subscriptionController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('customer'));

router.post('/', createSubscription);

module.exports = router;
