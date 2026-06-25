const express = require('express');
const router = express.Router();
const addressController = require('../../controllers/user/addressController');
const { protect } = require('../../middleware/auth');

// All address routes are protected (require login)
router.use(protect);

router.post('/', addressController.addAddress);
router.get('/', addressController.getAddresses);

router.route('/:addressId')
  .put(addressController.updateAddress)
  .delete(addressController.deleteAddress);

router.put('/:addressId/default', addressController.setDefaultAddress);

module.exports = router;
