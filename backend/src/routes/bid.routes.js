const express = require('express');
const router = express.Router();
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');
const bidController = require('../controllers/bid.controller');

// Provider-specific routes
router.get('/', authMiddleware, authorizeRoles(['provider']), bidController.getProviderBids);

// Homeowner-specific routes
router.get('/received', authMiddleware, authorizeRoles(['homeowner']), bidController.getHomeownerReceivedBids);

// AI recommendation routes
router.get('/recommendations/service-request/:id', authMiddleware, authorizeRoles(['homeowner']), bidController.getRecommendedBidsForServiceRequest);
router.get('/recommendations/top', authMiddleware, authorizeRoles(['homeowner']), bidController.getTopRecommendedBids);
router.get('/recommendations/score/:id', authMiddleware, bidController.getBidRecommendationScore);

// Fallback route for when AI service is unavailable
router.get('/ranked/service-request/:id', authMiddleware, authorizeRoles(['homeowner']), bidController.getRankedBidsForServiceRequest);

// Routes with ID parameter (must come after specific routes to avoid conflicts)
router.get('/:id', authMiddleware, bidController.getBidById);
router.put('/:id', authMiddleware, authorizeRoles(['provider']), bidController.updateBid);
router.delete('/:id', authMiddleware, authorizeRoles(['provider']), bidController.deleteBid);
router.patch('/:id/accept', authMiddleware, authorizeRoles(['homeowner']), bidController.acceptBid);

module.exports = router;