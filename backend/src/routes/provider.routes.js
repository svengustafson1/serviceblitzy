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

// Stripe Connect onboarding endpoints
router.post('/connect/account', authMiddleware, authorizeRoles(['provider']), providerController.createConnectAccount);
router.get('/connect/account/status', authMiddleware, authorizeRoles(['provider']), providerController.getConnectAccountStatus);
router.post('/connect/account/onboard', authMiddleware, authorizeRoles(['provider']), providerController.createAccountLink);

// Banking information management
router.get('/connect/banking', authMiddleware, authorizeRoles(['provider']), providerController.getBankingInformation);
router.put('/connect/banking', authMiddleware, authorizeRoles(['provider']), providerController.updateBankingInformation);

// Payout preference configuration
router.get('/connect/payout-preferences', authMiddleware, authorizeRoles(['provider']), providerController.getPayoutPreferences);
router.put('/connect/payout-preferences', authMiddleware, authorizeRoles(['provider']), providerController.updatePayoutPreferences);

// Verification status tracking
router.get('/connect/verification-status', authMiddleware, authorizeRoles(['provider']), providerController.getVerificationStatus);

module.exports = router; 