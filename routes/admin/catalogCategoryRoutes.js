const express = require('express');
const router = express.Router();

const {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  bulkUpdateCategoryStatus,
} = require('../../controllers/admin/categoryController');

const { protect, authorize } = require('../../middleware/auth');
const { upload } = require('../../config/cloudinary');

router.use(protect, authorize('admin'));

router.post('/', upload.single('image'), createCategory);
router.get('/', getAllCategories);
router.get('/:id', getCategoryById);
router.put('/:id', upload.single('image'), updateCategory);
router.delete('/:id', deleteCategory);
router.post('/bulk/status', bulkUpdateCategoryStatus);

module.exports = router;
