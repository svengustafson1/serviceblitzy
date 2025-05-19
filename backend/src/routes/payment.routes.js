const express = require('express');
const router = express.Router();
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');
const paymentController = require('../controllers/payment.controller');
const payoutController = require('../controllers/payout.controller');

// Payment intent routes
router.post('/create-intent', authMiddleware, authorizeRoles(['homeowner']), paymentController.createPaymentIntent);
router.post('/confirm', authMiddleware, authorizeRoles(['homeowner']), paymentController.confirmPayment);

// Payment history routes
router.get('/history', authMiddleware, paymentController.getPaymentHistory);
router.get('/analytics', authMiddleware, authorizeRoles(['provider', 'admin']), paymentController.getPaymentAnalytics);
router.get('/:id', authMiddleware, paymentController.getPaymentById);

// Refund routes
router.post('/:id/refund', authMiddleware, paymentController.createRefund);

// Stripe Connect routes for provider payments
router.post('/connect/account', authMiddleware, authorizeRoles(['provider']), payoutController.createConnectAccount);
router.get('/connect/account', authMiddleware, authorizeRoles(['provider']), payoutController.getConnectAccount);
router.get('/connect/account-link', authMiddleware, authorizeRoles(['provider']), payoutController.createAccountLink);
router.get('/connect/login-link', authMiddleware, authorizeRoles(['provider']), payoutController.createLoginLink);

// Provider payout routes
router.post('/process-payout', authMiddleware, authorizeRoles(['admin']), payoutController.processPayout);
router.get('/payouts', authMiddleware, authorizeRoles(['provider', 'admin']), payoutController.getPayoutHistory);
router.get('/payouts/:id', authMiddleware, payoutController.getPayoutById);

// Webhook routes (no auth needed as they're called by Stripe)
router.post('/webhook', paymentController.handleWebhook);
router.post('/connect/webhook', payoutController.handleConnectWebhook);

module.exports = router;