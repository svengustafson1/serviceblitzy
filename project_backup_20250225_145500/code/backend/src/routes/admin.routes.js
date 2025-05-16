const express = require('express');
const router = express.Router();
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');

// NOTE: This is a placeholder file to fix the module import error
// Controller functions will be implemented later

// Temporary placeholder function
const placeholderResponse = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Admin API routes are under development',
    data: null
  });
};

// Routes
router.get('/dashboard', authMiddleware, authorizeRoles(['admin']), placeholderResponse);
router.get('/users', authMiddleware, authorizeRoles(['admin']), placeholderResponse);
router.get('/services', authMiddleware, authorizeRoles(['admin']), placeholderResponse);
router.get('/service-requests', authMiddleware, authorizeRoles(['admin']), placeholderResponse);
router.get('/payments', authMiddleware, authorizeRoles(['admin']), placeholderResponse);

module.exports = router; 