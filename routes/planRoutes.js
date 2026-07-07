const express = require('express');
const router = express.Router();

const { getPlans } = require('../controllers/planController');

router.get('/', getPlans);

module.exports = router;
