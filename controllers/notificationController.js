const Notification = require('../models/Notification');
const NotificationService = require('../utils/notificationService');

/**
 * Get all notifications for logged-in user
 */
exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 10, type } = req.query;

    const result = await NotificationService.getNotifications(
      req.user._id,
      parseInt(page),
      parseInt(limit),
      type
    );

    return res.status(200).json({
      success: true,
      message: 'Notifications retrieved successfully',
      data: result.notifications,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get unread notifications count
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const { notifications, unreadCount } = await NotificationService.getUnreadNotifications(
      req.user._id,
      5
    );

    return res.status(200).json({
      success: true,
      message: 'Unread notifications retrieved',
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching unread notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Mark single notification as read
 */
exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    // Verify ownership
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to read this notification',
      });
    }

    const updated = await NotificationService.markAsRead(notificationId);

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: updated,
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating notification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Mark all notifications as read for user
 */
exports.markAllAsRead = async (req, res) => {
  try {
    await NotificationService.markAllAsRead(req.user._id);

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Delete single notification
 */
exports.deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;

    // Verify ownership
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this notification',
      });
    }

    await Notification.findByIdAndDelete(notificationId);

    return res.status(200).json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting notification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Clear all notifications for user
 */
exports.clearAll = async (req, res) => {
  try {
    await NotificationService.clearNotifications(req.user._id);

    return res.status(200).json({
      success: true,
      message: 'All notifications cleared',
    });
  } catch (error) {
    console.error('Clear all notifications error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error clearing notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get notifications by type
 */
exports.getNotificationsByType = async (req, res) => {
  try {
    const { type } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Validate type
    const validTypes = [
      'booking_created',
      'booking_confirmed',
      'booking_cancelled',
      'vendor_arrived',
      'service_completed',
      'payment_received',
      'review_posted',
      'booking_rescheduled',
      'otp_sent',
    ];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid notification type. Valid types: ${validTypes.join(', ')}`,
      });
    }

    const result = await NotificationService.getNotifications(
      req.user._id,
      parseInt(page),
      parseInt(limit),
      type
    );

    return res.status(200).json({
      success: true,
      message: `${type} notifications retrieved`,
      data: result.notifications,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Get notifications by type error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get notification preferences (for future expansion)
 */
exports.getPreferences = async (req, res) => {
  try {
    // This can be expanded to store user notification preferences
    return res.status(200).json({
      success: true,
      message: 'Notification preferences',
      data: {
        inApp: true,
        push: true,
        email: false,
        sms: false,
        emailNotificationTypes: [
          'booking_cancelled',
          'payment_received',
        ],
      },
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching preferences',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
