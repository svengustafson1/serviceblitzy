/**
 * Provider Payout Service
 * Manages automated payment distribution to service providers using Stripe Connect
 * 
 * Features:
 * - Provider onboarding to Stripe Connect
 * - Processing transfers from platform to provider accounts
 * - Calculating and retaining platform fees
 * - Generating payout receipts
 * - Tracking disbursement history
 * - Idempotent operations with unique transaction references
 * - Circuit breaker pattern for Stripe API calls
 * - Queue-based retry mechanism for transient failures
 * - Provider identity verification requirements
 */

// Dependencies
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

// Constants
const RETRY_ATTEMPTS = 3;
const CIRCUIT_BREAKER_THRESHOLD = 5; // Number of failures before circuit opens
const CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute timeout before trying again
const DEFAULT_PLATFORM_FEE_PERCENT = 10; // 10% platform fee by default

/**
 * Circuit Breaker implementation for Stripe API calls
 */
class CircuitBreaker {
  constructor(service) {
    this.service = service;
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.resetTimeout = null;
  }

  async call(method, ...args) {
    if (this.state === 'OPEN') {
      // Check if timeout has elapsed and we should try again
      const now = Date.now();
      if (now - this.lastFailureTime >= CIRCUIT_BREAKER_TIMEOUT) {
        this.state = 'HALF_OPEN';
        console.log(`Circuit breaker for ${this.service} moved to HALF_OPEN state`);
      } else {
        throw new Error(`Circuit breaker for ${this.service} is OPEN`);
      }
    }

    try {
      const result = await method(...args);
      
      // If we were in HALF_OPEN state and the call succeeded, reset the circuit breaker
      if (this.state === 'HALF_OPEN') {
        this.reset();
      }
      
      return result;
    } catch (error) {
      this.recordFailure(error);
      throw error;
    }
  }

  recordFailure(error) {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    console.error(`Circuit breaker for ${this.service} recorded failure: ${error.message}`);
    
    if (this.state === 'CLOSED' && this.failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
      this.state = 'OPEN';
      console.log(`Circuit breaker for ${this.service} moved to OPEN state`);
      
      // Set up automatic reset after timeout
      this.resetTimeout = setTimeout(() => {
        this.state = 'HALF_OPEN';
        console.log(`Circuit breaker for ${this.service} moved to HALF_OPEN state`);
      }, CIRCUIT_BREAKER_TIMEOUT);
    }
  }

  reset() {
    this.failureCount = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = null;
    
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
      this.resetTimeout = null;
    }
    
    console.log(`Circuit breaker for ${this.service} reset to CLOSED state`);
  }
}

// Initialize circuit breakers for different Stripe services
const stripeAccountCircuitBreaker = new CircuitBreaker('stripe.accounts');
const stripeTransferCircuitBreaker = new CircuitBreaker('stripe.transfers');
const stripeBalanceCircuitBreaker = new CircuitBreaker('stripe.balance');

/**
 * Provider Payout Service
 */
const providerPayoutService = {
  /**
   * Verifies if a provider is eligible for payouts
   * Checks if they have completed Stripe Connect onboarding and identity verification
   * 
   * @param {number} providerId - The ID of the service provider
   * @returns {Promise<boolean>} - Whether the provider is eligible for payouts
   */
  async isProviderEligibleForPayouts(providerId) {
    try {
      const provider = await db.query(
        'SELECT stripe_account_id, is_verified FROM service_providers WHERE id = $1',
        [providerId]
      );

      if (provider.rows.length === 0) {
        throw new Error(`Provider with ID ${providerId} not found`);
      }

      const { stripe_account_id, is_verified } = provider.rows[0];

      // Provider must be verified in our system
      if (!is_verified) {
        console.log(`Provider ${providerId} is not verified in our system`);
        return false;
      }

      // Provider must have a Stripe Connect account
      if (!stripe_account_id) {
        console.log(`Provider ${providerId} does not have a Stripe Connect account`);
        return false;
      }

      // Check if the Stripe Connect account is properly set up
      const account = await stripeAccountCircuitBreaker.call(
        stripe.accounts.retrieve.bind(stripe.accounts),
        stripe_account_id
      );

      // Check if the account has the required capabilities and is in good standing
      const isPayoutsEnabled = account.capabilities && 
                              account.capabilities.transfers === 'active';
      const isAccountActive = account.charges_enabled && account.payouts_enabled;

      return isPayoutsEnabled && isAccountActive;
    } catch (error) {
      console.error(`Error checking provider eligibility: ${error.message}`);
      return false;
    }
  },

  /**
   * Calculates the platform fee for a payment
   * 
   * @param {number} amount - The payment amount in cents
   * @param {number} serviceId - The ID of the service (optional, for service-specific fees)
   * @returns {Promise<number>} - The platform fee amount in cents
   */
  async calculatePlatformFee(amount, serviceId = null) {
    try {
      let feePercent = DEFAULT_PLATFORM_FEE_PERCENT;

      // Check if there's a service-specific fee percentage
      if (serviceId) {
        const serviceResult = await db.query(
          'SELECT markup_percentage FROM services WHERE id = $1',
          [serviceId]
        );

        if (serviceResult.rows.length > 0 && serviceResult.rows[0].markup_percentage) {
          feePercent = serviceResult.rows[0].markup_percentage;
        }
      }

      // Calculate the fee amount (rounded to nearest cent)
      const feeAmount = Math.round((amount * feePercent) / 100);
      return feeAmount;
    } catch (error) {
      console.error(`Error calculating platform fee: ${error.message}`);
      // Fall back to default fee calculation in case of error
      return Math.round((amount * DEFAULT_PLATFORM_FEE_PERCENT) / 100);
    }
  },

  /**
   * Creates a payout to a provider for a completed payment
   * 
   * @param {number} paymentId - The ID of the completed payment
   * @param {string} idempotencyKey - Unique key to ensure idempotent operations (optional)
   * @returns {Promise<Object>} - The created payout record
   */
  async createPayout(paymentId, idempotencyKey = null) {
    // Generate idempotency key if not provided
    const idempotencyKeyToUse = idempotencyKey || `payout_${paymentId}_${uuidv4()}`;
    
    // Start a database transaction
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Check if a payout already exists for this payment
      const existingPayout = await client.query(
        'SELECT * FROM provider_payouts WHERE payment_id = $1',
        [paymentId]
      );
      
      if (existingPayout.rows.length > 0) {
        // Payout already exists, return it (idempotent operation)
        await client.query('COMMIT');
        return existingPayout.rows[0];
      }
      
      // Get payment details
      const paymentResult = await client.query(
        `SELECT p.*, sr.service_id, sp.stripe_account_id 
         FROM payments p 
         JOIN service_requests sr ON p.service_request_id = sr.id 
         JOIN service_providers sp ON p.provider_id = sp.id 
         WHERE p.id = $1 AND p.status = 'completed'`,
        [paymentId]
      );
      
      if (paymentResult.rows.length === 0) {
        throw new Error(`Payment with ID ${paymentId} not found or not completed`);
      }
      
      const payment = paymentResult.rows[0];
      
      // Check if provider is eligible for payouts
      const isEligible = await this.isProviderEligibleForPayouts(payment.provider_id);
      
      if (!isEligible) {
        throw new Error(`Provider ${payment.provider_id} is not eligible for payouts`);
      }
      
      // Calculate platform fee
      const platformFee = await this.calculatePlatformFee(payment.amount, payment.service_id);
      
      // Calculate provider amount (payment amount minus platform fee)
      const providerAmount = payment.amount - platformFee;
      
      // Create transfer to provider's Stripe Connect account
      const transfer = await stripeTransferCircuitBreaker.call(
        stripe.transfers.create.bind(stripe.transfers),
        {
          amount: providerAmount,
          currency: payment.currency || 'usd',
          destination: payment.stripe_account_id,
          transfer_group: `payment_${payment.id}`,
          metadata: {
            payment_id: payment.id,
            service_request_id: payment.service_request_id,
            provider_id: payment.provider_id,
            platform_fee: platformFee
          }
        },
        { idempotencyKey: idempotencyKeyToUse }
      );
      
      // Record the payout in our database
      const payoutResult = await client.query(
        `INSERT INTO provider_payouts 
         (provider_id, payment_id, stripe_payout_id, amount, status, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) 
         RETURNING *`,
        [
          payment.provider_id,
          payment.id,
          transfer.id,
          providerAmount,
          'completed'
        ]
      );
      
      // Commit the transaction
      await client.query('COMMIT');
      
      return payoutResult.rows[0];
    } catch (error) {
      // Rollback the transaction on error
      await client.query('ROLLBACK');
      
      console.error(`Error creating payout: ${error.message}`);
      
      // Record failed payout attempt
      try {
        await db.query(
          `INSERT INTO provider_payouts 
           (provider_id, payment_id, amount, status, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, NOW(), NOW())`,
          [
            payment?.provider_id,
            paymentId,
            payment?.amount ? (payment.amount - (await this.calculatePlatformFee(payment.amount, payment?.service_id))) : 0,
            'failed'
          ]
        );
      } catch (dbError) {
        console.error(`Error recording failed payout: ${dbError.message}`);
      }
      
      throw error;
    } finally {
      // Release the client back to the pool
      client.release();
    }
  },

  /**
   * Retries a failed payout
   * 
   * @param {number} payoutId - The ID of the failed payout to retry
   * @returns {Promise<Object>} - The updated payout record
   */
  async retryPayout(payoutId) {
    // Start a database transaction
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Get the failed payout details
      const payoutResult = await client.query(
        'SELECT * FROM provider_payouts WHERE id = $1 AND status = $2',
        [payoutId, 'failed']
      );
      
      if (payoutResult.rows.length === 0) {
        throw new Error(`Failed payout with ID ${payoutId} not found`);
      }
      
      const payout = payoutResult.rows[0];
      
      // Create a new idempotency key for the retry
      const idempotencyKey = `retry_payout_${payout.id}_${uuidv4()}`;
      
      // Attempt to create the payout again
      const newPayout = await this.createPayout(payout.payment_id, idempotencyKey);
      
      // Update the status of the original failed payout to 'retried'
      await client.query(
        'UPDATE provider_payouts SET status = $1, updated_at = NOW() WHERE id = $2',
        ['retried', payoutId]
      );
      
      // Commit the transaction
      await client.query('COMMIT');
      
      return newPayout;
    } catch (error) {
      // Rollback the transaction on error
      await client.query('ROLLBACK');
      
      console.error(`Error retrying payout: ${error.message}`);
      throw error;
    } finally {
      // Release the client back to the pool
      client.release();
    }
  },

  /**
   * Generates a receipt for a completed payout
   * 
   * @param {number} payoutId - The ID of the completed payout
   * @returns {Promise<Object>} - The receipt data
   */
  async generatePayoutReceipt(payoutId) {
    try {
      // Get the payout details with related information
      const receiptData = await db.query(
        `SELECT 
           pp.id as payout_id,
           pp.amount as payout_amount,
           pp.created_at as payout_date,
           pp.stripe_payout_id,
           p.amount as payment_amount,
           p.stripe_payment_intent_id,
           sr.description as service_description,
           s.name as service_name,
           h.user_id as homeowner_user_id,
           sp.user_id as provider_user_id,
           sp.company_name as provider_company,
           u_h.first_name as homeowner_first_name,
           u_h.last_name as homeowner_last_name,
           u_p.first_name as provider_first_name,
           u_p.last_name as provider_last_name
         FROM provider_payouts pp
         JOIN payments p ON pp.payment_id = p.id
         JOIN service_requests sr ON p.service_request_id = sr.id
         JOIN services s ON sr.service_id = s.id
         JOIN homeowners h ON p.homeowner_id = h.id
         JOIN service_providers sp ON p.provider_id = sp.id
         JOIN users u_h ON h.user_id = u_h.id
         JOIN users u_p ON sp.user_id = u_p.id
         WHERE pp.id = $1 AND pp.status = $2`,
        [payoutId, 'completed']
      );
      
      if (receiptData.rows.length === 0) {
        throw new Error(`Completed payout with ID ${payoutId} not found`);
      }
      
      const receipt = receiptData.rows[0];
      
      // Calculate platform fee
      const platformFee = receipt.payment_amount - receipt.payout_amount;
      
      // Format the receipt data
      return {
        receipt_id: `RCPT-${receipt.payout_id}`,
        payout_id: receipt.payout_id,
        payout_date: receipt.payout_date,
        stripe_payout_id: receipt.stripe_payout_id,
        service_name: receipt.service_name,
        service_description: receipt.service_description,
        provider: {
          name: receipt.provider_company || `${receipt.provider_first_name} ${receipt.provider_last_name}`,
          user_id: receipt.provider_user_id
        },
        homeowner: {
          name: `${receipt.homeowner_first_name} ${receipt.homeowner_last_name}`,
          user_id: receipt.homeowner_user_id
        },
        payment_amount: receipt.payment_amount,
        platform_fee: platformFee,
        payout_amount: receipt.payout_amount,
        currency: 'usd' // Default to USD, could be retrieved from payment record if stored
      };
    } catch (error) {
      console.error(`Error generating payout receipt: ${error.message}`);
      throw error;
    }
  },

  /**
   * Gets payout history for a provider
   * 
   * @param {number} providerId - The ID of the service provider
   * @param {Object} options - Query options (limit, offset, status)
   * @returns {Promise<Object>} - Payout history with pagination info
   */
  async getProviderPayoutHistory(providerId, options = {}) {
    const { limit = 10, offset = 0, status = null } = options;
    
    try {
      let query = `
        SELECT 
          pp.*,
          p.stripe_payment_intent_id,
          sr.description as service_description,
          s.name as service_name
        FROM provider_payouts pp
        JOIN payments p ON pp.payment_id = p.id
        JOIN service_requests sr ON p.service_request_id = sr.id
        JOIN services s ON sr.service_id = s.id
        WHERE pp.provider_id = $1
      `;
      
      const queryParams = [providerId];
      let paramIndex = 2;
      
      if (status) {
        query += ` AND pp.status = $${paramIndex}`;
        queryParams.push(status);
        paramIndex++;
      }
      
      query += ` ORDER BY pp.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(limit, offset);
      
      // Get the payouts
      const payoutsResult = await db.query(query, queryParams);
      
      // Get the total count for pagination
      let countQuery = `
        SELECT COUNT(*) as total
        FROM provider_payouts
        WHERE provider_id = $1
      `;
      
      const countParams = [providerId];
      paramIndex = 2;
      
      if (status) {
        countQuery += ` AND status = $${paramIndex}`;
        countParams.push(status);
      }
      
      const countResult = await db.query(countQuery, countParams);
      
      return {
        payouts: payoutsResult.rows,
        pagination: {
          total: parseInt(countResult.rows[0].total),
          limit,
          offset,
          hasMore: offset + limit < parseInt(countResult.rows[0].total)
        }
      };
    } catch (error) {
      console.error(`Error getting provider payout history: ${error.message}`);
      throw error;
    }
  },

  /**
   * Processes pending payouts in a batch operation
   * This can be called by a scheduled job to automatically process payouts
   * 
   * @param {number} batchSize - Maximum number of payouts to process in this batch
   * @returns {Promise<Object>} - Results of the batch processing
   */
  async processPendingPayouts(batchSize = 10) {
    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: []
    };
    
    try {
      // Get completed payments that don't have associated payouts yet
      const pendingPayments = await db.query(
        `SELECT p.id 
         FROM payments p 
         LEFT JOIN provider_payouts pp ON p.id = pp.payment_id 
         WHERE p.status = 'completed' AND pp.id IS NULL 
         LIMIT $1`,
        [batchSize]
      );
      
      if (pendingPayments.rows.length === 0) {
        return results;
      }
      
      // Process each pending payment
      for (const payment of pendingPayments.rows) {
        results.processed++;
        
        try {
          await this.createPayout(payment.id);
          results.succeeded++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            paymentId: payment.id,
            error: error.message
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error(`Error processing pending payouts: ${error.message}`);
      throw error;
    }
  },

  /**
   * Checks if a provider has completed Stripe Connect onboarding
   * 
   * @param {number} providerId - The ID of the service provider
   * @returns {Promise<boolean>} - Whether the provider has completed onboarding
   */
  async hasCompletedOnboarding(providerId) {
    try {
      const provider = await db.query(
        'SELECT stripe_account_id FROM service_providers WHERE id = $1',
        [providerId]
      );

      if (provider.rows.length === 0 || !provider.rows[0].stripe_account_id) {
        return false;
      }

      const stripeAccountId = provider.rows[0].stripe_account_id;
      
      // Check the account details in Stripe
      const account = await stripeAccountCircuitBreaker.call(
        stripe.accounts.retrieve.bind(stripe.accounts),
        stripeAccountId
      );
      
      // Check if the account has completed all requirements
      return account.details_submitted && 
             account.charges_enabled && 
             account.payouts_enabled;
    } catch (error) {
      console.error(`Error checking onboarding status: ${error.message}`);
      return false;
    }
  },

  /**
   * Creates a Stripe Connect account link for onboarding
   * 
   * @param {number} providerId - The ID of the service provider
   * @param {string} returnUrl - URL to redirect after onboarding
   * @param {string} refreshUrl - URL to redirect if onboarding session expires
   * @returns {Promise<Object>} - The account link URL and expiration time
   */
  async createOnboardingLink(providerId, returnUrl, refreshUrl) {
    try {
      // Get the provider's Stripe account ID or create one if it doesn't exist
      const providerResult = await db.query(
        'SELECT stripe_account_id FROM service_providers WHERE id = $1',
        [providerId]
      );
      
      if (providerResult.rows.length === 0) {
        throw new Error(`Provider with ID ${providerId} not found`);
      }
      
      let stripeAccountId = providerResult.rows[0].stripe_account_id;
      
      // If the provider doesn't have a Stripe account yet, create one
      if (!stripeAccountId) {
        // Get provider details to use for the account
        const providerDetails = await db.query(
          `SELECT 
             sp.company_name, 
             u.email, 
             u.first_name, 
             u.last_name, 
             u.phone 
           FROM service_providers sp 
           JOIN users u ON sp.user_id = u.id 
           WHERE sp.id = $1`,
          [providerId]
        );
        
        if (providerDetails.rows.length === 0) {
          throw new Error(`Provider details not found for ID ${providerId}`);
        }
        
        const provider = providerDetails.rows[0];
        
        // Create a Stripe Connect account
        const account = await stripeAccountCircuitBreaker.call(
          stripe.accounts.create.bind(stripe.accounts),
          {
            type: 'express',
            country: 'US', // Default to US, could be made configurable
            email: provider.email,
            business_type: provider.company_name ? 'company' : 'individual',
            business_profile: {
              name: provider.company_name || `${provider.first_name} ${provider.last_name}`,
              url: process.env.WEBSITE_URL || 'https://homehub.com',
            },
            capabilities: {
              transfers: { requested: true },
              card_payments: { requested: true }
            },
            metadata: {
              provider_id: providerId
            }
          }
        );
        
        stripeAccountId = account.id;
        
        // Update the provider record with the new Stripe account ID
        await db.query(
          'UPDATE service_providers SET stripe_account_id = $1, updated_at = NOW() WHERE id = $2',
          [stripeAccountId, providerId]
        );
      }
      
      // Create an account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding'
      });
      
      return {
        url: accountLink.url,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Links expire after 7 days
      };
    } catch (error) {
      console.error(`Error creating onboarding link: ${error.message}`);
      throw error;
    }
  },

  /**
   * Gets the balance available for payouts for a provider
   * 
   * @param {number} providerId - The ID of the service provider
   * @returns {Promise<Object>} - The available and pending balance
   */
  async getProviderBalance(providerId) {
    try {
      const provider = await db.query(
        'SELECT stripe_account_id FROM service_providers WHERE id = $1',
        [providerId]
      );

      if (provider.rows.length === 0 || !provider.rows[0].stripe_account_id) {
        throw new Error(`Provider with ID ${providerId} not found or has no Stripe account`);
      }

      const stripeAccountId = provider.rows[0].stripe_account_id;
      
      // Get the balance from Stripe
      const balance = await stripeBalanceCircuitBreaker.call(
        stripe.balance.retrieve.bind(stripe.balance),
        { stripeAccount: stripeAccountId }
      );
      
      // Format the balance information
      const available = balance.available.reduce((sum, fund) => sum + fund.amount, 0);
      const pending = balance.pending.reduce((sum, fund) => sum + fund.amount, 0);
      
      return {
        available,
        pending,
        currency: 'usd', // Default to USD, could be made dynamic if multiple currencies are supported
        last_updated: new Date()
      };
    } catch (error) {
      console.error(`Error getting provider balance: ${error.message}`);
      throw error;
    }
  }
};

module.exports = providerPayoutService;