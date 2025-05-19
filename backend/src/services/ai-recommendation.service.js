/**
 * AI Recommendation Service
 * Provides intelligent bid analysis and recommendation capabilities for the service marketplace
 */

const CircuitBreaker = require('opossum');

// Configuration constants
const DEFAULT_WEIGHTS = {
  providerRating: 0.35,      // Provider's average rating weight
  pricingCompetitiveness: 0.25, // How competitive the price is compared to other bids and market rates
  responseTime: 0.15,        // How quickly the provider responds to requests
  completionRate: 0.15,      // Provider's job completion rate
  relevantExperience: 0.10   // Provider's experience with similar jobs
};

// Circuit breaker configuration
const CIRCUIT_BREAKER_OPTIONS = {
  timeout: 10000,            // Time in ms before request is considered failed
  errorThresholdPercentage: 50, // Percentage of failures before circuit opens
  resetTimeout: 30000,       // Time in ms to wait before trying again
  rollingCountTimeout: 60000, // Time window in ms for error rate calculation
  rollingCountBuckets: 10    // Number of buckets for error rate calculation
};

// Monitoring thresholds
const LATENCY_THRESHOLD_MS = 5000;  // Alert if processing takes longer than this
const ERROR_RATE_THRESHOLD = 0.1;   // Alert if error rate exceeds this value (10%)

/**
 * Analyzes a bid and generates a recommendation score
 * @param {Object} bid - The bid to analyze
 * @param {Object} serviceRequest - The service request the bid is for
 * @param {Object} provider - The service provider who submitted the bid
 * @param {Array} otherBids - Other bids for the same service request (for comparison)
 * @param {Object} options - Optional configuration parameters
 * @returns {Promise<Object>} Recommendation data including score, confidence, and explanation
 */
async function analyzeBid(bid, serviceRequest, provider, otherBids = [], options = {}) {
  const startTime = Date.now();
  const weights = { ...DEFAULT_WEIGHTS, ...options.weights };
  
  try {
    // Extract relevant factors for analysis
    const factors = await extractFactors(bid, serviceRequest, provider, otherBids);
    
    // Calculate individual scores for each factor
    const scores = calculateFactorScores(factors, otherBids);
    
    // Calculate weighted recommendation score
    const weightedScores = {};
    let totalScore = 0;
    
    for (const [factor, weight] of Object.entries(weights)) {
      if (scores[factor] !== undefined) {
        weightedScores[factor] = scores[factor] * weight;
        totalScore += weightedScores[factor];
      }
    }
    
    // Calculate confidence level based on data completeness and variance
    const confidence = calculateConfidence(factors, scores);
    
    // Generate explanation for the recommendation
    const explanation = generateExplanation(weightedScores, factors, scores);
    
    // Monitor latency
    const processingTime = Date.now() - startTime;
    if (processingTime > LATENCY_THRESHOLD_MS) {
      console.warn(`AI recommendation processing time exceeded threshold: ${processingTime}ms`);
    }
    
    return {
      score: parseFloat(totalScore.toFixed(2)),
      confidence: parseFloat(confidence.toFixed(2)),
      explanation,
      factors: weightedScores,
      processingTime
    };
  } catch (error) {
    console.error('Error in AI recommendation analysis:', error);
    throw error;
  }
}

/**
 * Extracts relevant factors for bid analysis
 * @param {Object} bid - The bid to analyze
 * @param {Object} serviceRequest - The service request the bid is for
 * @param {Object} provider - The service provider who submitted the bid
 * @param {Array} otherBids - Other bids for the same service request
 * @returns {Promise<Object>} Extracted factors for analysis
 */
async function extractFactors(bid, serviceRequest, provider, otherBids) {
  // Provider rating factor
  const providerRating = provider.avg_rating || 0;
  
  // Pricing competitiveness factor
  const avgBidPrice = otherBids.length > 0 
    ? otherBids.reduce((sum, b) => sum + parseFloat(b.price), 0) / otherBids.length 
    : bid.price;
  
  const pricingCompetitiveness = avgBidPrice > 0 
    ? 1 - Math.min(1, Math.max(0, (bid.price - avgBidPrice * 0.7) / (avgBidPrice * 0.6))) 
    : 0.5; // Default to neutral if no comparison available
  
  // Response time factor (how quickly provider responds to requests)
  // This would ideally come from historical data
  const responseTime = provider.avg_response_time 
    ? Math.min(1, 24 / provider.avg_response_time) // Normalize: 24 hours or less is ideal
    : 0.5; // Default to neutral if no data
  
  // Completion rate factor
  const completionRate = provider.completion_rate || 0.5;
  
  // Relevant experience factor
  // Check if provider has completed similar jobs successfully
  const relevantExperience = provider.services_offered && serviceRequest.service_id
    ? provider.services_offered.includes(serviceRequest.service_id) ? 1 : 0.3
    : 0.5; // Default to neutral if no data
  
  return {
    providerRating,
    pricingCompetitiveness,
    responseTime,
    completionRate,
    relevantExperience,
    bidPrice: bid.price,
    avgBidPrice,
    estimatedHours: bid.estimated_hours || 0
  };
}

/**
 * Calculates scores for individual factors
 * @param {Object} factors - Extracted factors for analysis
 * @param {Array} otherBids - Other bids for comparison
 * @returns {Object} Individual scores for each factor
 */
function calculateFactorScores(factors, otherBids) {
  return {
    // Provider rating: Linear scale from 0-5 stars normalized to 0-1
    providerRating: Math.min(1, factors.providerRating / 5),
    
    // Pricing competitiveness: Already normalized to 0-1 in extractFactors
    pricingCompetitiveness: factors.pricingCompetitiveness,
    
    // Response time: Already normalized to 0-1 in extractFactors
    responseTime: factors.responseTime,
    
    // Completion rate: Already normalized to 0-1
    completionRate: factors.completionRate,
    
    // Relevant experience: Already normalized to 0-1 in extractFactors
    relevantExperience: factors.relevantExperience
  };
}

/**
 * Calculates confidence level for the recommendation
 * @param {Object} factors - Extracted factors for analysis
 * @param {Object} scores - Individual scores for each factor
 * @returns {number} Confidence level from 0-1
 */
function calculateConfidence(factors, scores) {
  // Count how many factors have actual data vs. default values
  const factorKeys = Object.keys(DEFAULT_WEIGHTS);
  const availableFactors = factorKeys.filter(key => factors[key] !== undefined && factors[key] !== 0.5);
  
  // Data completeness component (50% of confidence)
  const completeness = availableFactors.length / factorKeys.length;
  
  // Score consistency component (50% of confidence)
  // If scores are all similar, confidence is lower as it's harder to differentiate
  const scoreValues = Object.values(scores);
  const avgScore = scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length;
  const variance = scoreValues.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scoreValues.length;
  const consistency = Math.min(1, variance * 10); // Normalize: higher variance = higher confidence (up to a point)
  
  // Combined confidence score
  return (completeness * 0.5) + (consistency * 0.5);
}

/**
 * Generates human-readable explanation for the recommendation
 * @param {Object} weightedScores - Scores weighted by importance
 * @param {Object} factors - Extracted factors for analysis
 * @param {Object} scores - Individual scores for each factor
 * @returns {string} Human-readable explanation
 */
function generateExplanation(weightedScores, factors, scores) {
  // Sort factors by their contribution to the final score
  const sortedFactors = Object.entries(weightedScores)
    .sort((a, b) => b[1] - a[1])
    .map(([factor, score]) => ({ factor, score }));
  
  let explanation = [];
  
  // Add top positive factors
  const positiveFactors = sortedFactors.filter(f => f.score > 0.15); // Significant positive contribution
  if (positiveFactors.length > 0) {
    explanation.push("Strengths: " + positiveFactors.map(f => {
      switch (f.factor) {
        case 'providerRating':
          return `Provider has a strong rating of ${(factors.providerRating).toFixed(1)} out of 5`;
        case 'pricingCompetitiveness':
          return `Price is competitive compared to other bids (${factors.bidPrice} vs. avg ${factors.avgBidPrice.toFixed(2)})`;
        case 'responseTime':
          return 'Provider typically responds quickly to requests';
        case 'completionRate':
          return `Provider has a high job completion rate of ${(factors.completionRate * 100).toFixed(0)}%`;
        case 'relevantExperience':
          return 'Provider has relevant experience with this type of service';
        default:
          return '';
      }
    }).filter(text => text).join(". ") + ".");
  }
  
  // Add areas of concern
  const negativeFactors = sortedFactors.filter(f => f.score < 0.1); // Significant negative contribution
  if (negativeFactors.length > 0) {
    explanation.push("Areas of consideration: " + negativeFactors.map(f => {
      switch (f.factor) {
        case 'providerRating':
          return `Provider rating is ${(factors.providerRating).toFixed(1)} out of 5`;
        case 'pricingCompetitiveness':
          return factors.bidPrice > factors.avgBidPrice 
            ? `Price is higher than average (${factors.bidPrice} vs. avg ${factors.avgBidPrice.toFixed(2)})` 
            : `Price is significantly lower than average which may affect quality`;
        case 'responseTime':
          return 'Provider may take longer to respond to requests';
        case 'completionRate':
          return `Provider has a completion rate of ${(factors.completionRate * 100).toFixed(0)}%`;
        case 'relevantExperience':
          return 'Provider has limited experience with this type of service';
        default:
          return '';
      }
    }).filter(text => text).join(". ") + ".");
  }
  
  // Add general recommendation
  if (explanation.length === 0) {
    explanation.push("This bid appears to be average across all factors.");
  }
  
  return explanation.join(" ");
}

/**
 * Fallback function for deterministic ranking when AI processing fails
 * @param {Object} bid - The bid to analyze
 * @param {Object} provider - The service provider who submitted the bid
 * @param {Array} otherBids - Other bids for the same service request
 * @returns {Object} Basic recommendation data
 */
function deterministicRanking(bid, provider, otherBids = []) {
  // Simple weighted calculation based on rating and price
  const ratingScore = provider.avg_rating ? (provider.avg_rating / 5) : 0.5;
  
  // Price score (lower is better, but extremely low might be suspicious)
  let priceScore = 0.5;
  if (otherBids.length > 0) {
    const avgPrice = otherBids.reduce((sum, b) => sum + parseFloat(b.price), 0) / otherBids.length;
    if (bid.price < avgPrice * 0.5) {
      // Suspiciously low price
      priceScore = 0.3;
    } else if (bid.price > avgPrice * 1.5) {
      // Significantly higher price
      priceScore = 0.2;
    } else if (bid.price <= avgPrice) {
      // Good price (at or below average)
      priceScore = 0.8;
    } else {
      // Above average but not extreme
      priceScore = 0.6;
    }
  }
  
  // Combined score with simple weighting
  const score = (ratingScore * 0.7) + (priceScore * 0.3);
  
  // Simple explanation
  let explanation = "Based on basic provider rating and price comparison";
  if (provider.avg_rating) {
    explanation += `, provider rating is ${provider.avg_rating.toFixed(1)} out of 5`;
  }
  
  return {
    score: parseFloat(score.toFixed(2)),
    confidence: 0.4, // Lower confidence for deterministic ranking
    explanation,
    factors: {
      providerRating: ratingScore * 0.7,
      pricingCompetitiveness: priceScore * 0.3
    },
    processingTime: 0,
    isFallback: true
  };
}

// Create circuit breaker for the analyzeBid function
const analyzeBreaker = new CircuitBreaker(analyzeBid, CIRCUIT_BREAKER_OPTIONS);

// Add listeners for circuit breaker events
analyzeBreaker.on('open', () => {
  console.warn('AI recommendation circuit breaker opened - too many failures');
});

analyzeBreaker.on('close', () => {
  console.log('AI recommendation circuit breaker closed - service recovered');
});

analyzeBreaker.on('halfOpen', () => {
  console.log('AI recommendation circuit breaker half-open - testing service');
});

analyzeBreaker.on('fallback', () => {
  console.log('AI recommendation using fallback mechanism');
});

// Set fallback function for circuit breaker
analyzeBreaker.fallback((bid, serviceRequest, provider, otherBids) => {
  console.log('Using deterministic ranking fallback for bid analysis');
  return deterministicRanking(bid, provider, otherBids);
});

/**
 * Generates recommendation for a bid
 * Uses circuit breaker pattern for resilience
 * @param {Object} bid - The bid to analyze
 * @param {Object} serviceRequest - The service request the bid is for
 * @param {Object} provider - The service provider who submitted the bid
 * @param {Array} otherBids - Other bids for the same service request
 * @param {Object} options - Optional configuration parameters
 * @returns {Promise<Object>} Recommendation data
 */
async function generateRecommendation(bid, serviceRequest, provider, otherBids = [], options = {}) {
  try {
    return await analyzeBreaker.fire(bid, serviceRequest, provider, otherBids, options);
  } catch (error) {
    console.error('Error generating recommendation:', error);
    // Circuit breaker should handle fallback, but just in case:
    return deterministicRanking(bid, provider, otherBids);
  }
}

/**
 * Batch processes multiple bids to generate recommendations
 * @param {Array} bids - Array of bids to analyze
 * @param {Object} serviceRequest - The service request the bids are for
 * @param {Object} providers - Map of provider objects by provider_id
 * @param {Object} options - Optional configuration parameters
 * @returns {Promise<Array>} Array of bids with recommendation data
 */
async function batchProcessBids(bids, serviceRequest, providers, options = {}) {
  // Create a copy of bids for processing
  const processedBids = [...bids];
  
  // Process each bid
  const recommendationPromises = bids.map(bid => {
    const provider = providers[bid.provider_id];
    const otherBids = bids.filter(b => b.id !== bid.id);
    
    return generateRecommendation(bid, serviceRequest, provider, otherBids, options)
      .then(recommendation => {
        return {
          ...bid,
          ai_recommended: recommendation.score > 0.7, // Flag as recommended if score is high
          recommendation_score: recommendation.score,
          recommendation_confidence: recommendation.confidence,
          recommendation_explanation: recommendation.explanation
        };
      })
      .catch(error => {
        console.error(`Error processing bid ${bid.id}:`, error);
        // Return original bid without recommendation data
        return bid;
      });
  });
  
  // Wait for all recommendations to complete
  return Promise.all(recommendationPromises);
}

/**
 * Gets monitoring statistics for the recommendation service
 * @returns {Object} Current monitoring statistics
 */
function getMonitoringStats() {
  return {
    state: analyzeBreaker.status.state,
    stats: {
      successful: analyzeBreaker.stats.successes,
      failed: analyzeBreaker.stats.failures,
      rejected: analyzeBreaker.stats.rejects,
      timeout: analyzeBreaker.stats.timeouts,
      fallbacks: analyzeBreaker.stats.fallbacks
    },
    errorRate: analyzeBreaker.stats.failures / (analyzeBreaker.stats.failures + analyzeBreaker.stats.successes || 1),
    latency: {
      mean: analyzeBreaker.stats.latencyMean,
      max: analyzeBreaker.stats.latencyMax
    }
  };
}

module.exports = {
  generateRecommendation,
  batchProcessBids,
  getMonitoringStats,
  // Exported for testing
  _internal: {
    analyzeBid,
    extractFactors,
    calculateFactorScores,
    calculateConfidence,
    generateExplanation,
    deterministicRanking
  }
};