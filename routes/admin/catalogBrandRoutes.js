const express = require('express');
const router = express.Router();

const {
  getAllBrandsAdmin,
  getBrandByIdAdmin,
  createBrand,
  updateBrand,
  deleteBrand,
} = require('../../controllers/catalogController');

const { protect, authorize } = require('../../middleware/auth');
const { upload } = require('../../config/cloudinary');

router.use(protect);
router.use(authorize('admin'));

router.get('/', getAllBrandsAdmin);
router.get('/:id', getBrandByIdAdmin);
router.post('/', upload.single('logo'), createBrand);
router.put('/:id', upload.single('logo'), updateBrand);
router.delete('/:id', deleteBrand);

module.exports = router;
