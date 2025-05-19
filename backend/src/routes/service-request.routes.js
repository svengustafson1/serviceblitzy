const express = require('express');
const router = express.Router();
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');
const { uploadSingleFile, uploadMultipleFiles, handleMulterError } = require('../middleware/file-upload.middleware');
const serviceRequestController = require('../controllers/service-request.controller');

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
  uploadSingleFile, 
  handleMulterError, 
  serviceRequestController.uploadServiceRequestAttachment
);

router.post('/:id/attachments/batch', 
  authMiddleware, 
  uploadMultipleFiles, 
  handleMulterError, 
  serviceRequestController.uploadMultipleServiceRequestAttachments
);

router.get('/:id/attachments', 
  authMiddleware, 
  serviceRequestController.getServiceRequestAttachments
);

router.delete('/:id/attachments/:fileId', 
  authMiddleware, 
  serviceRequestController.deleteServiceRequestAttachment
);

router.get('/:id/attachments/:fileId/url', 
  authMiddleware, 
  serviceRequestController.getAttachmentPresignedUrl
);

module.exports = router;