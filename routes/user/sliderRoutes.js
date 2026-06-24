const express = require('express');
const router = express.Router();

const { getActiveSliders } = require('../../controllers/user/sliderController');

// Public route to get active slider offers
router.get('/', getActiveSliders);

module.exports = router;
