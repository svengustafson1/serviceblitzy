/**
 * Notification Controller
 * Handles all operations related to user notifications
 * Includes WebSocket event emission for real-time notifications
 * and fallback to HTTP polling when WebSocket is unavailable
 */

const { getWebSocketService } = require('../services/websocket.service');
const { createLogger } = require('../utils/logger');

const logger = createLogger('notification-controller');

// In-memory store for pending notifications when WebSocket is unavailable
// This is a simple implementation - in production, use Redis or a database
const pendingNotifications = new Map(); // userId -> array of notifications

/**
 * Create a new notification
 * @param {Object} client - PostgreSQL client
 * @param {Object} notification - Notification data
 * @param {String} [deliveryChannel='all'] - Delivery channel ('websocket', 'http', 'all')
 */
const createNotification = async (client, notification, deliveryChannel = 'all') => {
  const {
    user_id,
    title,
    message,
    type = 'info',
    related_to = null,
    related_id = null,
    actions = null,
    expires_at = null
  } = notification;

  try {
    // Validate required fields
    if (!user_id || !title || !message) {
      logger.error('Missing required fields for notification');
      return null;
    }

    // Create the notification with delivery status tracking
    const result = await client.query(`
      INSERT INTO notifications (
        user_id, title, message, type, related_to, related_id, actions, expires_at,
        delivery_status, delivery_channel, delivery_attempts
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      user_id,
      title,
      message,
      type,
      related_to,
      related_id,
      actions ? JSON.stringify(actions) : null,
      expires_at,
      'pending', // Initial delivery status
      deliveryChannel,
      0 // Initial delivery attempts
    ]);

    const newNotification = result.rows[0];

    // Attempt to deliver via WebSocket if available and channel is 'websocket' or 'all'
    if (deliveryChannel === 'websocket' || deliveryChannel === 'all') {
      await deliverViaWebSocket(client, newNotification);
    }

    return newNotification;
  } catch (error) {
    logger.error('Error creating notification:', error);
    return null;
  }
};

/**
 * Deliver notification via WebSocket
 * @param {Object} client - PostgreSQL client
 * @param {Object} notification - Notification data
 */
const deliverViaWebSocket = async (client, notification) => {
  try {
    const webSocketService = getWebSocketService();
    
    // If WebSocket service is not available, store for HTTP polling
    if (!webSocketService) {
      logger.warn(`WebSocket service not available, storing notification ${notification.id} for HTTP polling`);
      storeForHttpPolling(notification.user_id, notification);
      
      // Update delivery status to 'pending_http'
      await updateNotificationDeliveryStatus(client, notification.id, 'pending_http', 1);
      return;
    }

    // Update delivery attempts before sending
    await updateNotificationDeliveryStatus(
      client, 
      notification.id, 
      'sending', // Status while attempting delivery
      notification.delivery_attempts + 1
    );

    // Attempt to send via WebSocket
    const result = await webSocketService.sendToUser(
      notification.user_id.toString(),
      'notification:new',
      notification
    );

    // Update delivery status based on result
    if (result.delivered) {
      await updateNotificationDeliveryStatus(client, notification.id, 'delivered', notification.delivery_attempts);
      logger.debug(`Notification ${notification.id} delivered to user ${notification.user_id} via ${result.method}`);
    } else {
      // If WebSocket failed but HTTP fallback succeeded
      if (result.method === 'http_polling') {
        await updateNotificationDeliveryStatus(client, notification.id, 'pending_http', notification.delivery_attempts);
        logger.debug(`Notification ${notification.id} queued for HTTP polling for user ${notification.user_id}`);
      } else {
        // Complete failure
        await updateNotificationDeliveryStatus(client, notification.id, 'failed', notification.delivery_attempts);
        logger.warn(`Failed to deliver notification ${notification.id} to user ${notification.user_id}: ${result.error}`);
      }
    }
  } catch (error) {
    logger.error(`Error delivering notification ${notification.id} via WebSocket:`, error);
    // Store for HTTP polling as fallback
    storeForHttpPolling(notification.user_id, notification);
    
    // Update delivery status to failed
    await updateNotificationDeliveryStatus(client, notification.id, 'failed', notification.delivery_attempts + 1);
  }
};

/**
 * Update notification delivery status
 * @param {Object} client - PostgreSQL client
 * @param {Number} notificationId - Notification ID
 * @param {String} status - New delivery status
 * @param {Number} attempts - Number of delivery attempts
 */
const updateNotificationDeliveryStatus = async (client, notificationId, status, attempts) => {
  try {
    await client.query(`
      UPDATE notifications
      SET 
        delivery_status = $1,
        delivery_attempts = $2,
        last_delivery_attempt = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [status, attempts, notificationId]);
    
    return true;
  } catch (error) {
    logger.error(`Error updating delivery status for notification ${notificationId}:`, error);
    return false;
  }
};

/**
 * Store notification for HTTP polling
 * @param {Number} userId - User ID
 * @param {Object} notification - Notification data
 */
const storeForHttpPolling = (userId, notification) => {
  if (!pendingNotifications.has(userId)) {
    pendingNotifications.set(userId, []);
  }
  
  pendingNotifications.get(userId).push({
    ...notification,
    pending_since: Date.now()
  });
  
  // Limit the number of pending notifications per user
  const userNotifications = pendingNotifications.get(userId);
  if (userNotifications.length > 100) {
    // Remove oldest notifications if we have too many
    pendingNotifications.set(
      userId,
      userNotifications.slice(userNotifications.length - 100)
    );
  }
};

/**
 * Create notifications for multiple users
 * @param {Object} client - PostgreSQL client
 * @param {Array} userIds - Array of user IDs
 * @param {Object} notificationData - Notification data (without user_id)
 * @param {String} [deliveryChannel='all'] - Delivery channel ('websocket', 'http', 'all')
 */
const createNotificationForUsers = async (client, userIds, notificationData, deliveryChannel = 'all') => {
  try {
    const notifications = [];
    
    for (const userId of userIds) {
      const notification = await createNotification(client, {
        ...notificationData,
        user_id: userId
      }, deliveryChannel);
      
      if (notification) {
        notifications.push(notification);
      }
    }
    
    return notifications;
  } catch (error) {
    logger.error('Error creating notifications for multiple users:', error);
    return [];
  }
};

/**
 * Get user notifications
 * @route GET /api/notifications
 */
const getUserNotifications = async (req, res) => {
  const { unread_only, limit = 20, offset = 0, delivery_status } = req.query;
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
    
    // Filter by delivery status if specified
    if (delivery_status) {
      query += ` AND delivery_status = $${paramIndex}`;
      queryParams.push(delivery_status);
      paramIndex++;
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
    let countQuery = `SELECT COUNT(*) FROM notifications WHERE user_id = $1`;
    const countParams = [req.user.id];
    
    if (unread_only === 'true') {
      countQuery += ` AND is_read = FALSE`;
    }
    
    if (delivery_status) {
      countQuery += ` AND delivery_status = $2`;
      countParams.push(delivery_status);
    }
    
    const countResult = await client.query(countQuery, countParams);
    
    const totalCount = parseInt(countResult.rows[0].count);
    
    // Get unread count
    const unreadCountResult = await client.query(
      `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
      [req.user.id]
    );
    
    const unreadCount = parseInt(unreadCountResult.rows[0].count);
    
    res.status(200).json({
      success: true,
      count: result.rows.length,
      total: totalCount,
      unread: unreadCount,
      data: result.rows
    });
  } catch (error) {
    logger.error('Error getting user notifications:', error);
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
    
    // Emit WebSocket event for read status update
    const webSocketService = getWebSocketService();
    if (webSocketService) {
      webSocketService.sendToUser(
        req.user.id.toString(),
        'notification:read',
        { ids: result.rows.map(row => row.id) }
      );
    }
    
    res.status(200).json({
      success: true,
      message: `${result.rows.length} notifications marked as read`,
      data: {
        updated_ids: result.rows.map(row => row.id)
      }
    });
  } catch (error) {
    logger.error('Error marking notifications as read:', error);
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
    
    // Emit WebSocket event for deletion
    const webSocketService = getWebSocketService();
    if (webSocketService) {
      webSocketService.sendToUser(
        req.user.id.toString(),
        'notification:deleted',
        { ids: result.rows.map(row => row.id) }
      );
    }
    
    res.status(200).json({
      success: true,
      message: `${result.rows.length} notifications deleted`,
      data: {
        deleted_ids: result.rows.map(row => row.id)
      }
    });
  } catch (error) {
    logger.error('Error deleting notifications:', error);
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
    
    // Get counts by delivery status
    const statusCountResult = await client.query(
      `SELECT delivery_status, COUNT(*) as count 
       FROM notifications 
       WHERE user_id = $1 
       GROUP BY delivery_status`,
      [req.user.id]
    );
    
    // Convert to object with status as key
    const statusCounts = {};
    statusCountResult.rows.forEach(row => {
      statusCounts[row.delivery_status] = parseInt(row.count);
    });
    
    res.status(200).json({
      success: true,
      data: {
        total: parseInt(totalCountResult.rows[0].total),
        unread: parseInt(unreadCountResult.rows[0].unread),
        by_status: statusCounts
      }
    });
  } catch (error) {
    logger.error('Error getting notification counts:', error);
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
    logger.error('Error getting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get notifications by delivery status
 * @route GET /api/notifications/status/:status
 */
const getNotificationsByDeliveryStatus = async (req, res) => {
  const { status } = req.params;
  const { limit = 20, offset = 0 } = req.query;
  const client = req.db;
  
  try {
    // Validate status
    const validStatuses = ['pending', 'sending', 'delivered', 'failed', 'pending_http'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }
    
    // Get notifications with the specified delivery status
    const result = await client.query(`
      SELECT * FROM notifications 
      WHERE user_id = $1 AND delivery_status = $2
      ORDER BY created_at DESC
      LIMIT $3 OFFSET $4
    `, [req.user.id, status, parseInt(limit), parseInt(offset)]);
    
    // Get total count
    const countResult = await client.query(
      `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND delivery_status = $2`,
      [req.user.id, status]
    );
    
    res.status(200).json({
      success: true,
      count: result.rows.length,
      total: parseInt(countResult.rows[0].count),
      data: result.rows
    });
  } catch (error) {
    logger.error(`Error getting notifications with status ${status}:`, error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update notification delivery status
 * @route PATCH /api/notifications/delivery-status
 */
const updateDeliveryStatus = async (req, res) => {
  const { id, status } = req.body;
  const client = req.db;
  
  try {
    // Validate required fields
    if (!id || !status) {
      return res.status(400).json({
        success: false,
        message: 'Notification ID and status are required'
      });
    }
    
    // Validate status
    const validStatuses = ['pending', 'sending', 'delivered', 'failed', 'pending_http'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }
    
    // Update delivery status
    const result = await client.query(`
      UPDATE notifications
      SET 
        delivery_status = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND user_id = $3
      RETURNING *
    `, [status, id, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or you do not have permission to update it'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Notification delivery status updated',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error updating notification delivery status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notification delivery status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Retry failed notification delivery
 * @route POST /api/notifications/retry-delivery
 */
const retryFailedDelivery = async (req, res) => {
  const { id } = req.body;
  const client = req.db;
  
  try {
    // Validate required fields
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Notification ID is required'
      });
    }
    
    // Get the notification
    const notificationResult = await client.query(`
      SELECT * FROM notifications 
      WHERE id = $1 AND user_id = $2
    `, [id, req.user.id]);
    
    if (notificationResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or you do not have permission to retry delivery'
      });
    }
    
    const notification = notificationResult.rows[0];
    
    // Only retry if status is 'failed' or 'pending_http'
    if (notification.delivery_status !== 'failed' && notification.delivery_status !== 'pending_http') {
      return res.status(400).json({
        success: false,
        message: 'Can only retry delivery for notifications with status "failed" or "pending_http"'
      });
    }
    
    // Attempt to deliver via WebSocket
    await deliverViaWebSocket(client, notification);
    
    // Get updated notification
    const updatedResult = await client.query(`
      SELECT * FROM notifications 
      WHERE id = $1
    `, [id]);
    
    res.status(200).json({
      success: true,
      message: 'Notification delivery retry initiated',
      data: updatedResult.rows[0]
    });
  } catch (error) {
    logger.error('Error retrying notification delivery:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrying notification delivery',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Poll for new notifications (fallback when WebSocket is unavailable)
 * @route GET /api/notifications/poll
 */
const pollNewNotifications = async (req, res) => {
  const client = req.db;
  const userId = req.user.id;
  
  try {
    // Check for pending notifications in memory first
    const pendingForUser = pendingNotifications.get(userId) || [];
    
    // If we have pending notifications in memory, return them and clear the queue
    if (pendingForUser.length > 0) {
      const notifications = [...pendingForUser];
      pendingNotifications.set(userId, []); // Clear the queue
      
      // Update delivery status for these notifications
      const notificationIds = notifications.map(n => n.id);
      await client.query(`
        UPDATE notifications
        SET 
          delivery_status = 'delivered',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ANY($1::int[])
      `, [notificationIds]);
      
      return res.status(200).json({
        success: true,
        count: notifications.length,
        data: notifications
      });
    }
    
    // Otherwise, check the database for pending notifications
    const result = await client.query(`
      SELECT * FROM notifications 
      WHERE user_id = $1 
      AND (delivery_status = 'pending' OR delivery_status = 'pending_http')
      AND is_read = FALSE
      ORDER BY created_at DESC
      LIMIT 50
    `, [userId]);
    
    // If we found notifications, update their status
    if (result.rows.length > 0) {
      const notificationIds = result.rows.map(n => n.id);
      await client.query(`
        UPDATE notifications
        SET 
          delivery_status = 'delivered',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ANY($1::int[])
      `, [notificationIds]);
    }
    
    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    logger.error('Error polling for notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error polling for notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Subscribe to WebSocket notifications
 * @route POST /api/notifications/subscribe
 */
const subscribeToNotifications = async (req, res) => {
  try {
    const webSocketService = getWebSocketService();
    
    if (!webSocketService) {
      return res.status(503).json({
        success: false,
        message: 'WebSocket service is not available',
        fallback: 'http_polling'
      });
    }
    
    // Return connection information
    res.status(200).json({
      success: true,
      message: 'WebSocket service is available',
      data: {
        websocket_url: process.env.WEBSOCKET_URL || '/socket.io',
        user_channel: `user:${req.user.id}`
      }
    });
  } catch (error) {
    logger.error('Error subscribing to notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error subscribing to notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Unsubscribe from WebSocket notifications
 * @route POST /api/notifications/unsubscribe
 */
const unsubscribeFromNotifications = async (req, res) => {
  try {
    // This is mostly a client-side operation, but we can clean up any server resources
    // associated with this user's WebSocket connections if needed
    
    res.status(200).json({
      success: true,
      message: 'Successfully unsubscribed from notifications'
    });
  } catch (error) {
    logger.error('Error unsubscribing from notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error unsubscribing from notifications',
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
      logger.error(`Service request ${serviceRequestId} not found for notification`);
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
      }
    }, 'all'); // Use all delivery channels
  } catch (error) {
    logger.error('Error creating service request notification:', error);
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
      logger.error(`Payment ${paymentId} not found for notification`);
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
    
    // Create notification with WebSocket delivery
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
      }
    }, 'all'); // Use all delivery channels
  } catch (error) {
    logger.error('Error creating payment notification:', error);
    return null;
  }
};

// Export public API endpoints
module.exports = {
  getUserNotifications,
  markNotificationsAsRead,
  deleteNotifications,
  getNotificationCount,
  getNotificationById,
  getNotificationsByDeliveryStatus,
  updateDeliveryStatus,
  retryFailedDelivery,
  pollNewNotifications,
  subscribeToNotifications,
  unsubscribeFromNotifications,
  
  // Export helper functions for use in other controllers
  createNotification,
  createNotificationForUsers,
  createServiceRequestNotification,
  createPaymentNotification
};