const Notification = require('../models/Notification');

class NotificationService {
  static async sendRealTimeNotification(io, userId, notification) {
    try {
      io.to(`user:${userId}`).emit('notification', {
        success: true,
        data: {
          type: notification.type,
          title: notification.title,
          message: notification.message,
          description: notification.description,
          metadata: notification.metadata,
          createdAt: notification.createdAt,
        },
      });

      console.log(`✓ Real-time notification sent to user: ${userId}`);
    } catch (error) {
      console.error('Error sending real-time notification:', error);
    }
  }

  static async notifyBookingCreated(bookingId, booking, io = null) {
    try {
      const Booking = require('../models/Booking');
      const statusMessages = {
        confirmed: {
          vendor: '✓ Booking confirmed',
          customer: '✓ Your booking has been confirmed!',
        },
        on_the_way: {
          vendor: 'Service started',
          customer: '🚗 Service provider is on the way',
        },
        in_progress: {
          vendor: 'Service in progress',
          customer: '🔧 Service is in progress',
        },
        completed: {
          vendor: '✓ Service completed',
          customer: '✓ Service completed! Please rate your experience',
        },
        cancelled: {
          vendor: '✗ Booking cancelled',
          customer: '✗ Booking has been cancelled',
        },
      };

      const messages = statusMessages[status];
      if (!messages) return;

      const populatedBooking = await Booking.findById(bookingId)
        .populate('vendor', '_id firstName lastName')
        .populate('customer', '_id firstName lastName')
        .populate('service', 'name');

      if (!populatedBooking) return;

      const vendorNotification = await Notification.create({
        recipient: populatedBooking.vendor._id,
        recipientRole: 'vendor',
        type: `booking_${status}`,
        title: messages.vendor,
        message: `Booking ${populatedBooking.bookingId}: ${messages.vendor}`,
        relatedData: {
          bookingId: populatedBooking._id,
        },
        metadata: {
          action: `/vendor/bookings/${bookingId}`,
          actionLabel: 'View Booking',
          priority: status === 'cancelled' ? 'normal' : 'high',
        },
      });

      const customerNotification = await Notification.create({
        recipient: populatedBooking.customer._id,
        recipientRole: 'customer',
        type: `booking_${status}`,
        title: messages.customer,
        message: messages.customer,
        relatedData: {
          bookingId: populatedBooking._id,
        },
        metadata: {
          action: `/customer/bookings/${bookingId}`,
          actionLabel: 'View Details',
          priority: 'normal',
        },
      });

      if (io) {
        await this.sendRealTimeNotification(io, populatedBooking.vendor._id.toString(), vendorNotification);
        await this.sendRealTimeNotification(io, populatedBooking.customer._id.toString(), customerNotification);
      }

      return { vendorNotification, customerNotification };
    } catch (error) {
      console.error('Error in notifyBookingStatusUpdate:', error);
      throw error;
    }
  }

  static async notifyOtpSent(userId, otp, type, bookingId, io = null) {
    try {
      const typeLabel = type === 'start' ? 'Arrival' : 'Completion';
      
      const notification = await Notification.create({
        recipient: userId,
        recipientRole: 'vendor',
        type: 'otp_sent',
        title: `🔐 ${typeLabel} OTP Sent`,
        message: `Your ${typeLabel.toLowerCase()} OTP is: ${otp}`,
        description: `This OTP will expire in 10 minutes`,
        relatedData: {
          bookingId,
        },
        metadata: {
          action: `/vendor/bookings/${bookingId}`,
          actionLabel: 'Verify OTP',
          priority: 'high',
        },
      });

      if (io) {
        await this.sendRealTimeNotification(io, userId, notification);
      }

      return notification;
    } catch (error) {
      console.error('Error in notifyOtpSent:', error);
      throw error;
    }
  }

  static async getUnreadNotifications(userId, limit = 20) {
    try {
      const notifications = await Notification.find({
        recipient: userId,
        isRead: false,
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const unreadCount = await Notification.countDocuments({
        recipient: userId,
        isRead: false,
      });

      return {
        notifications,
        unreadCount,
      };
    } catch (error) {
      console.error('Error in getUnreadNotifications:', error);
      throw error;
    }
  }

  static async getNotifications(userId, page = 1, limit = 10, type = null) {
    try {
      const filter = { recipient: userId };
      if (type) {
        filter.type = type;
      }

      const skip = (page - 1) * limit;

      const notifications = await Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await Notification.countDocuments(filter);

      return {
        notifications,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error in getNotifications:', error);
      throw error;
    }
  }

  static async markAsRead(notificationId) {
    try {
      const notification = await Notification.findByIdAndUpdate(
        notificationId,
        {
          isRead: true,
          readAt: new Date(),
        },
        { new: true }
      );

      return notification;
    } catch (error) {
      console.error('Error in markAsRead:', error);
      throw error;
    }
  }

  static async markAllAsRead(userId) {
    try {
      await Notification.updateMany(
        { recipient: userId, isRead: false },
        {
          isRead: true,
          readAt: new Date(),
        }
      );

      return { success: true };
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
      throw error;
    }
  }

  static async clearNotifications(userId) {
    try {
      await Notification.deleteMany({ recipient: userId });
      return { success: true };
    } catch (error) {
      console.error('Error in clearNotifications:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;
