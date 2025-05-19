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

// Get notifications with delivery status filtering
router.get('/status/:status', authMiddleware, notificationController.getNotificationsByDeliveryStatus);

// Update notification delivery status
router.patch('/delivery-status', authMiddleware, notificationController.updateDeliveryStatus);

// Retry failed notification delivery
router.post('/retry-delivery', authMiddleware, notificationController.retryFailedDelivery);

// Poll for new notifications (fallback when WebSocket is unavailable)
router.get('/poll', authMiddleware, notificationController.pollNewNotifications);

// Subscribe to WebSocket notifications
router.post('/subscribe', authMiddleware, notificationController.subscribeToNotifications);

// Unsubscribe from WebSocket notifications
router.post('/unsubscribe', authMiddleware, notificationController.unsubscribeFromNotifications);

module.exports = router;