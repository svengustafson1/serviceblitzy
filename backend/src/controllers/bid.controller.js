/**
 * Bid Controller
 * Handles all operations related to service request bids
 * Includes AI recommendation integration for bid analysis and scoring
 */

// Import notification helper functions
const { createServiceRequestNotification } = require('./notification.controller');

// Import AI recommendation service
const aiRecommendationService = require('../services/ai-recommendation.service');

/**
 * Get all bids placed by a provider
 * @route GET /api/bids
 */
const getProviderBids = async (req, res) => {
  const { status } = req.query;
  const client = req.db;
  
  try {
    // Get provider ID from user ID
    const providerId = await getProviderIdFromUserId(client, req.user.id);
    
    if (!providerId) {
      return res.status(404).json({
        success: false,
        message: 'Provider profile not found'
      });
    }
    
    // Base query
    let query = `
      SELECT b.*, 
        sr.description as request_description, sr.status as request_status,
        s.name as service_name, s.category as service_category,
        p.address as property_address, p.city as property_city, p.state as property_state,
        b.ai_recommended, b.recommendation_score, b.recommendation_confidence
      FROM bids b
      JOIN service_requests sr ON b.service_request_id = sr.id
      JOIN services s ON sr.service_id = s.id
      JOIN properties p ON sr.property_id = p.id
      WHERE b.provider_id = $1
    `;
    
    const queryParams = [providerId];
    let paramIndex = 2;
    
    // Filter by status if provided
    if (status) {
      query += ` AND b.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }
    
    // Order by created_at (newest first)
    query += ` ORDER BY b.created_at DESC`;
    
    const result = await client.query(query, queryParams);
    
    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting provider bids:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bids',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all bids received by a homeowner
 * @route GET /api/bids/received
 */
const getHomeownerReceivedBids = async (req, res) => {
  const { status, service_request_id, sort_by = 'price', recommended_only = 'false' } = req.query;
  const client = req.db;
  
  try {
    // Get homeowner ID from user ID
    const homeownerResult = await client.query(
      'SELECT id FROM homeowners WHERE user_id = $1',
      [req.user.id]
    );
    
    if (homeownerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Homeowner profile not found'
      });
    }
    
    const homeownerId = homeownerResult.rows[0].id;
    
    // Base query
    let query = `
      SELECT b.*, 
        sr.description as request_description, sr.status as request_status,
        s.name as service_name, s.category as service_category,
        p.address as property_address,
        sp.company_name, sp.avg_rating,
        u.first_name as provider_first_name, u.last_name as provider_last_name,
        b.ai_recommended, b.recommendation_score, b.recommendation_confidence
      FROM bids b
      JOIN service_requests sr ON b.service_request_id = sr.id
      JOIN services s ON sr.service_id = s.id
      JOIN properties p ON sr.property_id = p.id
      JOIN service_providers sp ON b.provider_id = sp.id
      JOIN users u ON sp.user_id = u.id
      WHERE sr.homeowner_id = $1
    `;
    
    const queryParams = [homeownerId];
    let paramIndex = 2;
    
    // Filter by status if provided
    if (status) {
      query += ` AND b.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }
    
    // Filter by service_request_id if provided
    if (service_request_id) {
      query += ` AND b.service_request_id = $${paramIndex}`;
      queryParams.push(service_request_id);
      paramIndex++;
    }
    
    // Filter by recommendation if requested
    if (recommended_only === 'true') {
      query += ` AND b.ai_recommended = TRUE`;
    }
    
    // Order by selected sort criteria
    switch (sort_by) {
      case 'recommendation':
        query += ` ORDER BY b.recommendation_score DESC NULLS LAST, b.price ASC`;
        break;
      case 'rating':
        query += ` ORDER BY sp.avg_rating DESC NULLS LAST, b.price ASC`;
        break;
      case 'price_desc':
        query += ` ORDER BY b.price DESC`;
        break;
      case 'newest':
        query += ` ORDER BY b.created_at DESC`;
        break;
      case 'price':
      default:
        query += ` ORDER BY b.price ASC, b.created_at DESC`;
        break;
    }
    
    const result = await client.query(query, queryParams);
    
    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
      sort_by: sort_by,
      has_recommendations: result.rows.some(bid => bid.recommendation_score !== null)
    });
  } catch (error) {
    console.error('Error getting received bids:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching received bids',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get a bid by ID
 * @route GET /api/bids/:id
 */
const getBidById = async (req, res) => {
  const { id } = req.params;
  const client = req.db;
  
  try {
    // Get the bid with related information
    const bidResult = await client.query(`
      SELECT b.*, 
        sr.description as request_description, sr.status as request_status, sr.preferred_date,
        sr.homeowner_id, sr.is_recurring, sr.recurrence_frequency,
        s.name as service_name, s.category as service_category,
        p.address as property_address, p.city as property_city, 
        p.state as property_state, p.zip_code as property_zip_code,
        sp.company_name, sp.avg_rating, sp.user_id as provider_user_id,
        h.user_id as homeowner_user_id,
        b.ai_recommended, b.recommendation_score, b.recommendation_confidence
      FROM bids b
      JOIN service_requests sr ON b.service_request_id = sr.id
      JOIN services s ON sr.service_id = s.id
      JOIN properties p ON sr.property_id = p.id
      JOIN service_providers sp ON b.provider_id = sp.id
      JOIN homeowners h ON sr.homeowner_id = h.id
      WHERE b.id = $1
    `, [id]);
    
    if (bidResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Bid not found'
      });
    }
    
    const bid = bidResult.rows[0];
    
    // Check authorization
    if (req.user.role === 'homeowner' && req.user.id !== parseInt(bid.homeowner_user_id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this bid'
      });
    }
    
    if (req.user.role === 'provider' && req.user.id !== parseInt(bid.provider_user_id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this bid'
      });
    }
    
    // Get provider details
    const providerResult = await client.query(`
      SELECT u.first_name, u.last_name, u.email, u.phone, 
        sp.company_name, sp.description as company_description, sp.avg_rating
      FROM users u
      JOIN service_providers sp ON u.id = sp.user_id
      WHERE sp.user_id = $1
    `, [bid.provider_user_id]);
    
    if (providerResult.rows.length > 0) {
      bid.provider = providerResult.rows[0];
    }
    
    // Get homeowner details
    const homeownerResult = await client.query(`
      SELECT u.first_name, u.last_name, u.email, u.phone
      FROM users u
      JOIN homeowners h ON u.id = h.user_id
      WHERE h.user_id = $1
    `, [bid.homeowner_user_id]);
    
    if (homeownerResult.rows.length > 0) {
      bid.homeowner = homeownerResult.rows[0];
    }
    
    res.status(200).json({
      success: true,
      data: bid
    });
  } catch (error) {
    console.error('Error getting bid:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bid',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update a bid 
 * @route PUT /api/bids/:id
 */
const updateBid = async (req, res) => {
  const { id } = req.params;
  const { price, estimated_hours, description } = req.body;
  const client = req.db;
  
  try {
    // Check if bid exists and belongs to this provider
    const providerId = await getProviderIdFromUserId(client, req.user.id);
    
    if (!providerId) {
      return res.status(404).json({
        success: false,
        message: 'Provider profile not found'
      });
    }
    
    const bidCheck = await client.query(`
      SELECT b.*, sr.status as request_status 
      FROM bids b
      JOIN service_requests sr ON b.service_request_id = sr.id
      WHERE b.id = $1 AND b.provider_id = $2
    `, [id, providerId]);
    
    if (bidCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Bid not found or you are not authorized to update it'
      });
    }
    
    const bid = bidCheck.rows[0];
    
    // Can only update if bid status is 'pending' and service request is in 'pending' or 'bidding'
    if (bid.status !== 'pending' || !['pending', 'bidding'].includes(bid.request_status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot update a bid with status '${bid.status}' or for a service request with status '${bid.request_status}'`
      });
    }
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Update the bid
    const result = await client.query(`
      UPDATE bids
      SET 
        price = COALESCE($1, price),
        estimated_hours = COALESCE($2, estimated_hours),
        description = COALESCE($3, description),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [price, estimated_hours, description, id]);
    
    const updatedBid = result.rows[0];
    
    // Get service request and provider details for AI recommendation
    const serviceRequestResult = await client.query(`
      SELECT sr.*, s.name as service_name, s.category as service_category
      FROM service_requests sr
      JOIN services s ON sr.service_id = s.id
      WHERE sr.id = $1
    `, [updatedBid.service_request_id]);
    
    const providerResult = await client.query(`
      SELECT sp.*, u.first_name, u.last_name
      FROM service_providers sp
      JOIN users u ON sp.user_id = u.id
      WHERE sp.id = $1
    `, [providerId]);
    
    // Get other bids for this service request for comparison
    const otherBidsResult = await client.query(`
      SELECT * FROM bids WHERE service_request_id = $1 AND id != $2
    `, [updatedBid.service_request_id, id]);
    
    // Generate AI recommendation for the updated bid
    try {
      const recommendation = await aiRecommendationService.generateRecommendation(
        updatedBid,
        serviceRequestResult.rows[0],
        providerResult.rows[0],
        otherBidsResult.rows
      );
      
      // Update bid with recommendation data
      await client.query(`
        UPDATE bids
        SET 
          ai_recommended = $1,
          recommendation_score = $2,
          recommendation_confidence = $3
        WHERE id = $4
      `, [
        recommendation.score > 0.7, // Flag as recommended if score is high
        recommendation.score,
        recommendation.confidence,
        id
      ]);
      
      // Add recommendation data to the response
      updatedBid.ai_recommended = recommendation.score > 0.7;
      updatedBid.recommendation_score = recommendation.score;
      updatedBid.recommendation_confidence = recommendation.confidence;
      updatedBid.recommendation_explanation = recommendation.explanation;
    } catch (aiError) {
      console.error('Error generating AI recommendation for updated bid:', aiError);
      // Continue without recommendation data if AI service fails
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    
    res.status(200).json({
      success: true,
      message: 'Bid updated successfully',
      data: updatedBid
    });
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
    console.error('Error updating bid:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating bid',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete a bid
 * @route DELETE /api/bids/:id
 */
const deleteBid = async (req, res) => {
  const { id } = req.params;
  const client = req.db;
  
  try {
    // Check if bid exists and belongs to this provider
    const providerId = await getProviderIdFromUserId(client, req.user.id);
    
    if (!providerId) {
      return res.status(404).json({
        success: false,
        message: 'Provider profile not found'
      });
    }
    
    const bidCheck = await client.query(`
      SELECT b.*, sr.status as request_status 
      FROM bids b
      JOIN service_requests sr ON b.service_request_id = sr.id
      WHERE b.id = $1 AND b.provider_id = $2
    `, [id, providerId]);
    
    if (bidCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Bid not found or you are not authorized to delete it'
      });
    }
    
    const bid = bidCheck.rows[0];
    
    // Can only delete if bid status is 'pending' and service request is in 'pending' or 'bidding'
    if (bid.status !== 'pending' || !['pending', 'bidding'].includes(bid.request_status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete a bid with status '${bid.status}' or for a service request with status '${bid.request_status}'`
      });
    }
    
    // Delete the bid
    await client.query('DELETE FROM bids WHERE id = $1', [id]);
    
    // If this was the only bid for this service request and the request is in 'bidding' status,
    // revert the request back to 'pending' status
    const remainingBidsCheck = await client.query(
      'SELECT COUNT(*) FROM bids WHERE service_request_id = $1',
      [bid.service_request_id]
    );
    
    const remainingBidsCount = parseInt(remainingBidsCheck.rows[0].count);
    
    if (remainingBidsCount === 0 && bid.request_status === 'bidding') {
      await client.query(`
        UPDATE service_requests
        SET status = 'pending', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [bid.service_request_id]);
    }
    
    res.status(200).json({
      success: true,
      message: 'Bid deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting bid:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting bid',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Submit a bid for a service request
 * @route POST /api/service-requests/:id/bids
 */
const submitBid = async (req, res) => {
  const { id } = req.params;
  const { price, estimated_hours, description } = req.body;
  const client = req.db;
  
  // Validate required fields
  if (!price) {
    return res.status(400).json({
      success: false,
      message: 'Price is required'
    });
  }
  
  try {
    // Check if service request exists and is in bidding status
    const serviceRequestCheck = await client.query(`
      SELECT sr.*, h.user_id as homeowner_user_id, s.name as service_name, s.category as service_category
      FROM service_requests sr
      JOIN homeowners h ON sr.homeowner_id = h.id
      JOIN services s ON sr.service_id = s.id
      WHERE sr.id = $1
    `, [id]);
    
    if (serviceRequestCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }
    
    const serviceRequest = serviceRequestCheck.rows[0];
    
    // Check if request is in a valid state for bidding
    if (!['pending', 'bidding'].includes(serviceRequest.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot submit a bid for a service request with status '${serviceRequest.status}'`
      });
    }
    
    // Get provider ID from user ID
    const providerId = await getProviderIdFromUserId(client, req.user.id);
    
    if (!providerId) {
      return res.status(404).json({
        success: false,
        message: 'Provider profile not found'
      });
    }
    
    // Get provider details for AI recommendation
    const providerResult = await client.query(`
      SELECT sp.*, u.first_name, u.last_name
      FROM service_providers sp
      JOIN users u ON sp.user_id = u.id
      WHERE sp.id = $1
    `, [providerId]);
    
    const provider = providerResult.rows[0];
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Check if provider has already submitted a bid
    const existingBidCheck = await client.query(
      'SELECT id FROM bids WHERE service_request_id = $1 AND provider_id = $2',
      [id, providerId]
    );
    
    let result;
    let isNewBid = false;
    
    if (existingBidCheck.rows.length > 0) {
      // Update existing bid
      result = await client.query(`
        UPDATE bids
        SET 
          price = $1,
          estimated_hours = $2,
          description = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE service_request_id = $4 AND provider_id = $5
        RETURNING *
      `, [price, estimated_hours, description, id, providerId]);
    } else {
      // Create new bid
      result = await client.query(`
        INSERT INTO bids
          (service_request_id, provider_id, price, estimated_hours, description, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [id, providerId, price, estimated_hours, description, 'pending']);
      
      isNewBid = true;
    }
    
    const bid = result.rows[0];
    
    // Get other bids for this service request for comparison
    const otherBidsResult = await client.query(`
      SELECT * FROM bids WHERE service_request_id = $1 AND id != $2
    `, [id, bid.id]);
    
    // Generate AI recommendation for the bid
    try {
      const recommendation = await aiRecommendationService.generateRecommendation(
        bid,
        serviceRequest,
        provider,
        otherBidsResult.rows
      );
      
      // Update bid with recommendation data
      await client.query(`
        UPDATE bids
        SET 
          ai_recommended = $1,
          recommendation_score = $2,
          recommendation_confidence = $3
        WHERE id = $4
      `, [
        recommendation.score > 0.7, // Flag as recommended if score is high
        recommendation.score,
        recommendation.confidence,
        bid.id
      ]);
      
      // Add recommendation data to the response
      bid.ai_recommended = recommendation.score > 0.7;
      bid.recommendation_score = recommendation.score;
      bid.recommendation_confidence = recommendation.confidence;
      bid.recommendation_explanation = recommendation.explanation;
    } catch (aiError) {
      console.error('Error generating AI recommendation:', aiError);
      // Continue without recommendation data if AI service fails
    }
    
    // If service request is still in 'pending' status, update it to 'bidding'
    if (serviceRequest.status === 'pending') {
      await client.query(`
        UPDATE service_requests
        SET status = 'bidding', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [id]);
    }
    
    // Create notification for the homeowner
    if (isNewBid) {
      await createServiceRequestNotification(
        client,
        id,
        serviceRequest.homeowner_user_id,
        'new_bid'
      );
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    
    res.status(isNewBid ? 201 : 200).json({
      success: true,
      message: isNewBid ? 'Bid submitted successfully' : 'Bid updated successfully',
      data: bid
    });
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
    console.error('Error submitting bid:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting bid',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Accept a bid (homeowner only)
 * @route PATCH /api/bids/:id/accept
 */
const acceptBid = async (req, res) => {
  const { id } = req.params;
  const client = req.db;
  
  try {
    // Get homeowner ID from user ID
    const homeownerResult = await client.query(
      'SELECT id FROM homeowners WHERE user_id = $1',
      [req.user.id]
    );
    
    if (homeownerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Homeowner profile not found'
      });
    }
    
    const homeownerId = homeownerResult.rows[0].id;
    
    // Check if bid exists and belongs to a service request owned by this homeowner
    const bidCheck = await client.query(`
      SELECT 
        b.*, 
        sr.status as request_status, 
        sr.id as service_request_id,
        sp.user_id as provider_user_id
      FROM bids b
      JOIN service_requests sr ON b.service_request_id = sr.id
      JOIN service_providers sp ON b.provider_id = sp.id
      WHERE b.id = $1 AND sr.homeowner_id = $2
    `, [id, homeownerId]);
    
    if (bidCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Bid not found or you are not authorized to accept it'
      });
    }
    
    const bid = bidCheck.rows[0];
    
    // Can only accept if bid status is 'pending' and service request is in 'bidding'
    if (bid.status !== 'pending' || bid.request_status !== 'bidding') {
      return res.status(400).json({
        success: false,
        message: `Cannot accept a bid with status '${bid.status}' or for a service request with status '${bid.request_status}'`
      });
    }
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Update the bid to accepted
    await client.query(`
      UPDATE bids
      SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id]);
    
    // Update all other bids for this service request to rejected
    await client.query(`
      UPDATE bids
      SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
      WHERE service_request_id = $1 AND id != $2
    `, [bid.service_request_id, id]);
    
    // Update the service request status to 'scheduled'
    await client.query(`
      UPDATE service_requests
      SET status = 'scheduled', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [bid.service_request_id]);
    
    // Create notification for the provider
    await createServiceRequestNotification(
      client,
      bid.service_request_id,
      bid.provider_user_id,
      'bid_accepted'
    );
    
    // Create notification for the homeowner
    await createServiceRequestNotification(
      client,
      bid.service_request_id,
      req.user.id,
      'status_changed'
    );
    
    // Commit the transaction
    await client.query('COMMIT');
    
    res.status(200).json({
      success: true,
      message: 'Bid accepted successfully'
    });
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
    console.error('Error accepting bid:', error);
    res.status(500).json({
      success: false,
      message: 'Error accepting bid',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get AI recommendations for bids on a service request
 * @route GET /api/service-requests/:id/recommendations
 */
const getRecommendationsForServiceRequest = async (req, res) => {
  const { id } = req.params;
  const client = req.db;
  
  try {
    // Get homeowner ID from user ID
    const homeownerResult = await client.query(
      'SELECT id FROM homeowners WHERE user_id = $1',
      [req.user.id]
    );
    
    if (homeownerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Homeowner profile not found'
      });
    }
    
    const homeownerId = homeownerResult.rows[0].id;
    
    // Check if service request exists and belongs to this homeowner
    const serviceRequestCheck = await client.query(`
      SELECT sr.*, s.name as service_name, s.category as service_category
      FROM service_requests sr
      JOIN services s ON sr.service_id = s.id
      WHERE sr.id = $1 AND sr.homeowner_id = $2
    `, [id, homeownerId]);
    
    if (serviceRequestCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found or you are not authorized to access it'
      });
    }
    
    const serviceRequest = serviceRequestCheck.rows[0];
    
    // Get all bids for this service request
    const bidsResult = await client.query(`
      SELECT b.*, sp.company_name, sp.avg_rating, sp.description as provider_description,
        u.first_name as provider_first_name, u.last_name as provider_last_name
      FROM bids b
      JOIN service_providers sp ON b.provider_id = sp.id
      JOIN users u ON sp.user_id = u.id
      WHERE b.service_request_id = $1
    `, [id]);
    
    if (bidsResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No bids found for this service request'
      });
    }
    
    const bids = bidsResult.rows;
    
    // Create a map of providers by provider_id
    const providers = {};
    for (const bid of bids) {
      providers[bid.provider_id] = {
        id: bid.provider_id,
        company_name: bid.company_name,
        avg_rating: bid.avg_rating,
        description: bid.provider_description,
        first_name: bid.provider_first_name,
        last_name: bid.provider_last_name
      };
      
      // Remove provider fields from bid object to avoid duplication
      delete bid.company_name;
      delete bid.avg_rating;
      delete bid.provider_description;
      delete bid.provider_first_name;
      delete bid.provider_last_name;
    }
    
    // Check if bids already have recommendation data
    const hasRecommendations = bids.some(bid => bid.recommendation_score !== null);
    
    // If recommendations don't exist or need to be refreshed, generate them
    if (!hasRecommendations) {
      try {
        // Get AI recommendation service monitoring stats
        const monitoringStats = aiRecommendationService.getMonitoringStats();
        
        // Check if AI service is available
        if (monitoringStats.state === 'open') {
          // Circuit is open, use deterministic ranking
          console.log('AI recommendation circuit is open, using deterministic ranking');
          
          // Process bids with deterministic ranking
          for (const bid of bids) {
            const provider = providers[bid.provider_id];
            const recommendation = aiRecommendationService._internal.deterministicRanking(
              bid,
              provider,
              bids.filter(b => b.id !== bid.id)
            );
            
            // Update bid with recommendation data
            await client.query(`
              UPDATE bids
              SET 
                ai_recommended = $1,
                recommendation_score = $2,
                recommendation_confidence = $3
              WHERE id = $4
            `, [
              recommendation.score > 0.7,
              recommendation.score,
              recommendation.confidence,
              bid.id
            ]);
            
            // Update bid object with recommendation data
            bid.ai_recommended = recommendation.score > 0.7;
            bid.recommendation_score = recommendation.score;
            bid.recommendation_confidence = recommendation.confidence;
            bid.recommendation_explanation = recommendation.explanation;
            bid.is_fallback_recommendation = true;
          }
        } else {
          // Circuit is closed or half-open, use AI recommendation service
          const processedBids = await aiRecommendationService.batchProcessBids(
            bids,
            serviceRequest,
            providers
          );
          
          // Update bids with recommendation data
          for (const bid of processedBids) {
            if (bid.recommendation_score !== undefined) {
              await client.query(`
                UPDATE bids
                SET 
                  ai_recommended = $1,
                  recommendation_score = $2,
                  recommendation_confidence = $3
                WHERE id = $4
              `, [
                bid.ai_recommended,
                bid.recommendation_score,
                bid.recommendation_confidence,
                bid.id
              ]);
            }
          }
          
          // Replace bids array with processed bids
          bids.length = 0;
          bids.push(...processedBids);
        }
      } catch (aiError) {
        console.error('Error generating AI recommendations:', aiError);
        // Continue with existing data if AI service fails
      }
    }
    
    // Sort bids by recommendation score (highest first)
    bids.sort((a, b) => {
      // Handle null scores
      if (a.recommendation_score === null && b.recommendation_score === null) return 0;
      if (a.recommendation_score === null) return 1;
      if (b.recommendation_score === null) return -1;
      
      // Sort by score (descending)
      return b.recommendation_score - a.recommendation_score;
    });
    
    // Get AI recommendation service status
    const aiServiceStatus = aiRecommendationService.getMonitoringStats();
    
    res.status(200).json({
      success: true,
      count: bids.length,
      data: bids,
      providers: providers,
      ai_service_status: {
        state: aiServiceStatus.state,
        error_rate: aiServiceStatus.errorRate,
        using_fallback: bids.some(bid => bid.is_fallback_recommendation)
      }
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recommendations',
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
  getProviderBids,
  getHomeownerReceivedBids,
  getBidById,
  updateBid,
  deleteBid,
  submitBid,
  acceptBid,
  getRecommendationsForServiceRequest
}; 