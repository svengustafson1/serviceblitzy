/**
 * Notification Controller
 * Handles all operations related to user notifications
 * Includes WebSocket event emission for real-time notifications
 * and delivery status tracking
 */

// Import WebSocket service
const { getWebSocketService } = require('../services/websocket.service');

/**
 * Create a new notification
 * @param {Object} client - PostgreSQL client
 * @param {Object} notification - Notification data
 * @param {boolean} [emitEvent=true] - Whether to emit WebSocket event
 * @returns {Promise<Object>} Created notification with delivery status
 */
const createNotification = async (client, notification, emitEvent = true) => {
  const {
    user_id,
    title,
    message,
    type = 'info',
    related_to = null,
    related_id = null,
    actions = null,
    expires_at = null,
    delivery_channels = ['websocket', 'in_app', 'email'] // Default delivery channels
  } = notification;

  try {
    // Validate required fields
    if (!user_id || !title || !message) {
      console.error('Missing required fields for notification');
      return null;
    }

    // Create the notification
    const result = await client.query(`
      INSERT INTO notifications (
        user_id, title, message, type, related_to, related_id, actions, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      user_id,
      title,
      message,
      type,
      related_to,
      related_id,
      actions ? JSON.stringify(actions) : null,
      expires_at
    ]);

    const newNotification = result.rows[0];
    
    // Initialize delivery status
    let deliveryStatus = {
      websocket: { delivered: false, attempted: false, timestamp: null },
      in_app: { delivered: true, attempted: true, timestamp: Date.now() }, // In-app is always delivered when created
      email: { delivered: false, attempted: false, timestamp: null }
    };

    // Emit WebSocket event if enabled and WebSocket service is available
    if (emitEvent && delivery_channels.includes('websocket')) {
      const webSocketService = getWebSocketService();
      if (webSocketService) {
        try {
          // Set attempted status before sending
          deliveryStatus.websocket.attempted = true;
          
          // Send notification via WebSocket with fallback to HTTP polling
          const wsResult = await webSocketService.sendToUser(
            user_id.toString(),
            'notification:new',
            {
              ...newNotification,
              actions: actions ? JSON.parse(JSON.stringify(actions)) : null
            }
          );
          
          // Update delivery status based on WebSocket result
          deliveryStatus.websocket.delivered = wsResult.delivered;
          deliveryStatus.websocket.timestamp = Date.now();
          deliveryStatus.websocket.method = wsResult.method; // 'websocket' or 'http_polling'
          
          console.log(`Notification ${newNotification.id} delivery status:`, wsResult);
        } catch (wsError) {
          console.error(`WebSocket delivery error for notification ${newNotification.id}:`, wsError);
          // WebSocket delivery failed, but notification is still created in database
        }
      }
    }
    
    // Store delivery status with the notification
    // In a production system, you would update the notification record with delivery status
    // For now, we'll just attach it to the returned object
    return {
      ...newNotification,
      delivery_status: deliveryStatus
    };
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

/**
 * Create notifications for multiple users
 * @param {Object} client - PostgreSQL client
 * @param {Array} userIds - Array of user IDs
 * @param {Object} notificationData - Notification data (without user_id)
 * @param {boolean} [emitEvent=true] - Whether to emit WebSocket event
 * @returns {Promise<Array>} Array of created notifications with delivery status
 */
const createNotificationForUsers = async (client, userIds, notificationData, emitEvent = true) => {
  try {
    const notifications = [];
    
    for (const userId of userIds) {
      const notification = await createNotification(client, {
        ...notificationData,
        user_id: userId
      }, emitEvent);
      
      if (notification) {
        notifications.push(notification);
      }
    }
    
    return notifications;
  } catch (error) {
    console.error('Error creating notifications for multiple users:', error);
    return [];
  }
};

/**
 * Get user notifications
 * @route GET /api/notifications
 */
const getUserNotifications = async (req, res) => {
  const { unread_only, limit = 20, offset = 0 } = req.query;
  const client = req.db;
  
  try {
    // Build the query
    let query = `
      SELECT *
      FROM notifications
      WHERE user_id = $1
    `;
    
    const queryParams = [req.user.id];
    let paramIndex = 2;
    
    // Filter by read status if specified
    if (unread_only === 'true') {
      query += ` AND is_read = FALSE`;
    }
    
    // Order by created_at (newest first) and add pagination
    query += ` 
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(parseInt(limit), parseInt(offset));
    
    // Execute the query
    const result = await client.query(query, queryParams);
    
    // Get total count for pagination
    const countResult = await client.query(
      `SELECT COUNT(*) FROM notifications WHERE user_id = $1 ${unread_only === 'true' ? 'AND is_read = FALSE' : ''}`,
      [req.user.id]
    );
    
    const totalCount = parseInt(countResult.rows[0].count);
    
    // Get unread count
    const unreadCountResult = await client.query(
      `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
      [req.user.id]
    );
    
    const unreadCount = parseInt(unreadCountResult.rows[0].count);
    
    // Check if WebSocket connection is available for this user
    const webSocketService = getWebSocketService();
    const hasWebSocketConnection = webSocketService ? webSocketService.isUserConnected(req.user.id.toString()) : false;
    
    res.status(200).json({
      success: true,
      count: result.rows.length,
      total: totalCount,
      unread: unreadCount,
      has_websocket: hasWebSocketConnection,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting user notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Mark notifications as read
 * @route PATCH /api/notifications/mark-read
 */
const markNotificationsAsRead = async (req, res) => {
  const { ids, all = false } = req.body;
  const client = req.db;
  
  try {
    let result;
    
    if (all) {
      // Mark all user's notifications as read
      result = await client.query(`
        UPDATE notifications
        SET 
          is_read = TRUE,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND is_read = FALSE
        RETURNING id
      `, [req.user.id]);
    } else if (ids && ids.length > 0) {
      // Mark specific notifications as read
      result = await client.query(`
        UPDATE notifications
        SET 
          is_read = TRUE,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ANY($1::int[]) AND user_id = $2
        RETURNING id
      `, [ids, req.user.id]);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either provide notification IDs or set all=true'
      });
    }
    
    // Emit WebSocket event for read status update if available
    const webSocketService = getWebSocketService();
    if (webSocketService && result.rows.length > 0) {
      const updatedIds = result.rows.map(row => row.id);
      webSocketService.sendToUser(
        req.user.id.toString(),
        'notification:read',
        { ids: updatedIds }
      ).catch(error => {
        console.error('Error sending read status update via WebSocket:', error);
      });
    }
    
    res.status(200).json({
      success: true,
      message: `${result.rows.length} notifications marked as read`,
      data: {
        updated_ids: result.rows.map(row => row.id)
      }
    });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete notifications
 * @route DELETE /api/notifications
 */
const deleteNotifications = async (req, res) => {
  const { ids } = req.body;
  const client = req.db;
  
  try {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide notification IDs to delete'
      });
    }
    
    // Delete specified notifications
    const result = await client.query(`
      DELETE FROM notifications
      WHERE id = ANY($1::int[]) AND user_id = $2
      RETURNING id
    `, [ids, req.user.id]);
    
    // Emit WebSocket event for deletion if available
    const webSocketService = getWebSocketService();
    if (webSocketService && result.rows.length > 0) {
      const deletedIds = result.rows.map(row => row.id);
      webSocketService.sendToUser(
        req.user.id.toString(),
        'notification:deleted',
        { ids: deletedIds }
      ).catch(error => {
        console.error('Error sending deletion update via WebSocket:', error);
      });
    }
    
    res.status(200).json({
      success: true,
      message: `${result.rows.length} notifications deleted`,
      data: {
        deleted_ids: result.rows.map(row => row.id)
      }
    });
  } catch (error) {
    console.error('Error deleting notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get notification counts
 * @route GET /api/notifications/count
 */
const getNotificationCount = async (req, res) => {
  const client = req.db;
  
  try {
    // Get total count
    const totalCountResult = await client.query(
      `SELECT COUNT(*) as total FROM notifications WHERE user_id = $1`,
      [req.user.id]
    );
    
    // Get unread count
    const unreadCountResult = await client.query(
      `SELECT COUNT(*) as unread FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
      [req.user.id]
    );
    
    // Check if WebSocket connection is available for this user
    const webSocketService = getWebSocketService();
    const hasWebSocketConnection = webSocketService ? webSocketService.isUserConnected(req.user.id.toString()) : false;
    
    res.status(200).json({
      success: true,
      data: {
        total: parseInt(totalCountResult.rows[0].total),
        unread: parseInt(unreadCountResult.rows[0].unread),
        has_websocket: hasWebSocketConnection
      }
    });
  } catch (error) {
    console.error('Error getting notification counts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notification counts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get a single notification
 * @route GET /api/notifications/:id
 */
const getNotificationById = async (req, res) => {
  const { id } = req.params;
  const client = req.db;
  
  try {
    const result = await client.query(`
      SELECT * FROM notifications 
      WHERE id = $1 AND user_id = $2
    `, [id, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error getting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Helper function for creating service request notifications
const createServiceRequestNotification = async (client, serviceRequestId, userId, action) => {
  try {
    // Get service request details
    const serviceRequestResult = await client.query(`
      SELECT 
        sr.*,
        s.name as service_name,
        p.address as property_address
      FROM service_requests sr
      JOIN services s ON sr.service_id = s.id
      JOIN properties p ON sr.property_id = p.id
      WHERE sr.id = $1
    `, [serviceRequestId]);
    
    if (serviceRequestResult.rows.length === 0) {
      console.error(`Service request ${serviceRequestId} not found for notification`);
      return null;
    }
    
    const serviceRequest = serviceRequestResult.rows[0];
    
    let title, message, type;
    
    switch (action) {
      case 'created':
        title = 'New Service Request Created';
        message = `Your service request for ${serviceRequest.service_name} at ${serviceRequest.property_address} has been created successfully.`;
        type = 'success';
        break;
      case 'updated':
        title = 'Service Request Updated';
        message = `Your service request for ${serviceRequest.service_name} has been updated.`;
        type = 'info';
        break;
      case 'status_changed':
        title = 'Service Request Status Changed';
        message = `The status of your service request for ${serviceRequest.service_name} has changed to ${serviceRequest.status}.`;
        type = 'info';
        break;
      case 'new_bid':
        title = 'New Bid Received';
        message = `You have received a new bid for your service request for ${serviceRequest.service_name}.`;
        type = 'info';
        break;
      case 'bid_accepted':
        title = 'Bid Accepted';
        message = `A bid has been accepted for your service request for ${serviceRequest.service_name}.`;
        type = 'success';
        break;
      case 'payment_required':
        title = 'Payment Required';
        message = `Payment is required for your service request for ${serviceRequest.service_name}.`;
        type = 'warning';
        break;
      case 'completed':
        title = 'Service Request Completed';
        message = `Your service request for ${serviceRequest.service_name} has been marked as completed.`;
        type = 'success';
        break;
      case 'cancelled':
        title = 'Service Request Cancelled';
        message = `Your service request for ${serviceRequest.service_name} has been cancelled.`;
        type = 'error';
        break;
      default:
        title = 'Service Request Update';
        message = `Your service request for ${serviceRequest.service_name} has been updated.`;
        type = 'info';
    }
    
    // Create notification with WebSocket delivery
    return await createNotification(client, {
      user_id: userId,
      title,
      message,
      type,
      related_to: 'service_request',
      related_id: serviceRequestId,
      actions: {
        view: {
          label: 'View Details',
          url: `/service-requests/${serviceRequestId}`
        }
      },
      delivery_channels: ['websocket', 'in_app', 'email'] // Use all available channels
    });
  } catch (error) {
    console.error('Error creating service request notification:', error);
    return null;
  }
};

// Helper function for creating payment notifications
const createPaymentNotification = async (client, paymentId, userId, action) => {
  try {
    // Get payment details
    const paymentResult = await client.query(`
      SELECT 
        p.*,
        sr.description as service_description,
        s.name as service_name,
        sp.company_name as provider_name,
        h.user_id as homeowner_user_id,
        prov.user_id as provider_user_id
      FROM payments p
      JOIN service_requests sr ON p.service_request_id = sr.id
      JOIN services s ON sr.service_id = s.id
      JOIN service_providers sp ON p.provider_id = sp.id
      JOIN homeowners h ON p.homeowner_id = h.id
      JOIN service_providers prov ON p.provider_id = prov.id
      WHERE p.id = $1
    `, [paymentId]);
    
    if (paymentResult.rows.length === 0) {
      console.error(`Payment ${paymentId} not found for notification`);
      return null;
    }
    
    const payment = paymentResult.rows[0];
    
    let title, message, type;
    
    switch (action) {
      case 'created':
        title = 'Payment Initiated';
        message = `A payment of $${payment.amount} has been initiated for ${payment.service_name}.`;
        type = 'info';
        break;
      case 'completed':
        title = 'Payment Completed';
        message = `Your payment of $${payment.amount} for ${payment.service_name} has been processed successfully.`;
        type = 'success';
        break;
      case 'failed':
        title = 'Payment Failed';
        message = `Your payment for ${payment.service_name} has failed. Please try again.`;
        type = 'error';
        break;
      case 'refunded':
        title = 'Payment Refunded';
        message = `Your payment of $${payment.amount} for ${payment.service_name} has been refunded.`;
        type = 'info';
        break;
      case 'received':
        title = 'Payment Received';
        message = `You have received a payment of $${payment.amount} for ${payment.service_description}.`;
        type = 'success';
        break;
      default:
        title = 'Payment Update';
        message = `Your payment for ${payment.service_name} has been updated.`;
        type = 'info';
    }
    
    // Create notification with high priority for payment events
    return await createNotification(client, {
      user_id: userId,
      title,
      message,
      type,
      related_to: 'payment',
      related_id: paymentId,
      actions: {
        view: {
          label: 'View Details',
          url: `/payments/${paymentId}`
        }
      },
      delivery_channels: ['websocket', 'in_app', 'email'] // Use all available channels for payment notifications
    });
  } catch (error) {
    console.error('Error creating payment notification:', error);
    return null;
  }
};

/**
 * Check WebSocket connection status for current user
 * @route GET /api/notifications/websocket-status
 */
const getWebSocketStatus = async (req, res) => {
  try {
    const webSocketService = getWebSocketService();
    const isConnected = webSocketService ? webSocketService.isUserConnected(req.user.id.toString()) : false;
    const circuitState = webSocketService ? webSocketService.getCircuitState() : 'UNAVAILABLE';
    
    res.status(200).json({
      success: true,
      data: {
        connected: isConnected,
        circuit_state: circuitState,
        socket_count: webSocketService ? webSocketService.getConnectedSocketCount() : 0,
        user_count: webSocketService ? webSocketService.getConnectedUserCount() : 0
      }
    });
  } catch (error) {
    console.error('Error getting WebSocket status:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching WebSocket status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Export public API endpoints
module.exports = {
  getUserNotifications,
  markNotificationsAsRead,
  deleteNotifications,
  getNotificationCount,
  getNotificationById,
  getWebSocketStatus,
  
  // Export helper functions for use in other controllers
  createNotification,
  createNotificationForUsers,
  createServiceRequestNotification,
  createPaymentNotification
};