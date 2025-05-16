const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault()
    });
  }
} catch (error) {
  console.error('Firebase admin initialization error:', error);
}

/**
 * Authentication middleware to protect routes
 */
const authMiddleware = async (req, res, next) => {
  try {
    // DEVELOPMENT BYPASS: Skip auth check for development environment
    const BYPASS_AUTH = true; // Set to true to enable development mode
    
    if (BYPASS_AUTH) {
      console.log('AUTH MIDDLEWARE: Bypassing authentication in development mode');
      // Set a mock user for development
      req.user = {
        id: 'mock-user-1',
        email: 'demo@example.com',
        role: 'homeowner'
      };
      return next();
    }
    
    // Get token from the header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token, authorization denied' 
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Method 1: JWT verification (can be used as fallback if Firebase Admin SDK is not configured)
    if (process.env.NODE_ENV === 'development' || !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
        
        // Add user data to request
        req.user = decoded;
        
        // Check if user exists in the database
        const client = req.db;
        const result = await client.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
        
        if (result.rows.length === 0) {
          return res.status(401).json({
            success: false,
            message: 'User not found, token is invalid'
          });
        }
        
        // Add full user data from database
        req.user = { ...req.user, ...result.rows[0] };
        
        next();
      } catch (error) {
        console.error('JWT verification error:', error);
        return res.status(401).json({
          success: false,
          message: 'Token is not valid'
        });
      }
    } 
    // Method 2: Firebase Auth (preferred for production)
    else {
      try {
        // Verify the Firebase ID token
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        if (!decodedToken) {
          return res.status(401).json({
            success: false,
            message: 'Invalid Firebase token'
          });
        }
        
        // Get user from database using Firebase UID
        const client = req.db;
        const result = await client.query('SELECT * FROM users WHERE firebase_uid = $1', [decodedToken.uid]);
        
        if (result.rows.length === 0) {
          return res.status(401).json({
            success: false,
            message: 'User not found in the database'
          });
        }
        
        // Add user data to request
        req.user = result.rows[0];
        req.firebaseUser = decodedToken;
        
        next();
      } catch (error) {
        console.error('Firebase token verification error:', error);
        return res.status(401).json({
          success: false,
          message: 'Invalid Firebase token'
        });
      }
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Middleware for role-based authorization
 * @param {Array} roles - Array of authorized roles
 */
const authorizeRoles = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role ${req.user.role} is not authorized to access this resource`
      });
    }
    next();
  };
};

module.exports = {
  authMiddleware,
  authorizeRoles
}; 