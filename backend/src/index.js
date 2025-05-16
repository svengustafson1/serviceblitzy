const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const http = require('http');

// Global variable to store the server reference
let server = null;

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

// Function to find an available port
const startServer = (port) => {
  // Ensure port is a number and within valid range
  port = parseInt(port, 10);
  if (isNaN(port) || port < 1024 || port > 65535) {
    port = 3001; // Reset to default if invalid
  }
  
  // Create a new server for each attempt
  const currentServer = http.createServer(app);
  
  currentServer.listen(port);
  currentServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      // Close the current server
      currentServer.close();
      
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
  currentServer.on('listening', () => {
    const address = currentServer.address();
    console.log(`Server running on port ${address.port}`);
    
    // Store the server reference globally
    server = currentServer;
  });
};

// Start server
startServer(PORT);

module.exports = app; 