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

// Maximum number of occurrences to generate at once
const MAX_OCCURRENCES = 10;

// Maximum number of retry attempts for failed jobs
const MAX_RETRY_ATTEMPTS = 3;

// Default number of days to look ahead for conflict detection
const DEFAULT_CONFLICT_WINDOW_DAYS = 90;

/**
 * RecurringScheduleService class for managing recurring service schedules
 */
class RecurringScheduleService {
  /**
   * Constructor for RecurringScheduleService
   * @param {Object} db - Database connection pool
   * @param {Object} notificationService - Notification service for alerts
   */
  constructor(db, notificationService) {
    this.db = db;
    this.notificationService = notificationService;
    this.retryMap = new Map(); // Tracks retry attempts for failed jobs
  }

  /**
   * Create a new recurring schedule
   * @param {Object} scheduleData - Schedule data including service request ID and recurrence pattern
   * @param {number} scheduleData.serviceRequestId - ID of the parent service request
   * @param {Object} scheduleData.rruleOptions - RRule options for recurrence pattern
   * @param {Date} scheduleData.rruleOptions.dtstart - Start date for recurrence
   * @param {string} scheduleData.rruleOptions.freq - Frequency (DAILY, WEEKLY, MONTHLY, YEARLY)
   * @param {number} [scheduleData.rruleOptions.interval] - Interval between occurrences
   * @param {Array} [scheduleData.rruleOptions.byweekday] - Days of week for recurrence
   * @param {Array} [scheduleData.rruleOptions.bymonthday] - Days of month for recurrence
   * @param {Array} [scheduleData.rruleOptions.bymonth] - Months for recurrence
   * @param {Date} [scheduleData.rruleOptions.until] - End date for recurrence
   * @param {number} [scheduleData.rruleOptions.count] - Number of occurrences
   * @param {string} [scheduleData.timezone] - Timezone for schedule (default: America/New_York)
   * @param {Array} [scheduleData.exdates] - Exception dates to exclude from pattern
   * @returns {Promise<Object>} Created recurring schedule with ID
   * @throws {Error} If creation fails
   */
  async createRecurringSchedule(scheduleData) {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Validate service request exists
      const serviceRequestResult = await client.query(
        'SELECT * FROM service_requests WHERE id = $1',
        [scheduleData.serviceRequestId]
      );
      
      if (serviceRequestResult.rows.length === 0) {
        throw new Error(`Service request with ID ${scheduleData.serviceRequestId} not found`);
      }
      
      const serviceRequest = serviceRequestResult.rows[0];
      
      // Create RRule from options
      const timezone = scheduleData.timezone || DEFAULT_TIMEZONE;
      const dtstart = moment.tz(scheduleData.rruleOptions.dtstart, timezone).toDate();
      
      const rruleOptions = {
        ...scheduleData.rruleOptions,
        dtstart
      };
      
      const rule = new RRule(rruleOptions);
      const rruleString = rule.toString();
      
      // Calculate next occurrence
      const nextRun = rule.after(new Date(), true);
      
      if (!nextRun) {
        throw new Error('Invalid recurrence pattern: no future occurrences found');
      }
      
      // Create unique identifier for idempotent operations
      const uniqueIdentifier = this._generateUniqueIdentifier(scheduleData);
      
      // Check if schedule with this identifier already exists
      const existingScheduleResult = await client.query(
        'SELECT id FROM recurring_schedules WHERE unique_identifier = $1',
        [uniqueIdentifier]
      );
      
      if (existingScheduleResult.rows.length > 0) {
        // Schedule already exists, return existing ID
        await client.query('COMMIT');
        return {
          id: existingScheduleResult.rows[0].id,
          isNew: false,
          message: 'Recurring schedule already exists'
        };
      }
      
      // Store exception dates if provided
      const exdates = scheduleData.exdates || [];
      const exdatesJson = JSON.stringify(exdates.map(date => new Date(date).toISOString()));
      
      // Insert new recurring schedule
      const result = await client.query(
        `INSERT INTO recurring_schedules 
         (service_request_id, rrule_pattern, next_run, timezone, exdates, 
          unique_identifier, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) 
         RETURNING id`,
        [
          scheduleData.serviceRequestId,
          rruleString,
          nextRun,
          timezone,
          exdatesJson,
          uniqueIdentifier
        ]
      );
      
      const scheduleId = result.rows[0].id;
      
      // Update service request to mark as recurring
      await client.query(
        'UPDATE service_requests SET is_recurring = true, recurrence_schedule_id = $1 WHERE id = $2',
        [scheduleId, scheduleData.serviceRequestId]
      );
      
      // Generate initial occurrences
      await this._generateScheduleOccurrences(client, scheduleId, serviceRequest);
      
      await client.query('COMMIT');
      
      return {
        id: scheduleId,
        isNew: true,
        message: 'Recurring schedule created successfully'
      };
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
   * @returns {Promise<Object>} Recurring schedule data
   * @throws {Error} If schedule not found or retrieval fails
   */
  async getRecurringScheduleById(scheduleId) {
    try {
      const result = await this.db.query(
        `SELECT rs.*, sr.homeowner_id, sr.property_id, sr.service_id, sr.description, sr.status
         FROM recurring_schedules rs
         JOIN service_requests sr ON rs.service_request_id = sr.id
         WHERE rs.id = $1`,
        [scheduleId]
      );
      
      if (result.rows.length === 0) {
        throw new Error(`Recurring schedule with ID ${scheduleId} not found`);
      }
      
      const schedule = result.rows[0];
      
      // Parse exdates from JSON
      if (schedule.exdates) {
        schedule.exdates = JSON.parse(schedule.exdates);
      } else {
        schedule.exdates = [];
      }
      
      return schedule;
    } catch (error) {
      console.error('Error getting recurring schedule:', error);
      throw error;
    }
  }

  /**
   * Get recurring schedules for a user
   * @param {number} userId - User ID
   * @param {string} role - User role ('homeowner' or 'provider')
   * @returns {Promise<Array>} List of recurring schedules
   * @throws {Error} If retrieval fails
   */
  async getRecurringSchedulesForUser(userId, role) {
    try {
      let query;
      let params;
      
      if (role === 'homeowner') {
        query = `
          SELECT rs.*, sr.description, sr.status, sr.property_id, p.address as property_address
          FROM recurring_schedules rs
          JOIN service_requests sr ON rs.service_request_id = sr.id
          LEFT JOIN properties p ON sr.property_id = p.id
          WHERE sr.homeowner_id = $1
          ORDER BY rs.next_run ASC
        `;
        params = [userId];
      } else if (role === 'provider') {
        query = `
          SELECT rs.*, sr.description, sr.status, sr.property_id, p.address as property_address
          FROM recurring_schedules rs
          JOIN service_requests sr ON rs.service_request_id = sr.id
          LEFT JOIN properties p ON sr.property_id = p.id
          JOIN bids b ON sr.id = b.service_request_id
          WHERE b.provider_id = $1 AND b.status = 'accepted'
          ORDER BY rs.next_run ASC
        `;
        params = [userId];
      } else {
        throw new Error(`Invalid role: ${role}`);
      }
      
      const result = await this.db.query(query, params);
      
      // Parse exdates from JSON for each schedule
      return result.rows.map(schedule => {
        if (schedule.exdates) {
          schedule.exdates = JSON.parse(schedule.exdates);
        } else {
          schedule.exdates = [];
        }
        return schedule;
      });
    } catch (error) {
      console.error('Error getting recurring schedules for user:', error);
      throw error;
    }
  }

  /**
   * Update a recurring schedule
   * @param {number} scheduleId - ID of the recurring schedule to update
   * @param {Object} updateData - Data to update
   * @param {Object} [updateData.rruleOptions] - Updated RRule options
   * @param {string} [updateData.timezone] - Updated timezone
   * @param {Array} [updateData.exdates] - Updated exception dates
   * @param {boolean} [updateData.applyToFuture=true] - Whether to apply changes to future occurrences
   * @returns {Promise<Object>} Updated recurring schedule
   * @throws {Error} If update fails
   */
  async updateRecurringSchedule(scheduleId, updateData) {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get current schedule
      const currentScheduleResult = await client.query(
        'SELECT * FROM recurring_schedules WHERE id = $1',
        [scheduleId]
      );
      
      if (currentScheduleResult.rows.length === 0) {
        throw new Error(`Recurring schedule with ID ${scheduleId} not found`);
      }
      
      const currentSchedule = currentScheduleResult.rows[0];
      
      // Determine what's being updated
      let rruleString = currentSchedule.rrule_pattern;
      let timezone = updateData.timezone || currentSchedule.timezone;
      let exdatesJson = currentSchedule.exdates;
      let nextRun = currentSchedule.next_run;
      
      // Update RRule if options provided
      if (updateData.rruleOptions) {
        const currentRule = rrulestr(currentSchedule.rrule_pattern);
        const currentOptions = currentRule.options;
        
        // Merge current options with updates
        const dtstart = updateData.rruleOptions.dtstart ? 
          moment.tz(updateData.rruleOptions.dtstart, timezone).toDate() : 
          currentOptions.dtstart;
        
        const newOptions = {
          ...currentOptions,
          ...updateData.rruleOptions,
          dtstart
        };
        
        const newRule = new RRule(newOptions);
        rruleString = newRule.toString();
        
        // Calculate new next run
        nextRun = newRule.after(new Date(), true);
        
        if (!nextRun) {
          throw new Error('Invalid recurrence pattern: no future occurrences found');
        }
      }
      
      // Update exception dates if provided
      if (updateData.exdates) {
        const exdates = updateData.exdates;
        exdatesJson = JSON.stringify(exdates.map(date => new Date(date).toISOString()));
      }
      
      // Update the recurring schedule
      await client.query(
        `UPDATE recurring_schedules 
         SET rrule_pattern = $1, next_run = $2, timezone = $3, exdates = $4, updated_at = NOW() 
         WHERE id = $5`,
        [rruleString, nextRun, timezone, exdatesJson, scheduleId]
      );
      
      // Handle future occurrences if requested
      const applyToFuture = updateData.applyToFuture !== false;
      
      if (applyToFuture) {
        // Get the service request ID
        const serviceRequestId = currentSchedule.service_request_id;
        
        // Get the original service request
        const serviceRequestResult = await client.query(
          'SELECT * FROM service_requests WHERE id = $1',
          [serviceRequestId]
        );
        
        if (serviceRequestResult.rows.length === 0) {
          throw new Error(`Service request with ID ${serviceRequestId} not found`);
        }
        
        const serviceRequest = serviceRequestResult.rows[0];
        
        // Cancel future occurrences that haven't been started yet
        await client.query(
          `UPDATE service_requests 
           SET status = 'cancelled', updated_at = NOW() 
           WHERE recurrence_parent_id = $1 AND date > NOW() AND status IN ('scheduled', 'pending')`,
          [serviceRequestId]
        );
        
        // Generate new occurrences based on updated pattern
        await this._generateScheduleOccurrences(client, scheduleId, serviceRequest);
      }
      
      await client.query('COMMIT');
      
      // Return updated schedule
      return await this.getRecurringScheduleById(scheduleId);
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
   * @param {boolean} [cancelFutureOccurrences=true] - Whether to cancel future occurrences
   * @returns {Promise<Object>} Deletion result
   * @throws {Error} If deletion fails
   */
  async deleteRecurringSchedule(scheduleId, cancelFutureOccurrences = true) {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get the schedule to delete
      const scheduleResult = await client.query(
        'SELECT * FROM recurring_schedules WHERE id = $1',
        [scheduleId]
      );
      
      if (scheduleResult.rows.length === 0) {
        throw new Error(`Recurring schedule with ID ${scheduleId} not found`);
      }
      
      const schedule = scheduleResult.rows[0];
      const serviceRequestId = schedule.service_request_id;
      
      // If requested, cancel future occurrences that haven't been started
      if (cancelFutureOccurrences) {
        await client.query(
          `UPDATE service_requests 
           SET status = 'cancelled', updated_at = NOW() 
           WHERE recurrence_parent_id = $1 AND date > NOW() AND status IN ('scheduled', 'pending')`,
          [serviceRequestId]
        );
      }
      
      // Update the parent service request to remove recurring flag
      await client.query(
        'UPDATE service_requests SET is_recurring = false, recurrence_schedule_id = NULL WHERE id = $1',
        [serviceRequestId]
      );
      
      // Delete the recurring schedule
      await client.query('DELETE FROM recurring_schedules WHERE id = $1', [scheduleId]);
      
      await client.query('COMMIT');
      
      return {
        success: true,
        message: 'Recurring schedule deleted successfully'
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error deleting recurring schedule:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Process due recurring schedules to generate upcoming occurrences
   * @returns {Promise<Object>} Processing results
   * @throws {Error} If processing fails
   */
  async processDueSchedules() {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Find schedules that need processing (next_run is in the past or within 24 hours)
      const dueSchedulesResult = await client.query(
        `SELECT rs.*, sr.* 
         FROM recurring_schedules rs
         JOIN service_requests sr ON rs.service_request_id = sr.id
         WHERE rs.next_run <= NOW() + INTERVAL '24 hours'
         ORDER BY rs.next_run ASC
         LIMIT 50`
      );
      
      const results = {
        processed: 0,
        failed: 0,
        details: []
      };
      
      // Process each due schedule
      for (const schedule of dueSchedulesResult.rows) {
        try {
          // Generate occurrences for this schedule
          const occurrencesGenerated = await this._generateScheduleOccurrences(client, schedule.id, schedule);
          
          results.processed++;
          results.details.push({
            scheduleId: schedule.id,
            serviceRequestId: schedule.service_request_id,
            occurrencesGenerated,
            success: true
          });
        } catch (error) {
          console.error(`Error processing schedule ${schedule.id}:`, error);
          
          // Track retry attempts
          const retryKey = `schedule_${schedule.id}`;
          const retryCount = (this.retryMap.get(retryKey) || 0) + 1;
          this.retryMap.set(retryKey, retryCount);
          
          // If max retries exceeded, send alert
          if (retryCount >= MAX_RETRY_ATTEMPTS) {
            await this._sendScheduleFailureAlert(schedule.id, schedule.service_request_id, error.message);
            this.retryMap.delete(retryKey); // Reset retry counter after alert
          }
          
          results.failed++;
          results.details.push({
            scheduleId: schedule.id,
            serviceRequestId: schedule.service_request_id,
            error: error.message,
            retryCount,
            success: false
          });
        }
      }
      
      await client.query('COMMIT');
      
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error processing due schedules:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check for scheduling conflicts
   * @param {number} propertyId - Property ID to check for conflicts
   * @param {Date} startDate - Start date of the period to check
   * @param {Date} endDate - End date of the period to check
   * @param {number} [excludeServiceRequestId] - Service request ID to exclude from conflict check
   * @returns {Promise<Array>} List of conflicting service requests
   * @throws {Error} If conflict check fails
   */
  async checkSchedulingConflicts(propertyId, startDate, endDate, excludeServiceRequestId = null) {
    try {
      // Query for existing service requests in the date range
      let query = `
        SELECT sr.id, sr.date, sr.end_date, sr.description, sr.status, s.name as service_name
        FROM service_requests sr
        JOIN services s ON sr.service_id = s.id
        WHERE sr.property_id = $1
          AND sr.status NOT IN ('cancelled', 'declined', 'completed')
          AND (
            (sr.date >= $2 AND sr.date <= $3) OR
            (sr.end_date >= $2 AND sr.end_date <= $3) OR
            (sr.date <= $2 AND sr.end_date >= $3)
          )
      `;
      
      const params = [propertyId, startDate, endDate];
      
      // Exclude specific service request if provided
      if (excludeServiceRequestId) {
        query += ' AND sr.id != $4';
        params.push(excludeServiceRequestId);
      }
      
      const result = await this.db.query(query, params);
      
      return result.rows;
    } catch (error) {
      console.error('Error checking scheduling conflicts:', error);
      throw error;
    }
  }

  /**
   * Add an exception date to a recurring schedule
   * @param {number} scheduleId - ID of the recurring schedule
   * @param {Date} exceptionDate - Date to exclude from the pattern
   * @returns {Promise<Object>} Updated recurring schedule
   * @throws {Error} If update fails
   */
  async addExceptionDate(scheduleId, exceptionDate) {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get current schedule
      const currentScheduleResult = await client.query(
        'SELECT * FROM recurring_schedules WHERE id = $1',
        [scheduleId]
      );
      
      if (currentScheduleResult.rows.length === 0) {
        throw new Error(`Recurring schedule with ID ${scheduleId} not found`);
      }
      
      const currentSchedule = currentScheduleResult.rows[0];
      
      // Parse current exception dates
      let exdates = [];
      if (currentSchedule.exdates) {
        exdates = JSON.parse(currentSchedule.exdates);
      }
      
      // Add new exception date if not already present
      const exceptionDateStr = new Date(exceptionDate).toISOString();
      if (!exdates.includes(exceptionDateStr)) {
        exdates.push(exceptionDateStr);
      }
      
      // Update exception dates
      const exdatesJson = JSON.stringify(exdates);
      await client.query(
        'UPDATE recurring_schedules SET exdates = $1, updated_at = NOW() WHERE id = $2',
        [exdatesJson, scheduleId]
      );
      
      // Cancel any existing service request for this date
      const serviceRequestId = currentSchedule.service_request_id;
      const timezone = currentSchedule.timezone || DEFAULT_TIMEZONE;
      
      // Convert exception date to start and end of day in the schedule's timezone
      const exceptionDay = moment.tz(exceptionDate, timezone).startOf('day');
      const nextDay = moment(exceptionDay).add(1, 'day');
      
      await client.query(
        `UPDATE service_requests 
         SET status = 'cancelled', updated_at = NOW() 
         WHERE recurrence_parent_id = $1 
         AND date >= $2 AND date < $3 
         AND status IN ('scheduled', 'pending')`,
        [serviceRequestId, exceptionDay.toDate(), nextDay.toDate()]
      );
      
      await client.query('COMMIT');
      
      // Return updated schedule
      return await this.getRecurringScheduleById(scheduleId);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error adding exception date:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Remove an exception date from a recurring schedule
   * @param {number} scheduleId - ID of the recurring schedule
   * @param {Date} exceptionDate - Date to remove from exceptions
   * @returns {Promise<Object>} Updated recurring schedule
   * @throws {Error} If update fails
   */
  async removeExceptionDate(scheduleId, exceptionDate) {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get current schedule
      const currentScheduleResult = await client.query(
        'SELECT * FROM recurring_schedules WHERE id = $1',
        [scheduleId]
      );
      
      if (currentScheduleResult.rows.length === 0) {
        throw new Error(`Recurring schedule with ID ${scheduleId} not found`);
      }
      
      const currentSchedule = currentScheduleResult.rows[0];
      
      // Parse current exception dates
      let exdates = [];
      if (currentSchedule.exdates) {
        exdates = JSON.parse(currentSchedule.exdates);
      }
      
      // Remove the exception date
      const exceptionDateStr = new Date(exceptionDate).toISOString();
      exdates = exdates.filter(date => date !== exceptionDateStr);
      
      // Update exception dates
      const exdatesJson = JSON.stringify(exdates);
      await client.query(
        'UPDATE recurring_schedules SET exdates = $1, updated_at = NOW() WHERE id = $2',
        [exdatesJson, scheduleId]
      );
      
      // Generate a new occurrence for this date if it matches the pattern
      const serviceRequestId = currentSchedule.service_request_id;
      
      // Get the original service request
      const serviceRequestResult = await client.query(
        'SELECT * FROM service_requests WHERE id = $1',
        [serviceRequestId]
      );
      
      if (serviceRequestResult.rows.length > 0) {
        const serviceRequest = serviceRequestResult.rows[0];
        
        // Check if this date matches the recurrence pattern
        const rule = rrulestr(currentSchedule.rrule_pattern);
        const timezone = currentSchedule.timezone || DEFAULT_TIMEZONE;
        
        // Convert exception date to the schedule's timezone
        const exceptionMoment = moment.tz(exceptionDate, timezone).startOf('day');
        
        // Check if this date is a valid occurrence
        const occurrences = rule.between(
          exceptionMoment.toDate(),
          moment(exceptionMoment).add(1, 'day').toDate(),
          true
        );
        
        if (occurrences.length > 0) {
          // Create a new service request for this date
          await this._createServiceRequestOccurrence(
            client,
            serviceRequest,
            occurrences[0],
            scheduleId
          );
        }
      }
      
      await client.query('COMMIT');
      
      // Return updated schedule
      return await this.getRecurringScheduleById(scheduleId);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error removing exception date:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get upcoming occurrences for a recurring schedule
   * @param {number} scheduleId - ID of the recurring schedule
   * @param {Object} [options] - Options for occurrence retrieval
   * @param {Date} [options.startDate=new Date()] - Start date for occurrence calculation
   * @param {number} [options.count=10] - Maximum number of occurrences to return
   * @param {number} [options.days=90] - Maximum number of days to look ahead
   * @returns {Promise<Array>} List of upcoming occurrences
   * @throws {Error} If retrieval fails
   */
  async getUpcomingOccurrences(scheduleId, options = {}) {
    try {
      // Get the recurring schedule
      const schedule = await this.getRecurringScheduleById(scheduleId);
      
      // Parse options
      const startDate = options.startDate || new Date();
      const count = options.count || MAX_OCCURRENCES;
      const days = options.days || DEFAULT_CONFLICT_WINDOW_DAYS;
      
      // Calculate end date based on days parameter
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + days);
      
      // Create RRule from pattern
      const rule = rrulestr(schedule.rrule_pattern);
      
      // Create RRuleSet to handle exceptions
      const ruleSet = new RRuleSet();
      ruleSet.rrule(rule);
      
      // Add exception dates if any
      if (schedule.exdates && schedule.exdates.length > 0) {
        schedule.exdates.forEach(exdate => {
          ruleSet.exdate(new Date(exdate));
        });
      }
      
      // Get occurrences between start and end dates
      const occurrences = ruleSet.between(startDate, endDate, true);
      
      // Limit to requested count
      const limitedOccurrences = occurrences.slice(0, count);
      
      // Get existing service requests for these occurrences
      const existingRequests = await this._getExistingOccurrences(
        schedule.service_request_id,
        startDate,
        endDate
      );
      
      // Map occurrences to include existing service request info if available
      return limitedOccurrences.map(occurrence => {
        const occurrenceDate = occurrence.toISOString().split('T')[0];
        const existingRequest = existingRequests.find(req => {
          const reqDate = new Date(req.date).toISOString().split('T')[0];
          return reqDate === occurrenceDate;
        });
        
        return {
          date: occurrence,
          existing: existingRequest ? {
            id: existingRequest.id,
            status: existingRequest.status,
            date: existingRequest.date
          } : null
        };
      });
    } catch (error) {
      console.error('Error getting upcoming occurrences:', error);
      throw error;
    }
  }

  /**
   * Generate schedule occurrences for a recurring schedule
   * @private
   * @param {Object} client - Database client with active transaction
   * @param {number} scheduleId - ID of the recurring schedule
   * @param {Object} serviceRequest - Original service request data
   * @param {number} [count=MAX_OCCURRENCES] - Maximum number of occurrences to generate
   * @returns {Promise<number>} Number of occurrences generated
   * @throws {Error} If generation fails
   */
  async _generateScheduleOccurrences(client, scheduleId, serviceRequest, count = MAX_OCCURRENCES) {
    // Get the recurring schedule
    const scheduleResult = await client.query(
      'SELECT * FROM recurring_schedules WHERE id = $1',
      [scheduleId]
    );
    
    if (scheduleResult.rows.length === 0) {
      throw new Error(`Recurring schedule with ID ${scheduleId} not found`);
    }
    
    const schedule = scheduleResult.rows[0];
    
    // Create RRule from pattern
    const rule = rrulestr(schedule.rrule_pattern);
    
    // Create RRuleSet to handle exceptions
    const ruleSet = new RRuleSet();
    ruleSet.rrule(rule);
    
    // Add exception dates if any
    if (schedule.exdates) {
      const exdates = JSON.parse(schedule.exdates);
      exdates.forEach(exdate => {
        ruleSet.exdate(new Date(exdate));
      });
    }
    
    // Calculate start date for occurrence generation (now or next_run)
    const startDate = new Date(Math.max(
      new Date().getTime(),
      new Date(schedule.next_run).getTime()
    ));
    
    // Calculate end date (90 days from now by default)
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + DEFAULT_CONFLICT_WINDOW_DAYS);
    
    // Get occurrences between start and end dates
    const occurrences = ruleSet.between(startDate, endDate, true);
    
    // Limit to requested count
    const limitedOccurrences = occurrences.slice(0, count);
    
    // Get existing service requests for these occurrences to avoid duplicates
    const existingRequests = await this._getExistingOccurrences(
      serviceRequest.id,
      startDate,
      endDate,
      client
    );
    
    // Create service requests for each occurrence that doesn't already exist
    let generatedCount = 0;
    
    for (const occurrence of limitedOccurrences) {
      // Check if this occurrence already exists
      const occurrenceDate = occurrence.toISOString().split('T')[0];
      const existingRequest = existingRequests.find(req => {
        const reqDate = new Date(req.date).toISOString().split('T')[0];
        return reqDate === occurrenceDate;
      });
      
      if (!existingRequest) {
        // Create new service request for this occurrence
        await this._createServiceRequestOccurrence(
          client,
          serviceRequest,
          occurrence,
          scheduleId
        );
        
        generatedCount++;
      }
    }
    
    // Update next_run to the next occurrence after the last one we processed
    if (limitedOccurrences.length > 0) {
      const lastOccurrence = limitedOccurrences[limitedOccurrences.length - 1];
      const nextRun = rule.after(lastOccurrence, true);
      
      if (nextRun) {
        await client.query(
          'UPDATE recurring_schedules SET next_run = $1, updated_at = NOW() WHERE id = $2',
          [nextRun, scheduleId]
        );
      }
    }
    
    return generatedCount;
  }

  /**
   * Create a service request occurrence from a recurring schedule
   * @private
   * @param {Object} client - Database client with active transaction
   * @param {Object} serviceRequest - Original service request data
   * @param {Date} occurrenceDate - Date of the occurrence
   * @param {number} scheduleId - ID of the recurring schedule
   * @returns {Promise<Object>} Created service request
   * @throws {Error} If creation fails
   */
  async _createServiceRequestOccurrence(client, serviceRequest, occurrenceDate, scheduleId) {
    // Check for scheduling conflicts
    const conflicts = await this.checkSchedulingConflicts(
      serviceRequest.property_id,
      occurrenceDate,
      occurrenceDate,
      serviceRequest.id
    );
    
    // If conflicts found, log them but still create the occurrence
    if (conflicts.length > 0) {
      console.warn(`Scheduling conflicts detected for occurrence on ${occurrenceDate}:`, conflicts);
    }
    
    // Calculate end date based on original service request duration if available
    let endDate = null;
    if (serviceRequest.end_date) {
      const originalDuration = new Date(serviceRequest.end_date) - new Date(serviceRequest.date);
      endDate = new Date(occurrenceDate.getTime() + originalDuration);
    }
    
    // Create new service request for this occurrence
    const result = await client.query(
      `INSERT INTO service_requests 
       (homeowner_id, property_id, service_id, description, date, end_date, 
        status, is_recurring, recurrence_parent_id, recurrence_schedule_id, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()) 
       RETURNING id`,
      [
        serviceRequest.homeowner_id,
        serviceRequest.property_id,
        serviceRequest.service_id,
        serviceRequest.description,
        occurrenceDate,
        endDate,
        'scheduled', // Default status for generated occurrences
        true,
        serviceRequest.id, // Parent service request ID
        scheduleId,
        
      ]
    );
    
    const newServiceRequestId = result.rows[0].id;
    
    // If the original service request has an accepted bid, create a corresponding bid
    // for this occurrence
    const acceptedBidResult = await client.query(
      `SELECT * FROM bids 
       WHERE service_request_id = $1 AND status = 'accepted'`,
      [serviceRequest.id]
    );
    
    if (acceptedBidResult.rows.length > 0) {
      const acceptedBid = acceptedBidResult.rows[0];
      
      await client.query(
        `INSERT INTO bids 
         (service_request_id, provider_id, price, estimated_hours, description, 
          status, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [
          newServiceRequestId,
          acceptedBid.provider_id,
          acceptedBid.price,
          acceptedBid.estimated_hours,
          acceptedBid.description,
          'accepted'
        ]
      );
    }
    
    // Create notification for the homeowner about the new scheduled service
    if (this.notificationService) {
      try {
        await this.notificationService.createNotification({
          userId: serviceRequest.homeowner_id,
          title: 'New Scheduled Service',
          message: `A new service has been scheduled for ${new Date(occurrenceDate).toLocaleDateString()} based on your recurring schedule.`,
          type: 'info',
          relatedTo: 'SERVICE_REQUEST',
          relatedId: newServiceRequestId
        });
      } catch (error) {
        console.error('Error creating notification for scheduled service:', error);
        // Non-critical error, continue execution
      }
    }
    
    return { id: newServiceRequestId };
  }

  /**
   * Get existing service request occurrences for a recurring schedule
   * @private
   * @param {number} parentServiceRequestId - ID of the parent service request
   * @param {Date} startDate - Start date for occurrence search
   * @param {Date} endDate - End date for occurrence search
   * @param {Object} [client] - Optional database client with active transaction
   * @returns {Promise<Array>} List of existing service requests
   * @throws {Error} If retrieval fails
   */
  async _getExistingOccurrences(parentServiceRequestId, startDate, endDate, client) {
    const dbClient = client || this.db;
    
    try {
      const result = await dbClient.query(
        `SELECT id, date, status 
         FROM service_requests 
         WHERE recurrence_parent_id = $1 
         AND date >= $2 AND date <= $3`,
        [parentServiceRequestId, startDate, endDate]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Error getting existing occurrences:', error);
      throw error;
    }
  }

  /**
   * Generate a unique identifier for a recurring schedule
   * @private
   * @param {Object} scheduleData - Schedule data
   * @returns {string} Unique identifier
   */
  _generateUniqueIdentifier(scheduleData) {
    const components = [
      scheduleData.serviceRequestId,
      JSON.stringify(scheduleData.rruleOptions),
      scheduleData.timezone || DEFAULT_TIMEZONE,
      JSON.stringify(scheduleData.exdates || [])
    ];
    
    // Create a hash of the components
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(components.join('|')).digest('hex');
  }

  /**
   * Send an alert for repeated scheduling failures
   * @private
   * @param {number} scheduleId - ID of the failing schedule
   * @param {number} serviceRequestId - ID of the parent service request
   * @param {string} errorMessage - Error message from the failure
   * @returns {Promise<void>}
   */
  async _sendScheduleFailureAlert(scheduleId, serviceRequestId, errorMessage) {
    try {
      // Get the service request owner
      const serviceRequestResult = await this.db.query(
        'SELECT homeowner_id FROM service_requests WHERE id = $1',
        [serviceRequestId]
      );
      
      if (serviceRequestResult.rows.length === 0) {
        console.error(`Service request with ID ${serviceRequestId} not found for failure alert`);
        return;
      }
      
      const homeownerId = serviceRequestResult.rows[0].homeowner_id;
      
      // Send notification to homeowner
      if (this.notificationService) {
        await this.notificationService.createNotification({
          userId: homeownerId,
          title: 'Recurring Schedule Error',
          message: `There was a problem processing your recurring schedule. Please check your schedule settings.`,
          type: 'error',
          relatedTo: 'SERVICE_REQUEST',
          relatedId: serviceRequestId
        });
      }
      
      // Send notification to admin
      const adminResult = await this.db.query(
        "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
      );
      
      if (adminResult.rows.length > 0) {
        const adminId = adminResult.rows[0].id;
        
        if (this.notificationService) {
          await this.notificationService.createNotification({
            userId: adminId,
            title: 'Recurring Schedule System Alert',
            message: `Recurring schedule ID ${scheduleId} for service request ID ${serviceRequestId} has failed multiple times. Error: ${errorMessage}`,
            type: 'error',
            relatedTo: 'SYSTEM',
            relatedId: null
          });
        }
      }
      
      // Log the failure for monitoring systems
      console.error(`ALERT: Recurring schedule ID ${scheduleId} has failed ${MAX_RETRY_ATTEMPTS} times. Error: ${errorMessage}`);
    } catch (error) {
      console.error('Error sending schedule failure alert:', error);
      // Non-critical error, continue execution
    }
  }
}

module.exports = RecurringScheduleService;