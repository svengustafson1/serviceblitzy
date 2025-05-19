/**
 * Admin Controller
 * Provides comprehensive administrative capabilities for platform management
 * including user oversight, service configuration, system analytics, and audit logging.
 */

/**
 * Get all users with optional filtering
 * @route GET /api/admin/users
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters for filtering
 * @param {string} [req.query.role] - Filter by user role (homeowner, provider, admin)
 * @param {string} [req.query.status] - Filter by user status (active, inactive)
 * @param {string} [req.query.search] - Search term for name or email
 * @param {Object} res - Express response object
 */
const getAllUsers = async (req, res) => {
  const { role, status, search, sort = 'created_at', order = 'desc', page = 1, limit = 20 } = req.query;
  const client = req.db;
  
  try {
    // Start building the query
    let query = `
      SELECT 
        u.id, u.email, u.first_name, u.last_name, u.phone, 
        u.roles, u.status, u.created_at, u.updated_at,
        CASE WHEN h.id IS NOT NULL THEN true ELSE false END AS is_homeowner,
        CASE WHEN sp.id IS NOT NULL THEN true ELSE false END AS is_provider
      FROM users u
      LEFT JOIN homeowners h ON u.id = h.user_id
      LEFT JOIN service_providers sp ON u.id = sp.user_id
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramIndex = 1;
    
    // Add filters
    if (role) {
      query += ` AND u.roles @> ARRAY[$${paramIndex}]::varchar[]`;
      queryParams.push(role);
      paramIndex++;
    }
    
    if (status) {
      query += ` AND u.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }
    
    if (search) {
      query += ` AND (u.email ILIKE $${paramIndex} OR u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }
    
    // Add sorting
    const validSortColumns = ['created_at', 'email', 'first_name', 'last_name', 'status'];
    const sortColumn = validSortColumns.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    query += ` ORDER BY u.${sortColumn} ${sortOrder}`;
    
    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(parseInt(limit), offset);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) FROM users u
      WHERE 1=1
    `;
    
    // Add the same filters to count query
    if (role) {
      countQuery += ` AND u.roles @> ARRAY[$1]::varchar[]`;
    }
    
    if (status) {
      countQuery += ` AND u.status = $${role ? 2 : 1}`;
    }
    
    if (search) {
      const searchParamIndex = (role ? 1 : 0) + (status ? 1 : 0) + 1;
      countQuery += ` AND (u.email ILIKE $${searchParamIndex} OR u.first_name ILIKE $${searchParamIndex} OR u.last_name ILIKE $${searchParamIndex})`;
    }
    
    // Execute queries
    const result = await client.query(query, queryParams);
    const countResult = await client.query(countQuery, queryParams.slice(0, paramIndex - 2));
    
    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / parseInt(limit));
    
    // Log the admin action
    await logAdminAction(client, req.user.id, 'user_list_view', { filters: { role, status, search } });
    
    res.status(200).json({
      success: true,
      count: result.rows.length,
      total: totalCount,
      page: parseInt(page),
      pages: totalPages,
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
 * Get user by ID
 * @route GET /api/admin/users/:id
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.id - User ID
 * @param {Object} res - Express response object
 */
const getUserById = async (req, res) => {
  const { id } = req.params;
  const client = req.db;
  
  try {
    // Get basic user information
    const userResult = await client.query(`
      SELECT 
        u.id, u.email, u.first_name, u.last_name, u.phone, 
        u.roles, u.status, u.created_at, u.updated_at
      FROM users u
      WHERE u.id = $1
    `, [id]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const user = userResult.rows[0];
    
    // Check if user is a homeowner and get homeowner details
    if (user.roles.includes('homeowner')) {
      const homeownerResult = await client.query(`
        SELECT * FROM homeowners WHERE user_id = $1
      `, [id]);
      
      if (homeownerResult.rows.length > 0) {
        user.homeowner_details = homeownerResult.rows[0];
        
        // Get homeowner properties
        const propertiesResult = await client.query(`
          SELECT * FROM properties WHERE homeowner_id = $1
        `, [homeownerResult.rows[0].id]);
        
        user.homeowner_details.properties = propertiesResult.rows;
      }
    }
    
    // Check if user is a service provider and get provider details
    if (user.roles.includes('provider')) {
      const providerResult = await client.query(`
        SELECT * FROM service_providers WHERE user_id = $1
      `, [id]);
      
      if (providerResult.rows.length > 0) {
        user.provider_details = providerResult.rows[0];
        
        // Get provider services
        const servicesResult = await client.query(`
          SELECT s.* 
          FROM provider_services ps
          JOIN services s ON ps.service_id = s.id
          WHERE ps.provider_id = $1
        `, [providerResult.rows[0].id]);
        
        user.provider_details.services = servicesResult.rows;
      }
    }
    
    // Get user activity statistics
    const statsResult = await client.query(`
      SELECT 
        COUNT(DISTINCT sr.id) FILTER (WHERE sr.homeowner_id IN (SELECT id FROM homeowners WHERE user_id = $1)) AS service_requests_count,
        COUNT(DISTINCT b.id) FILTER (WHERE b.provider_id IN (SELECT id FROM service_providers WHERE user_id = $1)) AS bids_count,
        COUNT(DISTINCT p.id) FILTER (WHERE p.homeowner_id IN (SELECT id FROM homeowners WHERE user_id = $1)) AS properties_count,
        COUNT(DISTINCT pay.id) FILTER (WHERE pay.homeowner_id IN (SELECT id FROM homeowners WHERE user_id = $1)) AS payments_count
      FROM 
        service_requests sr 
        FULL OUTER JOIN bids b ON 1=1
        FULL OUTER JOIN properties p ON 1=1
        FULL OUTER JOIN payments pay ON 1=1
    `, [id]);
    
    user.activity_stats = statsResult.rows[0];
    
    // Log the admin action
    await logAdminAction(client, req.user.id, 'user_view', { user_id: id });
    
    res.status(200).json({
      success: true,
      data: user
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
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.id - User ID
 * @param {Object} req.body - Request body
 * @param {string} [req.body.email] - User email
 * @param {string} [req.body.first_name] - User first name
 * @param {string} [req.body.last_name] - User last name
 * @param {string} [req.body.phone] - User phone number
 * @param {string[]} [req.body.roles] - User roles
 * @param {string} [req.body.status] - User status
 * @param {Object} res - Express response object
 */
const updateUser = async (req, res) => {
  const { id } = req.params;
  const { email, first_name, last_name, phone, roles, status } = req.body;
  const client = req.db;
  
  try {
    // Check if user exists
    const userCheck = await client.query('SELECT * FROM users WHERE id = $1', [id]);
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const oldUserData = userCheck.rows[0];
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Update user
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;
    
    if (email !== undefined) {
      updateFields.push(`email = $${paramIndex}`);
      updateValues.push(email);
      paramIndex++;
    }
    
    if (first_name !== undefined) {
      updateFields.push(`first_name = $${paramIndex}`);
      updateValues.push(first_name);
      paramIndex++;
    }
    
    if (last_name !== undefined) {
      updateFields.push(`last_name = $${paramIndex}`);
      updateValues.push(last_name);
      paramIndex++;
    }
    
    if (phone !== undefined) {
      updateFields.push(`phone = $${paramIndex}`);
      updateValues.push(phone);
      paramIndex++;
    }
    
    if (roles !== undefined) {
      updateFields.push(`roles = $${paramIndex}`);
      updateValues.push(roles);
      paramIndex++;
    }
    
    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex}`);
      updateValues.push(status);
      paramIndex++;
    }
    
    // Add updated_at timestamp
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    if (updateFields.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }
    
    // Build and execute update query
    const updateQuery = `
      UPDATE users
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    updateValues.push(id);
    const result = await client.query(updateQuery, updateValues);
    
    // Log the admin action with before/after data
    await logAdminAction(client, req.user.id, 'user_update', { 
      user_id: id,
      before: {
        email: oldUserData.email,
        first_name: oldUserData.first_name,
        last_name: oldUserData.last_name,
        phone: oldUserData.phone,
        roles: oldUserData.roles,
        status: oldUserData.status
      },
      after: {
        email: result.rows[0].email,
        first_name: result.rows[0].first_name,
        last_name: result.rows[0].last_name,
        phone: result.rows[0].phone,
        roles: result.rows[0].roles,
        status: result.rows[0].status
      }
    });
    
    // Commit transaction
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
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.id - User ID
 * @param {Object} res - Express response object
 */
const deleteUser = async (req, res) => {
  const { id } = req.params;
  const client = req.db;
  
  try {
    // Check if user exists
    const userCheck = await client.query('SELECT * FROM users WHERE id = $1', [id]);
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const userData = userCheck.rows[0];
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Delete user
    await client.query('DELETE FROM users WHERE id = $1', [id]);
    
    // Log the admin action
    await logAdminAction(client, req.user.id, 'user_delete', { 
      user_id: id,
      user_data: {
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        roles: userData.roles
      }
    });
    
    // Commit transaction
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
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllServiceCategories = async (req, res) => {
  const client = req.db;
  
  try {
    const result = await client.query(`
      SELECT 
        sc.*,
        COUNT(s.id) AS service_count
      FROM service_categories sc
      LEFT JOIN services s ON sc.id = s.category_id
      GROUP BY sc.id
      ORDER BY sc.name ASC
    `);
    
    // Log the admin action
    await logAdminAction(client, req.user.id, 'service_category_list_view', {});
    
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
 * Get service category by ID
 * @route GET /api/admin/service-categories/:id
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.id - Service category ID
 * @param {Object} res - Express response object
 */
const getServiceCategoryById = async (req, res) => {
  const { id } = req.params;
  const client = req.db;
  
  try {
    // Get category details
    const categoryResult = await client.query(`
      SELECT * FROM service_categories WHERE id = $1
    `, [id]);
    
    if (categoryResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service category not found'
      });
    }
    
    const category = categoryResult.rows[0];
    
    // Get services in this category
    const servicesResult = await client.query(`
      SELECT * FROM services WHERE category_id = $1
    `, [id]);
    
    category.services = servicesResult.rows;
    
    // Log the admin action
    await logAdminAction(client, req.user.id, 'service_category_view', { category_id: id });
    
    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error getting service category:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching service category',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create new service category
 * @route POST /api/admin/service-categories
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.name - Category name
 * @param {string} req.body.description - Category description
 * @param {string} [req.body.icon] - Category icon
 * @param {Object} res - Express response object
 */
const createServiceCategory = async (req, res) => {
  const { name, description, icon } = req.body;
  const client = req.db;
  
  // Validate required fields
  if (!name) {
    return res.status(400).json({
      success: false,
      message: 'Category name is required'
    });
  }
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    // Check if category with same name already exists
    const existingCategory = await client.query(
      'SELECT * FROM service_categories WHERE LOWER(name) = LOWER($1)',
      [name]
    );
    
    if (existingCategory.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'A service category with this name already exists'
      });
    }
    
    // Create new category
    const result = await client.query(`
      INSERT INTO service_categories (name, description, icon)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [name, description, icon]);
    
    // Log the admin action
    await logAdminAction(client, req.user.id, 'service_category_create', { 
      category_id: result.rows[0].id,
      category_data: {
        name,
        description,
        icon
      }
    });
    
    // Commit transaction
    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      message: 'Service category created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
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
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.id - Service category ID
 * @param {Object} req.body - Request body
 * @param {string} [req.body.name] - Category name
 * @param {string} [req.body.description] - Category description
 * @param {string} [req.body.icon] - Category icon
 * @param {Object} res - Express response object
 */
const updateServiceCategory = async (req, res) => {
  const { id } = req.params;
  const { name, description, icon } = req.body;
  const client = req.db;
  
  try {
    // Check if category exists
    const categoryCheck = await client.query('SELECT * FROM service_categories WHERE id = $1', [id]);
    
    if (categoryCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service category not found'
      });
    }
    
    const oldCategoryData = categoryCheck.rows[0];
    
    // Start a transaction
    await client.query('BEGIN');
    
    // If name is being updated, check for duplicates
    if (name && name !== oldCategoryData.name) {
      const existingCategory = await client.query(
        'SELECT * FROM service_categories WHERE LOWER(name) = LOWER($1) AND id != $2',
        [name, id]
      );
      
      if (existingCategory.rows.length > 0) {
        await client.query('ROLLBACK');
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
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [name, description, icon, id]);
    
    // Log the admin action
    await logAdminAction(client, req.user.id, 'service_category_update', { 
      category_id: id,
      before: {
        name: oldCategoryData.name,
        description: oldCategoryData.description,
        icon: oldCategoryData.icon
      },
      after: {
        name: result.rows[0].name,
        description: result.rows[0].description,
        icon: result.rows[0].icon
      }
    });
    
    // Commit transaction
    await client.query('COMMIT');
    
    res.status(200).json({
      success: true,
      message: 'Service category updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
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
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.id - Service category ID
 * @param {Object} res - Express response object
 */
const deleteServiceCategory = async (req, res) => {
  const { id } = req.params;
  const client = req.db;
  
  try {
    // Check if category exists
    const categoryCheck = await client.query('SELECT * FROM service_categories WHERE id = $1', [id]);
    
    if (categoryCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service category not found'
      });
    }
    
    const categoryData = categoryCheck.rows[0];
    
    // Check if category has services
    const servicesCheck = await client.query('SELECT COUNT(*) FROM services WHERE category_id = $1', [id]);
    
    if (parseInt(servicesCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with associated services. Please delete or reassign services first.'
      });
    }
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Delete category
    await client.query('DELETE FROM service_categories WHERE id = $1', [id]);
    
    // Log the admin action
    await logAdminAction(client, req.user.id, 'service_category_delete', { 
      category_id: id,
      category_data: {
        name: categoryData.name,
        description: categoryData.description
      }
    });
    
    // Commit transaction
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
 * Get all services with optional filtering
 * @route GET /api/admin/services
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters for filtering
 * @param {string} [req.query.category] - Filter by category name
 * @param {string} [req.query.search] - Search term for service name
 * @param {Object} res - Express response object
 */
const getAllServices = async (req, res) => {
  const { category, search, sort = 'name', order = 'asc', page = 1, limit = 20 } = req.query;
  const client = req.db;
  
  try {
    // Start building the query
    let query = `
      SELECT 
        s.*,
        sc.name as category_name,
        COUNT(DISTINCT sr.id) as request_count,
        COUNT(DISTINCT ps.provider_id) as provider_count
      FROM services s
      LEFT JOIN service_categories sc ON s.category_id = sc.id
      LEFT JOIN service_requests sr ON s.id = sr.service_id
      LEFT JOIN provider_services ps ON s.id = ps.service_id
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramIndex = 1;
    
    // Add filters
    if (category) {
      query += ` AND (sc.id = $${paramIndex} OR LOWER(sc.name) = LOWER($${paramIndex}))`;
      queryParams.push(category);
      paramIndex++;
    }
    
    if (search) {
      query += ` AND (LOWER(s.name) LIKE LOWER($${paramIndex}) OR LOWER(s.description) LIKE LOWER($${paramIndex}))`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }
    
    // Group by
    query += ` GROUP BY s.id, sc.name`;
    
    // Add sorting
    const validSortColumns = ['name', 'price', 'category_name', 'request_count', 'provider_count'];
    const sortColumn = validSortColumns.includes(sort) ? sort : 'name';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    if (sortColumn === 'category_name') {
      query += ` ORDER BY sc.name ${sortOrder}, s.name ASC`;
    } else {
      query += ` ORDER BY ${sortColumn === 'name' ? 's.name' : sortColumn} ${sortOrder}`;
    }
    
    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(parseInt(limit), offset);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT s.id) FROM services s
      LEFT JOIN service_categories sc ON s.category_id = sc.id
      WHERE 1=1
    `;
    
    // Add the same filters to count query
    if (category) {
      countQuery += ` AND (sc.id = $1 OR LOWER(sc.name) = LOWER($1))`;
    }
    
    if (search) {
      const searchParamIndex = category ? 2 : 1;
      countQuery += ` AND (LOWER(s.name) LIKE LOWER($${searchParamIndex}) OR LOWER(s.description) LIKE LOWER($${searchParamIndex}))`;
    }
    
    // Execute queries
    const result = await client.query(query, queryParams);
    const countResult = await client.query(countQuery, queryParams.slice(0, paramIndex - 2));
    
    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / parseInt(limit));
    
    // Log the admin action
    await logAdminAction(client, req.user.id, 'service_list_view', { filters: { category, search } });
    
    res.status(200).json({
      success: true,
      count: result.rows.length,
      total: totalCount,
      page: parseInt(page),
      pages: totalPages,
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
 * Get service by ID
 * @route GET /api/admin/services/:id
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.id - Service ID
 * @param {Object} res - Express response object
 */
const getServiceById = async (req, res) => {
  const { id } = req.params;
  const client = req.db;
  
  try {
    // Get service details
    const serviceResult = await client.query(`
      SELECT 
        s.*,
        sc.name as category_name,
        sc.description as category_description
      FROM services s
      LEFT JOIN service_categories sc ON s.category_id = sc.id
      WHERE s.id = $1
    `, [id]);
    
    if (serviceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }
    
    const service = serviceResult.rows[0];
    
    // Get providers offering this service
    const providersResult = await client.query(`
      SELECT 
        sp.id, sp.company_name, sp.avg_rating, sp.is_verified,
        u.first_name, u.last_name, u.email
      FROM provider_services ps
      JOIN service_providers sp ON ps.provider_id = sp.id
      JOIN users u ON sp.user_id = u.id
      WHERE ps.service_id = $1
      ORDER BY sp.avg_rating DESC
    `, [id]);
    
    service.providers = providersResult.rows;
    
    // Get service request statistics
    const statsResult = await client.query(`
      SELECT 
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_requests,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_requests,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_requests,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_requests,
        AVG(price) FILTER (WHERE status = 'completed') as avg_price
      FROM service_requests
      WHERE service_id = $1
    `, [id]);
    
    service.request_stats = statsResult.rows[0];
    
    // Log the admin action
    await logAdminAction(client, req.user.id, 'service_view', { service_id: id });
    
    res.status(200).json({
      success: true,
      data: service
    });
  } catch (error) {
    console.error('Error getting service details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching service details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create new service
 * @route POST /api/admin/services
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.name - Service name
 * @param {string} req.body.description - Service description
 * @param {number} req.body.category_id - Category ID
 * @param {number} [req.body.base_price] - Base price
 * @param {string} [req.body.price_unit] - Price unit (per_hour, per_job, etc.)
 * @param {string} [req.body.icon] - Service icon
 * @param {Object} res - Express response object
 */
const createService = async (req, res) => {
  const { name, description, category_id, base_price, price_unit, icon } = req.body;
  const client = req.db;
  
  // Validate required fields
  if (!name || !category_id) {
    return res.status(400).json({
      success: false,
      message: 'Service name and category ID are required'
    });
  }
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    // Check if category exists
    const categoryCheck = await client.query('SELECT * FROM service_categories WHERE id = $1', [category_id]);
    
    if (categoryCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID'
      });
    }
    
    // Check if service with same name already exists
    const existingService = await client.query(
      'SELECT * FROM services WHERE LOWER(name) = LOWER($1)',
      [name]
    );
    
    if (existingService.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'A service with this name already exists'
      });
    }
    
    // Create new service
    const result = await client.query(`
      INSERT INTO services (name, description, category_id, base_price, price_unit, icon)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [name, description, category_id, base_price, price_unit, icon]);
    
    // Log the admin action
    await logAdminAction(client, req.user.id, 'service_create', { 
      service_id: result.rows[0].id,
      service_data: {
        name,
        description,
        category_id,
        base_price,
        price_unit,
        icon
      }
    });
    
    // Commit transaction
    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
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
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.id - Service ID
 * @param {Object} req.body - Request body
 * @param {string} [req.body.name] - Service name
 * @param {string} [req.body.description] - Service description
 * @param {number} [req.body.category_id] - Category ID
 * @param {number} [req.body.base_price] - Base price
 * @param {string} [req.body.price_unit] - Price unit (per_hour, per_job, etc.)
 * @param {string} [req.body.icon] - Service icon
 * @param {Object} res - Express response object
 */
const updateService = async (req, res) => {
  const { id } = req.params;
  const { name, description, category_id, base_price, price_unit, icon } = req.body;
  const client = req.db;
  
  try {
    // Check if service exists
    const serviceCheck = await client.query('SELECT * FROM services WHERE id = $1', [id]);
    
    if (serviceCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }
    
    const oldServiceData = serviceCheck.rows[0];
    
    // Start a transaction
    await client.query('BEGIN');
    
    // If category_id is provided, check if it exists
    if (category_id) {
      const categoryCheck = await client.query('SELECT * FROM service_categories WHERE id = $1', [category_id]);
      
      if (categoryCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Invalid category ID'
        });
      }
    }
    
    // If name is being updated, check for duplicates
    if (name && name !== oldServiceData.name) {
      const existingService = await client.query(
        'SELECT * FROM services WHERE LOWER(name) = LOWER($1) AND id != $2',
        [name, id]
      );
      
      if (existingService.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'A service with this name already exists'
        });
      }
    }
    
    // Update service
    const result = await client.query(`
      UPDATE services
      SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        category_id = COALESCE($3, category_id),
        base_price = COALESCE($4, base_price),
        price_unit = COALESCE($5, price_unit),
        icon = COALESCE($6, icon),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [name, description, category_id, base_price, price_unit, icon, id]);
    
    // Log the admin action
    await logAdminAction(client, req.user.id, 'service_update', { 
      service_id: id,
      before: {
        name: oldServiceData.name,
        description: oldServiceData.description,
        category_id: oldServiceData.category_id,
        base_price: oldServiceData.base_price,
        price_unit: oldServiceData.price_unit,
        icon: oldServiceData.icon
      },
      after: {
        name: result.rows[0].name,
        description: result.rows[0].description,
        category_id: result.rows[0].category_id,
        base_price: result.rows[0].base_price,
        price_unit: result.rows[0].price_unit,
        icon: result.rows[0].icon
      }
    });
    
    // Commit transaction
    await client.query('COMMIT');
    
    res.status(200).json({
      success: true,
      message: 'Service updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
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
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.id - Service ID
 * @param {Object} res - Express response object
 */
const deleteService = async (req, res) => {
  const { id } = req.params;
  const client = req.db;
  
  try {
    // Check if service exists
    const serviceCheck = await client.query('SELECT * FROM services WHERE id = $1', [id]);
    
    if (serviceCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }
    
    const serviceData = serviceCheck.rows[0];
    
    // Check if service has active service requests
    const requestsCheck = await client.query(
      "SELECT COUNT(*) FROM service_requests WHERE service_id = $1 AND status NOT IN ('completed', 'cancelled')",
      [id]
    );
    
    if (parseInt(requestsCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete service with active service requests'
      });
    }
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Remove service from provider_services
    await client.query('DELETE FROM provider_services WHERE service_id = $1', [id]);
    
    // Delete service
    await client.query('DELETE FROM services WHERE id = $1', [id]);
    
    // Log the admin action
    await logAdminAction(client, req.user.id, 'service_delete', { 
      service_id: id,
      service_data: {
        name: serviceData.name,
        description: serviceData.description,
        category_id: serviceData.category_id
      }
    });
    
    // Commit transaction
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
 * Get system dashboard analytics
 * @route GET /api/admin/analytics/dashboard
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getDashboardAnalytics = async (req, res) => {
  const client = req.db;
  
  try {
    // Start a transaction for consistent reads
    await client.query('BEGIN');
    
    // Get user counts by role
    const userCountsResult = await client.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE roles @> ARRAY['homeowner']::varchar[]) as homeowner_count,
        COUNT(*) FILTER (WHERE roles @> ARRAY['provider']::varchar[]) as provider_count,
        COUNT(*) FILTER (WHERE roles @> ARRAY['admin']::varchar[]) as admin_count
      FROM users
    `);
    
    // Get service request counts by status
    const serviceRequestCountsResult = await client.query(`
      SELECT 
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'bidding') as bidding_count,
        COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_count,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count
      FROM service_requests
    `);
    
    // Get payment statistics
    const paymentStatsResult = await client.query(`
      SELECT 
        COUNT(*) as total_payments,
        SUM(amount) as total_amount,
        AVG(amount) as average_amount,
        COUNT(*) FILTER (WHERE status = 'succeeded') as successful_payments,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_payments,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_payments
      FROM payments
    `);
    
    // Get recent user registrations (last 30 days)
    const recentUsersResult = await client.query(`
      SELECT 
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as count
      FROM users
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date ASC
    `);
    
    // Get recent service requests (last 30 days)
    const recentRequestsResult = await client.query(`
      SELECT 
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as count
      FROM service_requests
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date ASC
    `);
    
    // Get top service categories by request count
    const topCategoriesResult = await client.query(`
      SELECT 
        sc.id, sc.name,
        COUNT(sr.id) as request_count
      FROM service_categories sc
      JOIN services s ON sc.id = s.category_id
      JOIN service_requests sr ON s.id = sr.service_id
      GROUP BY sc.id, sc.name
      ORDER BY request_count DESC
      LIMIT 5
    `);
    
    // Get top providers by completed jobs
    const topProvidersResult = await client.query(`
      SELECT 
        sp.id, sp.company_name, u.first_name, u.last_name,
        COUNT(sr.id) FILTER (WHERE sr.status = 'completed') as completed_jobs,
        AVG(r.rating) as average_rating
      FROM service_providers sp
      JOIN users u ON sp.user_id = u.id
      JOIN bids b ON sp.id = b.provider_id
      JOIN service_requests sr ON b.service_request_id = sr.id
      LEFT JOIN reviews r ON sp.id = r.provider_id
      WHERE b.status = 'accepted'
      GROUP BY sp.id, sp.company_name, u.first_name, u.last_name
      ORDER BY completed_jobs DESC
      LIMIT 5
    `);
    
    // Commit transaction
    await client.query('COMMIT');
    
    // Log the admin action
    await logAdminAction(client, req.user.id, 'dashboard_analytics_view', {});
    
    res.status(200).json({
      success: true,
      data: {
        user_counts: userCountsResult.rows[0],
        service_request_counts: serviceRequestCountsResult.rows[0],
        payment_stats: paymentStatsResult.rows[0],
        recent_users: recentUsersResult.rows,
        recent_requests: recentRequestsResult.rows,
        top_categories: topCategoriesResult.rows,
        top_providers: topProvidersResult.rows
      }
    });
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
    console.error('Error getting dashboard analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user analytics
 * @route GET /api/admin/analytics/users
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} [req.query.period] - Time period (daily, weekly, monthly)
 * @param {string} [req.query.start_date] - Start date (YYYY-MM-DD)
 * @param {string} [req.query.end_date] - End date (YYYY-MM-DD)
 * @param {Object} res - Express response object
 */
const getUserAnalytics = async (req, res) => {
  const { period = 'monthly', start_date, end_date } = req.query;
  const client = req.db;
  
  try {
    // Validate dates if provided
    let startDateObj = start_date ? new Date(start_date) : new Date(new Date().setFullYear(new Date().getFullYear() - 1));
    let endDateObj = end_date ? new Date(end_date) : new Date();
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Please use YYYY-MM-DD.'
      });
    }
    
    // Format dates for SQL
    const formattedStartDate = startDateObj.toISOString().split('T')[0];
    const formattedEndDate = endDateObj.toISOString().split('T')[0];
    
    // Determine time interval based on period
    let timeInterval;
    if (period === 'daily') {
      timeInterval = "'day'";
    } else if (period === 'weekly') {
      timeInterval = "'week'";
    } else {
      // Default to monthly
      timeInterval = "'month'";
    }
    
    // Get user registrations over time
    const registrationsQuery = `
      SELECT 
        DATE_TRUNC(${timeInterval}, created_at) as period,
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE roles @> ARRAY['homeowner']::varchar[]) as homeowner_count,
        COUNT(*) FILTER (WHERE roles @> ARRAY['provider']::varchar[]) as provider_count
      FROM users
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY period
      ORDER BY period ASC
    `;
    
    const registrationsResult = await client.query(registrationsQuery, [formattedStartDate, formattedEndDate]);
    
    // Get user retention data (users who have logged in within the last 30 days)
    const retentionQuery = `
      SELECT 
        DATE_TRUNC(${timeInterval}, created_at) as cohort_period,
        COUNT(*) as cohort_size,
        COUNT(*) FILTER (WHERE last_login_at >= NOW() - INTERVAL '30 days') as active_users
      FROM users
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY cohort_period
      ORDER BY cohort_period ASC
    `;
    
    const retentionResult = await client.query(retentionQuery, [formattedStartDate, formattedEndDate]);
    
    // Get user activity metrics
    const activityQuery = `
      SELECT 
        DATE_TRUNC(${timeInterval}, sr.created_at) as period,
        COUNT(DISTINCT sr.homeowner_id) as active_homeowners,
        COUNT(DISTINCT b.provider_id) as active_providers
      FROM service_requests sr
      LEFT JOIN bids b ON sr.id = b.service_request_id
      WHERE sr.created_at BETWEEN $1 AND $2
      GROUP BY period
      ORDER BY period ASC
    `;
    
    const activityResult = await client.query(activityQuery, [formattedStartDate, formattedEndDate]);
    
    // Get user demographics
    const demographicsQuery = `
      SELECT 
        CASE 
          WHEN roles @> ARRAY['homeowner']::varchar[] AND roles @> ARRAY['provider']::varchar[] THEN 'both'
          WHEN roles @> ARRAY['homeowner']::varchar[] THEN 'homeowner'
          WHEN roles @> ARRAY['provider']::varchar[] THEN 'provider'
          ELSE 'other'
        END as user_type,
        COUNT(*) as count
      FROM users
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY user_type
      ORDER BY count DESC
    `;
    
    const demographicsResult = await client.query(demographicsQuery, [formattedStartDate, formattedEndDate]);
    
    // Log the admin action
    await logAdminAction(client, req.user.id, 'user_analytics_view', { 
      period, 
      start_date: formattedStartDate, 
      end_date: formattedEndDate 
    });
    
    res.status(200).json({
      success: true,
      data: {
        registrations: registrationsResult.rows,
        retention: retentionResult.rows,
        activity: activityResult.rows,
        demographics: demographicsResult.rows,
        period,
        start_date: formattedStartDate,
        end_date: formattedEndDate
      }
    });
  } catch (error) {
    console.error('Error getting user analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get service request analytics
 * @route GET /api/admin/analytics/service-requests
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} [req.query.period] - Time period (daily, weekly, monthly)
 * @param {string} [req.query.start_date] - Start date (YYYY-MM-DD)
 * @param {string} [req.query.end_date] - End date (YYYY-MM-DD)
 * @param {Object} res - Express response object
 */
const getServiceRequestAnalytics = async (req, res) => {
  const { period = 'monthly', start_date, end_date } = req.query;
  const client = req.db;
  
  try {
    // Validate dates if provided
    let startDateObj = start_date ? new Date(start_date) : new Date(new Date().setFullYear(new Date().getFullYear() - 1));
    let endDateObj = end_date ? new Date(end_date) : new Date();
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Please use YYYY-MM-DD.'
      });
    }
    
    // Format dates for SQL
    const formattedStartDate = startDateObj.toISOString().split('T')[0];
    const formattedEndDate = endDateObj.toISOString().split('T')[0];
    
    // Determine time interval based on period
    let timeInterval;
    if (period === 'daily') {
      timeInterval = "'day'";
    } else if (period === 'weekly') {
      timeInterval = "'week'";
    } else {
      // Default to monthly
      timeInterval = "'month'";
    }
    
    // Get service request volume over time
    const volumeQuery = `
      SELECT 
        DATE_TRUNC(${timeInterval}, created_at) as period,
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count
      FROM service_requests
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY period
      ORDER BY period ASC
    `;
    
    const volumeResult = await client.query(volumeQuery, [formattedStartDate, formattedEndDate]);
    
    // Get service request by category
    const categoryQuery = `
      SELECT 
        sc.name as category_name,
        COUNT(sr.id) as request_count
      FROM service_requests sr
      JOIN services s ON sr.service_id = s.id
      JOIN service_categories sc ON s.category_id = sc.id
      WHERE sr.created_at BETWEEN $1 AND $2
      GROUP BY sc.name
      ORDER BY request_count DESC
    `;
    
    const categoryResult = await client.query(categoryQuery, [formattedStartDate, formattedEndDate]);
    
    // Get average time to completion
    const completionTimeQuery = `
      SELECT 
        DATE_TRUNC(${timeInterval}, created_at) as period,
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600) as avg_hours_to_completion
      FROM service_requests
      WHERE 
        status = 'completed' AND 
        created_at BETWEEN $1 AND $2
      GROUP BY period
      ORDER BY period ASC
    `;
    
    const completionTimeResult = await client.query(completionTimeQuery, [formattedStartDate, formattedEndDate]);
    
    // Get bid statistics
    const bidStatsQuery = `
      SELECT 
        DATE_TRUNC(${timeInterval}, sr.created_at) as period,
        AVG(bid_count) as avg_bids_per_request,
        AVG(EXTRACT(EPOCH FROM (first_bid_time - sr.created_at)) / 3600) as avg_hours_to_first_bid
      FROM (
        SELECT 
          sr.id, sr.created_at,
          COUNT(b.id) as bid_count,
          MIN(b.created_at) as first_bid_time
        FROM service_requests sr
        LEFT JOIN bids b ON sr.id = b.service_request_id
        WHERE sr.created_at BETWEEN $1 AND $2
        GROUP BY sr.id, sr.created_at
      ) as sr
      GROUP BY period
      ORDER BY period ASC
    `;
    
    const bidStatsResult = await client.query(bidStatsQuery, [formattedStartDate, formattedEndDate]);
    
    // Get service request status distribution
    const statusDistributionQuery = `
      SELECT 
        status,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM service_requests WHERE created_at BETWEEN $1 AND $2), 2) as percentage
      FROM service_requests
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY status
      ORDER BY count DESC
    `;
    
    const statusDistributionResult = await client.query(statusDistributionQuery, [formattedStartDate, formattedEndDate]);
    
    // Log the admin action
    await logAdminAction(client, req.user.id, 'service_request_analytics_view', { 
      period, 
      start_date: formattedStartDate, 
      end_date: formattedEndDate 
    });
    
    res.status(200).json({
      success: true,
      data: {
        volume: volumeResult.rows,
        by_category: categoryResult.rows,
        completion_time: completionTimeResult.rows,
        bid_stats: bidStatsResult.rows,
        status_distribution: statusDistributionResult.rows,
        period,
        start_date: formattedStartDate,
        end_date: formattedEndDate
      }
    });
  } catch (error) {
    console.error('Error getting service request analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching service request analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get payment analytics
 * @route GET /api/admin/analytics/payments
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} [req.query.period] - Time period (daily, weekly, monthly)
 * @param {string} [req.query.start_date] - Start date (YYYY-MM-DD)
 * @param {string} [req.query.end_date] - End date (YYYY-MM-DD)
 * @param {Object} res - Express response object
 */
const getPaymentAnalytics = async (req, res) => {
  const { period = 'monthly', start_date, end_date } = req.query;
  const client = req.db;
  
  try {
    // Validate dates if provided
    let startDateObj = start_date ? new Date(start_date) : new Date(new Date().setFullYear(new Date().getFullYear() - 1));
    let endDateObj = end_date ? new Date(end_date) : new Date();
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Please use YYYY-MM-DD.'
      });
    }
    
    // Format dates for SQL
    const formattedStartDate = startDateObj.toISOString().split('T')[0];
    const formattedEndDate = endDateObj.toISOString().split('T')[0];
    
    // Determine time interval based on period
    let timeInterval;
    if (period === 'daily') {
      timeInterval = "'day'";
    } else if (period === 'weekly') {
      timeInterval = "'week'";
    } else {
      // Default to monthly
      timeInterval = "'month'";
    }
    
    // Get payment volume over time
    const volumeQuery = `
      SELECT 
        DATE_TRUNC(${timeInterval}, created_at) as period,
        COUNT(*) as transaction_count,
        SUM(amount) as total_amount,
        AVG(amount) as average_amount
      FROM payments
      WHERE 
        status = 'succeeded' AND
        created_at BETWEEN $1 AND $2
      GROUP BY period
      ORDER BY period ASC
    `;
    
    const volumeResult = await client.query(volumeQuery, [formattedStartDate, formattedEndDate]);
    
    // Get payment by service category
    const categoryQuery = `
      SELECT 
        sc.name as category_name,
        COUNT(p.id) as payment_count,
        SUM(p.amount) as total_amount,
        AVG(p.amount) as average_amount
      FROM payments p
      JOIN service_requests sr ON p.service_request_id = sr.id
      JOIN services s ON sr.service_id = s.id
      JOIN service_categories sc ON s.category_id = sc.id
      WHERE 
        p.status = 'succeeded' AND
        p.created_at BETWEEN $1 AND $2
      GROUP BY sc.name
      ORDER BY total_amount DESC
    `;
    
    const categoryResult = await client.query(categoryQuery, [formattedStartDate, formattedEndDate]);
    
    // Get payment method distribution
    const paymentMethodQuery = `
      SELECT 
        payment_method_type,
        COUNT(*) as count,
        SUM(amount) as total_amount,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM payments WHERE status = 'succeeded' AND created_at BETWEEN $1 AND $2), 2) as percentage
      FROM payments
      WHERE 
        status = 'succeeded' AND
        created_at BETWEEN $1 AND $2
      GROUP BY payment_method_type
      ORDER BY count DESC
    `;
    
    const paymentMethodResult = await client.query(paymentMethodQuery, [formattedStartDate, formattedEndDate]);
    
    // Get platform revenue (fees)
    const revenueQuery = `
      SELECT 
        DATE_TRUNC(${timeInterval}, created_at) as period,
        SUM(amount * fee_percentage / 100) as platform_revenue,
        AVG(fee_percentage) as avg_fee_percentage
      FROM payments
      WHERE 
        status = 'succeeded' AND
        created_at BETWEEN $1 AND $2
      GROUP BY period
      ORDER BY period ASC
    `;
    
    const revenueResult = await client.query(revenueQuery, [formattedStartDate, formattedEndDate]);
    
    // Get refund statistics
    const refundQuery = `
      SELECT 
        DATE_TRUNC(${timeInterval}, r.created_at) as period,
        COUNT(r.id) as refund_count,
        SUM(r.amount) as total_refund_amount,
        ROUND(COUNT(r.id) * 100.0 / NULLIF(COUNT(p.id), 0), 2) as refund_rate
      FROM payments p
      LEFT JOIN refunds r ON p.id = r.payment_id
      WHERE p.created_at BETWEEN $1 AND $2
      GROUP BY period
      ORDER BY period ASC
    `;
    
    const refundResult = await client.query(refundQuery, [formattedStartDate, formattedEndDate]);
    
    // Log the admin action
    await logAdminAction(client, req.user.id, 'payment_analytics_view', { 
      period, 
      start_date: formattedStartDate, 
      end_date: formattedEndDate 
    });
    
    res.status(200).json({
      success: true,
      data: {
        volume: volumeResult.rows,
        by_category: categoryResult.rows,
        payment_methods: paymentMethodResult.rows,
        platform_revenue: revenueResult.rows,
        refunds: refundResult.rows,
        period,
        start_date: formattedStartDate,
        end_date: formattedEndDate
      }
    });
  } catch (error) {
    console.error('Error getting payment analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get provider analytics
 * @route GET /api/admin/analytics/providers
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} [req.query.period] - Time period (daily, weekly, monthly)
 * @param {string} [req.query.start_date] - Start date (YYYY-MM-DD)
 * @param {string} [req.query.end_date] - End date (YYYY-MM-DD)
 * @param {Object} res - Express response object
 */
const getProviderAnalytics = async (req, res) => {
  const { period = 'monthly', start_date, end_date } = req.query;
  const client = req.db;
  
  try {
    // Validate dates if provided
    let startDateObj = start_date ? new Date(start_date) : new Date(new Date().setFullYear(new Date().getFullYear() - 1));
    let endDateObj = end_date ? new Date(end_date) : new Date();
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Please use YYYY-MM-DD.'
      });
    }
    
    // Format dates for SQL
    const formattedStartDate = startDateObj.toISOString().split('T')[0];
    const formattedEndDate = endDateObj.toISOString().split('T')[0];
    
    // Determine time interval based on period
    let timeInterval;
    if (period === 'daily') {
      timeInterval = "'day'";
    } else if (period === 'weekly') {
      timeInterval = "'week'";
    } else {
      // Default to monthly
      timeInterval = "'month'";
    }
    
    // Get provider registration over time
    const registrationQuery = `
      SELECT 
        DATE_TRUNC(${timeInterval}, sp.created_at) as period,
        COUNT(*) as provider_count
      FROM service_providers sp
      WHERE sp.created_at BETWEEN $1 AND $2
      GROUP BY period
      ORDER BY period ASC
    `;
    
    const registrationResult = await client.query(registrationQuery, [formattedStartDate, formattedEndDate]);
    
    // Get provider bid activity
    const bidActivityQuery = `
      SELECT 
        DATE_TRUNC(${timeInterval}, b.created_at) as period,
        COUNT(b.id) as bid_count,
        COUNT(DISTINCT b.provider_id) as active_providers,
        AVG(b.price) as avg_bid_price
      FROM bids b
      WHERE b.created_at BETWEEN $1 AND $2
      GROUP BY period
      ORDER BY period ASC
    `;
    
    const bidActivityResult = await client.query(bidActivityQuery, [formattedStartDate, formattedEndDate]);
    
    // Get provider job completion rate
    const completionRateQuery = `
      SELECT 
        sp.id, sp.company_name,
        COUNT(sr.id) FILTER (WHERE b.status = 'accepted') as accepted_jobs,
        COUNT(sr.id) FILTER (WHERE b.status = 'accepted' AND sr.status = 'completed') as completed_jobs,
        ROUND(COUNT(sr.id) FILTER (WHERE b.status = 'accepted' AND sr.status = 'completed') * 100.0 / 
              NULLIF(COUNT(sr.id) FILTER (WHERE b.status = 'accepted'), 0), 2) as completion_rate
      FROM service_providers sp
      JOIN bids b ON sp.id = b.provider_id
      JOIN service_requests sr ON b.service_request_id = sr.id
      WHERE b.created_at BETWEEN $1 AND $2
      GROUP BY sp.id, sp.company_name
      ORDER BY accepted_jobs DESC
      LIMIT 10
    `;
    
    const completionRateResult = await client.query(completionRateQuery, [formattedStartDate, formattedEndDate]);
    
    // Get provider earnings
    const earningsQuery = `
      SELECT 
        DATE_TRUNC(${timeInterval}, p.created_at) as period,
        SUM(p.amount * (1 - p.fee_percentage / 100)) as provider_earnings,
        AVG(p.amount * (1 - p.fee_percentage / 100)) as avg_earnings_per_job
      FROM payments p
      WHERE 
        p.status = 'succeeded' AND
        p.created_at BETWEEN $1 AND $2
      GROUP BY period
      ORDER BY period ASC
    `;
    
    const earningsResult = await client.query(earningsQuery, [formattedStartDate, formattedEndDate]);
    
    // Get provider ratings distribution
    const ratingsQuery = `
      SELECT 
        FLOOR(r.rating) as rating_bucket,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM reviews WHERE created_at BETWEEN $1 AND $2), 2) as percentage
      FROM reviews r
      WHERE r.created_at BETWEEN $1 AND $2
      GROUP BY rating_bucket
      ORDER BY rating_bucket DESC
    `;
    
    const ratingsResult = await client.query(ratingsQuery, [formattedStartDate, formattedEndDate]);
    
    // Get top providers by earnings
    const topProvidersQuery = `
      SELECT 
        sp.id, sp.company_name, u.first_name, u.last_name,
        SUM(p.amount * (1 - p.fee_percentage / 100)) as total_earnings,
        COUNT(p.id) as job_count,
        AVG(r.rating) as avg_rating
      FROM service_providers sp
      JOIN users u ON sp.user_id = u.id
      JOIN bids b ON sp.id = b.provider_id
      JOIN service_requests sr ON b.service_request_id = sr.id
      JOIN payments p ON sr.id = p.service_request_id
      LEFT JOIN reviews r ON sp.id = r.provider_id
      WHERE 
        p.status = 'succeeded' AND
        p.created_at BETWEEN $1 AND $2
      GROUP BY sp.id, sp.company_name, u.first_name, u.last_name
      ORDER BY total_earnings DESC
      LIMIT 10
    `;
    
    const topProvidersResult = await client.query(topProvidersQuery, [formattedStartDate, formattedEndDate]);
    
    // Log the admin action
    await logAdminAction(client, req.user.id, 'provider_analytics_view', { 
      period, 
      start_date: formattedStartDate, 
      end_date: formattedEndDate 
    });
    
    res.status(200).json({
      success: true,
      data: {
        registrations: registrationResult.rows,
        bid_activity: bidActivityResult.rows,
        completion_rates: completionRateResult.rows,
        earnings: earningsResult.rows,
        ratings_distribution: ratingsResult.rows,
        top_providers: topProvidersResult.rows,
        period,
        start_date: formattedStartDate,
        end_date: formattedEndDate
      }
    });
  } catch (error) {
    console.error('Error getting provider analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching provider analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Generate user report
 * @route GET /api/admin/reports/users
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} [req.query.format] - Report format (csv, json)
 * @param {string} [req.query.start_date] - Start date (YYYY-MM-DD)
 * @param {string} [req.query.end_date] - End date (YYYY-MM-DD)
 * @param {Object} res - Express response object
 */
const generateUserReport = async (req, res) => {
  const { format = 'json', start_date, end_date, role } = req.query;
  const client = req.db;
  
  try {
    // Validate dates if provided
    let startDateObj = start_date ? new Date(start_date) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    let endDateObj = end_date ? new Date(end_date) : new Date();
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Please use YYYY-MM-DD.'
      });
    }
    
    // Format dates for SQL
    const formattedStartDate = startDateObj.toISOString().split('T')[0];
    const formattedEndDate = endDateObj.toISOString().split('T')[0];
    
    // Build query
    let query = `
      SELECT 
        u.id, u.email, u.first_name, u.last_name, u.phone, 
        u.roles, u.status, u.created_at,
        CASE WHEN h.id IS NOT NULL THEN true ELSE false END AS is_homeowner,
        CASE WHEN sp.id IS NOT NULL THEN true ELSE false END AS is_provider,
        h.id as homeowner_id,
        sp.id as provider_id,
        sp.company_name,
        COUNT(DISTINCT p.id) as property_count,
        COUNT(DISTINCT sr.id) as service_request_count,
        COUNT(DISTINCT b.id) as bid_count
      FROM users u
      LEFT JOIN homeowners h ON u.id = h.user_id
      LEFT JOIN service_providers sp ON u.id = sp.user_id
      LEFT JOIN properties p ON h.id = p.homeowner_id
      LEFT JOIN service_requests sr ON h.id = sr.homeowner_id
      LEFT JOIN bids b ON sp.id = b.provider_id
      WHERE u.created_at BETWEEN $1 AND $2
    `;
    
    const queryParams = [formattedStartDate, formattedEndDate];
    let paramIndex = 3;
    
    // Add role filter if provided
    if (role) {
      query += ` AND u.roles @> ARRAY[$${paramIndex}]::varchar[]`;
      queryParams.push(role);
      paramIndex++;
    }
    
    // Group by and order
    query += `
      GROUP BY u.id, u.email, u.first_name, u.last_name, u.phone, u.roles, u.status, u.created_at, h.id, sp.id, sp.company_name
      ORDER BY u.created_at DESC
    `;
    
    const result = await client.query(query, queryParams);
    
    // Log the admin action
    await logAdminAction(client, req.user.id, 'user_report_generate', { 
      format, 
      start_date: formattedStartDate, 
      end_date: formattedEndDate,
      role
    });
    
    // Return data in requested format
    if (format === 'csv') {
      // Convert to CSV
      const fields = [
        'id', 'email', 'first_name', 'last_name', 'phone', 'roles', 'status', 'created_at',
        'is_homeowner', 'is_provider', 'homeowner_id', 'provider_id', 'company_name',
        'property_count', 'service_request_count', 'bid_count'
      ];
      
      let csv = fields.join(',') + '\n';
      
      result.rows.forEach(row => {
        const values = fields.map(field => {
          const value = row[field];
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return '"' + JSON.stringify(value).replace(/"/g, '""') + '"';
          if (typeof value === 'string') return '"' + value.replace(/"/g, '""') + '"';
          return value;
        });
        csv += values.join(',') + '\n';
      });
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=user_report_${formattedStartDate}_to_${formattedEndDate}.csv`);
      return res.send(csv);
    } else {
      // Return JSON
      res.status(200).json({
        success: true,
        count: result.rows.length,
        start_date: formattedStartDate,
        end_date: formattedEndDate,
        data: result.rows
      });
    }
  } catch (error) {
    console.error('Error generating user report:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating user report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Generate service request report
 * @route GET /api/admin/reports/service-requests
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} [req.query.format] - Report format (csv, json)
 * @param {string} [req.query.start_date] - Start date (YYYY-MM-DD)
 * @param {string} [req.query.end_date] - End date (YYYY-MM-DD)
 * @param {string} [req.query.status] - Filter by status
 * @param {Object} res - Express response object
 */
const generateServiceRequestReport = async (req, res) => {
  const { format = 'json', start_date, end_date, status, category } = req.query;
  const client = req.db;
  
  try {
    // Validate dates if provided
    let startDateObj = start_date ? new Date(start_date) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    let endDateObj = end_date ? new Date(end_date) : new Date();
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Please use YYYY-MM-DD.'
      });
    }
    
    // Format dates for SQL
    const formattedStartDate = startDateObj.toISOString().split('T')[0];
    const formattedEndDate = endDateObj.toISOString().split('T')[0];
    
    // Build query
    let query = `
      SELECT 
        sr.id, sr.title, sr.description, sr.status, sr.created_at, sr.updated_at,
        sr.preferred_date, sr.preferred_time, sr.price, sr.notes,
        s.id as service_id, s.name as service_name,
        sc.id as category_id, sc.name as category_name,
        p.id as property_id, p.address as property_address, p.city as property_city, p.state as property_state, p.zip_code as property_zip_code,
        h.id as homeowner_id,
        u_h.first_name as homeowner_first_name, u_h.last_name as homeowner_last_name, u_h.email as homeowner_email,
        COUNT(b.id) as bid_count,
        MIN(b.price) as min_bid_price,
        MAX(b.price) as max_bid_price,
        AVG(b.price) as avg_bid_price,
        sp_accepted.id as accepted_provider_id,
        sp_accepted.company_name as accepted_provider_name,
        b_accepted.price as accepted_bid_price,
        p_payment.id as payment_id,
        p_payment.amount as payment_amount,
        p_payment.status as payment_status
      FROM service_requests sr
      JOIN services s ON sr.service_id = s.id
      JOIN service_categories sc ON s.category_id = sc.id
      JOIN properties p ON sr.property_id = p.id
      JOIN homeowners h ON sr.homeowner_id = h.id
      JOIN users u_h ON h.user_id = u_h.id
      LEFT JOIN bids b ON sr.id = b.service_request_id
      LEFT JOIN bids b_accepted ON sr.id = b_accepted.service_request_id AND b_accepted.status = 'accepted'
      LEFT JOIN service_providers sp_accepted ON b_accepted.provider_id = sp_accepted.id
      LEFT JOIN payments p_payment ON sr.id = p_payment.service_request_id
      WHERE sr.created_at BETWEEN $1 AND $2
    `;
    
    const queryParams = [formattedStartDate, formattedEndDate];
    let paramIndex = 3;
    
    // Add status filter if provided
    if (status) {
      query += ` AND sr.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }
    
    // Add category filter if provided
    if (category) {
      query += ` AND (sc.id = $${paramIndex} OR LOWER(sc.name) = LOWER($${paramIndex}))`;
      queryParams.push(category);
      paramIndex++;
    }
    
    // Group by and order
    query += `
      GROUP BY sr.id, s.id, sc.id, p.id, h.id, u_h.first_name, u_h.last_name, u_h.email, 
               sp_accepted.id, sp_accepted.company_name, b_accepted.price, p_payment.id, p_payment.amount, p_payment.status
      ORDER BY sr.created_at DESC
    `;
    
    const result = await client.query(query, queryParams);
    
    // Log the admin action
    await logAdminAction(client, req.user.id, 'service_request_report_generate', { 
      format, 
      start_date: formattedStartDate, 
      end_date: formattedEndDate,
      status,
      category
    });
    
    // Return data in requested format
    if (format === 'csv') {
      // Convert to CSV
      const fields = [
        'id', 'title', 'description', 'status', 'created_at', 'updated_at', 'preferred_date', 'preferred_time',
        'price', 'notes', 'service_id', 'service_name', 'category_id', 'category_name', 'property_id',
        'property_address', 'property_city', 'property_state', 'property_zip_code', 'homeowner_id',
        'homeowner_first_name', 'homeowner_last_name', 'homeowner_email', 'bid_count', 'min_bid_price',
        'max_bid_price', 'avg_bid_price', 'accepted_provider_id', 'accepted_provider_name', 'accepted_bid_price',
        'payment_id', 'payment_amount', 'payment_status'
      ];
      
      let csv = fields.join(',') + '\n';
      
      result.rows.forEach(row => {
        const values = fields.map(field => {
          const value = row[field];
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return '"' + JSON.stringify(value).replace(/"/g, '""') + '"';
          if (typeof value === 'string') return '"' + value.replace(/"/g, '""') + '"';
          return value;
        });
        csv += values.join(',') + '\n';
      });
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=service_request_report_${formattedStartDate}_to_${formattedEndDate}.csv`);
      return res.send(csv);
    } else {
      // Return JSON
      res.status(200).json({
        success: true,
        count: result.rows.length,
        start_date: formattedStartDate,
        end_date: formattedEndDate,
        data: result.rows
      });
    }
  } catch (error) {
    console.error('Error generating service request report:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating service request report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Generate payment report
 * @route GET /api/admin/reports/payments
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} [req.query.format] - Report format (csv, json)
 * @param {string} [req.query.start_date] - Start date (YYYY-MM-DD)
 * @param {string} [req.query.end_date] - End date (YYYY-MM-DD)
 * @param {string} [req.query.status] - Filter by status
 * @param {Object} res - Express response object
 */
const generatePaymentReport = async (req, res) => {
  const { format = 'json', start_date, end_date, status } = req.query;
  const client = req.db;
  
  try {
    // Validate dates if provided
    let startDateObj = start_date ? new Date(start_date) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    let endDateObj = end_date ? new Date(end_date) : new Date();
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Please use YYYY-MM-DD.'
      });
    }
    
    // Format dates for SQL
    const formattedStartDate = startDateObj.toISOString().split('T')[0];
    const formattedEndDate = endDateObj.toISOString().split('T')[0];
    
    // Build query
    let query = `
      SELECT 
        p.id, p.amount, p.status, p.payment_method_type, p.fee_percentage, p.created_at, p.updated_at,
        p.stripe_payment_intent_id, p.description, p.currency, p.payment_date,
        sr.id as service_request_id, sr.title as service_request_title, sr.status as service_request_status,
        s.id as service_id, s.name as service_name,
        sc.id as category_id, sc.name as category_name,
        h.id as homeowner_id,
        u_h.first_name as homeowner_first_name, u_h.last_name as homeowner_last_name, u_h.email as homeowner_email,
        sp.id as provider_id,
        sp.company_name as provider_company_name,
        u_p.first_name as provider_first_name, u_p.last_name as provider_last_name, u_p.email as provider_email,
        ROUND(p.amount * p.fee_percentage / 100, 2) as platform_fee,
        ROUND(p.amount * (1 - p.fee_percentage / 100), 2) as provider_payout,
        r.id as refund_id,
        r.amount as refund_amount,
        r.status as refund_status,
        r.created_at as refund_date
      FROM payments p
      LEFT JOIN service_requests sr ON p.service_request_id = sr.id
      LEFT JOIN services s ON sr.service_id = s.id
      LEFT JOIN service_categories sc ON s.category_id = sc.id
      LEFT JOIN homeowners h ON p.homeowner_id = h.id
      LEFT JOIN users u_h ON h.user_id = u_h.id
      LEFT JOIN service_providers sp ON p.provider_id = sp.id
      LEFT JOIN users u_p ON sp.user_id = u_p.id
      LEFT JOIN refunds r ON p.id = r.payment_id
      WHERE p.created_at BETWEEN $1 AND $2
    `;
    
    const queryParams = [formattedStartDate, formattedEndDate];
    let paramIndex = 3;
    
    // Add status filter if provided
    if (status) {
      query += ` AND p.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }
    
    // Order by
    query += ` ORDER BY p.created_at DESC`;
    
    const result = await client.query(query, queryParams);
    
    // Log the admin action
    await logAdminAction(client, req.user.id, 'payment_report_generate', { 
      format, 
      start_date: formattedStartDate, 
      end_date: formattedEndDate,
      status
    });
    
    // Return data in requested format
    if (format === 'csv') {
      // Convert to CSV
      const fields = [
        'id', 'amount', 'status', 'payment_method_type', 'fee_percentage', 'created_at', 'updated_at',
        'stripe_payment_intent_id', 'description', 'currency', 'payment_date', 'service_request_id',
        'service_request_title', 'service_request_status', 'service_id', 'service_name', 'category_id',
        'category_name', 'homeowner_id', 'homeowner_first_name', 'homeowner_last_name', 'homeowner_email',
        'provider_id', 'provider_company_name', 'provider_first_name', 'provider_last_name', 'provider_email',
        'platform_fee', 'provider_payout', 'refund_id', 'refund_amount', 'refund_status', 'refund_date'
      ];
      
      let csv = fields.join(',') + '\n';
      
      result.rows.forEach(row => {
        const values = fields.map(field => {
          const value = row[field];
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return '"' + JSON.stringify(value).replace(/"/g, '""') + '"';
          if (typeof value === 'string') return '"' + value.replace(/"/g, '""') + '"';
          return value;
        });
        csv += values.join(',') + '\n';
      });
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=payment_report_${formattedStartDate}_to_${formattedEndDate}.csv`);
      return res.send(csv);
    } else {
      // Return JSON
      res.status(200).json({
        success: true,
        count: result.rows.length,
        start_date: formattedStartDate,
        end_date: formattedEndDate,
        data: result.rows
      });
    }
  } catch (error) {
    console.error('Error generating payment report:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating payment report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Generate provider payout report
 * @route GET /api/admin/reports/payouts
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} [req.query.format] - Report format (csv, json)
 * @param {string} [req.query.start_date] - Start date (YYYY-MM-DD)
 * @param {string} [req.query.end_date] - End date (YYYY-MM-DD)
 * @param {string} [req.query.status] - Filter by status
 * @param {Object} res - Express response object
 */
const generatePayoutReport = async (req, res) => {
  const { format = 'json', start_date, end_date, status } = req.query;
  const client = req.db;
  
  try {
    // Validate dates if provided
    let startDateObj = start_date ? new Date(start_date) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    let endDateObj = end_date ? new Date(end_date) : new Date();
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Please use YYYY-MM-DD.'
      });
    }
    
    // Format dates for SQL
    const formattedStartDate = startDateObj.toISOString().split('T')[0];
    const formattedEndDate = endDateObj.toISOString().split('T')[0];
    
    // Build query
    let query = `
      SELECT 
        po.id, po.amount, po.status, po.created_at, po.updated_at,
        po.stripe_payout_id, po.description, po.currency, po.payout_date,
        sp.id as provider_id, sp.company_name as provider_company_name,
        u.first_name as provider_first_name, u.last_name as provider_last_name, u.email as provider_email,
        sp.stripe_connect_account_id,
        COUNT(p.id) as payment_count,
        SUM(p.amount) as total_payment_amount,
        AVG(p.fee_percentage) as avg_fee_percentage
      FROM provider_payouts po
      JOIN service_providers sp ON po.provider_id = sp.id
      JOIN users u ON sp.user_id = u.id
      LEFT JOIN payments p ON po.id = p.payout_id
      WHERE po.created_at BETWEEN $1 AND $2
    `;
    
    const queryParams = [formattedStartDate, formattedEndDate];
    let paramIndex = 3;
    
    // Add status filter if provided
    if (status) {
      query += ` AND po.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }
    
    // Group by and order
    query += `
      GROUP BY po.id, sp.id, sp.company_name, u.first_name, u.last_name, u.email, sp.stripe_connect_account_id
      ORDER BY po.created_at DESC
    `;
    
    const result = await client.query(query, queryParams);
    
    // Log the admin action
    await logAdminAction(client, req.user.id, 'payout_report_generate', { 
      format, 
      start_date: formattedStartDate, 
      end_date: formattedEndDate,
      status
    });
    
    // Return data in requested format
    if (format === 'csv') {
      // Convert to CSV
      const fields = [
        'id', 'amount', 'status', 'created_at', 'updated_at', 'stripe_payout_id', 'description',
        'currency', 'payout_date', 'provider_id', 'provider_company_name', 'provider_first_name',
        'provider_last_name', 'provider_email', 'stripe_connect_account_id', 'payment_count',
        'total_payment_amount', 'avg_fee_percentage'
      ];
      
      let csv = fields.join(',') + '\n';
      
      result.rows.forEach(row => {
        const values = fields.map(field => {
          const value = row[field];
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return '"' + JSON.stringify(value).replace(/"/g, '""') + '"';
          if (typeof value === 'string') return '"' + value.replace(/"/g, '""') + '"';
          return value;
        });
        csv += values.join(',') + '\n';
      });
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=payout_report_${formattedStartDate}_to_${formattedEndDate}.csv`);
      return res.send(csv);
    } else {
      // Return JSON
      res.status(200).json({
        success: true,
        count: result.rows.length,
        start_date: formattedStartDate,
        end_date: formattedEndDate,
        data: result.rows
      });
    }
  } catch (error) {
    console.error('Error generating payout report:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating payout report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get audit logs with filtering options
 * @route GET /api/admin/audit-logs
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} [req.query.admin_id] - Filter by admin ID
 * @param {string} [req.query.action_type] - Filter by action type
 * @param {string} [req.query.start_date] - Start date (YYYY-MM-DD)
 * @param {string} [req.query.end_date] - End date (YYYY-MM-DD)
 * @param {Object} res - Express response object
 */
const getAuditLogs = async (req, res) => {
  const { admin_id, action_type, start_date, end_date, page = 1, limit = 20 } = req.query;
  const client = req.db;
  
  try {
    // Validate dates if provided
    let startDateObj = start_date ? new Date(start_date) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    let endDateObj = end_date ? new Date(end_date) : new Date();
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Please use YYYY-MM-DD.'
      });
    }
    
    // Format dates for SQL
    const formattedStartDate = startDateObj.toISOString().split('T')[0];
    const formattedEndDate = endDateObj.toISOString().split('T')[0];
    
    // Build query
    let query = `
      SELECT 
        al.id, al.admin_id, al.action_type, al.action_details, al.created_at,
        u.email as admin_email, u.first_name as admin_first_name, u.last_name as admin_last_name
      FROM admin_audit_logs al
      JOIN users u ON al.admin_id = u.id
      WHERE al.created_at BETWEEN $1 AND $2
    `;
    
    const queryParams = [formattedStartDate, formattedEndDate];
    let paramIndex = 3;
    
    // Add admin_id filter if provided
    if (admin_id) {
      query += ` AND al.admin_id = $${paramIndex}`;
      queryParams.push(admin_id);
      paramIndex++;
    }
    
    // Add action_type filter if provided
    if (action_type) {
      query += ` AND al.action_type = $${paramIndex}`;
      queryParams.push(action_type);
      paramIndex++;
    }
    
    // Add sorting
    query += ` ORDER BY al.created_at DESC`;
    
    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(parseInt(limit), offset);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) FROM admin_audit_logs al
      WHERE al.created_at BETWEEN $1 AND $2
    `;
    
    // Add the same filters to count query
    if (admin_id) {
      countQuery += ` AND al.admin_id = $3`;
    }
    
    if (action_type) {
      const actionTypeParamIndex = admin_id ? 4 : 3;
      countQuery += ` AND al.action_type = $${actionTypeParamIndex}`;
    }
    
    // Execute queries
    const result = await client.query(query, queryParams);
    const countResult = await client.query(countQuery, queryParams.slice(0, paramIndex - 2));
    
    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / parseInt(limit));
    
    // Log the admin action
    await logAdminAction(client, req.user.id, 'audit_log_view', { 
      admin_id, 
      action_type, 
      start_date: formattedStartDate, 
      end_date: formattedEndDate 
    });
    
    res.status(200).json({
      success: true,
      count: result.rows.length,
      total: totalCount,
      page: parseInt(page),
      pages: totalPages,
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
 * Get audit log by ID
 * @route GET /api/admin/audit-logs/:id
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.id - Audit log ID
 * @param {Object} res - Express response object
 */
const getAuditLogById = async (req, res) => {
  const { id } = req.params;
  const client = req.db;
  
  try {
    const result = await client.query(`
      SELECT 
        al.id, al.admin_id, al.action_type, al.action_details, al.created_at,
        u.email as admin_email, u.first_name as admin_first_name, u.last_name as admin_last_name
      FROM admin_audit_logs al
      JOIN users u ON al.admin_id = u.id
      WHERE al.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Audit log not found'
      });
    }
    
    // Log the admin action
    await logAdminAction(client, req.user.id, 'audit_log_detail_view', { audit_log_id: id });
    
    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error getting audit log:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching audit log',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get system configuration
 * @route GET /api/admin/config
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSystemConfig = async (req, res) => {
  const client = req.db;
  
  try {
    const result = await client.query('SELECT * FROM system_config');
    
    // Log the admin action
    await logAdminAction(client, req.user.id, 'system_config_view', {});
    
    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting system configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching system configuration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update system configuration
 * @route PUT /api/admin/config
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body with configuration key-value pairs
 * @param {Object} res - Express response object
 */
const updateSystemConfig = async (req, res) => {
  const configUpdates = req.body;
  const client = req.db;
  
  // Validate request body
  if (!configUpdates || Object.keys(configUpdates).length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No configuration updates provided'
    });
  }
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    // Get current configuration
    const currentConfigResult = await client.query('SELECT * FROM system_config');
    const currentConfig = {};
    currentConfigResult.rows.forEach(row => {
      currentConfig[row.key] = row.value;
    });
    
    // Process each configuration update
    const updates = [];
    for (const [key, value] of Object.entries(configUpdates)) {
      // Check if config exists
      const configCheck = await client.query('SELECT * FROM system_config WHERE key = $1', [key]);
      
      if (configCheck.rows.length > 0) {
        // Update existing config
        await client.query(
          'UPDATE system_config SET value = $1, updated_at = CURRENT_TIMESTAMP WHERE key = $2',
          [value, key]
        );
      } else {
        // Insert new config
        await client.query(
          'INSERT INTO system_config (key, value) VALUES ($1, $2)',
          [key, value]
        );
      }
      
      updates.push({ key, old_value: currentConfig[key], new_value: value });
    }
    
    // Log the admin action
    await logAdminAction(client, req.user.id, 'system_config_update', { updates });
    
    // Commit transaction
    await client.query('COMMIT');
    
    // Get updated configuration
    const updatedConfigResult = await client.query('SELECT * FROM system_config');
    
    res.status(200).json({
      success: true,
      message: 'System configuration updated successfully',
      data: updatedConfigResult.rows
    });
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
    console.error('Error updating system configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating system configuration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get real-time platform metrics
 * @route GET /api/admin/metrics/real-time
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getRealTimeMetrics = async (req, res) => {
  const client = req.db;
  
  try {
    // Start a transaction for consistent reads
    await client.query('BEGIN');
    
    // Get active users (logged in within the last 24 hours)
    const activeUsersResult = await client.query(`
      SELECT COUNT(*) as active_users
      FROM users
      WHERE last_login_at >= NOW() - INTERVAL '24 hours'
    `);
    
    // Get pending service requests
    const pendingRequestsResult = await client.query(`
      SELECT COUNT(*) as pending_requests
      FROM service_requests
      WHERE status IN ('pending', 'bidding')
    `);
    
    // Get active service requests (scheduled or in progress)
    const activeRequestsResult = await client.query(`
      SELECT COUNT(*) as active_requests
      FROM service_requests
      WHERE status IN ('scheduled', 'in_progress')
    `);
    
    // Get recent payments (last 24 hours)
    const recentPaymentsResult = await client.query(`
      SELECT 
        COUNT(*) as payment_count,
        SUM(amount) as payment_volume
      FROM payments
      WHERE 
        status = 'succeeded' AND
        created_at >= NOW() - INTERVAL '24 hours'
    `);
    
    // Get recent signups (last 24 hours)
    const recentSignupsResult = await client.query(`
      SELECT COUNT(*) as signup_count
      FROM users
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `);
    
    // Get recent service requests (last 24 hours)
    const recentRequestsResult = await client.query(`
      SELECT COUNT(*) as request_count
      FROM service_requests
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `);
    
    // Get recent bids (last 24 hours)
    const recentBidsResult = await client.query(`
      SELECT COUNT(*) as bid_count
      FROM bids
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `);
    
    // Get system load metrics
    const systemLoadResult = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM pg_stat_activity) as db_connections,
        (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active') as active_queries,
        EXTRACT(EPOCH FROM (NOW() - pg_postmaster_start_time())) as uptime_seconds
      FROM pg_postmaster_start_time()
    `);
    
    // Commit transaction
    await client.query('COMMIT');
    
    // Log the admin action
    await logAdminAction(client, req.user.id, 'real_time_metrics_view', {});
    
    res.status(200).json({
      success: true,
      data: {
        active_users: parseInt(activeUsersResult.rows[0].active_users),
        pending_requests: parseInt(pendingRequestsResult.rows[0].pending_requests),
        active_requests: parseInt(activeRequestsResult.rows[0].active_requests),
        recent_payments: {
          count: parseInt(recentPaymentsResult.rows[0].payment_count),
          volume: parseFloat(recentPaymentsResult.rows[0].payment_volume || 0)
        },
        recent_signups: parseInt(recentSignupsResult.rows[0].signup_count),
        recent_requests: parseInt(recentRequestsResult.rows[0].request_count),
        recent_bids: parseInt(recentBidsResult.rows[0].bid_count),
        system_load: {
          db_connections: parseInt(systemLoadResult.rows[0].db_connections),
          active_queries: parseInt(systemLoadResult.rows[0].active_queries),
          uptime_seconds: parseFloat(systemLoadResult.rows[0].uptime_seconds)
        },
        timestamp: new Date()
      }
    });
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
    console.error('Error getting real-time metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching real-time metrics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get platform health status
 * @route GET /api/admin/metrics/health
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSystemHealth = async (req, res) => {
  const client = req.db;
  
  try {
    // Start a transaction for consistent reads
    await client.query('BEGIN');
    
    // Check database connectivity
    const dbConnectivityResult = await client.query('SELECT 1 as connected');
    const dbConnected = dbConnectivityResult.rows[0].connected === 1;
    
    // Check database performance
    const dbPerformanceStart = Date.now();
    await client.query('SELECT COUNT(*) FROM users');
    const dbPerformanceTime = Date.now() - dbPerformanceStart;
    
    // Check for long-running queries
    const longRunningQueriesResult = await client.query(`
      SELECT COUNT(*) as count
      FROM pg_stat_activity
      WHERE state = 'active' AND NOW() - query_start > INTERVAL '30 seconds'
    `);
    
    // Check for database connection utilization
    const connectionUtilizationResult = await client.query(`
      SELECT 
        COUNT(*) as active_connections,
        current_setting('max_connections')::int as max_connections
      FROM pg_stat_activity
    `);
    
    const activeConnections = parseInt(connectionUtilizationResult.rows[0].active_connections);
    const maxConnections = parseInt(connectionUtilizationResult.rows[0].max_connections);
    const connectionUtilization = (activeConnections / maxConnections) * 100;
    
    // Check for database size
    const dbSizeResult = await client.query(`
      SELECT pg_database_size(current_database()) as size_bytes
    `);
    
    const dbSizeBytes = parseInt(dbSizeResult.rows[0].size_bytes);
    const dbSizeMB = dbSizeBytes / (1024 * 1024);
    
    // Check for table sizes
    const tableSizesResult = await client.query(`
      SELECT 
        table_name,
        pg_total_relation_size(quote_ident(table_name)) as size_bytes
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY size_bytes DESC
      LIMIT 10
    `);
    
    // Check for index health
    const indexHealthResult = await client.query(`
      SELECT 
        COUNT(*) FILTER (WHERE idx_scan = 0 AND pg_relation_size(indexrelid) > 1024 * 1024) as unused_indexes_count
      FROM pg_stat_user_indexes
    `);
    
    // Commit transaction
    await client.query('COMMIT');
    
    // Log the admin action
    await logAdminAction(client, req.user.id, 'system_health_view', {});
    
    // Determine overall health status
    let overallStatus = 'healthy';
    const issues = [];
    
    if (!dbConnected) {
      overallStatus = 'critical';
      issues.push('Database connectivity issues');
    }
    
    if (dbPerformanceTime > 1000) {
      overallStatus = 'critical';
      issues.push('Database performance issues');
    } else if (dbPerformanceTime > 500) {
      if (overallStatus === 'healthy') overallStatus = 'warning';
      issues.push('Database performance degraded');
    }
    
    if (parseInt(longRunningQueriesResult.rows[0].count) > 0) {
      if (overallStatus === 'healthy') overallStatus = 'warning';
      issues.push('Long-running queries detected');
    }
    
    if (connectionUtilization > 80) {
      overallStatus = 'critical';
      issues.push('High database connection utilization');
    } else if (connectionUtilization > 60) {
      if (overallStatus === 'healthy') overallStatus = 'warning';
      issues.push('Elevated database connection utilization');
    }
    
    if (parseInt(indexHealthResult.rows[0].unused_indexes_count) > 5) {
      if (overallStatus === 'healthy') overallStatus = 'warning';
      issues.push('Multiple unused indexes detected');
    }
    
    res.status(200).json({
      success: true,
      data: {
        status: overallStatus,
        issues,
        database: {
          connected: dbConnected,
          performance_ms: dbPerformanceTime,
          long_running_queries: parseInt(longRunningQueriesResult.rows[0].count),
          connection_utilization: connectionUtilization.toFixed(2) + '%',
          active_connections: activeConnections,
          max_connections: maxConnections,
          size_mb: dbSizeMB.toFixed(2),
          unused_indexes: parseInt(indexHealthResult.rows[0].unused_indexes_count),
          largest_tables: tableSizesResult.rows.map(row => ({
            table_name: row.table_name,
            size_mb: (parseInt(row.size_bytes) / (1024 * 1024)).toFixed(2)
          }))
        },
        timestamp: new Date()
      }
    });
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
    console.error('Error getting system health:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching system health',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Helper function to log admin actions
 * @param {Object} client - Database client
 * @param {number} adminId - Admin user ID
 * @param {string} actionType - Type of action performed
 * @param {Object} actionDetails - Details of the action
 */
const logAdminAction = async (client, adminId, actionType, actionDetails) => {
  try {
    // Check if admin_audit_logs table exists, create if not
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER NOT NULL REFERENCES users(id),
        action_type VARCHAR(100) NOT NULL,
        action_details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create index if not exists
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE indexname = 'admin_audit_logs_admin_id_idx'
        ) THEN
          CREATE INDEX admin_audit_logs_admin_id_idx ON admin_audit_logs(admin_id);
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE indexname = 'admin_audit_logs_action_type_idx'
        ) THEN
          CREATE INDEX admin_audit_logs_action_type_idx ON admin_audit_logs(action_type);
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE indexname = 'admin_audit_logs_created_at_idx'
        ) THEN
          CREATE INDEX admin_audit_logs_created_at_idx ON admin_audit_logs(created_at);
        END IF;
      END
      $$;
    `);
    
    // Insert audit log entry
    await client.query(
      'INSERT INTO admin_audit_logs (admin_id, action_type, action_details) VALUES ($1, $2, $3)',
      [adminId, actionType, actionDetails]
    );
  } catch (error) {
    console.error('Error logging admin action:', error);
    // Don't throw error to prevent disrupting the main operation
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getAllServiceCategories,
  getServiceCategoryById,
  createServiceCategory,
  updateServiceCategory,
  deleteServiceCategory,
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  getDashboardAnalytics,
  getUserAnalytics,
  getServiceRequestAnalytics,
  getPaymentAnalytics,
  getProviderAnalytics,
  generateUserReport,
  generateServiceRequestReport,
  generatePaymentReport,
  generatePayoutReport,
  getAuditLogs,
  getAuditLogById,
  getSystemConfig,
  updateSystemConfig,
  getRealTimeMetrics,
  getSystemHealth
};