/**
 * WebSocket Service
 * Handles real-time communication between server and clients using Socket.IO
 * Implements authentication, user-to-socket mapping, event broadcasting,
 * reconnection handling, circuit breaker pattern, and graceful degradation
 */

const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const { createLogger } = require('../utils/logger');

const logger = createLogger('websocket-service');

// Circuit breaker states
const CIRCUIT_STATES = {
  CLOSED: 'CLOSED',      // Normal operation - requests pass through
  OPEN: 'OPEN',          // Circuit is open - requests fail fast
  HALF_OPEN: 'HALF_OPEN' // Testing if service has recovered
};

class WebSocketService {
  constructor(server, options = {}) {
    this.options = {
      jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
      pingTimeout: 10000,
      pingInterval: 5000,
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      randomizationFactor: 0.5,
      ...options
    };

    // Initialize Socket.IO server
    this.io = socketIO(server, {
      pingTimeout: this.options.pingTimeout,
      pingInterval: this.options.pingInterval,
      cors: this.options.cors,
      // Client reconnection settings will be passed to clients
      reconnection: this.options.reconnection,
      reconnectionAttempts: this.options.reconnectionAttempts,
      reconnectionDelay: this.options.reconnectionDelay,
      reconnectionDelayMax: this.options.reconnectionDelayMax,
      randomizationFactor: this.options.randomizationFactor
    });

    // User to socket mapping for targeted notifications
    this.userSocketMap = new Map();

    // Circuit breaker configuration
    this.circuitBreaker = {
      state: CIRCUIT_STATES.CLOSED,
      failureCount: 0,
      failureThreshold: 5,
      resetTimeout: 30000, // 30 seconds
      lastFailureTime: null,
      halfOpenMaxCalls: 3,
      halfOpenCallCount: 0
    };

    // Initialize Socket.IO with authentication middleware
    this.initializeSocketIO();

    logger.info('WebSocket service initialized');
  }

  /**
   * Initialize Socket.IO with authentication middleware
   */
  initializeSocketIO() {
    // Add authentication middleware
    this.io.use((socket, next) => {
      try {
        // Get token from handshake query or auth object
        const token = 
          socket.handshake.query.token ||
          (socket.handshake.auth && socket.handshake.auth.token) ||
          (socket.handshake.headers && socket.handshake.headers.authorization && 
            socket.handshake.headers.authorization.split(' ')[1]);

        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        // Verify JWT token
        jwt.verify(token, this.options.jwtSecret, (err, decoded) => {
          if (err) {
            logger.error('JWT verification failed:', err);
            return next(new Error('Authentication error: Invalid token'));
          }

          // Store user data in socket for later use
          socket.user = decoded;
          socket.userId = decoded.id || decoded.userId || decoded.sub;
          next();
        });
      } catch (error) {
        logger.error('Socket authentication error:', error);
        next(new Error('Authentication error'));
      }
    });

    // Handle connection event
    this.io.on('connection', (socket) => this.handleConnection(socket));
  }

  /**
   * Handle new socket connection
   * @param {Object} socket - Socket.IO socket object
   */
  handleConnection(socket) {
    const userId = socket.userId;
    logger.info(`User connected: ${userId}`);

    // Add socket to user mapping
    this.addUserSocket(userId, socket);

    // Handle disconnect event
    socket.on('disconnect', (reason) => {
      logger.info(`User disconnected: ${userId}, reason: ${reason}`);
      this.removeUserSocket(userId, socket.id);
      
      // If client should reconnect (e.g., server disconnected)
      if (reason === 'io server disconnect') {
        // The disconnection was initiated by the server, reconnect manually
        socket.connect();
      }
      // Otherwise, the socket will automatically try to reconnect if configured to do so
    });

    // Handle error event
    socket.on('error', (error) => {
      logger.error(`Socket error for user ${userId}:`, error);
      this.incrementFailureCount();
    });

    // Handle reconnection attempts
    socket.on('reconnect_attempt', (attemptNumber) => {
      logger.info(`Reconnection attempt ${attemptNumber} for user ${userId}`);
      
      // Implement exponential backoff by adjusting the reconnection delay
      // This is handled by Socket.IO client with the randomizationFactor
    });

    // Handle successful reconnection
    socket.on('reconnect', (attemptNumber) => {
      logger.info(`User ${userId} reconnected after ${attemptNumber} attempts`);
      // Reset circuit breaker on successful reconnection
      this.resetCircuitBreaker();
    });

    // Handle failed reconnection
    socket.on('reconnect_failed', () => {
      logger.warn(`User ${userId} failed to reconnect after maximum attempts`);
      // At this point, client should fall back to HTTP polling
    });

    // Handle acknowledgment of notification delivery
    socket.on('notification:ack', (notificationId) => {
      logger.debug(`Notification ${notificationId} acknowledged by user ${userId}`);
      // Here you could update the notification status in the database
    });

    // Handle fallback to HTTP polling request
    socket.on('fallback:polling', () => {
      logger.info(`User ${userId} requested fallback to HTTP polling`);
      // Respond with acknowledgment that server will send notifications via HTTP
      socket.emit('fallback:polling:ack', { enabled: true });
    });

    // Emit welcome event
    socket.emit('connected', { 
      message: 'Successfully connected to WebSocket server',
      userId: userId,
      timestamp: Date.now()
    });
  }

  /**
   * Add a socket to the user-socket mapping
   * @param {string} userId - User ID
   * @param {Object} socket - Socket.IO socket object
   */
  addUserSocket(userId, socket) {
    if (!userId) return;

    if (!this.userSocketMap.has(userId)) {
      this.userSocketMap.set(userId, new Set());
    }

    this.userSocketMap.get(userId).add(socket.id);
    socket.join(`user:${userId}`); // Join user-specific room
  }

  /**
   * Remove a socket from the user-socket mapping
   * @param {string} userId - User ID
   * @param {string} socketId - Socket ID to remove
   */
  removeUserSocket(userId, socketId) {
    if (!userId || !this.userSocketMap.has(userId)) return;

    const userSockets = this.userSocketMap.get(userId);
    userSockets.delete(socketId);

    // If no more sockets for this user, remove the user entry
    if (userSockets.size === 0) {
      this.userSocketMap.delete(userId);
    }
  }

  /**
   * Send a notification to a specific user
   * @param {string} userId - User ID to send notification to
   * @param {string} event - Event name
   * @param {Object} data - Notification data
   * @param {boolean} [fallbackToHttp=true] - Whether to fall back to HTTP if WebSocket fails
   * @returns {Promise<Object>} - Delivery result with status and method used
   */
  async sendToUser(userId, event, data, fallbackToHttp = true) {
    try {
      // Check circuit breaker state
      if (this.isCircuitOpen()) {
        logger.warn(`Circuit is open, not sending notification to user ${userId} via WebSocket`);
        // Fall back to HTTP polling if enabled
        return fallbackToHttp ? 
          await this.fallbackToHttpPolling(userId, event, data) : 
          { delivered: false, method: 'none', error: 'circuit_open' };
      }

      // If circuit is half-open, limit the number of calls
      if (this.circuitBreaker.state === CIRCUIT_STATES.HALF_OPEN) {
        if (this.circuitBreaker.halfOpenCallCount >= this.circuitBreaker.halfOpenMaxCalls) {
          logger.warn(`Circuit is half-open and max calls reached, not sending notification to user ${userId}`);
          return fallbackToHttp ? 
            await this.fallbackToHttpPolling(userId, event, data) : 
            { delivered: false, method: 'none', error: 'circuit_half_open_max_calls' };
        }
        this.circuitBreaker.halfOpenCallCount++;
      }

      // Check if user has any connected sockets
      if (!this.userSocketMap.has(userId) || this.userSocketMap.get(userId).size === 0) {
        logger.debug(`No active WebSocket connections for user ${userId}`);
        // Fall back to HTTP polling if enabled
        return fallbackToHttp ? 
          await this.fallbackToHttpPolling(userId, event, data) : 
          { delivered: false, method: 'none', error: 'no_active_connections' };
      }

      // Add unique ID to track delivery
      const notificationWithId = {
        ...data,
        id: data.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: data.timestamp || Date.now()
      };

      // Emit to user's room with acknowledgment
      const delivered = await new Promise((resolve) => {
        this.io.to(`user:${userId}`).emit(event, notificationWithId, (ack) => {
          resolve(!!ack);
        });

        // Resolve as false after timeout if no acknowledgment received
        setTimeout(() => resolve(false), 5000);
      });

      if (delivered) {
        this.resetCircuitBreaker(); // Reset circuit on successful delivery
        logger.debug(`Notification ${notificationWithId.id} delivered to user ${userId} via WebSocket`);
        return { delivered: true, method: 'websocket', id: notificationWithId.id };
      } else {
        this.incrementFailureCount();
        logger.warn(`Notification ${notificationWithId.id} delivery to user ${userId} failed or not acknowledged`);
        
        // Fall back to HTTP polling if enabled
        return fallbackToHttp ? 
          await this.fallbackToHttpPolling(userId, event, data) : 
          { delivered: false, method: 'websocket', error: 'not_acknowledged', id: notificationWithId.id };
      }
    } catch (error) {
      this.incrementFailureCount();
      logger.error(`Error sending notification to user ${userId}:`, error);
      
      // Fall back to HTTP polling if enabled
      return fallbackToHttp ? 
        await this.fallbackToHttpPolling(userId, event, data) : 
        { delivered: false, method: 'websocket', error: 'exception', message: error.message };
    }
  }
  
  /**
   * Fall back to HTTP polling for notification delivery
   * This method simulates storing the notification for HTTP polling
   * In a real implementation, this would store the notification in a database or cache
   * @param {string} userId - User ID to send notification to
   * @param {string} event - Event name
   * @param {Object} data - Notification data
   * @returns {Promise<Object>} - Delivery result
   */
  async fallbackToHttpPolling(userId, event, data) {
    try {
      logger.info(`Falling back to HTTP polling for user ${userId}, event: ${event}`);
      
      // Add unique ID if not present
      const notificationWithId = {
        ...data,
        id: data.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: data.timestamp || Date.now(),
        event: event // Store the event type with the notification
      };
      
      // In a real implementation, you would store this notification in a database or cache
      // for the client to retrieve via HTTP polling
      // For example:
      // await db.query('INSERT INTO pending_notifications (user_id, event, data) VALUES ($1, $2, $3)',
      //   [userId, event, JSON.stringify(notificationWithId)]);
      
      // For this implementation, we'll just log it
      logger.debug(`Stored notification ${notificationWithId.id} for HTTP polling for user ${userId}`);
      
      // Return success via HTTP method
      return { delivered: true, method: 'http_polling', id: notificationWithId.id };
    } catch (error) {
      logger.error(`Error in HTTP polling fallback for user ${userId}:`, error);
      return { delivered: false, method: 'http_polling', error: 'exception', message: error.message };
    }
  }

  /**
   * Broadcast a notification to all connected clients
   * @param {string} event - Event name
   * @param {Object} data - Notification data
   * @param {boolean} [fallbackToHttp=true] - Whether to fall back to HTTP if WebSocket fails
   * @returns {Promise<Object>} - Broadcast result
   */
  async broadcast(event, data, fallbackToHttp = true) {
    try {
      // Check circuit breaker state
      if (this.isCircuitOpen()) {
        logger.warn('Circuit is open, not broadcasting notification via WebSocket');
        // Fall back to HTTP polling if enabled
        return fallbackToHttp ? 
          await this.broadcastViaHttpPolling(event, data) : 
          { delivered: false, method: 'none', error: 'circuit_open' };
      }

      // Add unique ID and timestamp if not present
      const notificationWithId = {
        ...data,
        id: data.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: data.timestamp || Date.now()
      };

      // If no users are connected, fall back to HTTP polling
      if (!this.hasConnectedUsers()) {
        logger.debug('No users connected via WebSocket, using HTTP polling for broadcast');
        return fallbackToHttp ? 
          await this.broadcastViaHttpPolling(event, notificationWithId) : 
          { delivered: false, method: 'none', error: 'no_connected_users' };
      }

      // Broadcast to all connected clients
      this.io.emit(event, notificationWithId);
      logger.debug(`Broadcast notification ${notificationWithId.id} to all users via WebSocket`);
      
      // Reset circuit breaker on successful broadcast
      this.resetCircuitBreaker();
      
      return { 
        delivered: true, 
        method: 'websocket', 
        id: notificationWithId.id,
        recipientCount: this.getConnectedUserCount()
      };
    } catch (error) {
      this.incrementFailureCount();
      logger.error('Error broadcasting notification:', error);
      
      // Fall back to HTTP polling if enabled
      return fallbackToHttp ? 
        await this.broadcastViaHttpPolling(event, data) : 
        { delivered: false, method: 'websocket', error: 'exception', message: error.message };
    }
  }
  
  /**
   * Fall back to HTTP polling for broadcast delivery
   * This method simulates storing the broadcast notification for HTTP polling
   * @param {string} event - Event name
   * @param {Object} data - Notification data
   * @returns {Promise<Object>} - Delivery result
   */
  async broadcastViaHttpPolling(event, data) {
    try {
      logger.info(`Falling back to HTTP polling for broadcast event: ${event}`);
      
      // Add unique ID if not present
      const notificationWithId = {
        ...data,
        id: data.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: data.timestamp || Date.now(),
        event: event // Store the event type with the notification
      };
      
      // In a real implementation, you would store this broadcast notification in a database or cache
      // for all clients to retrieve via HTTP polling
      // For example:
      // await db.query('INSERT INTO broadcast_notifications (event, data) VALUES ($1, $2)',
      //   [event, JSON.stringify(notificationWithId)]);
      
      // For this implementation, we'll just log it
      logger.debug(`Stored broadcast notification ${notificationWithId.id} for HTTP polling`);
      
      // Return success via HTTP method
      return { delivered: true, method: 'http_polling', id: notificationWithId.id };
    } catch (error) {
      logger.error(`Error in HTTP polling fallback for broadcast:`, error);
      return { delivered: false, method: 'http_polling', error: 'exception', message: error.message };
    }
  }

  /**
   * Send a notification to a group of users
   * @param {Array<string>} userIds - Array of user IDs
   * @param {string} event - Event name
   * @param {Object} data - Notification data
   * @param {boolean} [fallbackToHttp=true] - Whether to fall back to HTTP if WebSocket fails
   * @returns {Promise<Object>} - Delivery results by user ID
   */
  async sendToUsers(userIds, event, data, fallbackToHttp = true) {
    const results = {};

    // Check circuit breaker state
    if (this.isCircuitOpen()) {
      logger.warn('Circuit is open, not sending group notification via WebSocket');
      
      // If fallback is enabled, send to all users via HTTP polling
      if (fallbackToHttp) {
        for (const userId of userIds) {
          results[userId] = await this.fallbackToHttpPolling(userId, event, data);
        }
        return results;
      }
      
      // Otherwise return failure for all users
      return userIds.reduce((acc, userId) => {
        acc[userId] = { delivered: false, method: 'none', error: 'circuit_open' };
        return acc;
      }, {});
    }

    // Send to each user and collect results
    for (const userId of userIds) {
      results[userId] = await this.sendToUser(userId, event, data, fallbackToHttp);
    }

    // Calculate success statistics
    const successCount = Object.values(results).filter(r => r.delivered).length;
    const websocketCount = Object.values(results).filter(r => r.method === 'websocket' && r.delivered).length;
    const httpCount = Object.values(results).filter(r => r.method === 'http_polling' && r.delivered).length;
    
    logger.info(`Group notification sent to ${successCount}/${userIds.length} users (WebSocket: ${websocketCount}, HTTP: ${httpCount})`);
    
    return results;
  }

  /**
   * Check if any users are connected
   * @returns {boolean} - Whether any users are connected
   */
  hasConnectedUsers() {
    return this.userSocketMap.size > 0;
  }

  /**
   * Get the number of connected users
   * @returns {number} - Number of connected users
   */
  getConnectedUserCount() {
    return this.userSocketMap.size;
  }

  /**
   * Get the number of connected sockets
   * @returns {number} - Number of connected sockets
   */
  getConnectedSocketCount() {
    let count = 0;
    for (const sockets of this.userSocketMap.values()) {
      count += sockets.size;
    }
    return count;
  }

  /**
   * Check if a specific user is connected
   * @param {string} userId - User ID to check
   * @returns {boolean} - Whether the user is connected
   */
  isUserConnected(userId) {
    return this.userSocketMap.has(userId) && this.userSocketMap.get(userId).size > 0;
  }

  /**
   * Increment the failure count for the circuit breaker
   */
  incrementFailureCount() {
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = Date.now();

    // Check if threshold is reached to open the circuit
    if (
      this.circuitBreaker.state === CIRCUIT_STATES.CLOSED &&
      this.circuitBreaker.failureCount >= this.circuitBreaker.failureThreshold
    ) {
      this.openCircuit();
    } else if (this.circuitBreaker.state === CIRCUIT_STATES.HALF_OPEN) {
      // If failure in half-open state, reopen the circuit
      this.openCircuit();
    }
  }

  /**
   * Reset the circuit breaker failure count
   */
  resetCircuitBreaker() {
    if (this.circuitBreaker.state === CIRCUIT_STATES.HALF_OPEN) {
      // If successful in half-open state, close the circuit
      this.closeCircuit();
    }

    this.circuitBreaker.failureCount = 0;
  }

  /**
   * Open the circuit breaker
   */
  openCircuit() {
    logger.warn('Circuit breaker opened due to too many failures');
    this.circuitBreaker.state = CIRCUIT_STATES.OPEN;
    this.circuitBreaker.lastFailureTime = Date.now();

    // Schedule transition to half-open state after reset timeout
    setTimeout(() => {
      if (this.circuitBreaker.state === CIRCUIT_STATES.OPEN) {
        logger.info('Circuit breaker transitioning to half-open state');
        this.circuitBreaker.state = CIRCUIT_STATES.HALF_OPEN;
        this.circuitBreaker.halfOpenCallCount = 0;
      }
    }, this.circuitBreaker.resetTimeout);
  }

  /**
   * Close the circuit breaker
   */
  closeCircuit() {
    logger.info('Circuit breaker closed, resuming normal operation');
    this.circuitBreaker.state = CIRCUIT_STATES.CLOSED;
    this.circuitBreaker.failureCount = 0;
    this.circuitBreaker.halfOpenCallCount = 0;
  }

  /**
   * Check if the circuit breaker is open
   * @returns {boolean} - Whether the circuit is open
   */
  isCircuitOpen() {
    // If circuit is open, check if reset timeout has elapsed
    if (
      this.circuitBreaker.state === CIRCUIT_STATES.OPEN &&
      Date.now() - this.circuitBreaker.lastFailureTime >= this.circuitBreaker.resetTimeout
    ) {
      // Transition to half-open state
      logger.info('Circuit breaker transitioning to half-open state after timeout');
      this.circuitBreaker.state = CIRCUIT_STATES.HALF_OPEN;
      this.circuitBreaker.halfOpenCallCount = 0;
      return false;
    }

    return this.circuitBreaker.state === CIRCUIT_STATES.OPEN;
  }

  /**
   * Get the current state of the circuit breaker
   * @returns {string} - Current circuit breaker state
   */
  getCircuitState() {
    return this.circuitBreaker.state;
  }
}

/**
 * Create a singleton instance of the WebSocket service
 * @param {Object} server - HTTP server instance
 * @param {Object} options - Configuration options
 * @returns {WebSocketService} - WebSocket service instance
 */
let instance = null;
const createWebSocketService = (server, options = {}) => {
  if (!instance && server) {
    instance = new WebSocketService(server, options);
  }
  return instance;
};

/**
 * Get the singleton instance of the WebSocket service
 * @returns {WebSocketService|null} - WebSocket service instance or null if not initialized
 */
const getWebSocketService = () => {
  return instance;
};

/**
 * Example integration with notification controller:
 *
 * // In your notification controller:
 * const { getWebSocketService } = require('../services/websocket.service');
 *
 * // When creating a notification
 * const createNotification = async (client, notification) => {
 *   // Create notification in database
 *   const result = await client.query(`INSERT INTO notifications (...) VALUES (...) RETURNING *`);
 *   const newNotification = result.rows[0];
 *
 *   // Send real-time notification via WebSocket if available
 *   const webSocketService = getWebSocketService();
 *   if (webSocketService) {
 *     await webSocketService.sendToUser(
 *       newNotification.user_id,
 *       'notification:new',
 *       newNotification
 *     );
 *   }
 *
 *   return newNotification;
 * };
 */

module.exports = {
  WebSocketService,
  createWebSocketService,
  getWebSocketService
};