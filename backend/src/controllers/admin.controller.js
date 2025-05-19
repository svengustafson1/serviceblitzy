/**
 * Admin Controller
 * Provides comprehensive administrative capabilities for platform management
 * including user oversight, service configuration, system analytics, and audit logging.
 */

/**
 * Get all users with filtering and pagination
 * @route GET /api/admin/users
 */
const getAllUsers = async (req, res) => {
  const { role, status, search, page = 1, limit = 20 } = req.query;
  const client = req.db;
  
  try {
    // Ensure the requester is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access admin resources'
      });
    }

    // Log the administrative action
    await logAdminAction(client, req.user.id, 'VIEW_USERS', { filters: { role, status, search } });
    
    // Build the query
    let query = `
      SELECT 
        u.id, u.email, u.first_name, u.last_name, u.phone, 
        u.roles, u.status, u.created_at, u.updated_at,
        CASE 
          WHEN 'homeowner' = ANY(u.roles) THEN 
            (SELECT json_build_object('id', h.id, 'billing_address', h.billing_address) 
             FROM homeowners h WHERE h.user_id = u.id)
          ELSE NULL 
        END as homeowner_data,
        CASE 
          WHEN 'provider' = ANY(u.roles) THEN 
            (SELECT json_build_object('id', sp.id, 'company_name', sp.company_name, 'avg_rating', sp.avg_rating) 
             FROM service_providers sp WHERE sp.user_id = u.id)
          ELSE NULL 
        END as provider_data
      FROM users u
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramIndex = 1;
    
    // Add role filter if provided
    if (role) {
      query += ` AND $${paramIndex} = ANY(u.roles)`;
      queryParams.push(role);
      paramIndex++;
    }
    
    // Add status filter if provided
    if (status) {
      query += ` AND u.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }
    
    // Add search filter if provided
    if (search) {
      query += ` AND (u.email ILIKE $${paramIndex} OR u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }
    
    // Add pagination
    const offset = (page - 1) * limit;
    query += ` ORDER BY u.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(parseInt(limit), offset);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) FROM users u WHERE 1=1
    `;
    
    if (role) {
      countQuery += ` AND $1 = ANY(u.roles)`;
    }
    
    if (status) {
      countQuery += ` AND u.status = $${role ? 2 : 1}`;
    }
    
    if (search) {
      const searchParamIndex = role && status ? 3 : (role || status ? 2 : 1);
      countQuery += ` AND (u.email ILIKE $${searchParamIndex} OR u.first_name ILIKE $${searchParamIndex} OR u.last_name ILIKE $${searchParamIndex})`;
    }
    
    const countParams = [];
    if (role) countParams.push(role);
    if (status) countParams.push(status);
    if (search) countParams.push(`%${search}%`);
    
    const countResult = await client.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);
    
    // Execute the main query
    const result = await client.query(query, queryParams);
    
    res.status(200).json({
      success: true,
      count: result.rows.length,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: parseInt(page),
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user by ID with detailed information
 * @route GET /api/admin/users/:id
 */
const getUserById = async (req, res) => {
  const { id } = req.params;
  const client = req.db;
  
  try {
    // Ensure the requester is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access admin resources'
      });
    }

    // Log the administrative action
    await logAdminAction(client, req.user.id, 'VIEW_USER_DETAILS', { userId: id });
    
    // Get user details
    const userResult = await client.query(`
      SELECT * FROM users WHERE id = $1
    `, [id]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const user = userResult.rows[0];
    
    // Get additional data based on user roles
    const userData = {
      ...user,
      homeowner_data: null,
      provider_data: null,
      activity: {}
    };
    
    // If user is a homeowner, get homeowner data
    if (user.roles.includes('homeowner')) {
      const homeownerResult = await client.query(`
        SELECT h.*, 
          (SELECT COUNT(*) FROM properties WHERE homeowner_id = h.id) as property_count,
          (SELECT COUNT(*) FROM service_requests WHERE homeowner_id = h.id) as service_request_count
        FROM homeowners h 
        WHERE h.user_id = $1
      `, [id]);
      
      if (homeownerResult.rows.length > 0) {
        userData.homeowner_data = homeownerResult.rows[0];
      }
    }
    
    // If user is a provider, get provider data
    if (user.roles.includes('provider')) {
      const providerResult = await client.query(`
        SELECT sp.*, 
          (SELECT COUNT(*) FROM bids WHERE provider_id = sp.id) as bid_count,
          (SELECT COUNT(*) FROM bids WHERE provider_id = sp.id AND status = 'accepted') as accepted_bid_count,
          (SELECT ARRAY_AGG(s.name) FROM provider_services ps JOIN services s ON ps.service_id = s.id WHERE ps.provider_id = sp.id) as services
        FROM service_providers sp 
        WHERE sp.user_id = $1
      `, [id]);
      
      if (providerResult.rows.length > 0) {
        userData.provider_data = providerResult.rows[0];
      }
    }
    
    // Get user activity data
    const activityResult = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM notifications WHERE user_id = $1) as notification_count,
        (SELECT COUNT(*) FROM logins WHERE user_id = $1) as login_count,
        (SELECT MAX(created_at) FROM logins WHERE user_id = $1) as last_login
    `, [id]);
    
    if (activityResult.rows.length > 0) {
      userData.activity = activityResult.rows[0];
    }
    
    res.status(200).json({
      success: true,
      data: userData
    });
  } catch (error) {
    console.error('Error getting user details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update user
 * @route PUT /api/admin/users/:id
 */
const updateUser = async (req, res) => {
  const { id } = req.params;
  const { 
    email, 
    first_name, 
    last_name, 
    phone, 
    status, 
    roles 
  } = req.body;
  const client = req.db;
  
  try {
    // Ensure the requester is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access admin resources'
      });
    }
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Check if user exists
    const userCheck = await client.query('SELECT * FROM users WHERE id = $1', [id]);
    
    if (userCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update user
    const result = await client.query(`
      UPDATE users
      SET 
        email = COALESCE($1, email),
        first_name = COALESCE($2, first_name),
        last_name = COALESCE($3, last_name),
        phone = COALESCE($4, phone),
        status = COALESCE($5, status),
        roles = COALESCE($6, roles),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [email, first_name, last_name, phone, status, roles, id]);
    
    // Log the administrative action
    await logAdminAction(client, req.user.id, 'UPDATE_USER', { 
      userId: id, 
      changes: { email, first_name, last_name, phone, status, roles } 
    });
    
    // Commit the transaction
    await client.query('COMMIT');
    
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete user
 * @route DELETE /api/admin/users/:id
 */
const deleteUser = async (req, res) => {
  const { id } = req.params;
  const client = req.db;
  
  try {
    // Ensure the requester is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access admin resources'
      });
    }
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Check if user exists
    const userCheck = await client.query('SELECT * FROM users WHERE id = $1', [id]);
    
    if (userCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if user is an admin - prevent deleting other admins
    if (userCheck.rows[0].roles.includes('admin') && req.user.id !== parseInt(id)) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Cannot delete another admin user'
      });
    }
    
    // Delete related records based on user roles
    if (userCheck.rows[0].roles.includes('homeowner')) {
      // Get homeowner ID
      const homeownerResult = await client.query('SELECT id FROM homeowners WHERE user_id = $1', [id]);
      
      if (homeownerResult.rows.length > 0) {
        const homeownerId = homeownerResult.rows[0].id;
        
        // Delete service requests
        await client.query('DELETE FROM service_requests WHERE homeowner_id = $1', [homeownerId]);
        
        // Delete properties
        await client.query('DELETE FROM properties WHERE homeowner_id = $1', [homeownerId]);
        
        // Delete homeowner
        await client.query('DELETE FROM homeowners WHERE id = $1', [homeownerId]);
      }
    }
    
    if (userCheck.rows[0].roles.includes('provider')) {
      // Get provider ID
      const providerResult = await client.query('SELECT id FROM service_providers WHERE user_id = $1', [id]);
      
      if (providerResult.rows.length > 0) {
        const providerId = providerResult.rows[0].id;
        
        // Delete bids
        await client.query('DELETE FROM bids WHERE provider_id = $1', [providerId]);
        
        // Delete provider services
        await client.query('DELETE FROM provider_services WHERE provider_id = $1', [providerId]);
        
        // Delete provider
        await client.query('DELETE FROM service_providers WHERE id = $1', [providerId]);
      }
    }
    
    // Delete notifications
    await client.query('DELETE FROM notifications WHERE user_id = $1', [id]);
    
    // Delete login history
    await client.query('DELETE FROM logins WHERE user_id = $1', [id]);
    
    // Delete user
    await client.query('DELETE FROM users WHERE id = $1', [id]);
    
    // Log the administrative action
    await logAdminAction(client, req.user.id, 'DELETE_USER', { userId: id });
    
    // Commit the transaction
    await client.query('COMMIT');
    
    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all service categories
 * @route GET /api/admin/service-categories
 */
const getAllServiceCategories = async (req, res) => {
  const client = req.db;
  
  try {
    // Ensure the requester is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access admin resources'
      });
    }

    // Log the administrative action
    await logAdminAction(client, req.user.id, 'VIEW_SERVICE_CATEGORIES', {});
    
    // Get all service categories with service counts
    const result = await client.query(`
      SELECT 
        sc.id, 
        sc.name, 
        sc.description, 
        sc.icon, 
        sc.status,
        sc.created_at,
        sc.updated_at,
        COUNT(s.id) as service_count
      FROM service_categories sc
      LEFT JOIN services s ON sc.id = s.category_id
      GROUP BY sc.id
      ORDER BY sc.name ASC
    `);
    
    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting service categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching service categories',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create service category
 * @route POST /api/admin/service-categories
 */
const createServiceCategory = async (req, res) => {
  const { name, description, icon, status = 'active' } = req.body;
  const client = req.db;
  
  try {
    // Ensure the requester is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access admin resources'
      });
    }
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }
    
    // Check if category with same name already exists
    const existingCategory = await client.query(
      'SELECT id FROM service_categories WHERE LOWER(name) = LOWER($1)',
      [name]
    );
    
    if (existingCategory.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'A service category with this name already exists'
      });
    }
    
    // Create new category
    const result = await client.query(`
      INSERT INTO service_categories (name, description, icon, status)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [name, description, icon, status]);
    
    // Log the administrative action
    await logAdminAction(client, req.user.id, 'CREATE_SERVICE_CATEGORY', { 
      categoryId: result.rows[0].id,
      name,
      description,
      icon,
      status
    });
    
    res.status(201).json({
      success: true,
      message: 'Service category created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating service category:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating service category',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update service category
 * @route PUT /api/admin/service-categories/:id
 */
const updateServiceCategory = async (req, res) => {
  const { id } = req.params;
  const { name, description, icon, status } = req.body;
  const client = req.db;
  
  try {
    // Ensure the requester is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access admin resources'
      });
    }
    
    // Check if category exists
    const categoryCheck = await client.query('SELECT * FROM service_categories WHERE id = $1', [id]);
    
    if (categoryCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service category not found'
      });
    }
    
    // If name is being updated, check for duplicates
    if (name && name.toLowerCase() !== categoryCheck.rows[0].name.toLowerCase()) {
      const existingCategory = await client.query(
        'SELECT id FROM service_categories WHERE LOWER(name) = LOWER($1)',
        [name]
      );
      
      if (existingCategory.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'A service category with this name already exists'
        });
      }
    }
    
    // Update category
    const result = await client.query(`
      UPDATE service_categories
      SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        icon = COALESCE($3, icon),
        status = COALESCE($4, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `, [name, description, icon, status, id]);
    
    // Log the administrative action
    await logAdminAction(client, req.user.id, 'UPDATE_SERVICE_CATEGORY', { 
      categoryId: id,
      changes: { name, description, icon, status }
    });
    
    res.status(200).json({
      success: true,
      message: 'Service category updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating service category:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating service category',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete service category
 * @route DELETE /api/admin/service-categories/:id
 */
const deleteServiceCategory = async (req, res) => {
  const { id } = req.params;
  const client = req.db;
  
  try {
    // Ensure the requester is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access admin resources'
      });
    }
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Check if category exists
    const categoryCheck = await client.query('SELECT * FROM service_categories WHERE id = $1', [id]);
    
    if (categoryCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Service category not found'
      });
    }
    
    // Check if category has services
    const servicesCheck = await client.query('SELECT COUNT(*) FROM services WHERE category_id = $1', [id]);
    
    if (parseInt(servicesCheck.rows[0].count) > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with associated services. Please reassign or delete the services first.'
      });
    }
    
    // Delete category
    await client.query('DELETE FROM service_categories WHERE id = $1', [id]);
    
    // Log the administrative action
    await logAdminAction(client, req.user.id, 'DELETE_SERVICE_CATEGORY', { categoryId: id });
    
    // Commit the transaction
    await client.query('COMMIT');
    
    res.status(200).json({
      success: true,
      message: 'Service category deleted successfully'
    });
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
    console.error('Error deleting service category:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting service category',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all services
 * @route GET /api/admin/services
 */
const getAllServices = async (req, res) => {
  const { category_id, status, search, page = 1, limit = 20 } = req.query;
  const client = req.db;
  
  try {
    // Ensure the requester is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access admin resources'
      });
    }

    // Log the administrative action
    await logAdminAction(client, req.user.id, 'VIEW_SERVICES', { 
      filters: { category_id, status, search } 
    });
    
    // Build the query
    let query = `
      SELECT 
        s.id, s.name, s.description, s.base_price, s.status, 
        s.created_at, s.updated_at,
        sc.id as category_id, sc.name as category_name,
        (SELECT COUNT(*) FROM service_requests sr WHERE sr.service_id = s.id) as request_count,
        (SELECT COUNT(*) FROM provider_services ps WHERE ps.service_id = s.id) as provider_count
      FROM services s
      JOIN service_categories sc ON s.category_id = sc.id
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramIndex = 1;
    
    // Add category filter if provided
    if (category_id) {
      query += ` AND s.category_id = $${paramIndex}`;
      queryParams.push(category_id);
      paramIndex++;
    }
    
    // Add status filter if provided
    if (status) {
      query += ` AND s.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }
    
    // Add search filter if provided
    if (search) {
      query += ` AND (s.name ILIKE $${paramIndex} OR s.description ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }
    
    // Add pagination
    const offset = (page - 1) * limit;
    query += ` ORDER BY s.name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(parseInt(limit), offset);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) FROM services s WHERE 1=1
    `;
    
    const countParams = [];
    let countParamIndex = 1;
    
    if (category_id) {
      countQuery += ` AND s.category_id = $${countParamIndex}`;
      countParams.push(category_id);
      countParamIndex++;
    }
    
    if (status) {
      countQuery += ` AND s.status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }
    
    if (search) {
      countQuery += ` AND (s.name ILIKE $${countParamIndex} OR s.description ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
    }
    
    const countResult = await client.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);
    
    // Execute the main query
    const result = await client.query(query, queryParams);
    
    res.status(200).json({
      success: true,
      count: result.rows.length,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: parseInt(page),
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting services:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching services',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create service
 * @route POST /api/admin/services
 */
const createService = async (req, res) => {
  const { name, description, base_price, category_id, status = 'active' } = req.body;
  const client = req.db;
  
  try {
    // Ensure the requester is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access admin resources'
      });
    }
    
    // Validate required fields
    if (!name || !category_id) {
      return res.status(400).json({
        success: false,
        message: 'Service name and category ID are required'
      });
    }
    
    // Check if service with same name already exists
    const existingService = await client.query(
      'SELECT id FROM services WHERE LOWER(name) = LOWER($1)',
      [name]
    );
    
    if (existingService.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'A service with this name already exists'
      });
    }
    
    // Check if category exists
    const categoryCheck = await client.query('SELECT id FROM service_categories WHERE id = $1', [category_id]);
    
    if (categoryCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Service category not found'
      });
    }
    
    // Create new service
    const result = await client.query(`
      INSERT INTO services (name, description, base_price, category_id, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [name, description, base_price, category_id, status]);
    
    // Log the administrative action
    await logAdminAction(client, req.user.id, 'CREATE_SERVICE', { 
      serviceId: result.rows[0].id,
      name,
      description,
      base_price,
      category_id,
      status
    });
    
    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating service',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update service
 * @route PUT /api/admin/services/:id
 */
const updateService = async (req, res) => {
  const { id } = req.params;
  const { name, description, base_price, category_id, status } = req.body;
  const client = req.db;
  
  try {
    // Ensure the requester is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access admin resources'
      });
    }
    
    // Check if service exists
    const serviceCheck = await client.query('SELECT * FROM services WHERE id = $1', [id]);
    
    if (serviceCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }
    
    // If name is being updated, check for duplicates
    if (name && name.toLowerCase() !== serviceCheck.rows[0].name.toLowerCase()) {
      const existingService = await client.query(
        'SELECT id FROM services WHERE LOWER(name) = LOWER($1)',
        [name]
      );
      
      if (existingService.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'A service with this name already exists'
        });
      }
    }
    
    // If category is being updated, check if it exists
    if (category_id && category_id !== serviceCheck.rows[0].category_id) {
      const categoryCheck = await client.query('SELECT id FROM service_categories WHERE id = $1', [category_id]);
      
      if (categoryCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Service category not found'
        });
      }
    }
    
    // Update service
    const result = await client.query(`
      UPDATE services
      SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        base_price = COALESCE($3, base_price),
        category_id = COALESCE($4, category_id),
        status = COALESCE($5, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `, [name, description, base_price, category_id, status, id]);
    
    // Log the administrative action
    await logAdminAction(client, req.user.id, 'UPDATE_SERVICE', { 
      serviceId: id,
      changes: { name, description, base_price, category_id, status }
    });
    
    res.status(200).json({
      success: true,
      message: 'Service updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating service',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete service
 * @route DELETE /api/admin/services/:id
 */
const deleteService = async (req, res) => {
  const { id } = req.params;
  const client = req.db;
  
  try {
    // Ensure the requester is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access admin resources'
      });
    }
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Check if service exists
    const serviceCheck = await client.query('SELECT * FROM services WHERE id = $1', [id]);
    
    if (serviceCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }
    
    // Check if service has active service requests
    const requestsCheck = await client.query(
      "SELECT COUNT(*) FROM service_requests WHERE service_id = $1 AND status NOT IN ('completed', 'cancelled')", 
      [id]
    );
    
    if (parseInt(requestsCheck.rows[0].count) > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Cannot delete service with active service requests'
      });
    }
    
    // Delete provider services associations
    await client.query('DELETE FROM provider_services WHERE service_id = $1', [id]);
    
    // Delete service
    await client.query('DELETE FROM services WHERE id = $1', [id]);
    
    // Log the administrative action
    await logAdminAction(client, req.user.id, 'DELETE_SERVICE', { serviceId: id });
    
    // Commit the transaction
    await client.query('COMMIT');
    
    res.status(200).json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
    console.error('Error deleting service:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting service',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get system analytics
 * @route GET /api/admin/analytics
 */
const getSystemAnalytics = async (req, res) => {
  const { period = 'month' } = req.query; // day, week, month, year
  const client = req.db;
  
  try {
    // Ensure the requester is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access admin resources'
      });
    }

    // Log the administrative action
    await logAdminAction(client, req.user.id, 'VIEW_SYSTEM_ANALYTICS', { period });
    
    // Determine date range based on period
    let dateFilter;
    switch (period) {
      case 'day':
        dateFilter = "created_at >= CURRENT_DATE";
        break;
      case 'week':
        dateFilter = "created_at >= CURRENT_DATE - INTERVAL '7 days'";
        break;
      case 'year':
        dateFilter = "created_at >= CURRENT_DATE - INTERVAL '1 year'";
        break;
      case 'month':
      default:
        dateFilter = "created_at >= CURRENT_DATE - INTERVAL '30 days'";
        break;
    }
    
    // Get user statistics
    const userStats = await client.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE 'homeowner' = ANY(roles)) as homeowner_count,
        COUNT(*) FILTER (WHERE 'provider' = ANY(roles)) as provider_count,
        COUNT(*) FILTER (WHERE ${dateFilter}) as new_users
      FROM users
    `);
    
    // Get service request statistics
    const requestStats = await client.query(`
      SELECT 
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE ${dateFilter}) as new_requests,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_requests,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_requests,
        COUNT(*) FILTER (WHERE status IN ('pending', 'bidding')) as open_requests
      FROM service_requests
    `);
    
    // Get payment statistics
    const paymentStats = await client.query(`
      SELECT 
        COUNT(*) as total_payments,
        SUM(amount) as total_amount,
        COUNT(*) FILTER (WHERE ${dateFilter}) as new_payments,
        SUM(amount) FILTER (WHERE ${dateFilter}) as new_amount,
        AVG(amount) as average_payment
      FROM payments
    `);
    
    // Get top service categories
    const topCategories = await client.query(`
      SELECT 
        sc.name as category_name,
        COUNT(sr.id) as request_count
      FROM service_categories sc
      JOIN services s ON sc.id = s.category_id
      JOIN service_requests sr ON s.id = sr.service_id
      WHERE ${dateFilter.replace('created_at', 'sr.created_at')}
      GROUP BY sc.name
      ORDER BY request_count DESC
      LIMIT 5
    `);
    
    // Get top services
    const topServices = await client.query(`
      SELECT 
        s.name as service_name,
        COUNT(sr.id) as request_count
      FROM services s
      JOIN service_requests sr ON s.id = sr.service_id
      WHERE ${dateFilter.replace('created_at', 'sr.created_at')}
      GROUP BY s.name
      ORDER BY request_count DESC
      LIMIT 5
    `);
    
    // Get top providers
    const topProviders = await client.query(`
      SELECT 
        sp.company_name as provider_name,
        COUNT(b.id) FILTER (WHERE b.status = 'accepted') as accepted_bids,
        AVG(sp.avg_rating) as average_rating
      FROM service_providers sp
      JOIN bids b ON sp.id = b.provider_id
      WHERE ${dateFilter.replace('created_at', 'b.created_at')}
      GROUP BY sp.id, sp.company_name
      ORDER BY accepted_bids DESC
      LIMIT 5
    `);
    
    // Get activity over time
    let timeGrouping;
    let timeFormat;
    
    switch (period) {
      case 'day':
        timeGrouping = "DATE_TRUNC('hour', created_at)";
        timeFormat = "HH24:MI";
        break;
      case 'week':
        timeGrouping = "DATE_TRUNC('day', created_at)";
        timeFormat = "YYYY-MM-DD";
        break;
      case 'year':
        timeGrouping = "DATE_TRUNC('month', created_at)";
        timeFormat = "YYYY-MM";
        break;
      case 'month':
      default:
        timeGrouping = "DATE_TRUNC('day', created_at)";
        timeFormat = "YYYY-MM-DD";
        break;
    }
    
    const userActivity = await client.query(`
      SELECT 
        TO_CHAR(${timeGrouping}, '${timeFormat}') as time_period,
        COUNT(*) as new_users
      FROM users
      WHERE ${dateFilter}
      GROUP BY time_period
      ORDER BY time_period
    `);
    
    const requestActivity = await client.query(`
      SELECT 
        TO_CHAR(${timeGrouping}, '${timeFormat}') as time_period,
        COUNT(*) as new_requests
      FROM service_requests
      WHERE ${dateFilter}
      GROUP BY time_period
      ORDER BY time_period
    `);
    
    const paymentActivity = await client.query(`
      SELECT 
        TO_CHAR(${timeGrouping}, '${timeFormat}') as time_period,
        COUNT(*) as payment_count,
        SUM(amount) as payment_amount
      FROM payments
      WHERE ${dateFilter}
      GROUP BY time_period
      ORDER BY time_period
    `);
    
    // Combine all analytics data
    const analytics = {
      user_statistics: userStats.rows[0],
      request_statistics: requestStats.rows[0],
      payment_statistics: paymentStats.rows[0],
      top_categories: topCategories.rows,
      top_services: topServices.rows,
      top_providers: topProviders.rows,
      activity: {
        users: userActivity.rows,
        requests: requestActivity.rows,
        payments: paymentActivity.rows
      }
    };
    
    res.status(200).json({
      success: true,
      period,
      data: analytics
    });
  } catch (error) {
    console.error('Error getting system analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching system analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get admin audit logs
 * @route GET /api/admin/audit-logs
 */
const getAuditLogs = async (req, res) => {
  const { action_type, admin_id, start_date, end_date, page = 1, limit = 20 } = req.query;
  const client = req.db;
  
  try {
    // Ensure the requester is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access admin resources'
      });
    }

    // Log the administrative action
    await logAdminAction(client, req.user.id, 'VIEW_AUDIT_LOGS', { 
      filters: { action_type, admin_id, start_date, end_date } 
    });
    
    // Build the query
    let query = `
      SELECT 
        al.*,
        u.email as admin_email,
        u.first_name as admin_first_name,
        u.last_name as admin_last_name
      FROM admin_audit_logs al
      JOIN users u ON al.admin_id = u.id
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramIndex = 1;
    
    // Add action type filter if provided
    if (action_type) {
      query += ` AND al.action_type = $${paramIndex}`;
      queryParams.push(action_type);
      paramIndex++;
    }
    
    // Add admin ID filter if provided
    if (admin_id) {
      query += ` AND al.admin_id = $${paramIndex}`;
      queryParams.push(admin_id);
      paramIndex++;
    }
    
    // Add date range filters if provided
    if (start_date) {
      query += ` AND al.created_at >= $${paramIndex}`;
      queryParams.push(start_date);
      paramIndex++;
    }
    
    if (end_date) {
      query += ` AND al.created_at <= $${paramIndex}`;
      queryParams.push(end_date);
      paramIndex++;
    }
    
    // Add pagination
    const offset = (page - 1) * limit;
    query += ` ORDER BY al.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(parseInt(limit), offset);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) FROM admin_audit_logs al WHERE 1=1
    `;
    
    const countParams = [];
    let countParamIndex = 1;
    
    if (action_type) {
      countQuery += ` AND al.action_type = $${countParamIndex}`;
      countParams.push(action_type);
      countParamIndex++;
    }
    
    if (admin_id) {
      countQuery += ` AND al.admin_id = $${countParamIndex}`;
      countParams.push(admin_id);
      countParamIndex++;
    }
    
    if (start_date) {
      countQuery += ` AND al.created_at >= $${countParamIndex}`;
      countParams.push(start_date);
      countParamIndex++;
    }
    
    if (end_date) {
      countQuery += ` AND al.created_at <= $${countParamIndex}`;
      countParams.push(end_date);
    }
    
    const countResult = await client.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);
    
    // Execute the main query
    const result = await client.query(query, queryParams);
    
    res.status(200).json({
      success: true,
      count: result.rows.length,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: parseInt(page),
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching audit logs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Helper function to log administrative actions
 */
const logAdminAction = async (client, adminId, actionType, details) => {
  try {
    await client.query(`
      INSERT INTO admin_audit_logs (admin_id, action_type, details)
      VALUES ($1, $2, $3)
    `, [adminId, actionType, JSON.stringify(details)]);
    
    return true;
  } catch (error) {
    console.error('Error logging admin action:', error);
    return false;
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getAllServiceCategories,
  createServiceCategory,
  updateServiceCategory,
  deleteServiceCategory,
  getAllServices,
  createService,
  updateService,
  deleteService,
  getSystemAnalytics,
  getAuditLogs
};