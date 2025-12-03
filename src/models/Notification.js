const { query, queryOne } = require('../config/database');

class Notification {
  // Create notification
  static async create(notificationData) {
    const result = await query(
      `INSERT INTO notifications (user_id, title, message, type, related_id, related_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        notificationData.user_id,
        notificationData.title,
        notificationData.message,
        notificationData.type || 'system',
        notificationData.related_id || null,
        notificationData.related_type || null
      ]
    );
    
    return result.insertId;
  }

  // Create bulk notifications
  static async createBulk(userIds, notificationData) {
    const values = userIds.map(userId => [
      userId,
      notificationData.title,
      notificationData.message,
      notificationData.type || 'system',
      notificationData.related_id || null,
      notificationData.related_type || null
    ]);
    
    await query(
      `INSERT INTO notifications (user_id, title, message, type, related_id, related_type)
       VALUES ?`,
      [values]
    );
  }

  // Get user notifications
  static async getUserNotifications(userId, filters = {}) {
    let sql = 'SELECT * FROM notifications WHERE user_id = ?';
    const params = [userId];
    
    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    
    if (filters.type) {
      sql += ' AND type = ?';
      params.push(filters.type);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    if (filters.limit) {
      sql += ' LIMIT ? OFFSET ?';
      params.push(parseInt(filters.limit), parseInt(filters.offset || 0));
    }
    
    return await query(sql, params);
  }

  // Get unread count
  static async getUnreadCount(userId) {
    const result = await queryOne(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND status = "unread"',
      [userId]
    );
    return result.count;
  }

  // Mark as read
  static async markAsRead(notificationId, userId) {
    await query(
      'UPDATE notifications SET status = "read", read_at = NOW() WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );
  }

  // Mark all as read
  static async markAllAsRead(userId) {
    await query(
      'UPDATE notifications SET status = "read", read_at = NOW() WHERE user_id = ? AND status = "unread"',
      [userId]
    );
  }

  // Delete notification
  static async delete(notificationId, userId) {
    await query(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );
  }

  // Get notification settings
  static async getSettings(userId) {
    let settings = await queryOne(
      'SELECT * FROM notification_settings WHERE user_id = ?',
      [userId]
    );
    
    // Create default settings if not exist
    if (!settings) {
      await query(
        'INSERT INTO notification_settings (user_id) VALUES (?)',
        [userId]
      );
      settings = await this.getSettings(userId);
    }
    
    return settings;
  }

  // Update notification settings
  static async updateSettings(userId, settings) {
    const fields = [];
    const values = [];
    
    const allowedFields = [
      'email_notifications', 'push_notifications', 'course_updates',
      'payment_updates', 'promotions'
    ];
    
    allowedFields.forEach(field => {
      if (settings[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(settings[field]);
      }
    });
    
    values.push(userId);
    
    await query(
      `UPDATE notification_settings SET ${fields.join(', ')} WHERE user_id = ?`,
      values
    );
  }
}

module.exports = Notification;