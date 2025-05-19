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
 * Get all recurring schedule patterns for current user
 * @route GET /api/schedule/recurring
 */
const getRecurringSchedules = async (req, res) => {
  const client = req.db;
  const userId = req.user.id;
  
  try {
    // Get all recurring schedules for this user
    const result = await client.query(`
      SELECT rs.*, sr.title, sr.description, 
        p.address as property_address, p.city as property_city, 
        p.state as property_state, p.zip_code as property_zip_code
      FROM recurring_schedules rs
      JOIN service_requests sr ON rs.service_request_id = sr.id
      LEFT JOIN properties p ON sr.property_id = p.id
      WHERE sr.homeowner_id = $1
      ORDER BY rs.next_run ASC
    `, [userId]);
    
    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting recurring schedules:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recurring schedules',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get recurring schedule pattern by ID
 * @route GET /api/schedule/recurring/:id
 */
const getRecurringScheduleById = async (req, res) => {
  const { id } = req.params;
  const client = req.db;
  const userId = req.user.id;
  
  try {
    // Get the recurring schedule
    const result = await client.query(`
      SELECT rs.*, sr.title, sr.description, 
        p.address as property_address, p.city as property_city, 
        p.state as property_state, p.zip_code as property_zip_code
      FROM recurring_schedules rs
      JOIN service_requests sr ON rs.service_request_id = sr.id
      LEFT JOIN properties p ON sr.property_id = p.id
      WHERE rs.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Recurring schedule not found'
      });
    }
    
    const recurringSchedule = result.rows[0];
    
    // Check if user is authorized to access this recurring schedule
    if (req.user.role !== 'admin' && recurringSchedule.homeowner_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this recurring schedule'
      });
    }
    
    res.status(200).json({
      success: true,
      data: recurringSchedule
    });
  } catch (error) {
    console.error('Error getting recurring schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recurring schedule',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create new recurring schedule pattern
 * @route POST /api/schedule/recurring
 */
const createRecurringSchedule = async (req, res) => {
  const { 
    serviceRequestId, 
    rrulePattern, 
    startDate,
    endDate,
    count,
    interval,
    frequency,
    byweekday,
    bymonthday,
    bysetpos,
    exceptions
  } = req.body;
  const client = req.db;
  const userId = req.user.id;
  
  try {
    // Validate service request exists and belongs to this user
    const serviceRequestCheck = await client.query(`
      SELECT * FROM service_requests
      WHERE id = $1
    `, [serviceRequestId]);
    
    if (serviceRequestCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }
    
    const serviceRequest = serviceRequestCheck.rows[0];
    
    // Check if user is authorized to create a recurring schedule for this service request
    if (req.user.role !== 'admin' && serviceRequest.homeowner_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create a recurring schedule for this service request'
      });
    }
    
    // Generate RRule pattern if not provided directly
    let finalRrulePattern = rrulePattern;
    if (!finalRrulePattern) {
      // Import RRule library
      const { RRule } = require('rrule');
      
      // Map frequency string to RRule constant
      const freqMap = {
        'daily': RRule.DAILY,
        'weekly': RRule.WEEKLY,
        'monthly': RRule.MONTHLY,
        'yearly': RRule.YEARLY
      };
      
      // Map weekday strings to RRule constants if provided
      let byweekdayArray = null;
      if (byweekday) {
        const weekdayMap = {
          'mo': RRule.MO,
          'tu': RRule.TU,
          'we': RRule.WE,
          'th': RRule.TH,
          'fr': RRule.FR,
          'sa': RRule.SA,
          'su': RRule.SU
        };
        
        byweekdayArray = Array.isArray(byweekday) 
          ? byweekday.map(day => weekdayMap[day.toLowerCase()])
          : [weekdayMap[byweekday.toLowerCase()]];
      }
      
      // Create RRule options
      const rruleOptions = {
        freq: freqMap[frequency.toLowerCase()],
        interval: interval || 1,
        dtstart: new Date(startDate),
      };
      
      // Add optional parameters if provided
      if (count) rruleOptions.count = count;
      if (endDate) rruleOptions.until = new Date(endDate);
      if (byweekdayArray) rruleOptions.byweekday = byweekdayArray;
      if (bymonthday) rruleOptions.bymonthday = bymonthday;
      if (bysetpos) rruleOptions.bysetpos = bysetpos;
      
      // Create RRule and get string representation
      const rule = new RRule(rruleOptions);
      finalRrulePattern = rule.toString();
    }
    
    // Calculate next run date
    const { RRule } = require('rrule');
    const rule = RRule.fromString(finalRrulePattern);
    const nextRun = rule.after(new Date(), true);
    
    // Create the recurring schedule
    const result = await client.query(`
      INSERT INTO recurring_schedules 
        (service_request_id, rrule_pattern, next_run, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING *
    `, [
      serviceRequestId, finalRrulePattern, nextRun
    ]);
    
    // Store exceptions if provided
    if (exceptions && exceptions.length > 0) {
      for (const exceptionDate of exceptions) {
        await client.query(`
          INSERT INTO schedule_exceptions 
            (recurring_schedule_id, exception_date, created_at, updated_at)
          VALUES ($1, $2, NOW(), NOW())
        `, [result.rows[0].id, new Date(exceptionDate)]);
      }
    }
    
    // Generate initial schedule items
    await generateScheduleItems(client, result.rows[0].id, userId);
    
    // Get the complete recurring schedule with exceptions
    const completeResult = await client.query(`
      SELECT rs.*, 
        (SELECT json_agg(exception_date) FROM schedule_exceptions WHERE recurring_schedule_id = rs.id) as exceptions
      FROM recurring_schedules rs
      WHERE rs.id = $1
    `, [result.rows[0].id]);
    
    res.status(201).json({
      success: true,
      message: 'Recurring schedule created successfully',
      data: completeResult.rows[0]
    });
  } catch (error) {
    console.error('Error creating recurring schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating recurring schedule',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update recurring schedule pattern
 * @route PUT /api/schedule/recurring/:id
 */
const updateRecurringSchedule = async (req, res) => {
  const { id } = req.params;
  const { 
    rrulePattern, 
    startDate,
    endDate,
    count,
    interval,
    frequency,
    byweekday,
    bymonthday,
    bysetpos,
    exceptions,
    applyToFuture
  } = req.body;
  const client = req.db;
  const userId = req.user.id;
  
  try {
    // Begin transaction
    await client.query('BEGIN');
    
    // Check if recurring schedule exists
    const checkResult = await client.query(`
      SELECT rs.*, sr.homeowner_id 
      FROM recurring_schedules rs
      JOIN service_requests sr ON rs.service_request_id = sr.id
      WHERE rs.id = $1
    `, [id]);
    
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Recurring schedule not found'
      });
    }
    
    const recurringSchedule = checkResult.rows[0];
    
    // Check if user is authorized to update this recurring schedule
    if (req.user.role !== 'admin' && recurringSchedule.homeowner_id !== userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this recurring schedule'
      });
    }
    
    // Generate RRule pattern if not provided directly
    let finalRrulePattern = rrulePattern;
    if (!finalRrulePattern && (frequency || interval || startDate || endDate || count || byweekday || bymonthday || bysetpos)) {
      // Import RRule library
      const { RRule } = require('rrule');
      
      // Parse existing rule to get current values
      const existingRule = RRule.fromString(recurringSchedule.rrule_pattern);
      const existingOptions = existingRule.options;
      
      // Map frequency string to RRule constant if provided
      let freq = existingOptions.freq;
      if (frequency) {
        const freqMap = {
          'daily': RRule.DAILY,
          'weekly': RRule.WEEKLY,
          'monthly': RRule.MONTHLY,
          'yearly': RRule.YEARLY
        };
        freq = freqMap[frequency.toLowerCase()];
      }
      
      // Map weekday strings to RRule constants if provided
      let byweekdayArray = existingOptions.byweekday;
      if (byweekday) {
        const weekdayMap = {
          'mo': RRule.MO,
          'tu': RRule.TU,
          'we': RRule.WE,
          'th': RRule.TH,
          'fr': RRule.FR,
          'sa': RRule.SA,
          'su': RRule.SU
        };
        
        byweekdayArray = Array.isArray(byweekday) 
          ? byweekday.map(day => weekdayMap[day.toLowerCase()])
          : [weekdayMap[byweekday.toLowerCase()]];
      }
      
      // Create RRule options with existing values as defaults
      const rruleOptions = {
        freq: freq,
        interval: interval || existingOptions.interval,
        dtstart: startDate ? new Date(startDate) : existingOptions.dtstart,
      };
      
      // Add optional parameters if provided or use existing
      if (count) {
        rruleOptions.count = count;
      } else if (existingOptions.count) {
        rruleOptions.count = existingOptions.count;
      }
      
      if (endDate) {
        rruleOptions.until = new Date(endDate);
      } else if (existingOptions.until) {
        rruleOptions.until = existingOptions.until;
      }
      
      if (byweekdayArray) {
        rruleOptions.byweekday = byweekdayArray;
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
      
      // Create RRule and get string representation
      const rule = new RRule(rruleOptions);
      finalRrulePattern = rule.toString();
    }
    
    // Calculate next run date if pattern changed
    let nextRun = recurringSchedule.next_run;
    if (finalRrulePattern && finalRrulePattern !== recurringSchedule.rrule_pattern) {
      const { RRule } = require('rrule');
      const rule = RRule.fromString(finalRrulePattern);
      nextRun = rule.after(new Date(), true);
    }
    
    // Update the recurring schedule
    const updateFields = [];
    const updateValues = [];
    let valueIndex = 1;
    
    if (finalRrulePattern) {
      updateFields.push(`rrule_pattern = $${valueIndex}`);
      updateValues.push(finalRrulePattern);
      valueIndex++;
    }
    
    if (nextRun) {
      updateFields.push(`next_run = $${valueIndex}`);
      updateValues.push(nextRun);
      valueIndex++;
    }
    
    updateFields.push(`updated_at = NOW()`);
    
    if (updateFields.length > 1) { // More than just updated_at
      const result = await client.query(`
        UPDATE recurring_schedules
        SET ${updateFields.join(', ')}
        WHERE id = $${valueIndex}
        RETURNING *
      `, [...updateValues, id]);
      
      // Handle exceptions if provided
      if (exceptions) {
        // Delete existing exceptions
        await client.query(`
          DELETE FROM schedule_exceptions
          WHERE recurring_schedule_id = $1
        `, [id]);
        
        // Add new exceptions
        for (const exceptionDate of exceptions) {
          await client.query(`
            INSERT INTO schedule_exceptions 
              (recurring_schedule_id, exception_date, created_at, updated_at)
            VALUES ($1, $2, NOW(), NOW())
          `, [id, new Date(exceptionDate)]);
        }
      }
      
      // Handle future occurrences if pattern changed
      if (applyToFuture && finalRrulePattern && finalRrulePattern !== recurringSchedule.rrule_pattern) {
        // Delete future schedule items
        await client.query(`
          DELETE FROM schedule_items
          WHERE recurrence_parent_id = $1 AND date > NOW()
        `, [id]);
        
        // Generate new schedule items
        await generateScheduleItems(client, id, userId);
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    // Get the updated recurring schedule with exceptions
    const completeResult = await client.query(`
      SELECT rs.*, 
        (SELECT json_agg(exception_date) FROM schedule_exceptions WHERE recurring_schedule_id = rs.id) as exceptions
      FROM recurring_schedules rs
      WHERE rs.id = $1
    `, [id]);
    
    res.status(200).json({
      success: true,
      message: 'Recurring schedule updated successfully',
      data: completeResult.rows[0]
    });
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('Error updating recurring schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating recurring schedule',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete recurring schedule pattern
 * @route DELETE /api/schedule/recurring/:id
 */
const deleteRecurringSchedule = async (req, res) => {
  const { id } = req.params;
  const { deleteFutureItems } = req.query;
  const client = req.db;
  const userId = req.user.id;
  
  try {
    // Begin transaction
    await client.query('BEGIN');
    
    // Check if recurring schedule exists
    const checkResult = await client.query(`
      SELECT rs.*, sr.homeowner_id 
      FROM recurring_schedules rs
      JOIN service_requests sr ON rs.service_request_id = sr.id
      WHERE rs.id = $1
    `, [id]);
    
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Recurring schedule not found'
      });
    }
    
    const recurringSchedule = checkResult.rows[0];
    
    // Check if user is authorized to delete this recurring schedule
    if (req.user.role !== 'admin' && recurringSchedule.homeowner_id !== userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this recurring schedule'
      });
    }
    
    // Delete associated exceptions
    await client.query(`
      DELETE FROM schedule_exceptions
      WHERE recurring_schedule_id = $1
    `, [id]);
    
    // Delete future schedule items if requested
    if (deleteFutureItems === 'true') {
      await client.query(`
        DELETE FROM schedule_items
        WHERE recurrence_parent_id = $1 AND date > NOW()
      `, [id]);
    }
    
    // Delete the recurring schedule
    await client.query(`
      DELETE FROM recurring_schedules
      WHERE id = $1
    `, [id]);
    
    // Commit transaction
    await client.query('COMMIT');
    
    res.status(200).json({
      success: true,
      message: 'Recurring schedule deleted successfully'
    });
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('Error deleting recurring schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting recurring schedule',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Generate schedule items from recurring pattern
 * @route POST /api/schedule/recurring/:id/generate
 */
const generateScheduleItemsFromPattern = async (req, res) => {
  const { id } = req.params;
  const { count } = req.body;
  const client = req.db;
  const userId = req.user.id;
  
  try {
    // Check if recurring schedule exists
    const checkResult = await client.query(`
      SELECT rs.*, sr.homeowner_id, sr.id as service_request_id 
      FROM recurring_schedules rs
      JOIN service_requests sr ON rs.service_request_id = sr.id
      WHERE rs.id = $1
    `, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Recurring schedule not found'
      });
    }
    
    const recurringSchedule = checkResult.rows[0];
    
    // Check if user is authorized to generate schedule items for this recurring schedule
    if (req.user.role !== 'admin' && recurringSchedule.homeowner_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to generate schedule items for this recurring schedule'
      });
    }
    
    // Generate schedule items
    const generatedItems = await generateScheduleItems(client, id, userId, count);
    
    res.status(200).json({
      success: true,
      message: `${generatedItems.length} schedule items generated successfully`,
      data: generatedItems
    });
  } catch (error) {
    console.error('Error generating schedule items:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating schedule items',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Helper function to generate schedule items from a recurring pattern
 * @param {Object} client - Database client
 * @param {number} recurringScheduleId - ID of the recurring schedule
 * @param {number} userId - ID of the user
 * @param {number} count - Number of occurrences to generate (default: 4)
 * @returns {Array} Generated schedule items
 */
const generateScheduleItems = async (client, recurringScheduleId, userId, count = 4) => {
  // Get the recurring schedule
  const scheduleResult = await client.query(`
    SELECT rs.*, sr.* 
    FROM recurring_schedules rs
    JOIN service_requests sr ON rs.service_request_id = sr.id
    WHERE rs.id = $1
  `, [recurringScheduleId]);
  
  if (scheduleResult.rows.length === 0) {
    throw new Error('Recurring schedule not found');
  }
  
  const recurringSchedule = scheduleResult.rows[0];
  
  // Get exceptions for this recurring schedule
  const exceptionsResult = await client.query(`
    SELECT exception_date 
    FROM schedule_exceptions
    WHERE recurring_schedule_id = $1
  `, [recurringScheduleId]);
  
  const exceptions = exceptionsResult.rows.map(row => new Date(row.exception_date));
  
  // Import RRule library
  const { RRule, RRuleSet } = require('rrule');
  
  // Create RRule from pattern
  const rule = RRule.fromString(recurringSchedule.rrule_pattern);
  
  // Create RRuleSet to handle exceptions
  const ruleSet = new RRuleSet();
  ruleSet.rrule(rule);
  
  // Add exceptions
  exceptions.forEach(exceptionDate => {
    ruleSet.exdate(exceptionDate);
  });
  
  // Get next occurrences
  const now = new Date();
  const occurrences = ruleSet.after(now, true, count);
  
  // Generate schedule items for each occurrence
  const generatedItems = [];
  
  for (const occurrence of occurrences) {
    // Check if schedule item already exists for this date
    const existingCheck = await client.query(`
      SELECT id FROM schedule_items
      WHERE recurrence_parent_id = $1 AND date = $2
    `, [recurringScheduleId, occurrence]);
    
    if (existingCheck.rows.length === 0) {
      // Create a new schedule item
      const result = await client.query(`
        INSERT INTO schedule_items 
          (user_id, title, description, date, type, 
           property_id, service_request_id, recurrence_parent_id, completed)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        userId,
        recurringSchedule.title,
        recurringSchedule.description,
        occurrence,
        'service',
        recurringSchedule.property_id,
        recurringSchedule.service_request_id,
        recurringScheduleId,
        false
      ]);
      
      generatedItems.push(result.rows[0]);
      
      // Create notification for upcoming service
      await createUpcomingServiceNotification(client, result.rows[0]);
    }
  }
  
  // Update next_run in recurring_schedules
  if (occurrences.length > 0) {
    const nextAfterLast = rule.after(occurrences[occurrences.length - 1], true);
    await client.query(`
      UPDATE recurring_schedules
      SET next_run = $1, updated_at = NOW()
      WHERE id = $2
    `, [nextAfterLast, recurringScheduleId]);
  }
  
  return generatedItems;
};

/**
 * Helper function to create notification for upcoming service
 * @param {Object} client - Database client
 * @param {Object} scheduleItem - Schedule item object
 */
const createUpcomingServiceNotification = async (client, scheduleItem) => {
  try {
    // Get service request details
    const serviceRequestResult = await client.query(`
      SELECT sr.*, p.address 
      FROM service_requests sr
      LEFT JOIN properties p ON sr.property_id = p.id
      WHERE sr.id = $1
    `, [scheduleItem.service_request_id]);
    
    if (serviceRequestResult.rows.length === 0) {
      return;
    }
    
    const serviceRequest = serviceRequestResult.rows[0];
    
    // Format date for notification
    const scheduleDate = new Date(scheduleItem.date);
    const formattedDate = scheduleDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Create notification for homeowner
    await client.query(`
      INSERT INTO notifications 
        (user_id, title, message, type, related_to, related_id, is_read, delivery_status, actions, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
    `, [
      serviceRequest.homeowner_id,
      'Upcoming Scheduled Service',
      `You have a scheduled service for ${serviceRequest.title} at ${serviceRequest.address} on ${formattedDate}.`,
      'info',
      'SCHEDULE',
      scheduleItem.id,
      false,
      'pending',
      JSON.stringify([
        {
          label: 'View Details',
          action: 'VIEW_SCHEDULE',
          data: { scheduleId: scheduleItem.id }
        }
      ])
    ]);
    
    // If there's a provider assigned, notify them too
    if (scheduleItem.provider) {
      await client.query(`
        INSERT INTO notifications 
          (user_id, title, message, type, related_to, related_id, is_read, delivery_status, actions, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      `, [
        scheduleItem.provider,
        'Upcoming Service Appointment',
        `You have a scheduled service appointment for ${serviceRequest.title} at ${serviceRequest.address} on ${formattedDate}.`,
        'info',
        'SCHEDULE',
        scheduleItem.id,
        false,
        'pending',
        JSON.stringify([
          {
            label: 'View Details',
            action: 'VIEW_SCHEDULE',
            data: { scheduleId: scheduleItem.id }
          }
        ])
      ]);
    }
  } catch (error) {
    console.error('Error creating notification for upcoming service:', error);
  }
};

module.exports = {
  getUserScheduleItems,
  getScheduleByDateRange,
  getScheduleItemById,
  createScheduleItem,
  updateScheduleItem,
  deleteScheduleItem,
  getRecurringSchedules,
  getRecurringScheduleById,
  createRecurringSchedule,
  updateRecurringSchedule,
  deleteRecurringSchedule,
  generateScheduleItemsFromPattern
};