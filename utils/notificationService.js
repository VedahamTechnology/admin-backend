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
      const User = require('../models/User');

      const populatedBooking = await Booking.findById(bookingId)
        .populate('vendor', '_id firstName lastName email businessName')
        .populate('customer', '_id firstName lastName email')
        .populate('service', 'name basePrice')
        .lean();

      if (!populatedBooking) return;

      // Notify vendor about new booking pending confirmation
      const vendorNotification = await Notification.create({
        recipient: populatedBooking.vendor._id,
        recipientRole: 'vendor',
        type: 'booking_created',
        title: '� New Booking Request',
        message: `New booking received from ${populatedBooking.customer.firstName} ${populatedBooking.customer.lastName}`,
        description: `Service: ${populatedBooking.service.name} | Amount: ₹${populatedBooking.pricing.totalAmount}`,
        relatedData: {
          bookingId: populatedBooking._id,
          customerId: populatedBooking.customer._id,
          serviceId: populatedBooking.service._id,
          amount: populatedBooking.pricing.totalAmount,
        },
        metadata: {
          action: `/vendor/bookings/${bookingId}`,
          actionLabel: 'View & Confirm',
          priority: 'high',
        },
      });

      // Notify customer that booking is pending vendor confirmation
      const customerNotification = await Notification.create({
        recipient: populatedBooking.customer._id,
        recipientRole: 'customer',
        type: 'booking_created',
        title: '✅ Booking Request Sent',
        message: `Your booking request has been sent to ${populatedBooking.vendor.businessName || populatedBooking.vendor.firstName}`,
        description: `Booking ID: ${populatedBooking._id.toString().slice(-6).toUpperCase()} | Awaiting confirmation`,
        relatedData: {
          bookingId: populatedBooking._id,
          vendorId: populatedBooking.vendor._id,
          serviceId: populatedBooking.service._id,
        },
        metadata: {
          action: `/customer/bookings/${bookingId}`,
          actionLabel: 'View Details',
          priority: 'normal',
        },
      });

      // Notify admin about new booking
      const adminUser = await User.findOne({ role: 'admin' });
      if (adminUser) {
        const adminNotification = await Notification.create({
          recipient: adminUser._id,
          recipientRole: 'admin',
          type: 'booking_created',
          title: '📊 New Booking Created',
          message: `New Booking - ${populatedBooking.customer.firstName} → ${populatedBooking.vendor.businessName}`,
          description: `Amount: ₹${populatedBooking.pricing.totalAmount}`,
          relatedData: {
            bookingId: populatedBooking._id,
            customerId: populatedBooking.customer._id,
            vendorId: populatedBooking.vendor._id,
            amount: populatedBooking.pricing.totalAmount,
          },
          metadata: {
            action: `/admin/bookings/${bookingId}`,
            actionLabel: 'View Booking',
            priority: 'normal',
          },
        });

        if (io) {
          await this.sendRealTimeNotification(io, adminUser._id.toString(), adminNotification);
        }
      }

      if (io) {
        await this.sendRealTimeNotification(io, populatedBooking.vendor._id.toString(), vendorNotification);
        await this.sendRealTimeNotification(io, populatedBooking.customer._id.toString(), customerNotification);
      }

      return { vendorNotification, customerNotification };
    } catch (error) {
      console.error('Error in notifyBookingCreated:', error);
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

  static async notifyServicePendingApproval(serviceId, serviceName, vendorId, adminId) {
    try {
      const notification = await Notification.create({
        recipient: adminId,
        recipientRole: 'admin',
        type: 'service_pending_approval',
        title: '⏳ New Service Pending Review',
        message: `A new service "${serviceName}" has been submitted by a vendor and requires your review`,
        description: 'Please review the service details and approve or reject it',
        relatedData: {
          serviceId,
          vendorId,
        },
        metadata: {
          action: `/admin/services/pending/${serviceId}`,
          actionLabel: 'Review Service',
          priority: 'high',
        },
      });

      return notification;
    } catch (error) {
      console.error('Error in notifyServicePendingApproval:', error);
      throw error;
    }
  }

  static async notifyServiceApproved(serviceId, serviceName, vendorId) {
    try {
      const notification = await Notification.create({
        recipient: vendorId,
        recipientRole: 'vendor',
        type: 'service_approved',
        title: '✅ Service Approved',
        message: `Your service "${serviceName}" has been approved by admin`,
        description: 'Your service is now visible to customers and can be booked',
        relatedData: {
          serviceId,
        },
        metadata: {
          action: `/vendor/services/${serviceId}`,
          actionLabel: 'View Service',
          priority: 'high',
        },
      });

      return notification;
    } catch (error) {
      console.error('Error in notifyServiceApproved:', error);
      throw error;
    }
  }

  static async notifyServiceRejected(serviceId, serviceName, vendorId, rejectionReason) {
    try {
      const notification = await Notification.create({
        recipient: vendorId,
        recipientRole: 'vendor',
        type: 'service_rejected',
        title: '❌ Service Rejected',
        message: `Your service "${serviceName}" has been rejected by admin`,
        description: `Reason: ${rejectionReason}`,
        relatedData: {
          serviceId,
          rejectionReason,
        },
        metadata: {
          action: `/vendor/services/${serviceId}`,
          actionLabel: 'View Details',
          priority: 'normal',
        },
      });

      return notification;
    } catch (error) {
      console.error('Error in notifyServiceRejected:', error);
      throw error;
    }
  }

  static async notifyBookingConfirmed(bookingId, io = null) {
    try {
      const Booking = require('../models/Booking');
      const User = require('../models/User');

      const booking = await Booking.findById(bookingId)
        .populate('vendor', '_id firstName lastName email businessName')
        .populate('customer', '_id firstName lastName email')
        .populate('worker', '_id firstName lastName phone profileImage')
        .populate('service', 'name')
        .lean();

      if (!booking) return;

      let message = `${booking.vendor.businessName || booking.vendor.firstName} has confirmed your booking`;
      let description = `Booking ID: ${booking._id.toString().slice(-6).toUpperCase()} | Date: ${new Date(booking.bookingDate).toLocaleDateString()}`;

      if (booking.worker) {
        description += ` | Worker: ${booking.worker.firstName} ${booking.worker.lastName}`;
      }

      // Notify customer that booking is confirmed
      const customerNotification = await Notification.create({
        recipient: booking.customer._id,
        recipientRole: 'customer',
        type: 'booking_confirmed',
        title: '✅ Booking Confirmed!',
        message: message,
        description: description,
        relatedData: {
          bookingId: booking._id,
          vendorId: booking.vendor._id,
          serviceId: booking.service._id,
          workerId: booking.worker ? booking.worker._id : null,
        },
        metadata: {
          action: `/customer/bookings/${bookingId}`,
          actionLabel: 'View Details',
          priority: 'high',
        },
      });

      // Notify admin about booking confirmation
      const adminUser = await User.findOne({ role: 'admin' });
      if (adminUser) {
        const adminNotification = await Notification.create({
          recipient: adminUser._id,
          recipientRole: 'admin',
          type: 'booking_confirmed',
          title: '✅ Booking Confirmed',
          message: `Booking confirmed by vendor`,
          description: `Vendor: ${booking.vendor.businessName} | Customer: ${booking.customer.firstName}`,
          relatedData: {
            bookingId: booking._id,
            vendorId: booking.vendor._id,
            customerId: booking.customer._id,
          },
          metadata: {
            action: `/admin/bookings/${bookingId}`,
            actionLabel: 'View Booking',
            priority: 'normal',
          },
        });

        if (io) {
          await this.sendRealTimeNotification(io, adminUser._id.toString(), adminNotification);
        }
      }

      if (io) {
        await this.sendRealTimeNotification(io, booking.customer._id.toString(), customerNotification);
      }

      return customerNotification;
    } catch (error) {
      console.error('Error in notifyBookingConfirmed:', error);
      throw error;
    }
  }

  static async notifyWorkerAssigned(bookingId, io = null) {
    try {
      const Booking = require('../models/Booking');

      const booking = await Booking.findById(bookingId)
        .populate('customer', '_id')
        .populate('worker', 'firstName lastName phone profileImage')
        .populate('service', 'name')
        .lean();

      if (!booking || !booking.worker) return;

      const customerNotification = await Notification.create({
        recipient: booking.customer._id,
        recipientRole: 'customer',
        type: 'worker_assigned',
        title: '👷 Worker Assigned',
        message: `${booking.worker.firstName} ${booking.worker.lastName} has been assigned to your ${booking.service.name} service`,
        description: `Contact: ${booking.worker.phone}`,
        relatedData: {
          bookingId: booking._id,
          workerId: booking.worker._id,
        },
        metadata: {
          action: `/customer/bookings/${bookingId}`,
          actionLabel: 'View Details',
          priority: 'normal',
        },
      });

      if (io) {
        await this.sendRealTimeNotification(io, booking.customer._id.toString(), customerNotification);
      }

      return customerNotification;
    } catch (error) {
      console.error('Error in notifyWorkerAssigned:', error);
      throw error;
    }
  }

  static async notifyBookingCompleted(bookingId, io = null) {
    try {
      const Booking = require('../models/Booking');
      const User = require('../models/User');

      const booking = await Booking.findById(bookingId)
        .populate('vendor', '_id firstName lastName businessName')
        .populate('customer', '_id firstName lastName email')
        .populate('service', 'name')
        .lean();

      if (!booking) return;

      // Notify customer
      const customerNotification = await Notification.create({
        recipient: booking.customer._id,
        recipientRole: 'customer',
        type: 'booking_completed',
        title: '🎊 Service Completed!',
        message: `Your service for ${booking.service.name} has been marked as completed.`,
        description: `Booking ID: ${booking._id.toString().slice(-6).toUpperCase()} | Thank you for using Homster!`,
        relatedData: {
          bookingId: booking._id,
          vendorId: booking.vendor._id,
        },
        metadata: {
          action: `/customer/bookings/${bookingId}`,
          actionLabel: 'Leave a Review',
          priority: 'high',
        },
      });

      // Notify vendor
      const vendorNotification = await Notification.create({
        recipient: booking.vendor._id,
        recipientRole: 'vendor',
        type: 'booking_completed',
        title: '💰 Payment Received & Booking Completed',
        message: `Booking has been successfully completed and paid.`,
        description: `Customer: ${booking.customer.firstName} | Service: ${booking.service.name}`,
        relatedData: {
          bookingId: booking._id,
          customerId: booking.customer._id,
        },
        metadata: {
          action: `/vendor/bookings/${bookingId}`,
          actionLabel: 'View Details',
          priority: 'normal',
        },
      });

      if (io) {
        await this.sendRealTimeNotification(io, booking.customer._id.toString(), customerNotification);
        await this.sendRealTimeNotification(io, booking.vendor._id.toString(), vendorNotification);
      }

      return { customerNotification, vendorNotification };
    } catch (error) {
      console.error('Error in notifyBookingCompleted:', error);
      throw error;
    }
  }

  static async notifyWorkDone(bookingId, io = null) {
    try {
      const Booking = require('../models/Booking');
      const booking = await Booking.findById(bookingId)
        .populate('customer', '_id firstName')
        .populate('vendor', 'businessName firstName')
        .populate('service', 'name')
        .lean();

      if (!booking) return;

      const customerNotification = await Notification.create({
        recipient: booking.customer._id,
        recipientRole: 'customer',
        type: 'work_done',
        title: '🛠️ Service Work Finished',
        message: `Work for ${booking.service.name} is finished. Please proceed to payment.`,
        description: `Booking ID: ${booking._id.toString().slice(-6).toUpperCase()} | Amount: ₹${booking.pricing.totalAmount}`,
        relatedData: {
          bookingId: booking._id,
          amount: booking.pricing.totalAmount,
        },
        metadata: {
          action: `/customer/payments/${bookingId}`,
          actionLabel: 'Pay Now',
          priority: 'high',
        },
      });

      if (io) {
        await this.sendRealTimeNotification(io, booking.customer._id.toString(), customerNotification);
      }

      return customerNotification;
    } catch (error) {
      console.error('Error in notifyWorkDone:', error);
      throw error;
    }
  }

  static async notifyBookingRejected(bookingId, rejectionReason, io = null) {
    try {
      const Booking = require('../models/Booking');
      const User = require('../models/User');

      const booking = await Booking.findById(bookingId)
        .populate('vendor', '_id firstName lastName email businessName')
        .populate('customer', '_id firstName lastName email')
        .populate('service', 'name')
        .lean();

      if (!booking) return;

      // Notify customer that booking is rejected
      const customerNotification = await Notification.create({
        recipient: booking.customer._id,
        recipientRole: 'customer',
        type: 'booking_cancelled',
        title: '❌ Booking Rejected',
        message: `${booking.vendor.businessName || booking.vendor.firstName} has rejected your booking`,
        description: `Reason: ${rejectionReason}`,
        relatedData: {
          bookingId: booking._id,
          vendorId: booking.vendor._id,
        },
        metadata: {
          action: `/customer/bookings/${bookingId}`,
          actionLabel: 'View Details',
          priority: 'high',
        },
      });

      // Notify admin
      const adminUser = await User.findOne({ role: 'admin' });
      if (adminUser) {
        const adminNotification = await Notification.create({
          recipient: adminUser._id,
          recipientRole: 'admin',
          type: 'booking_cancelled',
          title: '❌ Booking Rejected',
          message: `Booking rejected by vendor`,
          description: `Reason: ${rejectionReason}`,
          relatedData: {
            bookingId: booking._id,
            vendorId: booking.vendor._id,
            customerId: booking.customer._id,
          },
          metadata: {
            action: `/admin/bookings/${bookingId}`,
            actionLabel: 'View Booking',
            priority: 'normal',
          },
        });

        if (io) {
          await this.sendRealTimeNotification(io, adminUser._id.toString(), adminNotification);
        }
      }

      if (io) {
        await this.sendRealTimeNotification(io, booking.customer._id.toString(), customerNotification);
      }

      return customerNotification;
    } catch (error) {
      console.error('Error in notifyBookingRejected:', error);
      throw error;
    }
  }

  static async notifyBookingRescheduled(bookingId, rescheduledBy, io = null) {
    try {
      const Booking = require('../models/Booking');
      const User = require('../models/User');

      const booking = await Booking.findById(bookingId)
        .populate('vendor', '_id firstName lastName businessName')
        .populate('customer', '_id firstName lastName')
        .populate('service', 'name')
        .lean();

      if (!booking) return;

      const isCustomer = rescheduledBy === 'customer';
      const recipientId = isCustomer ? booking.vendor._id : booking.customer._id;
      const recipientRole = isCustomer ? 'vendor' : 'customer';
      const actorName = isCustomer
        ? `${booking.customer.firstName} ${booking.customer.lastName}`
        : (booking.vendor.businessName || booking.vendor.firstName);

      const notification = await Notification.create({
        recipient: recipientId,
        recipientRole: recipientRole,
        type: 'booking_rescheduled',
        title: '📅 Booking Rescheduled',
        message: `Booking for ${booking.service.name} has been rescheduled by ${actorName}`,
        description: `New Date: ${new Date(booking.bookingDate).toLocaleDateString()} | Slot: ${booking.timeSlot.startTime} - ${booking.timeSlot.endTime}`,
        relatedData: {
          bookingId: booking._id,
        },
        metadata: {
          action: `/${recipientRole}/bookings/${bookingId}`,
          actionLabel: 'View Booking',
          priority: 'high',
        },
      });

      if (io) {
        await this.sendRealTimeNotification(io, recipientId.toString(), notification);
      }

      return notification;
    } catch (error) {
      console.error('Error in notifyBookingRescheduled:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;
