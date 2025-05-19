const express = require('express');
const router = express.Router();
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');
const { upload, handleMulterError } = require('../middleware/upload.middleware');

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

// Import file upload controllers
const {
  uploadPropertyFiles,
  getPropertyFiles,
  deletePropertyFile,
  getPropertyFileById
} = require('../controllers/file-upload.controller');

// Property Routes
router.get('/', authMiddleware, authorizeRoles(['admin']), getAllProperties);
router.post('/', authMiddleware, authorizeRoles(['homeowner']), createProperty);
router.get('/access/:hash', getPropertyByHash); // Public route - no auth required
router.get('/:id', authMiddleware, getPropertyById);
router.put('/:id', authMiddleware, updateProperty);
router.delete('/:id', authMiddleware, deleteProperty);
router.post('/:id/qr-code', authMiddleware, generateQrCode);

// File Upload Routes
router.post('/:id/files', 
  authMiddleware, 
  upload.single('file'), 
  handleMulterError, 
  uploadPropertyFiles
);
router.get('/:id/files', authMiddleware, getPropertyFiles);
router.get('/:propertyId/files/:fileId', authMiddleware, getPropertyFileById);
router.delete('/:propertyId/files/:fileId', authMiddleware, deletePropertyFile);

module.exports = router;