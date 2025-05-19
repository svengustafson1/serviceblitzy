/**
 * Payout Routes
 * Defines and exports an Express Router for provider payout management
 * Implements secure endpoints for initiating, tracking, and managing automated payments to service providers via Stripe Connect
 * 
 * This router handles provider payout history retrieval, payout status updates, and automated disbursement scheduling.
 * It applies authentication middleware to all routes and authorizes access based on user roles,
 * with specific endpoints restricted to providers or administrators.
 */
const express = require('express');
const router = express.Router();
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');
const payoutController = require('../controllers/payout.controller');

// Provider Connect account management - Stripe Connect onboarding and account management
router.post('/connect/create-account', authMiddleware, authorizeRoles(['provider']), payoutController.createConnectAccount);
router.post('/connect/create-account-link', authMiddleware, authorizeRoles(['provider']), payoutController.createAccountLink);
router.get('/connect/account', authMiddleware, authorizeRoles(['provider']), payoutController.getConnectAccount);
router.post('/connect/create-login-link', authMiddleware, authorizeRoles(['provider']), payoutController.createLoginLink);

// Payout processing - Initiate transfers to provider accounts with commission calculation
router.post('/process', authMiddleware, authorizeRoles(['admin']), payoutController.processPayout);

// Payout history and details - Retrieve payout records with filtering and pagination
router.get('/history', authMiddleware, authorizeRoles(['provider', 'admin']), payoutController.getPayoutHistory);
router.get('/:id', authMiddleware, authorizeRoles(['provider', 'admin']), payoutController.getPayoutById);

// Webhook route (no auth needed as it's called by Stripe) - Handle Stripe Connect payout events
router.post('/webhook', payoutController.handleConnectWebhook);

module.exports = router;