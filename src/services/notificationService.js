const Notification = require('../models/Notification');
const User = require('../models/User');
const emailService = require('./emailService');
const { NOTIFICATION_TYPES } = require('../utils/constants');

class NotificationService {
  // Send payment success notification
  async sendPaymentSuccessNotification(userId, order) {
    // Create notification
    await Notification.create({
      user_id: userId,
      title: 'Thanh toán thành công',
      message: `Đơn hàng #${order.order_code} của bạn đã được thanh toán thành công. Bạn có thể bắt đầu học ngay bây giờ!`,
      type: NOTIFICATION_TYPES.PAYMENT,
      related_id: order.id,
      related_type: 'order'
    });

    // Send email
    const user = await User.findById(userId);
    if (user) {
      await emailService.sendPaymentSuccessEmail(user.email, order, user.full_name);
    }
  }

  // Send payment failed notification
  async sendPaymentFailedNotification(userId, order) {
    await Notification.create({
      user_id: userId,
      title: 'Thanh toán thất bại',
      message: `Đơn hàng #${order.order_code} thanh toán thất bại. Vui lòng thử lại hoặc liên hệ hỗ trợ.`,
      type: NOTIFICATION_TYPES.PAYMENT,
      related_id: order.id,
      related_type: 'order'
    });
  }

  // Send payment rejected notification
  async sendPaymentRejectedNotification(userId, order) {
    await Notification.create({
      user_id: userId,
      title: 'Thanh toán bị từ chối',
      message: `Đơn hàng #${order.order_code} của bạn đã bị từ chối. Vui lòng kiểm tra lại thông tin thanh toán hoặc liên hệ hỗ trợ.`,
      type: NOTIFICATION_TYPES.PAYMENT,
      related_id: order.id,
      related_type: 'order'
    });
  }

  // Notify admin about new manual transfer
  async notifyAdminNewManualTransfer(order) {
    // Get all admins
    const { query } = require('../config/database');
    const admins = await query('SELECT id FROM users WHERE role_id = 1 AND status = "active"');

    for (const admin of admins) {
      await Notification.create({
        user_id: admin.id,
        title: 'Chuyển khoản thủ công mới',
        message: `Đơn hàng #${order.order_code} có chuyển khoản thủ công cần xác minh.`,
        type: NOTIFICATION_TYPES.SYSTEM,
        related_id: order.id,
        related_type: 'order'
      });
    }
  }

  // Send course enrollment notification
  async sendEnrollmentNotification(userId, courseName) {
    await Notification.create({
      user_id: userId,
      title: 'Ghi danh thành công',
      message: `Bạn đã được ghi danh vào khóa học "${courseName}". Chúc bạn học tập hiệu quả!`,
      type: NOTIFICATION_TYPES.COURSE
    });
  }

  // Send course completion notification
  async sendCompletionNotification(userId, courseName) {
    await Notification.create({
      user_id: userId,
      title: 'Hoàn thành khóa học',
      message: `Chúc mừng! Bạn đã hoàn thành khóa học "${courseName}". Chứng chỉ của bạn đã sẵn sàng.`,
      type: NOTIFICATION_TYPES.COURSE
    });
  }

  // Send promotion notification
  async sendPromotionNotification(userIds, title, message) {
    await Notification.createBulk(userIds, {
      title,
      message,
      type: NOTIFICATION_TYPES.PROMOTION
    });
  }

  // Send system notification to all users
  async sendSystemNotificationToAll(title, message) {
    const { query } = require('../config/database');
    const users = await query('SELECT id FROM users WHERE status = "active"');
    
    const userIds = users.map(u => u.id);
    
    await Notification.createBulk(userIds, {
      title,
      message,
      type: NOTIFICATION_TYPES.SYSTEM
    });
  }
}

module.exports = new NotificationService();