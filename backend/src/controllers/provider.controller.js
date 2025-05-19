/**
 * Provider Controller
 * Handles all operations related to service providers
 */
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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
    
    // Get Stripe Connect account status if available
    if (provider.stripe_connect_account_id) {
      try {
        const connectAccount = await stripe.accounts.retrieve(provider.stripe_connect_account_id);
        
        provider.connect_account_status = {
          charges_enabled: connectAccount.charges_enabled,
          payouts_enabled: connectAccount.payouts_enabled,
          details_submitted: connectAccount.details_submitted,
          capabilities: connectAccount.capabilities,
          requirements: connectAccount.requirements
        };
      } catch (stripeError) {
        console.error('Error fetching Stripe Connect account:', stripeError);
        provider.connect_account_status = { error: 'Unable to fetch Connect account status' };
      }
    } else {
      provider.connect_account_status = { status: 'not_connected' };
    }
    
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
 * Create a Stripe Connect account for a provider
 * @route POST /api/providers/connect/account
 */
const createConnectAccount = async (req, res) => {
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
    
    // Get provider details
    const providerResult = await client.query(
      'SELECT * FROM service_providers WHERE id = $1',
      [providerId]
    );
    
    const provider = providerResult.rows[0];
    
    // Check if provider already has a Connect account
    if (provider.stripe_connect_account_id) {
      return res.status(400).json({
        success: false,
        message: 'Provider already has a Stripe Connect account'
      });
    }
    
    // Get user details for the provider
    const userResult = await client.query(
      'SELECT * FROM users WHERE id = $1',
      [req.user.id]
    );
    
    const user = userResult.rows[0];
    
    // Create a Stripe Connect account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: user.email,
      business_type: 'individual',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      },
      business_profile: {
        mcc: '1520', // General Contractors
        url: provider.website || `https://homehub.com/providers/${providerId}`
      },
      metadata: {
        provider_id: providerId
      }
    });
    
    // Update provider record with Connect account ID
    await client.query(
      'UPDATE service_providers SET stripe_connect_account_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [account.id, providerId]
    );
    
    res.status(201).json({
      success: true,
      message: 'Stripe Connect account created successfully',
      data: {
        account_id: account.id
      }
    });
  } catch (error) {
    console.error('Error creating Stripe Connect account:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating Stripe Connect account',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get the status of a provider's Connect account
 * @route GET /api/providers/connect/account/status
 */
const getConnectAccountStatus = async (req, res) => {
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
    
    // Get provider details
    const providerResult = await client.query(
      'SELECT * FROM service_providers WHERE id = $1',
      [providerId]
    );
    
    const provider = providerResult.rows[0];
    
    // Check if provider has a Connect account
    if (!provider.stripe_connect_account_id) {
      return res.status(404).json({
        success: false,
        message: 'Provider does not have a Stripe Connect account',
        data: {
          status: 'not_connected'
        }
      });
    }
    
    // Retrieve the Connect account from Stripe
    const account = await stripe.accounts.retrieve(provider.stripe_connect_account_id);
    
    // Determine account status
    let status = 'pending';
    if (account.charges_enabled && account.payouts_enabled) {
      status = 'active';
    } else if (account.requirements && account.requirements.currently_due && account.requirements.currently_due.length > 0) {
      status = 'incomplete';
    } else if (account.requirements && account.requirements.disabled_reason) {
      status = 'restricted';
    }
    
    res.status(200).json({
      success: true,
      data: {
        account_id: account.id,
        status,
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        requirements: account.requirements,
        capabilities: account.capabilities
      }
    });
  } catch (error) {
    console.error('Error getting Connect account status:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching Connect account status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Generate an onboarding link for a provider
 * @route POST /api/providers/connect/account/onboard
 */
const createAccountLink = async (req, res) => {
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
    
    // Get provider details
    const providerResult = await client.query(
      'SELECT * FROM service_providers WHERE id = $1',
      [providerId]
    );
    
    const provider = providerResult.rows[0];
    
    // Check if provider has a Connect account
    if (!provider.stripe_connect_account_id) {
      return res.status(404).json({
        success: false,
        message: 'Provider does not have a Stripe Connect account'
      });
    }
    
    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: provider.stripe_connect_account_id,
      refresh_url: `${process.env.FRONTEND_URL}/dashboard/provider/connect/refresh`,
      return_url: `${process.env.FRONTEND_URL}/dashboard/provider/connect/complete`,
      type: 'account_onboarding',
      collect: 'eventually_due'
    });
    
    res.status(200).json({
      success: true,
      data: {
        url: accountLink.url
      }
    });
  } catch (error) {
    console.error('Error creating account link:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating account link',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get a provider's banking information
 * @route GET /api/providers/connect/banking
 */
const getBankingInformation = async (req, res) => {
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
    
    // Get provider details
    const providerResult = await client.query(
      'SELECT * FROM service_providers WHERE id = $1',
      [providerId]
    );
    
    const provider = providerResult.rows[0];
    
    // Check if provider has a Connect account
    if (!provider.stripe_connect_account_id) {
      return res.status(404).json({
        success: false,
        message: 'Provider does not have a Stripe Connect account'
      });
    }
    
    // Retrieve the Connect account from Stripe
    const account = await stripe.accounts.retrieve(provider.stripe_connect_account_id);
    
    // Get external accounts (bank accounts)
    const externalAccounts = await stripe.accounts.listExternalAccounts(
      provider.stripe_connect_account_id,
      { object: 'bank_account', limit: 10 }
    );
    
    // Format the response
    const bankingInfo = {
      external_accounts: externalAccounts.data.map(account => ({
        id: account.id,
        bank_name: account.bank_name,
        last4: account.last4,
        routing_number: account.routing_number,
        account_holder_name: account.account_holder_name,
        account_holder_type: account.account_holder_type,
        currency: account.currency,
        country: account.country,
        default_for_currency: account.default_for_currency
      })),
      has_external_account: externalAccounts.data.length > 0
    };
    
    res.status(200).json({
      success: true,
      data: bankingInfo
    });
  } catch (error) {
    console.error('Error getting banking information:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching banking information',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update a provider's banking information
 * @route PUT /api/providers/connect/banking
 */
const updateBankingInformation = async (req, res) => {
  const { external_account, default_for_currency } = req.body;
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
    
    // Get provider details
    const providerResult = await client.query(
      'SELECT * FROM service_providers WHERE id = $1',
      [providerId]
    );
    
    const provider = providerResult.rows[0];
    
    // Check if provider has a Connect account
    if (!provider.stripe_connect_account_id) {
      return res.status(404).json({
        success: false,
        message: 'Provider does not have a Stripe Connect account'
      });
    }
    
    // If external_account is provided, create or update bank account
    if (external_account) {
      // Create a new external account
      const bankAccount = await stripe.accounts.createExternalAccount(
        provider.stripe_connect_account_id,
        { external_account }
      );
      
      // If default_for_currency is true, set as default
      if (default_for_currency) {
        await stripe.accounts.updateExternalAccount(
          provider.stripe_connect_account_id,
          bankAccount.id,
          { default_for_currency: true }
        );
      }
      
      res.status(200).json({
        success: true,
        message: 'Banking information updated successfully',
        data: {
          id: bankAccount.id,
          bank_name: bankAccount.bank_name,
          last4: bankAccount.last4,
          routing_number: bankAccount.routing_number,
          account_holder_name: bankAccount.account_holder_name,
          account_holder_type: bankAccount.account_holder_type,
          currency: bankAccount.currency,
          country: bankAccount.country,
          default_for_currency: bankAccount.default_for_currency || default_for_currency
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'External account information is required'
      });
    }
  } catch (error) {
    console.error('Error updating banking information:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating banking information',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get a provider's payout preferences
 * @route GET /api/providers/connect/payout-preferences
 */
const getPayoutPreferences = async (req, res) => {
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
    
    // Get provider details
    const providerResult = await client.query(
      'SELECT * FROM service_providers WHERE id = $1',
      [providerId]
    );
    
    const provider = providerResult.rows[0];
    
    // Check if provider has a Connect account
    if (!provider.stripe_connect_account_id) {
      return res.status(404).json({
        success: false,
        message: 'Provider does not have a Stripe Connect account'
      });
    }
    
    // Retrieve the Connect account from Stripe
    const account = await stripe.accounts.retrieve(provider.stripe_connect_account_id);
    
    // Format the response
    const payoutPreferences = {
      payout_schedule: account.settings?.payouts?.schedule || {
        interval: 'standard',
        weekly_anchor: null,
        monthly_anchor: null
      },
      statement_descriptor: account.settings?.payments?.statement_descriptor || null,
      default_currency: account.default_currency || 'usd'
    };
    
    res.status(200).json({
      success: true,
      data: payoutPreferences
    });
  } catch (error) {
    console.error('Error getting payout preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payout preferences',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update a provider's payout preferences
 * @route PUT /api/providers/connect/payout-preferences
 */
const updatePayoutPreferences = async (req, res) => {
  const { payout_schedule, statement_descriptor } = req.body;
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
    
    // Get provider details
    const providerResult = await client.query(
      'SELECT * FROM service_providers WHERE id = $1',
      [providerId]
    );
    
    const provider = providerResult.rows[0];
    
    // Check if provider has a Connect account
    if (!provider.stripe_connect_account_id) {
      return res.status(404).json({
        success: false,
        message: 'Provider does not have a Stripe Connect account'
      });
    }
    
    // Prepare update parameters
    const updateParams = {};
    
    if (payout_schedule) {
      updateParams['settings[payouts][schedule][interval]'] = payout_schedule.interval;
      
      if (payout_schedule.interval === 'weekly' && payout_schedule.weekly_anchor) {
        updateParams['settings[payouts][schedule][weekly_anchor]'] = payout_schedule.weekly_anchor;
      } else if (payout_schedule.interval === 'monthly' && payout_schedule.monthly_anchor) {
        updateParams['settings[payouts][schedule][monthly_anchor]'] = payout_schedule.monthly_anchor;
      }
    }
    
    if (statement_descriptor) {
      updateParams['settings[payments][statement_descriptor]'] = statement_descriptor;
    }
    
    // Update the Connect account
    const updatedAccount = await stripe.accounts.update(
      provider.stripe_connect_account_id,
      updateParams
    );
    
    // Format the response
    const updatedPreferences = {
      payout_schedule: updatedAccount.settings?.payouts?.schedule || {
        interval: 'standard',
        weekly_anchor: null,
        monthly_anchor: null
      },
      statement_descriptor: updatedAccount.settings?.payments?.statement_descriptor || null,
      default_currency: updatedAccount.default_currency || 'usd'
    };
    
    res.status(200).json({
      success: true,
      message: 'Payout preferences updated successfully',
      data: updatedPreferences
    });
  } catch (error) {
    console.error('Error updating payout preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating payout preferences',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get a provider's verification status
 * @route GET /api/providers/connect/verification-status
 */
const getVerificationStatus = async (req, res) => {
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
    
    // Get provider details
    const providerResult = await client.query(
      'SELECT * FROM service_providers WHERE id = $1',
      [providerId]
    );
    
    const provider = providerResult.rows[0];
    
    // Check if provider has a Connect account
    if (!provider.stripe_connect_account_id) {
      return res.status(404).json({
        success: false,
        message: 'Provider does not have a Stripe Connect account'
      });
    }
    
    // Retrieve the Connect account from Stripe
    const account = await stripe.accounts.retrieve(provider.stripe_connect_account_id);
    
    // Format the verification status
    const verificationStatus = {
      details_submitted: account.details_submitted,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      requirements: account.requirements,
      verification: account.individual?.verification || null
    };
    
    res.status(200).json({
      success: true,
      data: verificationStatus
    });
  } catch (error) {
    console.error('Error getting verification status:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching verification status',
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
  getProviderJobs,
  createConnectAccount,
  getConnectAccountStatus,
  createAccountLink,
  getBankingInformation,
  updateBankingInformation,
  getPayoutPreferences,
  updatePayoutPreferences,
  getVerificationStatus
};