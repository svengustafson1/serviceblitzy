/**
 * Provider Controller
 * Handles all operations related to service providers
 */

/**
 * Get all providers (with filtering options)
 * @route GET /api/providers
 */
const getAllProviders = async (req, res) => {
  const { service_id, rating, location, sort } = req.query;
  const client = req.db;
  
  try {
    // Base query
    let query = `
      SELECT 
        sp.id, sp.company_name, sp.description, sp.website, sp.avg_rating,
        sp.is_verified, sp.service_areas, sp.years_of_experience,
        u.first_name, u.last_name, u.email, u.phone,
        ARRAY_AGG(DISTINCT s.name) AS services,
        COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'accepted') AS completed_jobs_count,
        ROUND(AVG(r.rating), 1) AS review_avg,
        COUNT(DISTINCT r.id) AS review_count
      FROM service_providers sp
      JOIN users u ON sp.user_id = u.id
      LEFT JOIN provider_services ps ON sp.id = ps.provider_id
      LEFT JOIN services s ON ps.service_id = s.id
      LEFT JOIN bids b ON sp.id = b.provider_id
      LEFT JOIN reviews r ON sp.id = r.provider_id
    `;
    
    // Where clause
    let whereClause = [];
    const queryParams = [];
    let paramIndex = 1;
    
    // Filter by service
    if (service_id) {
      whereClause.push(`ps.service_id = $${paramIndex}`);
      queryParams.push(service_id);
      paramIndex++;
    }
    
    // Filter by minimum rating
    if (rating) {
      whereClause.push(`sp.avg_rating >= $${paramIndex}`);
      queryParams.push(parseFloat(rating));
      paramIndex++;
    }
    
    // Filter by location (city or zip)
    if (location) {
      whereClause.push(`sp.service_areas @> ARRAY[$${paramIndex}]::varchar[]`);
      queryParams.push(location);
      paramIndex++;
    }
    
    // Add where clause if filters exist
    if (whereClause.length > 0) {
      query += ' WHERE ' + whereClause.join(' AND ');
    }
    
    // Group by
    query += `
      GROUP BY sp.id, u.id
    `;
    
    // Sort
    if (sort === 'rating_high') {
      query += ' ORDER BY sp.avg_rating DESC';
    } else if (sort === 'rating_low') {
      query += ' ORDER BY sp.avg_rating ASC';
    } else if (sort === 'experience_high') {
      query += ' ORDER BY sp.years_of_experience DESC';
    } else if (sort === 'jobs_completed') {
      query += ' ORDER BY completed_jobs_count DESC';
    } else {
      // Default sort by name
      query += ' ORDER BY sp.company_name ASC';
    }
    
    const result = await client.query(query, queryParams);
    
    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting providers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching providers',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get a provider by ID
 * @route GET /api/providers/:id
 */
const getProviderById = async (req, res) => {
  const { id } = req.params;
  const client = req.db;
  
  try {
    // Get basic provider information
    const providerResult = await client.query(`
      SELECT 
        sp.*,
        u.first_name, u.last_name, u.email, u.phone,
        u.created_at as member_since
      FROM service_providers sp
      JOIN users u ON sp.user_id = u.id
      WHERE sp.id = $1
    `, [id]);
    
    if (providerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }
    
    const provider = providerResult.rows[0];
    
    // Get services offered
    const servicesResult = await client.query(`
      SELECT s.id, s.name, s.category, s.description
      FROM provider_services ps
      JOIN services s ON ps.service_id = s.id
      WHERE ps.provider_id = $1
    `, [id]);
    
    provider.services = servicesResult.rows;
    
    // Get reviews
    const reviewsResult = await client.query(`
      SELECT 
        r.*, 
        u.first_name, u.last_name,
        sr.id as service_request_id,
        s.name as service_name
      FROM reviews r
      JOIN users u ON r.homeowner_user_id = u.id
      JOIN service_requests sr ON r.service_request_id = sr.id
      JOIN services s ON sr.service_id = s.id
      WHERE r.provider_id = $1
      ORDER BY r.created_at DESC
      LIMIT 10
    `, [id]);
    
    provider.reviews = reviewsResult.rows;
    
    // Get review statistics
    const reviewStatsResult = await client.query(`
      SELECT 
        COUNT(*) as total_reviews,
        ROUND(AVG(rating), 1) as average_rating,
        COUNT(*) FILTER (WHERE rating = 5) as five_star,
        COUNT(*) FILTER (WHERE rating = 4) as four_star,
        COUNT(*) FILTER (WHERE rating = 3) as three_star,
        COUNT(*) FILTER (WHERE rating = 2) as two_star,
        COUNT(*) FILTER (WHERE rating = 1) as one_star
      FROM reviews
      WHERE provider_id = $1
    `, [id]);
    
    provider.review_stats = reviewStatsResult.rows[0];
    
    // Get completed jobs count
    const jobsResult = await client.query(`
      SELECT COUNT(*) as completed_jobs
      FROM bids b
      JOIN service_requests sr ON b.service_request_id = sr.id
      WHERE b.provider_id = $1 AND b.status = 'accepted' AND sr.status = 'completed'
    `, [id]);
    
    provider.completed_jobs = parseInt(jobsResult.rows[0].completed_jobs);
    
    res.status(200).json({
      success: true,
      data: provider
    });
  } catch (error) {
    console.error('Error getting provider details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching provider details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create a new provider profile
 * @route POST /api/providers
 */
const createProvider = async (req, res) => {
  const { 
    company_name, 
    description, 
    website, 
    service_areas,
    years_of_experience,
    services
  } = req.body;
  const client = req.db;
  
  // Validate required fields
  if (!company_name) {
    return res.status(400).json({
      success: false,
      message: 'Company name is required'
    });
  }
  
  try {
    // Check if user already has a provider profile
    const existingProviderCheck = await client.query(
      'SELECT id FROM service_providers WHERE user_id = $1',
      [req.user.id]
    );
    
    if (existingProviderCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User already has a provider profile'
      });
    }
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Create provider profile
    const providerResult = await client.query(`
      INSERT INTO service_providers
        (user_id, company_name, description, website, service_areas, years_of_experience)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      req.user.id,
      company_name,
      description,
      website,
      service_areas || [],
      years_of_experience || 0
    ]);
    
    const providerId = providerResult.rows[0].id;
    
    // Add services if provided
    if (services && services.length > 0) {
      // Validate all services exist
      const serviceIds = services.map(s => s.id || s);
      const validServicesResult = await client.query(
        'SELECT id FROM services WHERE id = ANY($1::int[])',
        [serviceIds]
      );
      
      if (validServicesResult.rows.length !== serviceIds.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'One or more service IDs are invalid'
        });
      }
      
      // Add provider_services entries
      for (const serviceId of serviceIds) {
        await client.query(
          'INSERT INTO provider_services (provider_id, service_id) VALUES ($1, $2)',
          [providerId, serviceId]
        );
      }
    }
    
    // Update user role to include 'provider'
    const userRoleCheck = await client.query(
      'SELECT roles FROM users WHERE id = $1',
      [req.user.id]
    );
    
    const currentRoles = userRoleCheck.rows[0].roles || [];
    if (!currentRoles.includes('provider')) {
      const updatedRoles = [...currentRoles, 'provider'];
      await client.query(
        'UPDATE users SET roles = $1 WHERE id = $2',
        [updatedRoles, req.user.id]
      );
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    
    // Get the complete provider profile with user info
    const completeProviderResult = await client.query(`
      SELECT 
        sp.*,
        u.first_name, u.last_name, u.email, u.phone
      FROM service_providers sp
      JOIN users u ON sp.user_id = u.id
      WHERE sp.id = $1
    `, [providerId]);
    
    res.status(201).json({
      success: true,
      message: 'Provider profile created successfully',
      data: completeProviderResult.rows[0]
    });
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
    console.error('Error creating provider profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating provider profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update a provider profile
 * @route PUT /api/providers/:id
 */
const updateProvider = async (req, res) => {
  const { id } = req.params;
  const { 
    company_name, 
    description, 
    website, 
    service_areas,
    years_of_experience,
    services
  } = req.body;
  const client = req.db;
  
  try {
    // Check if provider exists and belongs to this user
    const providerCheck = await client.query(
      'SELECT * FROM service_providers WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    
    if (providerCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Provider profile not found or you are not authorized to update it'
      });
    }
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Update provider profile
    const providerResult = await client.query(`
      UPDATE service_providers
      SET 
        company_name = COALESCE($1, company_name),
        description = COALESCE($2, description),
        website = COALESCE($3, website),
        service_areas = COALESCE($4, service_areas),
        years_of_experience = COALESCE($5, years_of_experience),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `, [
      company_name,
      description,
      website,
      service_areas,
      years_of_experience,
      id
    ]);
    
    // Update services if provided
    if (services && services.length > 0) {
      // Validate all services exist
      const serviceIds = services.map(s => s.id || s);
      const validServicesResult = await client.query(
        'SELECT id FROM services WHERE id = ANY($1::int[])',
        [serviceIds]
      );
      
      if (validServicesResult.rows.length !== serviceIds.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'One or more service IDs are invalid'
        });
      }
      
      // Remove existing service associations
      await client.query(
        'DELETE FROM provider_services WHERE provider_id = $1',
        [id]
      );
      
      // Add provider_services entries
      for (const serviceId of serviceIds) {
        await client.query(
          'INSERT INTO provider_services (provider_id, service_id) VALUES ($1, $2)',
          [id, serviceId]
        );
      }
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    
    // Get services for the response
    const servicesResult = await client.query(`
      SELECT s.id, s.name, s.category
      FROM provider_services ps
      JOIN services s ON ps.service_id = s.id
      WHERE ps.provider_id = $1
    `, [id]);
    
    const updatedProvider = providerResult.rows[0];
    updatedProvider.services = servicesResult.rows;
    
    res.status(200).json({
      success: true,
      message: 'Provider profile updated successfully',
      data: updatedProvider
    });
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
    console.error('Error updating provider profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating provider profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get available service requests for a provider
 * @route GET /api/providers/service-requests/available
 */
const getAvailableServiceRequests = async (req, res) => {
  const { service_id, status } = req.query;
  const client = req.db;
  
  try {
    // Get provider ID and services
    const providerId = await getProviderIdFromUserId(client, req.user.id);
    
    if (!providerId) {
      return res.status(404).json({
        success: false,
        message: 'Provider profile not found'
      });
    }
    
    // Get services offered by this provider
    const providerServicesResult = await client.query(
      'SELECT service_id FROM provider_services WHERE provider_id = $1',
      [providerId]
    );
    
    const providerServiceIds = providerServicesResult.rows.map(row => row.service_id);
    
    if (providerServiceIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Provider does not offer any services yet',
        data: []
      });
    }
    
    // Base query
    let query = `
      SELECT 
        sr.*,
        s.name as service_name, s.category as service_category,
        p.address as property_address, p.city as property_city, 
        p.state as property_state, p.zip_code as property_zip_code,
        h.id as homeowner_id,
        u.first_name as homeowner_first_name, u.last_name as homeowner_last_name,
        CASE WHEN EXISTS (
          SELECT 1 FROM bids WHERE service_request_id = sr.id AND provider_id = $1
        ) THEN true ELSE false END as has_bid,
        (
          SELECT COUNT(*) FROM bids WHERE service_request_id = sr.id
        ) as bid_count
      FROM service_requests sr
      JOIN services s ON sr.service_id = s.id
      JOIN properties p ON sr.property_id = p.id
      JOIN homeowners h ON sr.homeowner_id = h.id
      JOIN users u ON h.user_id = u.id
      WHERE sr.status IN ('pending', 'bidding')
      AND sr.service_id = ANY($2::int[])
      AND NOT EXISTS (
        SELECT 1 FROM bids 
        WHERE service_request_id = sr.id 
        AND provider_id = $1 
        AND status = 'accepted'
      )
    `;
    
    const queryParams = [providerId, providerServiceIds];
    let paramIndex = 3;
    
    // Filter by specific service if provided
    if (service_id) {
      query += ` AND sr.service_id = $${paramIndex}`;
      queryParams.push(service_id);
      paramIndex++;
    }
    
    // Filter by specific status if provided
    if (status && ['pending', 'bidding'].includes(status)) {
      query += ` AND sr.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }
    
    // Order by created_at (newest first)
    query += ` ORDER BY sr.created_at DESC`;
    
    const result = await client.query(query, queryParams);
    
    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting available service requests:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available service requests',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get jobs assigned to a provider
 * @route GET /api/providers/jobs
 */
const getProviderJobs = async (req, res) => {
  const { status } = req.query;
  const client = req.db;
  
  try {
    // Get provider ID
    const providerId = await getProviderIdFromUserId(client, req.user.id);
    
    if (!providerId) {
      return res.status(404).json({
        success: false,
        message: 'Provider profile not found'
      });
    }
    
    // Base query
    let query = `
      SELECT 
        sr.*,
        s.name as service_name, s.category as service_category,
        p.address as property_address, p.city as property_city, 
        p.state as property_state, p.zip_code as property_zip_code,
        h.id as homeowner_id,
        u.first_name as homeowner_first_name, u.last_name as homeowner_last_name,
        u.phone as homeowner_phone,
        b.price as agreed_price, b.estimated_hours
      FROM service_requests sr
      JOIN services s ON sr.service_id = s.id
      JOIN properties p ON sr.property_id = p.id
      JOIN homeowners h ON sr.homeowner_id = h.id
      JOIN users u ON h.user_id = u.id
      JOIN bids b ON sr.id = b.service_request_id
      WHERE b.provider_id = $1
      AND b.status = 'accepted'
    `;
    
    const queryParams = [providerId];
    let paramIndex = 2;
    
    // Filter by specific status if provided
    if (status) {
      query += ` AND sr.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    } else {
      // By default, show active jobs (scheduled or in_progress)
      query += ` AND sr.status IN ('scheduled', 'in_progress')`;
    }
    
    // Order by status priority then by date
    query += `
      ORDER BY 
        CASE sr.status
          WHEN 'scheduled' THEN 1
          WHEN 'in_progress' THEN 2
          WHEN 'completed' THEN 3
          WHEN 'cancelled' THEN 4
          ELSE 5
        END,
        sr.preferred_date ASC
    `;
    
    const result = await client.query(query, queryParams);
    
    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting provider jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching provider jobs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Helper function to get provider ID from user ID
 */
const getProviderIdFromUserId = async (client, userId) => {
  const result = await client.query(
    'SELECT id FROM service_providers WHERE user_id = $1',
    [userId]
  );
  
  return result.rows.length > 0 ? result.rows[0].id : null;
};

module.exports = {
  getAllProviders,
  getProviderById,
  createProvider,
  updateProvider,
  getAvailableServiceRequests,
  getProviderJobs
}; 