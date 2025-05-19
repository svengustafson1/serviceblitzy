const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const scheduleController = require('../controllers/schedule.controller');

// All schedule routes require authentication
router.use(authMiddleware);

// Regular schedule item routes
// Get all schedule items for current user
router.get('/', scheduleController.getUserScheduleItems);

// Get schedule items by date range
router.get('/range', scheduleController.getScheduleByDateRange);

// Recurring schedule pattern routes
// Get all recurring schedule patterns for current user
router.get('/recurring', scheduleController.getRecurringSchedules);

// Get recurring schedule pattern by ID
router.get('/recurring/:id', scheduleController.getRecurringScheduleById);

// Create new recurring schedule pattern
router.post('/recurring', scheduleController.createRecurringSchedule);

// Update recurring schedule pattern
router.put('/recurring/:id', scheduleController.updateRecurringSchedule);

// Delete recurring schedule pattern
router.delete('/recurring/:id', scheduleController.deleteRecurringSchedule);

// Generate schedule items from recurring pattern
router.post('/recurring/:id/generate', scheduleController.generateScheduleItemsFromPattern);

// Get schedule item by ID
router.get('/:id', scheduleController.getScheduleItemById);

// Create new schedule item
router.post('/', scheduleController.createScheduleItem);

// Update schedule item
router.put('/:id', scheduleController.updateScheduleItem);

// Delete schedule item
router.delete('/:id', scheduleController.deleteScheduleItem);

module.exports = router; 