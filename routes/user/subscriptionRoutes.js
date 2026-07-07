const express = require('express');
const router = express.Router();

const { getUserSubscriptions } = require('../../controllers/subscriptionController');
const { protect, authorize } = require('../../middleware/auth');

router.use(protect);

router.get('/:id/subscriptions', getUserSubscriptions);

module.exports = router;
