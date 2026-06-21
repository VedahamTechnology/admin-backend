const express = require('express');
const router = express.Router();
const workerController = require('../../controllers/vendor/workerController');
const { protect, authorize, verifyVendorApproval } = require('../../middleware/auth');
const { upload } = require('../../config/cloudinary');

// All routes require vendor authentication and approval
router.use(protect);
router.use(authorize('vendor'));
router.use(verifyVendorApproval);

// Add a new worker (Request goes to admin)
router.post('/', upload.fields([
  { name: 'aadharFront', maxCount: 1 }
]), workerController.addWorker);

// Get all workers of this vendor
router.get('/', workerController.getMyWorkers);

// Get specific worker details
router.get('/:id', workerController.getWorkerDetails);

module.exports = router;
