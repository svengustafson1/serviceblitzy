const express = require('express');
const router = express.Router();
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');
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

module.exports = router; 