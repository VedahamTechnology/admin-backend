const express = require('express');
const router = express.Router();

const { createPlan } = require('../../controllers/planController');
const { protect, authorize } = require('../../middleware/auth');

router.use(protect);
router.use(authorize('admin'));

router.post('/', createPlan);

module.exports = router;
