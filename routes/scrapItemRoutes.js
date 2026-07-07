const express = require('express');
const router = express.Router();

const { createScrapItem } = require('../controllers/scrapItemController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('customer'));

router.post('/', createScrapItem);

module.exports = router;
