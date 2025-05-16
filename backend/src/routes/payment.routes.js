const express = require('express');
const router = express.Router();
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');
const paymentController = require('../controllers/payment.controller');

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

module.exports = router; 