const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const scheduleController = require('../controllers/schedule.controller');

// All schedule routes require authentication
router.use(authMiddleware);

// Get all schedule items for current user
router.get('/', scheduleController.getUserScheduleItems);

// Get schedule items by date range
router.get('/range', scheduleController.getScheduleByDateRange);

// Get schedule item by ID
router.get('/:id', scheduleController.getScheduleItemById);

// Create new schedule item
router.post('/', scheduleController.createScheduleItem);

// Update schedule item
router.put('/:id', scheduleController.updateScheduleItem);

// Delete schedule item
router.delete('/:id', scheduleController.deleteScheduleItem);

module.exports = router; 