/**
 * Get all homeowners (admin only)
 * @route GET /api/homeowners
 */
const getAllHomeowners = async (req, res) => {
  const client = req.db;
  
  try {
    const result = await client.query(`
      SELECT h.*, u.email, u.first_name, u.last_name, u.phone 
      FROM homeowners h
      JOIN users u ON h.user_id = u.id
      ORDER BY h.created_at DESC
    `);
    
    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting homeowners:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching homeowners',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get homeowner by ID
 * @route GET /api/homeowners/:id
 */
const getHomeownerById = async (req, res) => {
  const { id } = req.params;
  const client = req.db;
  
  // Only allow admin or the homeowner themselves to access
  // Convert both IDs to strings for comparison to handle both string and number IDs
  if (req.user.role !== 'admin' && String(req.user.id) !== String(id)) {
    console.log(`Access denied: User ID ${req.user.id} (${typeof req.user.id}) tried to access homeowner ID ${id} (${typeof id})`);
    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this homeowner'
    });
  }
  
  try {
    const result = await client.query(`
      SELECT h.*, u.email, u.first_name, u.last_name, u.phone 
      FROM homeowners h
      JOIN users u ON h.user_id = u.id
      WHERE h.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Homeowner not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error getting homeowner:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching homeowner',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update homeowner
 * @route PUT /api/homeowners/:id
 */
const updateHomeowner = async (req, res) => {
  const { id } = req.params;
  const { billingAddress, paymentMethodId } = req.body;
  const client = req.db;
  
  // Only allow admin or the homeowner themselves to update
  // Convert both IDs to strings for comparison to handle both string and number IDs
  if (req.user.role !== 'admin' && String(req.user.id) !== String(id)) {
    console.log(`Access denied: User ID ${req.user.id} (${typeof req.user.id}) tried to update homeowner ID ${id} (${typeof id})`);
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this homeowner'
    });
  }
  
  try {
    const result = await client.query(`
      UPDATE homeowners
      SET 
        billing_address = COALESCE($1, billing_address),
        payment_method_id = COALESCE($2, payment_method_id),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [billingAddress, paymentMethodId, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Homeowner not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Homeowner updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating homeowner:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating homeowner',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete homeowner
 * @route DELETE /api/homeowners/:id
 */
const deleteHomeowner = async (req, res) => {
  const { id } = req.params;
  const client = req.db;
  
  // Only allow admin or the homeowner themselves to delete
  if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this homeowner'
    });
  }
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    // First delete from homeowners table
    const result = await client.query('DELETE FROM homeowners WHERE id = $1 RETURNING user_id', [id]);
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Homeowner not found'
      });
    }
    
    const userId = result.rows[0].user_id;
    
    // Then delete the user
    await client.query('DELETE FROM users WHERE id = $1', [userId]);
    
    // Commit transaction
    await client.query('COMMIT');
    
    res.status(200).json({
      success: true,
      message: 'Homeowner deleted successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting homeowner:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting homeowner',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get homeowner properties
 * @route GET /api/homeowners/:id/properties
 */
const getHomeownerProperties = async (req, res) => {
  const { id } = req.params;
  const client = req.db;
  
  // Only allow admin or the homeowner themselves to access
  // Convert both IDs to strings for comparison to handle both string and number IDs
  if (req.user.role !== 'admin' && String(req.user.id) !== String(id)) {
    console.log(`Access denied: User ID ${req.user.id} (${typeof req.user.id}) tried to access properties for homeowner ID ${id} (${typeof id})`);
    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this homeowner\'s properties'
    });
  }
  
  try {
    const result = await client.query(`
      SELECT * FROM properties
      WHERE homeowner_id = $1
      ORDER BY created_at DESC
    `, [id]);
    
    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting properties:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching properties',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get homeowner service requests
 * @route GET /api/homeowners/:id/service-requests
 */
const getHomeownerServiceRequests = async (req, res) => {
  const { id } = req.params;
  const { status } = req.query;
  const client = req.db;
  
  // Only allow admin or the homeowner themselves to access
  // Convert both IDs to strings for comparison to handle both string and number IDs
  if (req.user.role !== 'admin' && String(req.user.id) !== String(id)) {
    console.log(`Access denied: User ID ${req.user.id} (${typeof req.user.id}) tried to access service requests for homeowner ID ${id} (${typeof id})`);
    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this homeowner\'s service requests'
    });
  }
  
  try {
    let query = `
      SELECT sr.*, s.name as service_name, p.address as property_address
      FROM service_requests sr
      JOIN services s ON sr.service_id = s.id
      JOIN properties p ON sr.property_id = p.id
      WHERE sr.homeowner_id = $1
    `;
    
    const queryParams = [id];
    
    if (status) {
      query += ` AND sr.status = $2`;
      queryParams.push(status);
    }
    
    query += ` ORDER BY sr.created_at DESC`;
    
    const result = await client.query(query, queryParams);
    
    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting service requests:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching service requests',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getAllHomeowners,
  getHomeownerById,
  updateHomeowner,
  deleteHomeowner,
  getHomeownerProperties,
  getHomeownerServiceRequests
}; 