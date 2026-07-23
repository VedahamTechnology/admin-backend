const express = require('express');
const router = express.Router();
const {
    getAllServices,
    getServiceDetails,
    getCategories,
    getTopRatedServices,
    getServicesByCategory,
    searchServices
} = require('../../controllers/user/servicesController');

router.get('/', getAllServices);
router.get('/categories', getCategories);
router.get('/search', searchServices);
router.get('/top-rated', getTopRatedServices);
router.get('/category/:categoryId', getServicesByCategory);
router.get('/:serviceId', getServiceDetails);

module.exports = router;
