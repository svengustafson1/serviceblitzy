const express = require('express');
const router = express.Router();
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');

// Import controllers
const {
  getAllHomeowners,
  getHomeownerById,
  updateHomeowner,
  deleteHomeowner,
  getHomeownerProperties,
  getHomeownerServiceRequests
} = require('../controllers/homeowner.controller');

// Routes
router.get('/', authMiddleware, authorizeRoles(['admin']), getAllHomeowners);
router.get('/:id', authMiddleware, getHomeownerById);
router.put('/:id', authMiddleware, updateHomeowner);
router.delete('/:id', authMiddleware, deleteHomeowner);

// Related resource routes
router.get('/:id/properties', authMiddleware, getHomeownerProperties);
router.get('/:id/service-requests', authMiddleware, getHomeownerServiceRequests);

module.exports = router; 