const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const auth = require('../middlewares/auth');
const { isStaffOrAdmin, isAdmin } = require('../middlewares/roleCheck');

router.use(auth); // All notification routes require authentication

// User routes
router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.put('/:id/read', notificationController.markAsRead);
router.put('/read-all', notificationController.markAllAsRead);
router.delete('/:id', notificationController.deleteNotification);
router.get('/settings', notificationController.getNotificationSettings);
router.put('/settings', notificationController.updateNotificationSettings);

// Admin/Staff routes
router.post('/send', isStaffOrAdmin, notificationController.sendNotification);
router.post('/send-bulk', isAdmin, notificationController.sendBulkNotification);

module.exports = router;