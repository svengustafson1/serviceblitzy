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

// Get upcoming scheduled services
router.get('/upcoming', scheduleController.getUpcomingScheduledServices);

// Recurring schedule pattern management
// Get all recurring patterns for current user
router.get('/recurring/patterns', scheduleController.getUserRecurringPatterns);

// Get recurring pattern by ID
router.get('/recurring/patterns/:id', scheduleController.getRecurringPatternById);

// Create new recurring pattern
router.post('/recurring/patterns', scheduleController.createRecurringPattern);

// Update recurring pattern
router.put('/recurring/patterns/:id', scheduleController.updateRecurringPattern);

// Delete recurring pattern
router.delete('/recurring/patterns/:id', scheduleController.deleteRecurringPattern);

// Generate schedule items from recurring pattern
router.post('/recurring/generate/:patternId', scheduleController.generateScheduleFromPattern);

// Add exception date to recurring pattern
router.post('/recurring/patterns/:id/exceptions', scheduleController.addPatternException);

// Remove exception date from recurring pattern
router.delete('/recurring/patterns/:id/exceptions/:exceptionId', scheduleController.removePatternException);

// Trigger notifications for upcoming scheduled services
router.post('/notify/upcoming', scheduleController.notifyUpcomingServices);

// Get schedule item by ID
router.get('/:id', scheduleController.getScheduleItemById);

// Create new schedule item
router.post('/', scheduleController.createScheduleItem);

// Update schedule item
router.put('/:id', scheduleController.updateScheduleItem);

// Delete schedule item
router.delete('/:id', scheduleController.deleteScheduleItem);

module.exports = router;