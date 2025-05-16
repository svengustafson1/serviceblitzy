const express = require('express');
const router = express.Router();
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');

// Import controllers
const {
  register,
  login,
  getCurrentUser,
  updateProfile,
  forgotPassword,
  resetPassword
} = require('../controllers/auth.controller');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/me', authMiddleware, getCurrentUser);
router.put('/profile', authMiddleware, updateProfile);

module.exports = router; 