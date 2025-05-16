const express = require('express');
const router = express.Router();
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');
const providerController = require('../controllers/provider.controller');

// Public provider routes (no auth needed)
router.get('/public', providerController.getAllProviders);

// Protected provider routes
router.get('/', authMiddleware, providerController.getAllProviders);
router.get('/service-requests/available', authMiddleware, authorizeRoles(['provider']), providerController.getAvailableServiceRequests);
router.get('/jobs', authMiddleware, authorizeRoles(['provider']), providerController.getProviderJobs);
router.get('/:id', authMiddleware, providerController.getProviderById);
router.post('/', authMiddleware, providerController.createProvider);
router.put('/:id', authMiddleware, providerController.updateProvider);

module.exports = router; 