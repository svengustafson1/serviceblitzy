const express = require('express');
const router = express.Router();
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');
const bidController = require('../controllers/bid.controller');

// Routes for all users
router.get('/:id', authMiddleware, bidController.getBidById);

// Provider-specific routes
router.get('/', authMiddleware, authorizeRoles(['provider']), bidController.getProviderBids);
router.put('/:id', authMiddleware, authorizeRoles(['provider']), bidController.updateBid);
router.delete('/:id', authMiddleware, authorizeRoles(['provider']), bidController.deleteBid);

// Homeowner-specific routes
router.get('/received', authMiddleware, authorizeRoles(['homeowner']), bidController.getHomeownerReceivedBids);
router.patch('/:id/accept', authMiddleware, authorizeRoles(['homeowner']), bidController.acceptBid);

module.exports = router; 