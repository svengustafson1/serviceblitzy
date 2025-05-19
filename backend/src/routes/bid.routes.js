const express = require('express');
const router = express.Router();
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');
const bidController = require('../controllers/bid.controller');

// Provider-specific routes
router.get('/', authMiddleware, authorizeRoles(['provider']), bidController.getProviderBids);

// Homeowner-specific routes
router.get('/received', authMiddleware, authorizeRoles(['homeowner']), bidController.getHomeownerReceivedBids);

// AI Recommendation routes
// Get top recommended bids across all service requests for a homeowner
router.get('/recommendations/top', authMiddleware, authorizeRoles(['homeowner']), bidController.getTopRecommendedBids);

// Get recommendation service health status (admin only)
router.get('/recommendations/health', authMiddleware, authorizeRoles(['admin']), bidController.getRecommendationServiceHealth);

// Get recommendations for a specific service request
router.get('/service-request/:requestId/recommendations', authMiddleware, authorizeRoles(['homeowner']), bidController.getRecommendationsForServiceRequest);

// Filter bids by recommendation score (min_score parameter)
router.get('/filter/by-score', authMiddleware, authorizeRoles(['homeowner']), bidController.filterBidsByRecommendationScore);

// Sort bids by recommendation score (asc or desc parameter)
router.get('/sort/by-score', authMiddleware, authorizeRoles(['homeowner']), bidController.sortBidsByRecommendationScore);

// Routes with ID parameters - these must come after specific routes to avoid conflicts
// Get detailed recommendation information for a specific bid
router.get('/:id/recommendation-details', authMiddleware, bidController.getBidRecommendationDetails);

// Accept a bid (homeowner only)
router.patch('/:id/accept', authMiddleware, authorizeRoles(['homeowner']), bidController.acceptBid);

// Get a bid by ID (all authenticated users)
router.get('/:id', authMiddleware, bidController.getBidById);

// Update a bid (provider only)
router.put('/:id', authMiddleware, authorizeRoles(['provider']), bidController.updateBid);

// Delete a bid (provider only)
router.delete('/:id', authMiddleware, authorizeRoles(['provider']), bidController.deleteBid);

module.exports = router;