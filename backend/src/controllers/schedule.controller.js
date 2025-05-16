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

module.exports = {
  getUserScheduleItems,
  getScheduleByDateRange,
  getScheduleItemById,
  createScheduleItem,
  updateScheduleItem,
  deleteScheduleItem
}; 