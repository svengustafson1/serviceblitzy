/**
 * Get all schedule items for current user
 * @route GET /api/schedule
 */
const getUserScheduleItems = async (req, res) => {
  const client = req.db;
  const userId = req.user.id;
  
  try {
    // Get all schedule items for this user
    const result = await client.query(`
      SELECT s.*, 
        p.address as property_address, p.city as property_city, 
        p.state as property_state, p.zip_code as property_zip_code
      FROM schedule_items s
      LEFT JOIN properties p ON s.property_id = p.id
      WHERE s.user_id = $1
      ORDER BY s.date ASC
    `, [userId]);
    
    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting schedule items:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching schedule items',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get schedule items by date range
 * @route GET /api/schedule/range
 */
const getScheduleByDateRange = async (req, res) => {
  const client = req.db;
  const userId = req.user.id;
  const { startDate, endDate } = req.query;
  
  // Validate date parameters
  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      message: 'Start date and end date are required'
    });
  }
  
  try {
    // Get all schedule items for this user within date range
    const result = await client.query(`
      SELECT s.*, 
        p.address as property_address, p.city as property_city, 
        p.state as property_state, p.zip_code as property_zip_code
      FROM schedule_items s
      LEFT JOIN properties p ON s.property_id = p.id
      WHERE s.user_id = $1 AND s.date >= $2 AND s.date <= $3
      ORDER BY s.date ASC
    `, [userId, startDate, endDate]);
    
    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting schedule items by date range:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching schedule items',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get schedule item by ID
 * @route GET /api/schedule/:id
 */
const getScheduleItemById = async (req, res) => {
  const { id } = req.params;
  const client = req.db;
  const userId = req.user.id;
  
  try {
    // Get the schedule item
    const result = await client.query(`
      SELECT s.*, 
        p.address as property_address, p.city as property_city, 
        p.state as property_state, p.zip_code as property_zip_code
      FROM schedule_items s
      LEFT JOIN properties p ON s.property_id = p.id
      WHERE s.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Schedule item not found'
      });
    }
    
    const scheduleItem = result.rows[0];
    
    // Check if user is authorized to access this schedule item
    if (req.user.role !== 'admin' && scheduleItem.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this schedule item'
      });
    }
    
    res.status(200).json({
      success: true,
      data: scheduleItem
    });
  } catch (error) {
    console.error('Error getting schedule item:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching schedule item',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create new schedule item
 * @route POST /api/schedule
 */
const createScheduleItem = async (req, res) => {
  const { 
    title, description, date, endDate, type, 
    propertyId, serviceRequestId, invoiceId,
    completed, recurrence, timeSlot, amount, provider
  } = req.body;
  const client = req.db;
  const userId = req.user.id;
  
  try {
    // Create the schedule item
    const result = await client.query(`
      INSERT INTO schedule_items 
        (user_id, title, description, date, end_date, type, 
         property_id, service_request_id, invoice_id,
         completed, recurrence, time_slot, amount, provider)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      userId, title, description, date, endDate, type, 
      propertyId, serviceRequestId, invoiceId,
      completed, recurrence, timeSlot, amount, provider
    ]);
    
    res.status(201).json({
      success: true,
      message: 'Schedule item created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating schedule item:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating schedule item',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update schedule item
 * @route PUT /api/schedule/:id
 */
const updateScheduleItem = async (req, res) => {
  const { id } = req.params;
  const { 
    title, description, date, endDate, type, 
    propertyId, serviceRequestId, invoiceId,
    completed, recurrence, timeSlot, amount, provider
  } = req.body;
  const client = req.db;
  const userId = req.user.id;
  
  try {
    // Check if schedule item exists and belongs to this user
    const checkResult = await client.query(`
      SELECT * FROM schedule_items
      WHERE id = $1
    `, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Schedule item not found'
      });
    }
    
    const scheduleItem = checkResult.rows[0];
    
    // Check if user is authorized to update this schedule item
    if (req.user.role !== 'admin' && scheduleItem.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this schedule item'
      });
    }
    
    // Update the schedule item
    const result = await client.query(`
      UPDATE schedule_items
      SET 
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        date = COALESCE($3, date),
        end_date = COALESCE($4, end_date),
        type = COALESCE($5, type),
        property_id = COALESCE($6, property_id),
        service_request_id = COALESCE($7, service_request_id),
        invoice_id = COALESCE($8, invoice_id),
        completed = COALESCE($9, completed),
        recurrence = COALESCE($10, recurrence),
        time_slot = COALESCE($11, time_slot),
        amount = COALESCE($12, amount),
        provider = COALESCE($13, provider)
      WHERE id = $14
      RETURNING *
    `, [
      title, description, date, endDate, type, 
      propertyId, serviceRequestId, invoiceId,
      completed, recurrence, timeSlot, amount, provider, id
    ]);
    
    res.status(200).json({
      success: true,
      message: 'Schedule item updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating schedule item:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating schedule item',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete schedule item
 * @route DELETE /api/schedule/:id
 */
const deleteScheduleItem = async (req, res) => {
  const { id } = req.params;
  const client = req.db;
  const userId = req.user.id;
  
  try {
    // Check if schedule item exists and belongs to this user
    const checkResult = await client.query(`
      SELECT * FROM schedule_items
      WHERE id = $1
    `, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Schedule item not found'
      });
    }
    
    const scheduleItem = checkResult.rows[0];
    
    // Check if user is authorized to delete this schedule item
    if (req.user.role !== 'admin' && scheduleItem.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this schedule item'
      });
    }
    
    // Delete the schedule item
    await client.query(`
      DELETE FROM schedule_items
      WHERE id = $1
    `, [id]);
    
    res.status(200).json({
      success: true,
      message: 'Schedule item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting schedule item:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting schedule item',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all recurring patterns for current user
 * @route GET /api/schedule/recurring/patterns
 */
const getUserRecurringPatterns = async (req, res) => {
  const client = req.db;
  const userId = req.user.id;
  
  try {
    // Get all recurring patterns for this user
    const result = await client.query(`
      SELECT rs.*, 
        sr.title as service_request_title,
        p.address as property_address, p.city as property_city, 
        p.state as property_state, p.zip_code as property_zip_code
      FROM recurring_schedules rs
      LEFT JOIN service_requests sr ON rs.service_request_id = sr.id
      LEFT JOIN properties p ON sr.property_id = p.id
      WHERE sr.homeowner_id = $1 OR sr.provider_id = $1
      ORDER BY rs.created_at DESC
    `, [userId]);
    
    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting recurring patterns:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recurring patterns',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get recurring pattern by ID
 * @route GET /api/schedule/recurring/patterns/:id
 */
const getRecurringPatternById = async (req, res) => {
  const { id } = req.params;
  const client = req.db;
  const userId = req.user.id;
  
  try {
    // Get the recurring pattern
    const result = await client.query(`
      SELECT rs.*, 
        sr.title as service_request_title,
        p.address as property_address, p.city as property_city, 
        p.state as property_state, p.zip_code as property_zip_code
      FROM recurring_schedules rs
      LEFT JOIN service_requests sr ON rs.service_request_id = sr.id
      LEFT JOIN properties p ON sr.property_id = p.id
      WHERE rs.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Recurring pattern not found'
      });
    }
    
    const pattern = result.rows[0];
    
    // Check if user is authorized to access this pattern
    const authCheck = await client.query(`
      SELECT id FROM service_requests 
      WHERE id = $1 AND (homeowner_id = $2 OR provider_id = $2)
    `, [pattern.service_request_id, userId]);
    
    if (req.user.role !== 'admin' && authCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this recurring pattern'
      });
    }
    
    res.status(200).json({
      success: true,
      data: pattern
    });
  } catch (error) {
    console.error('Error getting recurring pattern:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recurring pattern',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create new recurring pattern
 * @route POST /api/schedule/recurring/patterns
 */
const createRecurringPattern = async (req, res) => {
  const { 
    serviceRequestId, 
    rrulePattern,
    startDate,
    endDate,
    frequency,
    interval,
    byweekday,
    bymonthday,
    bysetpos,
    count,
    until,
    exceptions
  } = req.body;
  const client = req.db;
  const userId = req.user.id;
  
  try {
    // Check if service request exists and user has access to it
    const serviceCheck = await client.query(`
      SELECT id, homeowner_id, provider_id FROM service_requests 
      WHERE id = $1
    `, [serviceRequestId]);
    
    if (serviceCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }
    
    const serviceRequest = serviceCheck.rows[0];
    
    // Check if user is authorized to create a pattern for this service request
    if (req.user.role !== 'admin' && 
        serviceRequest.homeowner_id !== userId && 
        serviceRequest.provider_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create a recurring pattern for this service request'
      });
    }
    
    // If rrulePattern is provided directly, use it
    // Otherwise, construct it from the individual parameters
    let finalRrulePattern = rrulePattern;
    
    if (!finalRrulePattern) {
      // Import RRule library
      const { RRule } = require('rrule');
      
      // Create RRule options object
      const rruleOptions = {
        freq: frequency ? RRule[frequency.toUpperCase()] : RRule.WEEKLY,
        interval: interval || 1,
        dtstart: startDate ? new Date(startDate) : new Date(),
      };
      
      // Add optional parameters if provided
      if (byweekday) {
        rruleOptions.byweekday = Array.isArray(byweekday) 
          ? byweekday.map(day => RRule[day.toUpperCase()]) 
          : [RRule[byweekday.toUpperCase()]];
      }
      
      if (bymonthday) rruleOptions.bymonthday = bymonthday;
      if (bysetpos) rruleOptions.bysetpos = bysetpos;
      
      // Handle end conditions
      if (count) rruleOptions.count = count;
      else if (until) rruleOptions.until = new Date(until);
      else if (endDate) rruleOptions.until = new Date(endDate);
      
      // Create RRule instance and get string representation
      const rule = new RRule(rruleOptions);
      finalRrulePattern = rule.toString();
    }
    
    // Calculate next run date
    const { RRule } = require('rrule');
    const rule = RRule.fromString(finalRrulePattern);
    const nextRun = rule.after(new Date());
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Create the recurring pattern
    const patternResult = await client.query(`
      INSERT INTO recurring_schedules 
        (service_request_id, rrule_pattern, next_run, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING *
    `, [serviceRequestId, finalRrulePattern, nextRun]);
    
    const newPattern = patternResult.rows[0];
    
    // Add exceptions if provided
    if (exceptions && Array.isArray(exceptions) && exceptions.length > 0) {
      for (const exceptionDate of exceptions) {
        await client.query(`
          INSERT INTO recurring_schedule_exceptions 
            (recurring_schedule_id, exception_date, created_at)
          VALUES ($1, $2, NOW())
        `, [newPattern.id, new Date(exceptionDate)]);
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    // Get the complete pattern with exceptions
    const completeResult = await client.query(`
      SELECT rs.*, 
        (SELECT json_agg(exception_date) 
         FROM recurring_schedule_exceptions 
         WHERE recurring_schedule_id = rs.id) as exceptions
      FROM recurring_schedules rs
      WHERE rs.id = $1
    `, [newPattern.id]);
    
    res.status(201).json({
      success: true,
      message: 'Recurring pattern created successfully',
      data: completeResult.rows[0]
    });
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
    console.error('Error creating recurring pattern:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating recurring pattern',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update recurring pattern
 * @route PUT /api/schedule/recurring/patterns/:id
 */
const updateRecurringPattern = async (req, res) => {
  const { id } = req.params;
  const { 
    rrulePattern,
    startDate,
    endDate,
    frequency,
    interval,
    byweekday,
    bymonthday,
    bysetpos,
    count,
    until
  } = req.body;
  const client = req.db;
  const userId = req.user.id;
  
  try {
    // Check if pattern exists
    const patternCheck = await client.query(`
      SELECT rs.*, sr.homeowner_id, sr.provider_id 
      FROM recurring_schedules rs
      JOIN service_requests sr ON rs.service_request_id = sr.id
      WHERE rs.id = $1
    `, [id]);
    
    if (patternCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Recurring pattern not found'
      });
    }
    
    const pattern = patternCheck.rows[0];
    
    // Check if user is authorized to update this pattern
    if (req.user.role !== 'admin' && 
        pattern.homeowner_id !== userId && 
        pattern.provider_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this recurring pattern'
      });
    }
    
    // If rrulePattern is provided directly, use it
    // Otherwise, construct it from the individual parameters
    let finalRrulePattern = rrulePattern;
    
    if (!finalRrulePattern && (frequency || interval || byweekday || bymonthday || bysetpos || count || until || startDate || endDate)) {
      // Import RRule library
      const { RRule } = require('rrule');
      
      // Get existing rule to use as base
      const existingRule = RRule.fromString(pattern.rrule_pattern);
      const existingOptions = existingRule.options;
      
      // Create RRule options object, starting with existing options
      const rruleOptions = {
        freq: frequency ? RRule[frequency.toUpperCase()] : existingOptions.freq,
        interval: interval || existingOptions.interval,
        dtstart: startDate ? new Date(startDate) : existingOptions.dtstart,
      };
      
      // Add optional parameters if provided or use existing
      if (byweekday) {
        rruleOptions.byweekday = Array.isArray(byweekday) 
          ? byweekday.map(day => RRule[day.toUpperCase()]) 
          : [RRule[byweekday.toUpperCase()]];
      } else if (existingOptions.byweekday) {
        rruleOptions.byweekday = existingOptions.byweekday;
      }
      
      if (bymonthday) {
        rruleOptions.bymonthday = bymonthday;
      } else if (existingOptions.bymonthday) {
        rruleOptions.bymonthday = existingOptions.bymonthday;
      }
      
      if (bysetpos) {
        rruleOptions.bysetpos = bysetpos;
      } else if (existingOptions.bysetpos) {
        rruleOptions.bysetpos = existingOptions.bysetpos;
      }
      
      // Handle end conditions - only one can be active
      if (count) {
        rruleOptions.count = count;
      } else if (until) {
        rruleOptions.until = new Date(until);
      } else if (endDate) {
        rruleOptions.until = new Date(endDate);
      } else if (existingOptions.count) {
        rruleOptions.count = existingOptions.count;
      } else if (existingOptions.until) {
        rruleOptions.until = existingOptions.until;
      }
      
      // Create RRule instance and get string representation
      const rule = new RRule(rruleOptions);
      finalRrulePattern = rule.toString();
    }
    
    // If no changes to the pattern, use the existing one
    if (!finalRrulePattern) {
      finalRrulePattern = pattern.rrule_pattern;
    }
    
    // Calculate next run date
    const { RRule } = require('rrule');
    const rule = RRule.fromString(finalRrulePattern);
    const nextRun = rule.after(new Date());
    
    // Update the recurring pattern
    const updateResult = await client.query(`
      UPDATE recurring_schedules
      SET 
        rrule_pattern = $1,
        next_run = $2,
        updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [finalRrulePattern, nextRun, id]);
    
    // Get the complete pattern with exceptions
    const completeResult = await client.query(`
      SELECT rs.*, 
        (SELECT json_agg(exception_date) 
         FROM recurring_schedule_exceptions 
         WHERE recurring_schedule_id = rs.id) as exceptions
      FROM recurring_schedules rs
      WHERE rs.id = $1
    `, [id]);
    
    res.status(200).json({
      success: true,
      message: 'Recurring pattern updated successfully',
      data: completeResult.rows[0]
    });
  } catch (error) {
    console.error('Error updating recurring pattern:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating recurring pattern',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete recurring pattern
 * @route DELETE /api/schedule/recurring/patterns/:id
 */
const deleteRecurringPattern = async (req, res) => {
  const { id } = req.params;
  const client = req.db;
  const userId = req.user.id;
  
  try {
    // Check if pattern exists
    const patternCheck = await client.query(`
      SELECT rs.*, sr.homeowner_id, sr.provider_id 
      FROM recurring_schedules rs
      JOIN service_requests sr ON rs.service_request_id = sr.id
      WHERE rs.id = $1
    `, [id]);
    
    if (patternCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Recurring pattern not found'
      });
    }
    
    const pattern = patternCheck.rows[0];
    
    // Check if user is authorized to delete this pattern
    if (req.user.role !== 'admin' && 
        pattern.homeowner_id !== userId && 
        pattern.provider_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this recurring pattern'
      });
    }
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Delete all exceptions for this pattern
    await client.query(`
      DELETE FROM recurring_schedule_exceptions
      WHERE recurring_schedule_id = $1
    `, [id]);
    
    // Delete the recurring pattern
    await client.query(`
      DELETE FROM recurring_schedules
      WHERE id = $1
    `, [id]);
    
    // Commit transaction
    await client.query('COMMIT');
    
    res.status(200).json({
      success: true,
      message: 'Recurring pattern deleted successfully'
    });
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
    console.error('Error deleting recurring pattern:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting recurring pattern',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Generate schedule items from recurring pattern
 * @route POST /api/schedule/recurring/generate/:patternId
 */
const generateScheduleFromPattern = async (req, res) => {
  const { patternId } = req.params;
  const { startDate, endDate, limit } = req.body;
  const client = req.db;
  const userId = req.user.id;
  
  try {
    // Check if pattern exists
    const patternCheck = await client.query(`
      SELECT rs.*, sr.* 
      FROM recurring_schedules rs
      JOIN service_requests sr ON rs.service_request_id = sr.id
      WHERE rs.id = $1
    `, [patternId]);
    
    if (patternCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Recurring pattern not found'
      });
    }
    
    const pattern = patternCheck.rows[0];
    
    // Check if user is authorized to generate schedules from this pattern
    if (req.user.role !== 'admin' && 
        pattern.homeowner_id !== userId && 
        pattern.provider_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to generate schedules from this pattern'
      });
    }
    
    // Get exceptions for this pattern
    const exceptionsResult = await client.query(`
      SELECT exception_date 
      FROM recurring_schedule_exceptions 
      WHERE recurring_schedule_id = $1
    `, [patternId]);
    
    const exceptions = exceptionsResult.rows.map(row => new Date(row.exception_date));
    
    // Import RRule library
    const { RRule, RRuleSet } = require('rrule');
    
    // Create RRuleSet to handle both the rule and exceptions
    const rruleSet = new RRuleSet();
    
    // Add the main rule
    rruleSet.rrule(RRule.fromString(pattern.rrule_pattern));
    
    // Add exceptions
    exceptions.forEach(exceptionDate => {
      rruleSet.exdate(exceptionDate);
    });
    
    // Generate occurrences
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(start.getTime() + (90 * 24 * 60 * 60 * 1000)); // Default to 90 days if no end date
    
    let occurrences;
    if (limit) {
      // If limit is specified, get that many occurrences after start date
      occurrences = rruleSet.between(start, end, true).slice(0, limit);
    } else {
      // Otherwise get all occurrences between start and end dates
      occurrences = rruleSet.between(start, end, true);
    }
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Create schedule items for each occurrence
    const createdItems = [];
    for (const occurrence of occurrences) {
      // Calculate end date based on service duration or default to 1 hour
      const duration = pattern.estimated_duration || 60; // in minutes
      const occurrenceEnd = new Date(occurrence.getTime() + (duration * 60 * 1000));
      
      // Create schedule item
      const itemResult = await client.query(`
        INSERT INTO schedule_items 
          (user_id, title, description, date, end_date, type, 
           property_id, service_request_id, time_slot, 
           provider, recurring_schedule_id, completed)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        pattern.homeowner_id, 
        pattern.title, 
        pattern.description, 
        occurrence, 
        occurrenceEnd, 
        'service', 
        pattern.property_id, 
        pattern.id, 
        `${occurrence.getHours()}:${occurrence.getMinutes().toString().padStart(2, '0')}`, 
        pattern.provider_id, 
        patternId,
        false
      ]);
      
      createdItems.push(itemResult.rows[0]);
    }
    
    // Update next run date for the pattern
    const nextRun = rruleSet.after(new Date());
    if (nextRun) {
      await client.query(`
        UPDATE recurring_schedules
        SET next_run = $1, updated_at = NOW()
        WHERE id = $2
      `, [nextRun, patternId]);
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    res.status(200).json({
      success: true,
      message: `Generated ${createdItems.length} schedule items`,
      count: createdItems.length,
      data: createdItems
    });
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
    console.error('Error generating schedule from pattern:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating schedule from pattern',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Add exception date to recurring pattern
 * @route POST /api/schedule/recurring/patterns/:id/exceptions
 */
const addPatternException = async (req, res) => {
  const { id } = req.params;
  const { exceptionDate } = req.body;
  const client = req.db;
  const userId = req.user.id;
  
  if (!exceptionDate) {
    return res.status(400).json({
      success: false,
      message: 'Exception date is required'
    });
  }
  
  try {
    // Check if pattern exists
    const patternCheck = await client.query(`
      SELECT rs.*, sr.homeowner_id, sr.provider_id 
      FROM recurring_schedules rs
      JOIN service_requests sr ON rs.service_request_id = sr.id
      WHERE rs.id = $1
    `, [id]);
    
    if (patternCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Recurring pattern not found'
      });
    }
    
    const pattern = patternCheck.rows[0];
    
    // Check if user is authorized to modify this pattern
    if (req.user.role !== 'admin' && 
        pattern.homeowner_id !== userId && 
        pattern.provider_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this recurring pattern'
      });
    }
    
    // Check if exception already exists
    const exceptionCheck = await client.query(`
      SELECT id FROM recurring_schedule_exceptions 
      WHERE recurring_schedule_id = $1 AND exception_date = $2
    `, [id, new Date(exceptionDate)]);
    
    if (exceptionCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Exception date already exists for this pattern'
      });
    }
    
    // Add the exception
    const exceptionResult = await client.query(`
      INSERT INTO recurring_schedule_exceptions 
        (recurring_schedule_id, exception_date, created_at)
      VALUES ($1, $2, NOW())
      RETURNING *
    `, [id, new Date(exceptionDate)]);
    
    // Get all exceptions for this pattern
    const allExceptions = await client.query(`
      SELECT * FROM recurring_schedule_exceptions 
      WHERE recurring_schedule_id = $1
      ORDER BY exception_date ASC
    `, [id]);
    
    res.status(201).json({
      success: true,
      message: 'Exception added successfully',
      data: exceptionResult.rows[0],
      allExceptions: allExceptions.rows
    });
  } catch (error) {
    console.error('Error adding pattern exception:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding pattern exception',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Remove exception date from recurring pattern
 * @route DELETE /api/schedule/recurring/patterns/:id/exceptions/:exceptionId
 */
const removePatternException = async (req, res) => {
  const { id, exceptionId } = req.params;
  const client = req.db;
  const userId = req.user.id;
  
  try {
    // Check if pattern exists
    const patternCheck = await client.query(`
      SELECT rs.*, sr.homeowner_id, sr.provider_id 
      FROM recurring_schedules rs
      JOIN service_requests sr ON rs.service_request_id = sr.id
      WHERE rs.id = $1
    `, [id]);
    
    if (patternCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Recurring pattern not found'
      });
    }
    
    const pattern = patternCheck.rows[0];
    
    // Check if user is authorized to modify this pattern
    if (req.user.role !== 'admin' && 
        pattern.homeowner_id !== userId && 
        pattern.provider_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this recurring pattern'
      });
    }
    
    // Check if exception exists
    const exceptionCheck = await client.query(`
      SELECT id FROM recurring_schedule_exceptions 
      WHERE id = $1 AND recurring_schedule_id = $2
    `, [exceptionId, id]);
    
    if (exceptionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Exception not found for this pattern'
      });
    }
    
    // Remove the exception
    await client.query(`
      DELETE FROM recurring_schedule_exceptions 
      WHERE id = $1
    `, [exceptionId]);
    
    // Get all remaining exceptions for this pattern
    const allExceptions = await client.query(`
      SELECT * FROM recurring_schedule_exceptions 
      WHERE recurring_schedule_id = $1
      ORDER BY exception_date ASC
    `, [id]);
    
    res.status(200).json({
      success: true,
      message: 'Exception removed successfully',
      allExceptions: allExceptions.rows
    });
  } catch (error) {
    console.error('Error removing pattern exception:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing pattern exception',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get upcoming scheduled services
 * @route GET /api/schedule/upcoming
 */
const getUpcomingScheduledServices = async (req, res) => {
  const client = req.db;
  const userId = req.user.id;
  const { days = 7, limit = 10 } = req.query;
  
  try {
    // Calculate date range
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + (parseInt(days) * 24 * 60 * 60 * 1000));
    
    // Get upcoming schedule items for this user
    const result = await client.query(`
      SELECT s.*, 
        p.address as property_address, p.city as property_city, 
        p.state as property_state, p.zip_code as property_zip_code,
        rs.rrule_pattern
      FROM schedule_items s
      LEFT JOIN properties p ON s.property_id = p.id
      LEFT JOIN recurring_schedules rs ON s.recurring_schedule_id = rs.id
      WHERE (s.user_id = $1 OR s.provider = $1)
        AND s.date >= $2 AND s.date <= $3
        AND s.completed = false
      ORDER BY s.date ASC
      LIMIT $4
    `, [userId, startDate, endDate, limit]);
    
    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting upcoming scheduled services:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching upcoming scheduled services',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Trigger notifications for upcoming scheduled services
 * @route POST /api/schedule/notify/upcoming
 */
const notifyUpcomingServices = async (req, res) => {
  const client = req.db;
  const { days = 1 } = req.body;
  
  try {
    // Only admin or system can trigger notifications for all users
    if (req.user.role !== 'admin' && req.user.role !== 'system') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to trigger notifications for all users'
      });
    }
    
    // Calculate date range for upcoming services
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + (parseInt(days) * 24 * 60 * 60 * 1000));
    
    // Get upcoming schedule items
    const scheduleResult = await client.query(`
      SELECT s.*, 
        p.address as property_address,
        u.id as homeowner_id, u.email as homeowner_email,
        sp.id as provider_id, sp.email as provider_email
      FROM schedule_items s
      LEFT JOIN properties p ON s.property_id = p.id
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN users sp ON s.provider = sp.id
      WHERE s.date >= $1 AND s.date <= $2
        AND s.completed = false
    `, [startDate, endDate]);
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Create notifications for each upcoming service
    const notifications = [];
    for (const service of scheduleResult.rows) {
      // Format date for display
      const serviceDate = new Date(service.date);
      const formattedDate = serviceDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Create notification for homeowner
      if (service.homeowner_id) {
        const homeownerNotification = await client.query(`
          INSERT INTO notifications 
            (user_id, title, message, type, related_to, related_id, is_read, delivery_status, actions, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
          RETURNING *
        `, [
          service.homeowner_id,
          'Upcoming Service Reminder',
          `You have a scheduled service on ${formattedDate}${service.property_address ? ` at ${service.property_address}` : ''}.`,
          'reminder',
          'schedule',
          service.id,
          false,
          'pending',
          JSON.stringify([{
            label: 'View Details',
            action: 'view_schedule',
            data: { scheduleId: service.id }
          }])
        ]);
        
        notifications.push(homeownerNotification.rows[0]);
      }
      
      // Create notification for service provider
      if (service.provider_id) {
        const providerNotification = await client.query(`
          INSERT INTO notifications 
            (user_id, title, message, type, related_to, related_id, is_read, delivery_status, actions, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
          RETURNING *
        `, [
          service.provider_id,
          'Upcoming Service Reminder',
          `You have a service scheduled on ${formattedDate}${service.property_address ? ` at ${service.property_address}` : ''}.`,
          'reminder',
          'schedule',
          service.id,
          false,
          'pending',
          JSON.stringify([{
            label: 'View Details',
            action: 'view_schedule',
            data: { scheduleId: service.id }
          }])
        ]);
        
        notifications.push(providerNotification.rows[0]);
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    // Emit WebSocket events for real-time notifications
    // This assumes a WebSocket service is available
    try {
      const WebSocketService = require('../services/websocket.service');
      for (const notification of notifications) {
        WebSocketService.emitToUser(notification.user_id, 'notification', notification);
        
        // Update delivery status
        await client.query(`
          UPDATE notifications
          SET delivery_status = 'sent', updated_at = NOW()
          WHERE id = $1
        `, [notification.id]);
      }
    } catch (wsError) {
      console.error('WebSocket notification error:', wsError);
      // Continue execution even if WebSocket fails
    }
    
    res.status(200).json({
      success: true,
      message: `Sent ${notifications.length} notifications for upcoming services`,
      count: notifications.length,
      data: notifications
    });
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
    console.error('Error sending notifications for upcoming services:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending notifications for upcoming services',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getUserScheduleItems,
  getScheduleByDateRange,
  getScheduleItemById,
  createScheduleItem,
  updateScheduleItem,
  deleteScheduleItem,
  getUserRecurringPatterns,
  getRecurringPatternById,
  createRecurringPattern,
  updateRecurringPattern,
  deleteRecurringPattern,
  generateScheduleFromPattern,
  addPatternException,
  removePatternException,
  getUpcomingScheduledServices,
  notifyUpcomingServices
};