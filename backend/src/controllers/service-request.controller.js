/**
 * Service Request Controller
 * Handles all operations related to service requests
 * Includes file attachment support for service documentation
 */

// Import the notification helper functions and file upload service
const { createServiceRequestNotification } = require('./notification.controller');
const fileUploadService = require('../services/file-upload.service');
const { createLogger } = require('../utils/logger');

const logger = createLogger('service-request-controller');

/**
 * Get all service requests (filtered by query params)
 * @route GET /api/service-requests
 */
const getAllServiceRequests = async (req, res) => {
  const { status, property_id, service_id } = req.query;
  const client = req.db;
  
  try {
    // Base query
    let query = `
      SELECT sr.*, 
        s.name as service_name, s.category as service_category,
        p.address as property_address,
        u.first_name as homeowner_first_name, u.last_name as homeowner_last_name
      FROM service_requests sr
      JOIN services s ON sr.service_id = s.id
      JOIN properties p ON sr.property_id = p.id
      JOIN homeowners h ON sr.homeowner_id = h.id
      JOIN users u ON h.user_id = u.id
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramIndex = 1;
    
    // Filter by status if provided
    if (status) {
      query += ` AND sr.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }
    
    // Filter by property_id if provided
    if (property_id) {
      query += ` AND sr.property_id = $${paramIndex}`;
      queryParams.push(property_id);
      paramIndex++;
    }
    
    // Filter by service_id if provided
    if (service_id) {
      query += ` AND sr.service_id = $${paramIndex}`;
      queryParams.push(service_id);
      paramIndex++;
    }
    
    // Filter by user role
    if (req.user.role === 'homeowner') {
      // Homeowners can only see their own requests
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
      query += ` AND sr.homeowner_id = $${paramIndex}`;
      queryParams.push(homeownerId);
      paramIndex++;
    } else if (req.user.role === 'provider') {
      // Providers can see:
      // 1. Requests with status 'pending' or 'bidding' for new opportunities
      // 2. Requests where they have placed bids
      // 3. Requests where they have been awarded the job
      
      const providerId = await getProviderIdFromUserId(client, req.user.id);
      
      if (!providerId) {
        return res.status(404).json({
          success: false,
          message: 'Provider profile not found'
        });
      }
      
      query = `
        ${query}
        AND (
          sr.status IN ('pending', 'bidding')
          OR sr.id IN (
            SELECT service_request_id 
            FROM bids 
            WHERE provider_id = $${paramIndex}
          )
          OR sr.id IN (
            SELECT service_request_id 
            FROM bids 
            WHERE provider_id = $${paramIndex} AND status = 'accepted'
          )
        )
      `;
      queryParams.push(providerId, providerId);
      paramIndex += 2;
    }
    
    // Order by created_at (newest first)
    query += ` ORDER BY sr.created_at DESC`;
    
    const result = await client.query(query, queryParams);
    
    // Enhance response with file attachments
    const enhancedResults = await Promise.all(result.rows.map(async (request) => {
      // Get file attachments if any
      if (request.attachment_ids && Array.isArray(request.attachment_ids)) {
        try {
          // Get file metadata for each attachment
          const fileMetadata = await getFileMetadataForServiceRequest(client, request.id);
          return { ...request, attachments: fileMetadata };
        } catch (error) {
          logger.error(`Error fetching attachments for service request ${request.id}:`, error);
          return { ...request, attachments: [] };
        }
      }
      return { ...request, attachments: [] };
    }));
    
    res.status(200).json({
      success: true,
      count: enhancedResults.length,
      data: enhancedResults
    });
  } catch (error) {
    logger.error('Error getting service requests:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching service requests',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get a service request by ID
 * @route GET /api/service-requests/:id
 */
const getServiceRequestById = async (req, res) => {
  const { id } = req.params;
  const client = req.db;
  
  try {
    // First, get the basic service request information
    const serviceRequestResult = await client.query(`
      SELECT sr.*, 
        s.name as service_name, s.category as service_category,
        p.address as property_address, p.city as property_city, 
        p.state as property_state, p.zip_code as property_zip_code,
        h.id as homeowner_id, h.user_id as homeowner_user_id
      FROM service_requests sr
      JOIN services s ON sr.service_id = s.id
      JOIN properties p ON sr.property_id = p.id
      JOIN homeowners h ON sr.homeowner_id = h.id
      WHERE sr.id = $1
    `, [id]);
    
    if (serviceRequestResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }
    
    const serviceRequest = serviceRequestResult.rows[0];
    
    // Check authorization
    if (req.user.role === 'homeowner' && req.user.id !== parseInt(serviceRequest.homeowner_user_id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this service request'
      });
    }
    
    // For providers, we need to check if they can see this request
    if (req.user.role === 'provider') {
      const providerId = await getProviderIdFromUserId(client, req.user.id);
      
      if (!providerId) {
        return res.status(404).json({
          success: false,
          message: 'Provider profile not found'
        });
      }
      
      // Providers can see:
      // 1. Requests with status 'pending' or 'bidding'
      // 2. Requests where they have placed bids
      // 3. Requests where they have been awarded the job
      if (!['pending', 'bidding'].includes(serviceRequest.status)) {
        // Check if provider has placed a bid
        const bidCheck = await client.query(
          'SELECT id FROM bids WHERE service_request_id = $1 AND provider_id = $2',
          [id, providerId]
        );
        
        // If no bid placed and not a pending/bidding request, deny access
        if (bidCheck.rows.length === 0) {
          return res.status(403).json({
            success: false,
            message: 'Not authorized to access this service request'
          });
        }
      }
    }
    
    // Get the homeowner information
    const homeownerResult = await client.query(`
      SELECT u.first_name, u.last_name, u.email, u.phone
      FROM users u
      JOIN homeowners h ON u.id = h.user_id
      WHERE h.id = $1
    `, [serviceRequest.homeowner_id]);
    
    if (homeownerResult.rows.length > 0) {
      serviceRequest.homeowner = homeownerResult.rows[0];
    }
    
    // Get bids for this service request if appropriate
    if (['bidding', 'scheduled', 'in_progress', 'completed'].includes(serviceRequest.status)) {
      const bidsResult = await client.query(`
        SELECT b.*, 
          sp.id as provider_id, sp.company_name, sp.avg_rating,
          u.first_name as provider_first_name, u.last_name as provider_last_name
        FROM bids b
        JOIN service_providers sp ON b.provider_id = sp.id
        JOIN users u ON sp.user_id = u.id
        WHERE b.service_request_id = $1
        ORDER BY b.price ASC
      `, [id]);
      
      serviceRequest.bids = bidsResult.rows;
    }
    
    // Get file attachments if any
    const fileMetadata = await getFileMetadataForServiceRequest(client, id);
    serviceRequest.attachments = fileMetadata;
    
    res.status(200).json({
      success: true,
      data: serviceRequest
    });
  } catch (error) {
    logger.error('Error getting service request:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching service request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create a new service request
 * @route POST /api/service-requests
 */
const createServiceRequest = async (req, res) => {
  const { 
    property_id, 
    service_id, 
    description, 
    preferred_date, 
    is_recurring, 
    recurrence_frequency,
    attachment_ids // Array of file upload IDs
  } = req.body;
  const client = req.db;
  
  // Validate required fields
  if (!property_id || !service_id) {
    return res.status(400).json({
      success: false,
      message: 'Property ID and Service ID are required'
    });
  }
  
  try {
    // Get homeowner id from the user id
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
    
    // Verify property belongs to this homeowner
    const propertyCheck = await client.query(
      'SELECT id FROM properties WHERE id = $1 AND homeowner_id = $2',
      [property_id, homeownerId]
    );
    
    if (propertyCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Property does not belong to this homeowner'
      });
    }
    
    // Verify service exists
    const serviceCheck = await client.query(
      'SELECT id FROM services WHERE id = $1',
      [service_id]
    );
    
    if (serviceCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Validate attachment_ids if provided
    let validatedAttachmentIds = [];
    if (attachment_ids && Array.isArray(attachment_ids) && attachment_ids.length > 0) {
      try {
        // Verify each attachment exists and belongs to this user
        const attachmentResult = await client.query(
          'SELECT id FROM file_uploads WHERE id = ANY($1::int[]) AND user_id = $2',
          [attachment_ids, req.user.id]
        );
        
        if (attachmentResult.rows.length !== attachment_ids.length) {
          // Some attachments were not found or don't belong to this user
          await client.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            message: 'One or more attachments are invalid or do not belong to you'
          });
        }
        
        validatedAttachmentIds = attachmentResult.rows.map(row => row.id);
      } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Error validating attachments:', error);
        return res.status(500).json({
          success: false,
          message: 'Error validating attachments',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    }
    
    // Create the service request with attachment_ids
    const result = await client.query(`
      INSERT INTO service_requests
        (homeowner_id, property_id, service_id, status, description, preferred_date, is_recurring, recurrence_frequency, attachment_ids)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      homeownerId, 
      property_id, 
      service_id, 
      'pending', // Initial status
      description,
      preferred_date,
      is_recurring || false,
      recurrence_frequency,
      validatedAttachmentIds.length > 0 ? JSON.stringify(validatedAttachmentIds) : null
    ]);
    
    // If attachments were provided, update their related_id to link them to this service request
    if (validatedAttachmentIds.length > 0) {
      await client.query(
        'UPDATE file_uploads SET related_id = $1, related_to = $2 WHERE id = ANY($3::int[])',
        [result.rows[0].id, 'SERVICE_REQUEST', validatedAttachmentIds]
      );
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    
    // Get additional information to return
    const enhancedResult = await client.query(`
      SELECT sr.*, 
        s.name as service_name, s.category as service_category,
        p.address as property_address
      FROM service_requests sr
      JOIN services s ON sr.service_id = s.id
      JOIN properties p ON sr.property_id = p.id
      WHERE sr.id = $1
    `, [result.rows[0].id]);
    
    // Get file metadata for attachments
    const fileMetadata = await getFileMetadataForServiceRequest(client, result.rows[0].id);
    
    // Create notification for the homeowner
    await createServiceRequestNotification(
      client,
      result.rows[0].id,
      req.user.id,
      'created'
    );
    
    res.status(201).json({
      success: true,
      message: 'Service request created successfully',
      data: {
        ...enhancedResult.rows[0],
        attachments: fileMetadata
      }
    });
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
    logger.error('Error creating service request:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating service request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update a service request
 * @route PUT /api/service-requests/:id
 */
const updateServiceRequest = async (req, res) => {
  const { id } = req.params;
  const { 
    description, 
    preferred_date, 
    is_recurring, 
    recurrence_frequency,
    attachment_ids // Array of file upload IDs to add/replace
  } = req.body;
  const client = req.db;
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    // Check if service request exists and belongs to this user
    const serviceRequestCheck = await client.query(`
      SELECT sr.*, h.user_id as homeowner_user_id
      FROM service_requests sr
      JOIN homeowners h ON sr.homeowner_id = h.id
      WHERE sr.id = $1
    `, [id]);
    
    if (serviceRequestCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }
    
    const serviceRequest = serviceRequestCheck.rows[0];
    
    // Only homeowner who owns this request or admin can update it
    if (req.user.role !== 'admin' && req.user.id !== parseInt(serviceRequest.homeowner_user_id)) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this service request'
      });
    }
    
    // Can only update if status is 'pending' or 'bidding'
    if (!['pending', 'bidding'].includes(serviceRequest.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Cannot update a service request with status '${serviceRequest.status}'`
      });
    }
    
    // Handle attachment updates if provided
    let updatedAttachmentIds = serviceRequest.attachment_ids || [];
    if (attachment_ids !== undefined) {
      if (Array.isArray(attachment_ids)) {
        try {
          // Verify each attachment exists and belongs to this user
          const attachmentResult = await client.query(
            'SELECT id FROM file_uploads WHERE id = ANY($1::int[]) AND user_id = $2',
            [attachment_ids, req.user.id]
          );
          
          if (attachmentResult.rows.length !== attachment_ids.length) {
            // Some attachments were not found or don't belong to this user
            await client.query('ROLLBACK');
            return res.status(400).json({
              success: false,
              message: 'One or more attachments are invalid or do not belong to you'
            });
          }
          
          updatedAttachmentIds = attachmentResult.rows.map(row => row.id);
          
          // Update the related_id for new attachments
          await client.query(
            'UPDATE file_uploads SET related_id = $1, related_to = $2 WHERE id = ANY($3::int[])',
            [id, 'SERVICE_REQUEST', updatedAttachmentIds]
          );
          
          // If there were previous attachments that are no longer included, update their related_id to null
          if (serviceRequest.attachment_ids && Array.isArray(serviceRequest.attachment_ids)) {
            const removedAttachmentIds = serviceRequest.attachment_ids.filter(
              oldId => !updatedAttachmentIds.includes(oldId)
            );
            
            if (removedAttachmentIds.length > 0) {
              await client.query(
                'UPDATE file_uploads SET related_id = NULL, related_to = NULL WHERE id = ANY($1::int[])',
                [removedAttachmentIds]
              );
            }
          }
        } catch (error) {
          await client.query('ROLLBACK');
          logger.error('Error updating attachments:', error);
          return res.status(500).json({
            success: false,
            message: 'Error updating attachments',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
          });
        }
      } else if (attachment_ids === null) {
        // If attachment_ids is explicitly set to null, remove all attachments
        updatedAttachmentIds = null;
        
        // Update any existing attachments to remove the relation
        if (serviceRequest.attachment_ids && Array.isArray(serviceRequest.attachment_ids)) {
          await client.query(
            'UPDATE file_uploads SET related_id = NULL, related_to = NULL WHERE id = ANY($1::int[])',
            [serviceRequest.attachment_ids]
          );
        }
      }
    }
    
    // Update the service request
    const result = await client.query(`
      UPDATE service_requests
      SET 
        description = COALESCE($1, description),
        preferred_date = COALESCE($2, preferred_date),
        is_recurring = COALESCE($3, is_recurring),
        recurrence_frequency = COALESCE($4, recurrence_frequency),
        attachment_ids = COALESCE($5, attachment_ids),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `, [
      description, 
      preferred_date, 
      is_recurring, 
      recurrence_frequency, 
      updatedAttachmentIds !== undefined ? 
        (updatedAttachmentIds && updatedAttachmentIds.length > 0 ? JSON.stringify(updatedAttachmentIds) : null) : 
        undefined,
      id
    ]);
    
    // Commit the transaction
    await client.query('COMMIT');
    
    // Get file metadata for attachments
    const fileMetadata = await getFileMetadataForServiceRequest(client, id);
    
    // Create notification for the homeowner
    await createServiceRequestNotification(
      client,
      id,
      req.user.id,
      'updated'
    );
    
    res.status(200).json({
      success: true,
      message: 'Service request updated successfully',
      data: {
        ...result.rows[0],
        attachments: fileMetadata
      }
    });
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
    logger.error('Error updating service request:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating service request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete a service request
 * @route DELETE /api/service-requests/:id
 */
const deleteServiceRequest = async (req, res) => {
  const { id } = req.params;
  const client = req.db;
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    // Check if service request exists and belongs to this user
    const serviceRequestCheck = await client.query(`
      SELECT sr.*, h.user_id as homeowner_user_id
      FROM service_requests sr
      JOIN homeowners h ON sr.homeowner_id = h.id
      WHERE sr.id = $1
    `, [id]);
    
    if (serviceRequestCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }
    
    const serviceRequest = serviceRequestCheck.rows[0];
    
    // Only homeowner who owns this request or admin can delete it
    if (req.user.role !== 'admin' && req.user.id !== parseInt(serviceRequest.homeowner_user_id)) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this service request'
      });
    }
    
    // Can only delete if status is 'pending' or 'bidding'
    if (!['pending', 'bidding'].includes(serviceRequest.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Cannot delete a service request with status '${serviceRequest.status}'`
      });
    }
    
    // Update file attachments to remove the relation
    if (serviceRequest.attachment_ids && Array.isArray(serviceRequest.attachment_ids)) {
      await client.query(
        'UPDATE file_uploads SET related_id = NULL, related_to = NULL WHERE id = ANY($1::int[])',
        [serviceRequest.attachment_ids]
      );
    }
    
    // Delete any bids associated with this service request
    await client.query('DELETE FROM bids WHERE service_request_id = $1', [id]);
    
    // Delete the service request
    await client.query('DELETE FROM service_requests WHERE id = $1', [id]);
    
    // Commit the transaction
    await client.query('COMMIT');
    
    res.status(200).json({
      success: true,
      message: 'Service request deleted successfully'
    });
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
    logger.error('Error deleting service request:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting service request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update the status of a service request
 * @route PATCH /api/service-requests/:id/status
 */
const updateServiceRequestStatus = async (req, res) => {
  const { id } = req.params;
  const { status, bid_id } = req.body;
  const client = req.db;
  
  try {
    // Validate status
    const validStatuses = ['pending', 'bidding', 'scheduled', 'in_progress', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }
    
    // Get the service request
    const serviceRequestCheck = await client.query(`
      SELECT sr.*, sr.status as current_status, h.user_id as homeowner_user_id
      FROM service_requests sr
      JOIN homeowners h ON sr.homeowner_id = h.id
      WHERE sr.id = $1
    `, [id]);
    
    if (serviceRequestCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }
    
    const serviceRequest = serviceRequestCheck.rows[0];
    const currentStatus = serviceRequest.current_status;
    
    // Validate the status transition
    if (!isValidStatusTransition(currentStatus, status, req.user.role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from '${currentStatus}' to '${status}' for role '${req.user.role}'`
      });
    }
    
    // Handle special case for 'scheduled' status - requires a bid_id
    if (status === 'scheduled' && !bid_id) {
      return res.status(400).json({
        success: false,
        message: 'Bid ID is required when changing status to scheduled'
      });
    }
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Update the service request status
    const result = await client.query(`
      UPDATE service_requests
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [status, id]);
    
    let providerId = null;
    
    // If moving to 'scheduled', update the selected bid
    if (status === 'scheduled' && bid_id) {
      // Verify the bid exists for this service request
      const bidCheck = await client.query(
        'SELECT id, provider_id FROM bids WHERE id = $1 AND service_request_id = $2',
        [bid_id, id]
      );
      
      if (bidCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Bid not found for this service request'
        });
      }
      
      providerId = bidCheck.rows[0].provider_id;
      
      // Mark the selected bid as accepted
      await client.query(`
        UPDATE bids
        SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [bid_id]);
      
      // Mark all other bids as rejected
      await client.query(`
        UPDATE bids
        SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
        WHERE service_request_id = $1 AND id != $2
      `, [id, bid_id]);
    }
    
    // If no providerId was set from bid acceptance and status is in_progress or completed,
    // try to get it from the accepted bid
    if (!providerId && ['in_progress', 'completed'].includes(status)) {
      const acceptedBidResult = await client.query(
        'SELECT provider_id FROM bids WHERE service_request_id = $1 AND status = $2',
        [id, 'accepted']
      );
      
      if (acceptedBidResult.rows.length > 0) {
        providerId = acceptedBidResult.rows[0].provider_id;
      }
    }
    
    // Get provider user_id if we have a provider_id
    let providerUserId = null;
    if (providerId) {
      const providerResult = await client.query(
        'SELECT user_id FROM service_providers WHERE id = $1',
        [providerId]
      );
      
      if (providerResult.rows.length > 0) {
        providerUserId = providerResult.rows[0].user_id;
      }
    }
    
    // Create notification for homeowner
    await createServiceRequestNotification(
      client,
      id,
      serviceRequest.homeowner_user_id,
      status === currentStatus ? 'updated' : 'status_changed'
    );
    
    // Create notification for provider if applicable
    if (providerUserId) {
      // Determine the appropriate action based on status
      let providerAction;
      switch (status) {
        case 'scheduled':
          providerAction = 'bid_accepted';
          break;
        case 'in_progress':
          providerAction = 'status_changed';
          break;
        case 'completed':
          providerAction = 'completed';
          break;
        case 'cancelled':
          providerAction = 'cancelled';
          break;
        default:
          providerAction = 'updated';
      }
      
      await createServiceRequestNotification(
        client,
        id,
        providerUserId,
        providerAction
      );
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    
    // Get file metadata for attachments
    const fileMetadata = await getFileMetadataForServiceRequest(client, id);
    
    res.status(200).json({
      success: true,
      message: `Service request status updated to ${status}`,
      data: {
        ...result.rows[0],
        attachments: fileMetadata
      }
    });
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
    logger.error('Error updating service request status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating service request status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get bids for a service request
 * @route GET /api/service-requests/:id/bids
 */
const getServiceRequestBids = async (req, res) => {
  const { id } = req.params;
  const client = req.db;
  
  try {
    // Check if service request exists
    const serviceRequestCheck = await client.query(`
      SELECT sr.*, h.user_id as homeowner_user_id, h.id as homeowner_id
      FROM service_requests sr
      JOIN homeowners h ON sr.homeowner_id = h.id
      WHERE sr.id = $1
    `, [id]);
    
    if (serviceRequestCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }
    
    const serviceRequest = serviceRequestCheck.rows[0];
    
    // Verify authorization
    if (req.user.role === 'homeowner' && req.user.id !== parseInt(serviceRequest.homeowner_user_id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view bids for this service request'
      });
    }
    
    // For providers, only allow viewing their own bids or if the request is in bidding status
    if (req.user.role === 'provider') {
      const providerId = await getProviderIdFromUserId(client, req.user.id);
      
      if (!providerId) {
        return res.status(404).json({
          success: false,
          message: 'Provider profile not found'
        });
      }
      
      // Get all bids for this service request
      const bidsResult = await client.query(`
        SELECT b.*,
          sp.company_name, sp.avg_rating,
          u.first_name as provider_first_name, u.last_name as provider_last_name,
          CASE WHEN b.provider_id = $1 THEN true ELSE false END as is_own_bid
        FROM bids b
        JOIN service_providers sp ON b.provider_id = sp.id
        JOIN users u ON sp.user_id = u.id
        WHERE b.service_request_id = $2
        ORDER BY b.price ASC
      `, [providerId, id]);
      
      // Filter out competitor bids if request is not in 'bidding' status
      if (serviceRequest.status !== 'bidding') {
        const filteredBids = bidsResult.rows.filter(bid => 
          bid.is_own_bid || serviceRequest.status === 'completed'
        );
        
        return res.status(200).json({
          success: true,
          count: filteredBids.length,
          data: filteredBids
        });
      } else {
        // In bidding state, show all bids but with limited data for competitors
        const processedBids = bidsResult.rows.map(bid => {
          if (!bid.is_own_bid) {
            // For competitor bids, provide limited information
            return {
              id: bid.id,
              service_request_id: bid.service_request_id,
              price: bid.price,
              estimated_hours: bid.estimated_hours,
              created_at: bid.created_at,
              // No detailed description, company name masked
              company_name: 'Provider ' + (bid.id % 100), // Simple masking
              avg_rating: bid.avg_rating
            };
          }
          return bid;
        });
        
        return res.status(200).json({
          success: true,
          count: processedBids.length,
          data: processedBids
        });
      }
    }
    
    // For admins and homeowners, get all bids
    const bidsResult = await client.query(`
      SELECT b.*,
        sp.company_name, sp.avg_rating,
        u.first_name as provider_first_name, u.last_name as provider_last_name,
        (
          SELECT COUNT(*) 
          FROM service_requests sr2
          JOIN bids b2 ON sr2.id = b2.service_request_id
          WHERE b2.status = 'accepted' AND b2.provider_id = b.provider_id
        ) as completed_jobs_count
      FROM bids b
      JOIN service_providers sp ON b.provider_id = sp.id
      JOIN users u ON sp.user_id = u.id
      WHERE b.service_request_id = $1
      ORDER BY b.price ASC
    `, [id]);
    
    res.status(200).json({
      success: true,
      count: bidsResult.rows.length,
      data: bidsResult.rows
    });
  } catch (error) {
    logger.error('Error getting bids:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bids',
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
      SELECT * FROM service_requests WHERE id = $1
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
    
    // Check if provider has already submitted a bid
    const existingBidCheck = await client.query(
      'SELECT id FROM bids WHERE service_request_id = $1 AND provider_id = $2',
      [id, providerId]
    );
    
    if (existingBidCheck.rows.length > 0) {
      // Update existing bid
      const result = await client.query(`
        UPDATE bids
        SET 
          price = $1,
          estimated_hours = $2,
          description = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE service_request_id = $4 AND provider_id = $5
        RETURNING *
      `, [price, estimated_hours, description, id, providerId]);
      
      return res.status(200).json({
        success: true,
        message: 'Bid updated successfully',
        data: result.rows[0]
      });
    }
    
    // Create new bid
    const result = await client.query(`
      INSERT INTO bids
        (service_request_id, provider_id, price, estimated_hours, description, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [id, providerId, price, estimated_hours, description, 'pending']);
    
    // If service request is still in 'pending' status, update it to 'bidding'
    if (serviceRequest.status === 'pending') {
      await client.query(`
        UPDATE service_requests
        SET status = 'bidding', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [id]);
    }
    
    res.status(201).json({
      success: true,
      message: 'Bid submitted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error submitting bid:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting bid',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Upload files for a service request
 * @route POST /api/service-requests/:id/attachments
 */
const uploadServiceRequestAttachments = async (req, res) => {
  const { id } = req.params;
  const client = req.db;
  
  try {
    // Check if service request exists and belongs to this user
    const serviceRequestCheck = await client.query(`
      SELECT sr.*, h.user_id as homeowner_user_id
      FROM service_requests sr
      JOIN homeowners h ON sr.homeowner_id = h.id
      WHERE sr.id = $1
    `, [id]);
    
    if (serviceRequestCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }
    
    const serviceRequest = serviceRequestCheck.rows[0];
    
    // Only homeowner who owns this request or admin can add attachments
    if (req.user.role !== 'admin' && req.user.id !== parseInt(serviceRequest.homeowner_user_id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add attachments to this service request'
      });
    }
    
    // Can only add attachments if status is 'pending', 'bidding', or 'in_progress'
    if (!['pending', 'bidding', 'in_progress'].includes(serviceRequest.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot add attachments to a service request with status '${serviceRequest.status}'`
      });
    }
    
    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files were uploaded'
      });
    }
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Process each uploaded file
    const uploadedFiles = [];
    const fileIds = [];
    
    for (const file of req.files) {
      try {
        // Upload file to S3 using the file upload service
        const fileMetadata = await fileUploadService.uploadFile(file, {
          entityType: 'service-request',
          entityId: id,
          description: `Attachment for service request #${id}`
        });
        
        // Store file metadata in the database
        const fileResult = await client.query(`
          INSERT INTO file_uploads
            (user_id, related_to, related_id, file_url, metadata)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `, [
          req.user.id,
          'SERVICE_REQUEST',
          id,
          fileMetadata.location,
          JSON.stringify({
            originalFilename: fileMetadata.originalFilename,
            mimeType: fileMetadata.mimeType,
            size: fileMetadata.size,
            key: fileMetadata.key,
            bucket: fileMetadata.bucket
          })
        ]);
        
        uploadedFiles.push(fileResult.rows[0]);
        fileIds.push(fileResult.rows[0].id);
      } catch (error) {
        logger.error(`Error uploading file ${file.originalname}:`, error);
        // Continue with other files even if one fails
      }
    }
    
    // If no files were successfully uploaded, rollback and return error
    if (uploadedFiles.length === 0) {
      await client.query('ROLLBACK');
      return res.status(500).json({
        success: false,
        message: 'Failed to upload any files'
      });
    }
    
    // Update the service request with the new attachment IDs
    let currentAttachmentIds = serviceRequest.attachment_ids || [];
    if (Array.isArray(currentAttachmentIds)) {
      currentAttachmentIds = [...currentAttachmentIds, ...fileIds];
    } else {
      currentAttachmentIds = fileIds;
    }
    
    await client.query(`
      UPDATE service_requests
      SET attachment_ids = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [JSON.stringify(currentAttachmentIds), id]);
    
    // Commit the transaction
    await client.query('COMMIT');
    
    // Create notification for the homeowner
    await createServiceRequestNotification(
      client,
      id,
      serviceRequest.homeowner_user_id,
      'updated'
    );
    
    res.status(200).json({
      success: true,
      message: `Successfully uploaded ${uploadedFiles.length} file(s)`,
      data: uploadedFiles
    });
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
    logger.error('Error uploading attachments:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading attachments',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get attachments for a service request
 * @route GET /api/service-requests/:id/attachments
 */
const getServiceRequestAttachments = async (req, res) => {
  const { id } = req.params;
  const client = req.db;
  
  try {
    // Check if service request exists
    const serviceRequestCheck = await client.query(`
      SELECT sr.*, h.user_id as homeowner_user_id
      FROM service_requests sr
      JOIN homeowners h ON sr.homeowner_id = h.id
      WHERE sr.id = $1
    `, [id]);
    
    if (serviceRequestCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }
    
    const serviceRequest = serviceRequestCheck.rows[0];
    
    // Check authorization
    if (req.user.role === 'homeowner' && req.user.id !== parseInt(serviceRequest.homeowner_user_id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this service request'
      });
    }
    
    // For providers, we need to check if they can see this request
    if (req.user.role === 'provider') {
      const providerId = await getProviderIdFromUserId(client, req.user.id);
      
      if (!providerId) {
        return res.status(404).json({
          success: false,
          message: 'Provider profile not found'
        });
      }
      
      // Providers can see:
      // 1. Requests with status 'pending' or 'bidding'
      // 2. Requests where they have placed bids
      // 3. Requests where they have been awarded the job
      if (!['pending', 'bidding'].includes(serviceRequest.status)) {
        // Check if provider has placed a bid
        const bidCheck = await client.query(
          'SELECT id FROM bids WHERE service_request_id = $1 AND provider_id = $2',
          [id, providerId]
        );
        
        // If no bid placed and not a pending/bidding request, deny access
        if (bidCheck.rows.length === 0) {
          return res.status(403).json({
            success: false,
            message: 'Not authorized to access this service request'
          });
        }
      }
    }
    
    // Get file metadata for attachments
    const fileMetadata = await getFileMetadataForServiceRequest(client, id);
    
    res.status(200).json({
      success: true,
      count: fileMetadata.length,
      data: fileMetadata
    });
  } catch (error) {
    logger.error('Error getting attachments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching attachments',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete an attachment from a service request
 * @route DELETE /api/service-requests/:id/attachments/:fileId
 */
const deleteServiceRequestAttachment = async (req, res) => {
  const { id, fileId } = req.params;
  const client = req.db;
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    // Check if service request exists and belongs to this user
    const serviceRequestCheck = await client.query(`
      SELECT sr.*, h.user_id as homeowner_user_id
      FROM service_requests sr
      JOIN homeowners h ON sr.homeowner_id = h.id
      WHERE sr.id = $1
    `, [id]);
    
    if (serviceRequestCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }
    
    const serviceRequest = serviceRequestCheck.rows[0];
    
    // Only homeowner who owns this request or admin can delete attachments
    if (req.user.role !== 'admin' && req.user.id !== parseInt(serviceRequest.homeowner_user_id)) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete attachments from this service request'
      });
    }
    
    // Can only delete attachments if status is 'pending' or 'bidding'
    if (!['pending', 'bidding'].includes(serviceRequest.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Cannot delete attachments from a service request with status '${serviceRequest.status}'`
      });
    }
    
    // Check if the file exists and belongs to this service request
    const fileCheck = await client.query(`
      SELECT * FROM file_uploads 
      WHERE id = $1 AND related_to = 'SERVICE_REQUEST' AND related_id = $2
    `, [fileId, id]);
    
    if (fileCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'File not found or does not belong to this service request'
      });
    }
    
    const file = fileCheck.rows[0];
    
    // Update the file to remove the relation to the service request
    await client.query(`
      UPDATE file_uploads
      SET related_id = NULL, related_to = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [fileId]);
    
    // Update the service request to remove the file ID from attachment_ids
    if (serviceRequest.attachment_ids && Array.isArray(serviceRequest.attachment_ids)) {
      const updatedAttachmentIds = serviceRequest.attachment_ids.filter(
        attachmentId => attachmentId !== parseInt(fileId)
      );
      
      await client.query(`
        UPDATE service_requests
        SET attachment_ids = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [
        updatedAttachmentIds.length > 0 ? JSON.stringify(updatedAttachmentIds) : null,
        id
      ]);
    }
    
    // Try to delete the file from S3 (but don't fail if this doesn't work)
    try {
      if (file.metadata && file.metadata.key) {
        await fileUploadService.deleteFile(file.metadata.key, req.user);
      }
    } catch (deleteError) {
      logger.error(`Error deleting file from S3: ${deleteError.message}`);
      // Continue even if S3 deletion fails
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    
    res.status(200).json({
      success: true,
      message: 'File attachment removed successfully'
    });
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
    logger.error('Error deleting attachment:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting attachment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Generate a pre-signed URL for downloading an attachment
 * @route GET /api/service-requests/:id/attachments/:fileId/download
 */
const getAttachmentDownloadUrl = async (req, res) => {
  const { id, fileId } = req.params;
  const client = req.db;
  
  try {
    // Check if service request exists
    const serviceRequestCheck = await client.query(`
      SELECT sr.*, h.user_id as homeowner_user_id
      FROM service_requests sr
      JOIN homeowners h ON sr.homeowner_id = h.id
      WHERE sr.id = $1
    `, [id]);
    
    if (serviceRequestCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }
    
    const serviceRequest = serviceRequestCheck.rows[0];
    
    // Check authorization
    if (req.user.role === 'homeowner' && req.user.id !== parseInt(serviceRequest.homeowner_user_id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this service request'
      });
    }
    
    // For providers, we need to check if they can see this request
    if (req.user.role === 'provider') {
      const providerId = await getProviderIdFromUserId(client, req.user.id);
      
      if (!providerId) {
        return res.status(404).json({
          success: false,
          message: 'Provider profile not found'
        });
      }
      
      // Providers can see:
      // 1. Requests with status 'pending' or 'bidding'
      // 2. Requests where they have placed bids
      // 3. Requests where they have been awarded the job
      if (!['pending', 'bidding'].includes(serviceRequest.status)) {
        // Check if provider has placed a bid
        const bidCheck = await client.query(
          'SELECT id FROM bids WHERE service_request_id = $1 AND provider_id = $2',
          [id, providerId]
        );
        
        // If no bid placed and not a pending/bidding request, deny access
        if (bidCheck.rows.length === 0) {
          return res.status(403).json({
            success: false,
            message: 'Not authorized to access this service request'
          });
        }
      }
    }
    
    // Check if the file exists and belongs to this service request
    const fileCheck = await client.query(`
      SELECT * FROM file_uploads 
      WHERE id = $1 AND related_to = 'SERVICE_REQUEST' AND related_id = $2
    `, [fileId, id]);
    
    if (fileCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'File not found or does not belong to this service request'
      });
    }
    
    const file = fileCheck.rows[0];
    
    // Generate a pre-signed URL for downloading the file
    if (!file.metadata || !file.metadata.key) {
      return res.status(400).json({
        success: false,
        message: 'File metadata is missing or invalid'
      });
    }
    
    const downloadUrl = await fileUploadService.generatePresignedUrl(file.metadata.key, {
      operation: 'getObject',
      expiresIn: 3600, // URL expires in 1 hour
      user: req.user
    });
    
    res.status(200).json({
      success: true,
      data: {
        downloadUrl,
        expiresIn: 3600,
        fileName: file.metadata.originalFilename || 'download',
        mimeType: file.metadata.mimeType || 'application/octet-stream'
      }
    });
  } catch (error) {
    logger.error('Error generating download URL:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating download URL',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Helper function to get file metadata for a service request
 * @param {Object} client - Database client
 * @param {Number} serviceRequestId - Service request ID
 * @returns {Promise<Array>} - Array of file metadata objects
 */
const getFileMetadataForServiceRequest = async (client, serviceRequestId) => {
  try {
    // Get the service request to check for attachment_ids
    const serviceRequestResult = await client.query(
      'SELECT attachment_ids FROM service_requests WHERE id = $1',
      [serviceRequestId]
    );
    
    if (serviceRequestResult.rows.length === 0 || 
        !serviceRequestResult.rows[0].attachment_ids || 
        !Array.isArray(serviceRequestResult.rows[0].attachment_ids) || 
        serviceRequestResult.rows[0].attachment_ids.length === 0) {
      return [];
    }
    
    const attachmentIds = serviceRequestResult.rows[0].attachment_ids;
    
    // Get file metadata for each attachment
    const fileResult = await client.query(`
      SELECT id, user_id, file_url, metadata, created_at, updated_at
      FROM file_uploads
      WHERE id = ANY($1::int[])
    `, [attachmentIds]);
    
    // Process the results to include presigned URLs
    return fileResult.rows.map(file => {
      let metadata = {};
      try {
        metadata = typeof file.metadata === 'string' ? 
          JSON.parse(file.metadata) : 
          (file.metadata || {});
      } catch (error) {
        logger.error(`Error parsing file metadata for file ${file.id}:`, error);
      }
      
      return {
        id: file.id,
        user_id: file.user_id,
        file_url: file.file_url,
        originalFilename: metadata.originalFilename || 'unknown',
        mimeType: metadata.mimeType || 'application/octet-stream',
        size: metadata.size || 0,
        created_at: file.created_at,
        updated_at: file.updated_at
      };
    });
  } catch (error) {
    logger.error(`Error getting file metadata for service request ${serviceRequestId}:`, error);
    return [];
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

/**
 * Helper function to validate status transitions
 */
const isValidStatusTransition = (currentStatus, newStatus, userRole) => {
  // Define allowed transitions by role
  const allowedTransitions = {
    homeowner: {
      pending: ['bidding', 'cancelled'],
      bidding: ['scheduled', 'cancelled'],
      scheduled: ['cancelled'],
      in_progress: [], // Homeowner can't change once in progress
      completed: [], // Homeowner can't change once completed
      cancelled: [] // Can't un-cancel
    },
    provider: {
      pending: [], // Provider can't change pending status
      bidding: [], // Provider can't change bidding status
      scheduled: ['in_progress'],
      in_progress: ['completed'],
      completed: [], // Can't change once completed
      cancelled: [] // Can't un-cancel
    },
    admin: {
      // Admin can make any transition
      pending: ['bidding', 'scheduled', 'in_progress', 'completed', 'cancelled'],
      bidding: ['pending', 'scheduled', 'in_progress', 'completed', 'cancelled'],
      scheduled: ['pending', 'bidding', 'in_progress', 'completed', 'cancelled'],
      in_progress: ['pending', 'bidding', 'scheduled', 'completed', 'cancelled'],
      completed: ['pending', 'bidding', 'scheduled', 'in_progress', 'cancelled'],
      cancelled: ['pending', 'bidding', 'scheduled', 'in_progress', 'completed']
    }
  };
  
  // If same status, it's always valid
  if (currentStatus === newStatus) {
    return true;
  }
  
  // Check if the transition is allowed for this role
  return allowedTransitions[userRole]?.[currentStatus]?.includes(newStatus) || false;
};

module.exports = {
  getAllServiceRequests,
  getServiceRequestById,
  createServiceRequest,
  updateServiceRequest,
  deleteServiceRequest,
  updateServiceRequestStatus,
  getServiceRequestBids,
  submitBid,
  uploadServiceRequestAttachments,
  getServiceRequestAttachments,
  deleteServiceRequestAttachment,
  getAttachmentDownloadUrl
};