const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const notificationController = require('../controllers/notification.controller');

// Get all user notifications (with filtering and pagination)
router.get('/', authMiddleware, notificationController.getUserNotifications);

// Get notification counts
router.get('/count', authMiddleware, notificationController.getNotificationCount);

// Get a specific notification
router.get('/:id', authMiddleware, notificationController.getNotificationById);

// Mark notifications as read
router.patch('/mark-read', authMiddleware, notificationController.markNotificationsAsRead);

// Delete notifications
router.delete('/', authMiddleware, notificationController.deleteNotifications);

module.exports = router; 