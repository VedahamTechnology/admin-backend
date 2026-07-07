const express = require('express');
const router = express.Router();

const { getAllReviews, deleteReview } = require('../../controllers/admin/reviewController');
const { protect, authorize } = require('../../middleware/auth');

router.use(protect);
router.use(authorize('admin'));

router.get('/', getAllReviews);
router.delete('/:id', deleteReview);

module.exports = router;
