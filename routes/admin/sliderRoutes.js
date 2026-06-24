const express = require('express');
const router = express.Router();

const {
  getAllSliders,
  getSliderById,
  createSlider,
  updateSlider,
  deleteSlider,
} = require('../../controllers/admin/sliderController');

const { protect, authorize } = require('../../middleware/auth');

router.use(protect);
router.use(authorize('admin'));

router.route('/')
  .get(getAllSliders)
  .post(createSlider);

router.route('/:id')
  .get(getSliderById)
  .put(updateSlider)
  .delete(deleteSlider);

module.exports = router;
