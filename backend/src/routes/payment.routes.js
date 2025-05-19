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

// Webhook route (no auth needed as it's called by Stripe)
router.post('/webhook', paymentController.handleWebhook);

// Stripe Connect routes
router.post('/connect/create-account', authMiddleware, authorizeRoles(['provider']), payoutController.createConnectAccount);
router.post('/connect/create-account-link', authMiddleware, authorizeRoles(['provider']), payoutController.createAccountLink);
router.get('/connect/account', authMiddleware, authorizeRoles(['provider']), payoutController.getConnectAccount);
router.post('/connect/create-login-link', authMiddleware, authorizeRoles(['provider']), payoutController.createLoginLink);

// Payout routes
router.post('/connect/payout', authMiddleware, authorizeRoles(['admin', 'provider']), payoutController.processPayout);
router.get('/connect/payouts', authMiddleware, authorizeRoles(['admin', 'provider']), payoutController.getPayoutHistory);
router.get('/connect/payouts/:id', authMiddleware, payoutController.getPayoutById);

// Connect webhook route (no auth needed as it's called by Stripe)
router.post('/connect/webhook', payoutController.handleConnectWebhook);

module.exports = router;