/**
 * Recurring Schedule Service
 * 
 * Manages pattern-based recurring service schedules using the RRule specification (RFC 5545).
 * This service processes recurrence patterns (daily, weekly, monthly, with exceptions),
 * generates individual schedule entries based on patterns, detects and resolves scheduling
 * conflicts, and triggers notifications for upcoming services.
 */

const { RRule, RRuleSet, rrulestr } = require('rrule');
const moment = require('moment-timezone');

// Default timezone for schedule processing
const DEFAULT_TIMEZONE = 'America/New_York';

// Default number of occurrences to generate at once
const DEFAULT_OCCURRENCE_COUNT = 4;

// Maximum number of retry attempts for failed job executions
const MAX_RETRY_ATTEMPTS = 3;

// Default conflict resolution strategy
// 'skip' - Skip conflicting occurrences
// 'reschedule' - Try to reschedule to next available time
// 'error' - Throw an error when conflicts are detected
const DEFAULT_CONFLICT_STRATEGY = 'reschedule';

/**
 * RecurringScheduleService class
 * Handles all recurring schedule operations using RRule specification
 */
class RecurringScheduleService {
  /**
   * Constructor
   * @param {Object} db - Database connection pool
   * @param {Object} notificationService - Notification service for alerts
   */
  constructor(db, notificationService) {
    this.db = db;
    this.notificationService = notificationService;
    this.retryQueue = new Map(); // Map to track retry attempts
    this.alertThreshold = 3; // Number of failures before triggering an alert
  }

  /**
   * Create a new recurring schedule
   * @param {Object} scheduleData - Schedule data including pattern information
   * @param {number} scheduleData.serviceRequestId - ID of the parent service request
   * @param {Object} scheduleData.pattern - Pattern information for RRule
   * @param {string} scheduleData.pattern.freq - Frequency (DAILY, WEEKLY, MONTHLY, YEARLY)
   * @param {number} scheduleData.pattern.interval - Interval between occurrences
   * @param {Array} scheduleData.pattern.byweekday - Days of week (optional)
   * @param {Array} scheduleData.pattern.bymonthday - Days of month (optional)
   * @param {Array} scheduleData.pattern.bymonth - Months (optional)
   * @param {Date} scheduleData.pattern.dtstart - Start date
   * @param {Date|string} scheduleData.pattern.until - End date (optional)
   * @param {number} scheduleData.pattern.count - Number of occurrences (optional)
   * @param {Array} scheduleData.excludeDates - Dates to exclude (optional)
   * @param {string} scheduleData.timezone - Timezone (optional)
   * @param {string} scheduleData.conflictStrategy - Strategy for handling conflicts (optional)
   * @returns {Promise<Object>} Created recurring schedule
   */
  async createRecurringSchedule(scheduleData) {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Generate a unique identifier for idempotent creation
      const idempotencyKey = this._generateIdempotencyKey(scheduleData);
      
      // Check if schedule with this idempotency key already exists
      const existingSchedule = await client.query(
        'SELECT id FROM recurring_schedules WHERE idempotency_key = $1',
        [idempotencyKey]
      );
      
      if (existingSchedule.rows.length > 0) {
        // Schedule already exists, return it
        const scheduleId = existingSchedule.rows[0].id;
        await client.query('COMMIT');
        return this.getRecurringScheduleById(scheduleId);
      }
      
      // Create RRule from pattern
      const rruleOptions = this._createRRuleOptions(scheduleData.pattern);
      const rule = new RRule(rruleOptions);
      const rruleString = rule.toString();
      
      // Calculate next run date
      const nextRun = rule.after(new Date(), true);
      
      if (!nextRun) {
        throw new Error('Invalid recurrence pattern: no future occurrences');
      }
      
      // Store the recurring schedule
      const result = await client.query(
        `INSERT INTO recurring_schedules 
          (service_request_id, rrule_pattern, next_run, idempotency_key, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING id`,
        [scheduleData.serviceRequestId, rruleString, nextRun, idempotencyKey]
      );
      
      const scheduleId = result.rows[0].id;
      
      // Handle excluded dates if provided
      if (scheduleData.excludeDates && scheduleData.excludeDates.length > 0) {
        await this._storeExcludedDates(client, scheduleId, scheduleData.excludeDates);
      }
      
      // Generate initial occurrences
      await this._generateOccurrences(
        client, 
        scheduleId, 
        DEFAULT_OCCURRENCE_COUNT, 
        scheduleData.conflictStrategy || DEFAULT_CONFLICT_STRATEGY
      );
      
      await client.query('COMMIT');
      
      // Return the created schedule with its occurrences
      return this.getRecurringScheduleById(scheduleId);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating recurring schedule:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get a recurring schedule by ID
   * @param {number} scheduleId - ID of the recurring schedule
   * @returns {Promise<Object>} Recurring schedule with occurrences
   */
  async getRecurringScheduleById(scheduleId) {
    try {
      // Get the recurring schedule
      const scheduleResult = await this.db.query(
        `SELECT rs.*, sr.title, sr.description, sr.property_id, sr.user_id as homeowner_id
         FROM recurring_schedules rs
         JOIN service_requests sr ON rs.service_request_id = sr.id
         WHERE rs.id = $1`,
        [scheduleId]
      );
      
      if (scheduleResult.rows.length === 0) {
        throw new Error('Recurring schedule not found');
      }
      
      const schedule = scheduleResult.rows[0];
      
      // Get upcoming occurrences
      const occurrencesResult = await this.db.query(
        `SELECT s.* 
         FROM schedule_items s
         WHERE s.recurring_schedule_id = $1 AND s.date >= NOW()
         ORDER BY s.date ASC
         LIMIT 10`,
        [scheduleId]
      );
      
      // Get excluded dates
      const excludedDatesResult = await this.db.query(
        `SELECT exclude_date 
         FROM recurring_schedule_exclusions
         WHERE recurring_schedule_id = $1
         ORDER BY exclude_date ASC`,
        [scheduleId]
      );
      
      // Format the response
      return {
        id: schedule.id,
        serviceRequestId: schedule.service_request_id,
        title: schedule.title,
        description: schedule.description,
        propertyId: schedule.property_id,
        homeownerId: schedule.homeowner_id,
        rrulePattern: schedule.rrule_pattern,
        nextRun: schedule.next_run,
        createdAt: schedule.created_at,
        updatedAt: schedule.updated_at,
        occurrences: occurrencesResult.rows,
        excludedDates: excludedDatesResult.rows.map(row => row.exclude_date)
      };
    } catch (error) {
      console.error('Error getting recurring schedule:', error);
      throw error;
    }
  }

  /**
   * Update a recurring schedule
   * @param {number} scheduleId - ID of the recurring schedule to update
   * @param {Object} updateData - Data to update
   * @param {Object} updateData.pattern - Updated pattern information (optional)
   * @param {Array} updateData.excludeDates - Updated excluded dates (optional)
   * @param {boolean} updateData.applyToFuture - Whether to apply changes to future occurrences only (default: true)
   * @returns {Promise<Object>} Updated recurring schedule
   */
  async updateRecurringSchedule(scheduleId, updateData) {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get the current schedule
      const currentScheduleResult = await client.query(
        'SELECT * FROM recurring_schedules WHERE id = $1',
        [scheduleId]
      );
      
      if (currentScheduleResult.rows.length === 0) {
        throw new Error('Recurring schedule not found');
      }
      
      const currentSchedule = currentScheduleResult.rows[0];
      const applyToFuture = updateData.applyToFuture !== false; // Default to true
      
      // If pattern is being updated
      if (updateData.pattern) {
        // Create new RRule from updated pattern
        const rruleOptions = this._createRRuleOptions(updateData.pattern);
        const rule = new RRule(rruleOptions);
        const rruleString = rule.toString();
        
        // Calculate next run date
        const nextRun = rule.after(new Date(), true);
        
        if (!nextRun) {
          throw new Error('Invalid recurrence pattern: no future occurrences');
        }
        
        // Update the recurring schedule
        await client.query(
          `UPDATE recurring_schedules
           SET rrule_pattern = $1, next_run = $2, updated_at = NOW()
           WHERE id = $3`,
          [rruleString, nextRun, scheduleId]
        );
        
        if (applyToFuture) {
          // Remove future occurrences
          await client.query(
            `DELETE FROM schedule_items
             WHERE recurring_schedule_id = $1 AND date > NOW()`,
            [scheduleId]
          );
          
          // Generate new occurrences
          await this._generateOccurrences(
            client, 
            scheduleId, 
            DEFAULT_OCCURRENCE_COUNT, 
            updateData.conflictStrategy || DEFAULT_CONFLICT_STRATEGY
          );
        }
      }
      
      // If excluded dates are being updated
      if (updateData.excludeDates) {
        if (applyToFuture) {
          // Remove future exclusions
          await client.query(
            `DELETE FROM recurring_schedule_exclusions
             WHERE recurring_schedule_id = $1 AND exclude_date > NOW()`,
            [scheduleId]
          );
        } else {
          // Remove all exclusions
          await client.query(
            `DELETE FROM recurring_schedule_exclusions
             WHERE recurring_schedule_id = $1`,
            [scheduleId]
          );
        }
        
        // Add new exclusions
        await this._storeExcludedDates(client, scheduleId, updateData.excludeDates);
        
        // Remove occurrences that match excluded dates
        for (const excludeDate of updateData.excludeDates) {
          const dateStart = new Date(excludeDate);
          dateStart.setHours(0, 0, 0, 0);
          
          const dateEnd = new Date(excludeDate);
          dateEnd.setHours(23, 59, 59, 999);
          
          await client.query(
            `DELETE FROM schedule_items
             WHERE recurring_schedule_id = $1 
             AND date >= $2 AND date <= $3`,
            [scheduleId, dateStart, dateEnd]
          );
        }
      }
      
      await client.query('COMMIT');
      
      // Return the updated schedule
      return this.getRecurringScheduleById(scheduleId);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating recurring schedule:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete a recurring schedule
   * @param {number} scheduleId - ID of the recurring schedule to delete
   * @param {boolean} deleteFutureOnly - Whether to delete only future occurrences (default: false)
   * @returns {Promise<boolean>} Success status
   */
  async deleteRecurringSchedule(scheduleId, deleteFutureOnly = false) {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      if (deleteFutureOnly) {
        // Delete only future occurrences
        await client.query(
          `DELETE FROM schedule_items
           WHERE recurring_schedule_id = $1 AND date > NOW()`,
          [scheduleId]
        );
        
        // Update the recurring schedule to mark it as ended
        await client.query(
          `UPDATE recurring_schedules
           SET next_run = NULL, updated_at = NOW()
           WHERE id = $1`,
          [scheduleId]
        );
      } else {
        // Delete all occurrences
        await client.query(
          `DELETE FROM schedule_items
           WHERE recurring_schedule_id = $1`,
          [scheduleId]
        );
        
        // Delete exclusions
        await client.query(
          `DELETE FROM recurring_schedule_exclusions
           WHERE recurring_schedule_id = $1`,
          [scheduleId]
        );
        
        // Delete the recurring schedule
        await client.query(
          `DELETE FROM recurring_schedules
           WHERE id = $1`,
          [scheduleId]
        );
      }
      
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error deleting recurring schedule:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Process upcoming schedules and generate occurrences
   * This method should be called by a scheduled job
   * @returns {Promise<number>} Number of schedules processed
   */
  async processUpcomingSchedules() {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get schedules that need processing
      const schedulesResult = await client.query(
        `SELECT id, service_request_id, rrule_pattern, next_run
         FROM recurring_schedules
         WHERE next_run IS NOT NULL AND next_run <= NOW() + INTERVAL '7 days'
         ORDER BY next_run ASC
         LIMIT 100`
      );
      
      let processedCount = 0;
      
      for (const schedule of schedulesResult.rows) {
        try {
          await this._generateOccurrences(client, schedule.id, DEFAULT_OCCURRENCE_COUNT);
          processedCount++;
          
          // Reset retry count if it exists
          if (this.retryQueue.has(schedule.id)) {
            this.retryQueue.delete(schedule.id);
          }
        } catch (error) {
          console.error(`Error processing schedule ${schedule.id}:`, error);
          
          // Handle retry logic
          await this._handleProcessingFailure(client, schedule.id, error);
        }
      }
      
      await client.query('COMMIT');
      return processedCount;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error processing upcoming schedules:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check for scheduling conflicts
   * @param {Object} client - Database client
   * @param {number} homeownerId - ID of the homeowner
   * @param {Date} startDate - Start date of the potential schedule
   * @param {Date} endDate - End date of the potential schedule
   * @returns {Promise<Array>} List of conflicting schedules
   */
  async _checkForConflicts(client, homeownerId, startDate, endDate) {
    // Add buffer time (e.g., 30 minutes) before and after
    const bufferMs = 30 * 60 * 1000; // 30 minutes in milliseconds
    const bufferStart = new Date(startDate.getTime() - bufferMs);
    const bufferEnd = new Date(endDate.getTime() + bufferMs);
    
    const conflictsResult = await client.query(
      `SELECT s.* 
       FROM schedule_items s
       WHERE s.user_id = $1 
       AND (
         (s.date <= $2 AND s.end_date >= $2) OR
         (s.date <= $3 AND s.end_date >= $3) OR
         (s.date >= $2 AND s.end_date <= $3)
       )`,
      [homeownerId, bufferStart, bufferEnd]
    );
    
    return conflictsResult.rows;
  }

  /**
   * Resolve scheduling conflicts based on strategy
   * @param {string} strategy - Conflict resolution strategy
   * @param {Array} conflicts - List of conflicting schedules
   * @param {Date} proposedStart - Proposed start date
   * @param {Date} proposedEnd - Proposed end date
   * @param {number} duration - Duration in minutes
   * @returns {Object|null} Resolved schedule time or null if should skip
   */
  _resolveConflict(strategy, conflicts, proposedStart, proposedEnd, duration) {
    switch (strategy) {
      case 'skip':
        return null; // Skip this occurrence
        
      case 'reschedule':
        // Find the next available time slot after all conflicts
        let latestEndTime = proposedEnd;
        
        for (const conflict of conflicts) {
          const conflictEnd = new Date(conflict.end_date);
          if (conflictEnd > latestEndTime) {
            latestEndTime = conflictEnd;
          }
        }
        
        // Add a buffer (e.g., 30 minutes)
        const bufferMs = 30 * 60 * 1000;
        const newStartTime = new Date(latestEndTime.getTime() + bufferMs);
        const newEndTime = new Date(newStartTime.getTime() + (duration * 60 * 1000));
        
        return { start: newStartTime, end: newEndTime };
        
      case 'error':
      default:
        throw new Error('Scheduling conflict detected');
    }
  }

  /**
   * Generate occurrences for a recurring schedule
   * @param {Object} client - Database client
   * @param {number} scheduleId - ID of the recurring schedule
   * @param {number} count - Number of occurrences to generate
   * @param {string} conflictStrategy - Strategy for handling conflicts
   * @returns {Promise<number>} Number of occurrences generated
   */
  async _generateOccurrences(client, scheduleId, count = DEFAULT_OCCURRENCE_COUNT, conflictStrategy = DEFAULT_CONFLICT_STRATEGY) {
    // Get the recurring schedule
    const scheduleResult = await client.query(
      `SELECT rs.*, sr.title, sr.description, sr.property_id, sr.user_id as homeowner_id,
              sr.service_id, sr.type, sr.time_slot
       FROM recurring_schedules rs
       JOIN service_requests sr ON rs.service_request_id = sr.id
       WHERE rs.id = $1`,
      [scheduleId]
    );
    
    if (scheduleResult.rows.length === 0) {
      throw new Error('Recurring schedule not found');
    }
    
    const schedule = scheduleResult.rows[0];
    
    // Get excluded dates
    const excludedDatesResult = await client.query(
      `SELECT exclude_date 
       FROM recurring_schedule_exclusions
       WHERE recurring_schedule_id = $1`,
      [scheduleId]
    );
    
    const excludedDates = excludedDatesResult.rows.map(row => row.exclude_date);
    
    // Parse the RRule pattern
    const rule = rrulestr(schedule.rrule_pattern);
    
    // Get existing occurrences to avoid duplicates
    const existingOccurrencesResult = await client.query(
      `SELECT date 
       FROM schedule_items
       WHERE recurring_schedule_id = $1`,
      [scheduleId]
    );
    
    const existingDates = existingOccurrencesResult.rows.map(row => {
      const date = new Date(row.date);
      return date.toISOString().split('T')[0]; // Get date part only for comparison
    });
    
    // Calculate the next occurrences
    const now = new Date();
    const occurrences = rule.all((date, i) => {
      // Limit to specified count
      if (i >= count) return false;
      
      // Only include future dates
      if (date <= now) return false;
      
      // Check if date is excluded
      const dateStr = date.toISOString().split('T')[0];
      if (excludedDates.some(excludeDate => {
        const excludeDateStr = new Date(excludeDate).toISOString().split('T')[0];
        return dateStr === excludeDateStr;
      })) {
        return false;
      }
      
      // Check if occurrence already exists
      if (existingDates.includes(dateStr)) {
        return false;
      }
      
      return true;
    });
    
    let generatedCount = 0;
    
    // Create schedule items for each occurrence
    for (const occurrence of occurrences) {
      // Calculate end time based on time_slot or default duration
      const startTime = occurrence;
      const duration = schedule.time_slot ? parseInt(schedule.time_slot) : 60; // Default to 1 hour
      const endTime = new Date(startTime.getTime() + (duration * 60 * 1000));
      
      // Check for conflicts
      const conflicts = await this._checkForConflicts(client, schedule.homeowner_id, startTime, endTime);
      
      if (conflicts.length > 0) {
        // Resolve conflicts based on strategy
        const resolution = this._resolveConflict(conflictStrategy, conflicts, startTime, endTime, duration);
        
        if (!resolution) {
          // Skip this occurrence
          continue;
        }
        
        // Use the rescheduled time
        startTime = resolution.start;
        endTime = resolution.end;
      }
      
      // Create the schedule item
      await client.query(
        `INSERT INTO schedule_items 
          (user_id, title, description, date, end_date, type, 
           property_id, service_request_id, recurring_schedule_id,
           completed, time_slot, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
        [
          schedule.homeowner_id,
          schedule.title,
          schedule.description,
          startTime,
          endTime,
          schedule.type || 'service',
          schedule.property_id,
          schedule.service_request_id,
          scheduleId,
          false, // not completed
          schedule.time_slot,
        ]
      );
      
      generatedCount++;
    }
    
    // Update the next_run field
    if (occurrences.length > 0) {
      const lastOccurrence = occurrences[occurrences.length - 1];
      const nextRun = rule.after(lastOccurrence, true);
      
      if (nextRun) {
        await client.query(
          `UPDATE recurring_schedules
           SET next_run = $1, updated_at = NOW()
           WHERE id = $2`,
          [nextRun, scheduleId]
        );
      } else {
        // No more occurrences, mark as completed
        await client.query(
          `UPDATE recurring_schedules
           SET next_run = NULL, updated_at = NOW()
           WHERE id = $1`,
          [scheduleId]
        );
      }
    }
    
    // Trigger notifications for upcoming services
    if (generatedCount > 0 && this.notificationService) {
      try {
        await this._triggerUpcomingServiceNotifications(client, scheduleId);
      } catch (notificationError) {
        console.error('Error sending notifications:', notificationError);
        // Continue processing even if notifications fail
      }
    }
    
    return generatedCount;
  }

  /**
   * Store excluded dates for a recurring schedule
   * @param {Object} client - Database client
   * @param {number} scheduleId - ID of the recurring schedule
   * @param {Array} excludeDates - Array of dates to exclude
   * @returns {Promise<void>}
   */
  async _storeExcludedDates(client, scheduleId, excludeDates) {
    for (const excludeDate of excludeDates) {
      await client.query(
        `INSERT INTO recurring_schedule_exclusions 
          (recurring_schedule_id, exclude_date, created_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (recurring_schedule_id, exclude_date) DO NOTHING`,
        [scheduleId, new Date(excludeDate)]
      );
    }
  }

  /**
   * Handle processing failure with retry logic and alerts
   * @param {Object} client - Database client
   * @param {number} scheduleId - ID of the recurring schedule
   * @param {Error} error - The error that occurred
   * @returns {Promise<void>}
   */
  async _handleProcessingFailure(client, scheduleId, error) {
    // Get or initialize retry count
    let retryData = this.retryQueue.get(scheduleId) || { count: 0, lastError: null };
    retryData.count++;
    retryData.lastError = error;
    
    this.retryQueue.set(scheduleId, retryData);
    
    // Log the failure
    await client.query(
      `INSERT INTO schedule_processing_errors 
        (recurring_schedule_id, error_message, retry_count, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [scheduleId, error.message, retryData.count]
    );
    
    // Check if we should trigger an alert
    if (retryData.count >= this.alertThreshold && this.notificationService) {
      try {
        // Get schedule details for the alert
        const scheduleResult = await client.query(
          `SELECT rs.*, sr.title, sr.user_id as homeowner_id
           FROM recurring_schedules rs
           JOIN service_requests sr ON rs.service_request_id = sr.id
           WHERE rs.id = $1`,
          [scheduleId]
        );
        
        if (scheduleResult.rows.length > 0) {
          const schedule = scheduleResult.rows[0];
          
          // Send alert to system administrators
          await this.notificationService.sendAdminAlert({
            title: 'Recurring Schedule Processing Failure',
            message: `Schedule "${schedule.title}" (ID: ${scheduleId}) has failed processing ${retryData.count} times. Last error: ${error.message}`,
            relatedTo: 'SCHEDULE',
            relatedId: scheduleId,
            severity: 'high'
          });
          
          // Also notify the homeowner
          await this.notificationService.sendNotification({
            userId: schedule.homeowner_id,
            title: 'Schedule Processing Issue',
            message: `There was an issue processing your recurring schedule "${schedule.title}". Our team has been notified and is working to resolve it.`,
            type: 'SYSTEM',
            relatedTo: 'SCHEDULE',
            relatedId: scheduleId
          });
        }
      } catch (notificationError) {
        console.error('Error sending failure notification:', notificationError);
      }
    }
  }

  /**
   * Trigger notifications for upcoming services
   * @param {Object} client - Database client
   * @param {number} scheduleId - ID of the recurring schedule
   * @returns {Promise<void>}
   */
  async _triggerUpcomingServiceNotifications(client, scheduleId) {
    if (!this.notificationService) return;
    
    // Get upcoming services that haven't been notified yet
    const upcomingServicesResult = await client.query(
      `SELECT s.*, rs.service_request_id, sr.user_id as homeowner_id, sr.title
       FROM schedule_items s
       JOIN recurring_schedules rs ON s.recurring_schedule_id = rs.id
       JOIN service_requests sr ON rs.service_request_id = sr.id
       WHERE s.recurring_schedule_id = $1
       AND s.date > NOW() AND s.date <= NOW() + INTERVAL '3 days'
       AND s.notification_sent = FALSE
       ORDER BY s.date ASC`,
      [scheduleId]
    );
    
    for (const service of upcomingServicesResult.rows) {
      // Format the date for display
      const serviceDate = moment(service.date).format('dddd, MMMM Do [at] h:mm A');
      
      // Send notification to homeowner
      await this.notificationService.sendNotification({
        userId: service.homeowner_id,
        title: 'Upcoming Scheduled Service',
        message: `Reminder: You have a scheduled service "${service.title}" on ${serviceDate}.`,
        type: 'SCHEDULE',
        relatedTo: 'SCHEDULE',
        relatedId: service.id
      });
      
      // Mark as notified
      await client.query(
        `UPDATE schedule_items
         SET notification_sent = TRUE, updated_at = NOW()
         WHERE id = $1`,
        [service.id]
      );
    }
  }

  /**
   * Create RRule options from pattern data
   * @param {Object} pattern - Pattern information
   * @returns {Object} RRule options
   */
  _createRRuleOptions(pattern) {
    const options = {
      freq: this._getFrequencyValue(pattern.freq),
      interval: pattern.interval || 1,
      dtstart: new Date(pattern.dtstart)
    };
    
    // Add optional parameters if provided
    if (pattern.byweekday) {
      options.byweekday = this._getWeekdayValues(pattern.byweekday);
    }
    
    if (pattern.bymonthday) {
      options.bymonthday = Array.isArray(pattern.bymonthday) 
        ? pattern.bymonthday 
        : [pattern.bymonthday];
    }
    
    if (pattern.bymonth) {
      options.bymonth = Array.isArray(pattern.bymonth) 
        ? pattern.bymonth 
        : [pattern.bymonth];
    }
    
    if (pattern.until) {
      options.until = new Date(pattern.until);
    }
    
    if (pattern.count) {
      options.count = pattern.count;
    }
    
    return options;
  }

  /**
   * Convert frequency string to RRule constant
   * @param {string} freq - Frequency string (DAILY, WEEKLY, MONTHLY, YEARLY)
   * @returns {number} RRule frequency constant
   */
  _getFrequencyValue(freq) {
    const freqMap = {
      'DAILY': RRule.DAILY,
      'WEEKLY': RRule.WEEKLY,
      'MONTHLY': RRule.MONTHLY,
      'YEARLY': RRule.YEARLY
    };
    
    return freqMap[freq.toUpperCase()] || RRule.WEEKLY; // Default to weekly
  }

  /**
   * Convert weekday strings to RRule weekday constants
   * @param {Array} weekdays - Array of weekday strings (MO, TU, WE, TH, FR, SA, SU)
   * @returns {Array} Array of RRule weekday constants
   */
  _getWeekdayValues(weekdays) {
    const weekdayMap = {
      'MO': RRule.MO,
      'TU': RRule.TU,
      'WE': RRule.WE,
      'TH': RRule.TH,
      'FR': RRule.FR,
      'SA': RRule.SA,
      'SU': RRule.SU
    };
    
    return Array.isArray(weekdays)
      ? weekdays.map(day => weekdayMap[day.toUpperCase()])
      : [weekdayMap[weekdays.toUpperCase()]];
  }

  /**
   * Generate an idempotency key for a schedule
   * @param {Object} scheduleData - Schedule data
   * @returns {string} Idempotency key
   */
  _generateIdempotencyKey(scheduleData) {
    const data = {
      serviceRequestId: scheduleData.serviceRequestId,
      pattern: scheduleData.pattern,
      excludeDates: scheduleData.excludeDates || []
    };
    
    return require('crypto')
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }
}

module.exports = RecurringScheduleService;