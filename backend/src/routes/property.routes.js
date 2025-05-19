const express = require('express');
const router = express.Router();
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');
const multer = require('multer');

// Configure multer for memory storage (files will be processed and sent to S3)
const upload = multer({ storage: multer.memoryStorage() });

// Import controllers
const {
  getAllProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  generateQrCode,
  getPropertyByHash,
  uploadPropertyFiles,
  getPropertyFiles,
  getPropertyFile,
  deletePropertyFile
} = require('../controllers/property.controller');

// Routes
router.get('/', authMiddleware, authorizeRoles(['admin']), getAllProperties);
router.post('/', authMiddleware, authorizeRoles(['homeowner']), createProperty);
router.get('/access/:hash', getPropertyByHash); // Public route - no auth required
router.get('/:id', authMiddleware, getPropertyById);
router.put('/:id', authMiddleware, updateProperty);
router.delete('/:id', authMiddleware, deleteProperty);
router.post('/:id/qr-code', authMiddleware, generateQrCode);

// File upload routes
router.post('/:id/files', authMiddleware, upload.single('file'), uploadPropertyFiles);
router.post('/:id/files/multiple', authMiddleware, upload.array('files', 10), uploadPropertyFiles);
router.get('/:id/files', authMiddleware, getPropertyFiles);
router.get('/:id/files/:fileId', authMiddleware, getPropertyFile);
router.delete('/:id/files/:fileId', authMiddleware, deletePropertyFile);

module.exports = router;