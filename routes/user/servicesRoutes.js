const express = require('express');
const router = express.Router();

const {
  getAllServices,
  getCategories,
  getServicesByCategory,
  getServiceDetails,
  searchServices,
  getTopRatedServices,
} = require('../../controllers/user/servicesController');

const { protect, authorize } = require('../../middleware/auth');

// Public routes - no authentication required
router.get('/categories', getCategories);
router.get('/top-rated', getTopRatedServices);
router.get('/search', searchServices);
router.get('/category/:categoryId', getServicesByCategory);
router.get('/', getAllServices);
router.get('/:serviceId', getServiceDetails);

module.exports = router;
