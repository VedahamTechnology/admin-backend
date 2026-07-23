const express = require('express');
const router  = express.Router();

const {
  getAllUsers,
  getUserById,
  blockUser,
  unblockUser,
  deleteUser,
  searchUsers,
} = require('../../controllers/admin/userController');
const { getUserAnalytics } = require('../../controllers/admin/analyticsController');

const { protect, authorize } = require('../../middleware/auth');

router.use(protect);
router.use(authorize('admin'));

router.get('/', getAllUsers);
router.get('/search', searchUsers);
router.get('/analytics', getUserAnalytics);
router.get('/:id', getUserById);
router.put('/:id/block', blockUser);
router.put('/:id/unblock', unblockUser);
router.delete('/:id', deleteUser);

module.exports = router;
