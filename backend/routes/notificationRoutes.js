const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware.protect);

// Get all notifications
router.get('/', notificationController.getNotifications);

// Get unread count
router.get('/unread-count', notificationController.getUnreadCount);

// Mark notification as read
router.put('/:id/read', notificationController.markAsRead);

// Mark all as read
router.put('/mark-all-read', notificationController.markAllAsRead);

// Clear all notifications
// Keep this route before '/:id' so Express does not treat "clear-all" as an ID.
router.delete('/clear-all', notificationController.clearAll);

// Delete notification
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;