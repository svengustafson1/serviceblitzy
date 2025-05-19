/**
 * Payout Routes
 * Defines endpoints for provider payout management via Stripe Connect
 * Implements secure routes for initiating, tracking, and managing automated payments to service providers
 */

const express = require('express');
const router = express.Router();
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');
const payoutController = require('../controllers/payout.controller');

// Stripe Connect account management routes
router.post('/connect/create-account', authMiddleware, authorizeRoles(['provider']), payoutController.createConnectAccount);
router.post('/connect/create-account-link', authMiddleware, authorizeRoles(['provider']), payoutController.createAccountLink);
router.get('/connect/account', authMiddleware, authorizeRoles(['provider']), payoutController.getConnectAccount);
router.post('/connect/create-login-link', authMiddleware, authorizeRoles(['provider']), payoutController.createLoginLink);

// Payout processing routes
router.post('/process', authMiddleware, authorizeRoles(['admin']), payoutController.processPayout);

// Payout history and details routes
router.get('/history', authMiddleware, authorizeRoles(['provider', 'admin']), payoutController.getPayoutHistory);
router.get('/:id', authMiddleware, authorizeRoles(['provider', 'admin']), payoutController.getPayoutById);

// Webhook route (no auth needed as it's called by Stripe)
router.post('/webhook', payoutController.handleConnectWebhook);

module.exports = router;