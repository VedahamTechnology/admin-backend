const express = require('express');
const router = express.Router();

const {
  getCategories,
  getBrands,
  getBrandServices,
} = require('../controllers/catalogController');

router.get('/categories', getCategories);
router.get('/brands', getBrands);
router.get('/brands/:id/services', getBrandServices);

module.exports = router;
