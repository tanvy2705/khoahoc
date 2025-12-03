
const Notification = require('../models/Notification');
const User = require('../models/User');
const ResponseHandler = require('../utils/responseHandler');
const asyncHandler = require('../middlewares/asyncHandler');
const Helpers = require('../utils/helpers');

class NotificationController {
  // Get user notifications
  getNotifications = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status, type } = req.query;
    const pagination = Helpers.getPagination(page, limit);

    const notifications = await Notification.getUserNotifications(req.user.id, {
      ...pagination,
      status,
      type
    });

    return ResponseHandler.success(res, notifications);
  });

  // Get unread count
  getUnreadCount = asyncHandler(async (req, res) => {
    const count = await Notification.getUnreadCount(req.user.id);
    return ResponseHandler.success(res, { count });
  });

  // Mark as read
  markAsRead = asyncHandler(async (req, res) => {
    const { id } = req.params;

    await Notification.markAsRead(id, req.user.id);

    return ResponseHandler.success(res, null, 'Notification marked as read');
  });

  // Mark all as read
  markAllAsRead = asyncHandler(async (req, res) => {
    await Notification.markAllAsRead(req.user.id);
    return ResponseHandler.success(res, null, 'All notifications marked as read');
  });

  // Delete notification
  deleteNotification = asyncHandler(async (req, res) => {
    const { id } = req.params;

    await Notification.delete(id, req.user.id);

    return ResponseHandler.success(res, null, 'Notification deleted successfully');
  });

  // Send notification (Admin/Staff)
  sendNotification = asyncHandler(async (req, res) => {
    const { user_id, title, message, type, related_id, related_type } = req.body;

    // Check if user exists
    const user = await User.findById(user_id);
    if (!user) {
      return ResponseHandler.notFound(res, 'User not found');
    }

    await Notification.create({
      user_id,
      title,
      message,
      type,
      related_id,
      related_type
    });

    return ResponseHandler.created(res, null, 'Notification sent successfully');
  });

  // Send bulk notification (Admin)
  sendBulkNotification = asyncHandler(async (req, res) => {
    const { user_ids, title, message, type, related_id, related_type } = req.body;

    if (!user_ids || user_ids.length === 0) {
      return ResponseHandler.badRequest(res, 'User IDs are required');
    }

    await Notification.createBulk(user_ids, {
      title,
      message,
      type,
      related_id,
      related_type
    });

    return ResponseHandler.created(res, null, `Notification sent to ${user_ids.length} users`);
  });

  // Get notification settings
  getNotificationSettings = asyncHandler(async (req, res) => {
    const settings = await Notification.getSettings(req.user.id);
    return ResponseHandler.success(res, settings);
  });

  // Update notification settings
  updateNotificationSettings = asyncHandler(async (req, res) => {
    const {
      email_notifications,
      push_notifications,
      course_updates,
      payment_updates,
      promotions
    } = req.body;

    await Notification.updateSettings(req.user.id, {
      email_notifications,
      push_notifications,
      course_updates,
      payment_updates,
      promotions
    });

    return ResponseHandler.success(res, null, 'Notification settings updated successfully');
  });
}

module.exports = new NotificationController();