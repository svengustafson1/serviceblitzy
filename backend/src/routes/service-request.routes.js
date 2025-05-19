const express = require('express');
const router = express.Router();
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');
const serviceRequestController = require('../controllers/service-request.controller');
const multer = require('multer');

// Configure multer for memory storage (files will be in req.file.buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit, matching the file-upload.service.js limit
  }
});

// Routes
router.get('/', authMiddleware, serviceRequestController.getAllServiceRequests);
router.get('/:id', authMiddleware, serviceRequestController.getServiceRequestById);
router.post('/', authMiddleware, authorizeRoles(['homeowner']), serviceRequestController.createServiceRequest);
router.put('/:id', authMiddleware, serviceRequestController.updateServiceRequest);
router.delete('/:id', authMiddleware, serviceRequestController.deleteServiceRequest);

// Bids related routes
router.get('/:id/bids', authMiddleware, serviceRequestController.getServiceRequestBids);
router.post('/:id/bids', authMiddleware, authorizeRoles(['provider']), serviceRequestController.submitBid);

// Status update routes
router.patch('/:id/status', authMiddleware, serviceRequestController.updateServiceRequestStatus);

// File attachment routes
router.post('/:id/attachments', 
  authMiddleware, 
  upload.single('file'), // 'file' is the field name for the uploaded file
  serviceRequestController.uploadServiceRequestAttachment
);

router.get('/:id/attachments', 
  authMiddleware, 
  serviceRequestController.getServiceRequestAttachments
);

router.delete('/:id/attachments/:fileId', 
  authMiddleware, 
  serviceRequestController.deleteServiceRequestAttachment
);

// Route to get a pre-signed URL for a specific attachment
router.get('/:id/attachments/:fileId/url', 
  authMiddleware, 
  serviceRequestController.getAttachmentPresignedUrl
);

// Route for uploading multiple files at once
router.post('/:id/attachments/batch', 
  authMiddleware, 
  upload.array('files', 5), // Allow up to 5 files at once, field name 'files'
  serviceRequestController.uploadMultipleServiceRequestAttachments
);

module.exports = router; 