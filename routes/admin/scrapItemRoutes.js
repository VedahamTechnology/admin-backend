const express = require('express');
const router = express.Router();

const {
  getAllScrapItems,
  updateScrapItemStatus,
} = require('../../controllers/scrapItemController');

const { protect, authorize } = require('../../middleware/auth');

router.use(protect);
router.use(authorize('admin'));

router.get('/', getAllScrapItems);
router.patch('/:id/status', updateScrapItemStatus);

module.exports = router;
