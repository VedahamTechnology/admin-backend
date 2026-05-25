const express = require('express');
const router = express.Router();

const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAll,
  getNotificationsByType,
  getPreferences,
} = require('../controllers/notificationController');

const { protect } = require('../middleware/auth');

/**
 * All routes require authentication
 */
router.use(protect);

/**
 * GET ENDPOINTS
 */
// Get all notifications with pagination
router.get('/', getNotifications);

// Get unread notifications count
router.get('/unread/count', getUnreadCount);

// Get notifications by type
router.get('/type/:type', getNotificationsByType);

// Get notification preferences
router.get('/preferences', getPreferences);

/**
 * PUT ENDPOINTS
 */
// Mark single notification as read
router.put('/:notificationId/read', markAsRead);

// Mark all notifications as read
router.put('/read/all', markAllAsRead);

/**
 * DELETE ENDPOINTS
 */
// Delete single notification
router.delete('/:notificationId', deleteNotification);

// Clear all notifications
router.delete('/', clearAll);

module.exports = router;
