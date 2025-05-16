const express = require('express');
const router = express.Router();
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');

// Import controllers
const {
  getAllProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  generateQrCode,
  getPropertyByHash
} = require('../controllers/property.controller');

// Routes
router.get('/', authMiddleware, authorizeRoles(['admin']), getAllProperties);
router.post('/', authMiddleware, authorizeRoles(['homeowner']), createProperty);
router.get('/access/:hash', getPropertyByHash); // Public route - no auth required
router.get('/:id', authMiddleware, getPropertyById);
router.put('/:id', authMiddleware, updateProperty);
router.delete('/:id', authMiddleware, deleteProperty);
router.post('/:id/qr-code', authMiddleware, generateQrCode);

module.exports = router; 