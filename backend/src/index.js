const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const http = require('http');
const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');

// Global variables to store server references
let httpServer = null;
let io = null;

// Route imports
const homeownerRoutes = require('./routes/homeowner.routes');
const providerRoutes = require('./routes/provider.routes');
const adminRoutes = require('./routes/admin.routes');
const serviceRoutes = require('./routes/service.routes');
const authRoutes = require('./routes/auth.routes');
const paymentRoutes = require('./routes/payment.routes');
const propertyRoutes = require('./routes/property.routes');
const serviceRequestRoutes = require('./routes/service-request.routes');
const bidRoutes = require('./routes/bid.routes');
const notificationRoutes = require('./routes/notification.routes');
const scheduleRoutes = require('./routes/schedule.routes');

// Middleware imports
const { authMiddleware } = require('./middleware/auth.middleware');

// Configuration
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Configure CORS to explicitly allow requests from all frontend ports
const corsOptions = {
  origin: [
    'http://localhost:3000', 
    'http://localhost:3001', 
    'http://localhost:3002',
    'http://127.51.68.120:3000',
    'http://127.51.68.120:3001',
    'http://127.51.68.120:3002'
  ],
  credentials: true
};

// Middleware
app.use(express.json());
app.use(cors(corsOptions));

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test database connection
pool.connect()
  .then(() => console.log('Connected to PostgreSQL database'))
  .catch(err => console.error('Database connection error:', err));

// Make db available to routes
app.use((req, res, next) => {
  req.db = pool;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/homeowners', authMiddleware, homeownerRoutes);
app.use('/api/providers', authMiddleware, providerRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/payments', authMiddleware, paymentRoutes);
app.use('/api/properties', authMiddleware, propertyRoutes);
app.use('/api/service-requests', authMiddleware, serviceRequestRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/schedule', scheduleRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('Home Services API is running');
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// User-to-socket mapping for targeted notifications
const userSocketMap = new Map();

// Function to find an available port and start the server
const startServer = (port) => {
  // Ensure port is a number and within valid range
  port = parseInt(port, 10);
  if (isNaN(port) || port < 1024 || port > 65535) {
    port = 3001; // Reset to default if invalid
  }
  
  // Create a new HTTP server
  httpServer = http.createServer(app);
  
  // Initialize Socket.IO with the HTTP server and CORS options
  io = socketIO(httpServer, {
    cors: corsOptions
  });
  
  // Socket.IO authentication middleware
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }
      
      // Verify the JWT token
      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
          return next(new Error('Authentication error: Invalid token'));
        }
        
        // Attach the decoded user to the socket
        socket.user = decoded;
        next();
      });
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication error'));
    }
  });
  
  // Socket.IO connection handler
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    
    // Store the socket in the user-to-socket mapping
    if (socket.user && socket.user.id) {
      // If user already has sockets, add this one to the array
      if (userSocketMap.has(socket.user.id)) {
        userSocketMap.get(socket.user.id).add(socket.id);
      } else {
        // Create a new Set for this user's sockets
        userSocketMap.set(socket.user.id, new Set([socket.id]));
      }
      
      console.log(`User ${socket.user.id} connected with socket ${socket.id}`);
    }
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      
      // Remove the socket from the user-to-socket mapping
      if (socket.user && socket.user.id) {
        const userSockets = userSocketMap.get(socket.user.id);
        if (userSockets) {
          userSockets.delete(socket.id);
          
          // If no more sockets for this user, remove the user entry
          if (userSockets.size === 0) {
            userSocketMap.delete(socket.user.id);
          }
          
          console.log(`User ${socket.user.id} disconnected socket ${socket.id}`);
        }
      }
    });
  });
  
  // Make Socket.IO instance available globally
  app.set('io', io);
  app.set('userSocketMap', userSocketMap);
  
  // Start the HTTP server
  httpServer.listen(port);
  
  // Handle server errors
  httpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      // Close the current server
      httpServer.close();
      
      // Increment by 1 but ensure we don't exceed 65535
      const nextPort = port + 1;
      if (nextPort > 65535) {
        console.error('No available ports found in valid range');
        process.exit(1);
      }
      console.log(`Port ${port} is in use, trying ${nextPort} instead.`);
      startServer(nextPort);
    } else {
      console.error('Server error:', err);
    }
  });
  
  // Handle successful server start
  httpServer.on('listening', () => {
    const address = httpServer.address();
    console.log(`HTTP server running on port ${address.port}`);
    console.log(`WebSocket server initialized on port ${address.port}`);
  });
};

// Start server
startServer(PORT);

// Handle graceful shutdown
const gracefulShutdown = () => {
  console.log('Received shutdown signal, closing servers...');
  
  // Close the Socket.IO server first
  if (io) {
    io.close(() => {
      console.log('WebSocket server closed');
      
      // Then close the HTTP server
      if (httpServer) {
        httpServer.close(() => {
          console.log('HTTP server closed');
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    });
  } else if (httpServer) {
    httpServer.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
  
  // Force exit after timeout if graceful shutdown fails
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Listen for termination signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = app;