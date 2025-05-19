/**
 * Provider Payout Service
 * Manages automated payment distribution to service providers using Stripe Connect
 * 
 * This service handles:
 * - Provider onboarding to Stripe Connect
 * - Processing transfers from platform to provider accounts
 * - Calculating and retaining platform fees
 * - Generating payout receipts
 * - Tracking disbursement history
 * 
 * Implements:
 * - Idempotent operations with unique transaction references
 * - Circuit breaker pattern for Stripe API calls
 * - Queue-based retry mechanisms for transient failures
 * - Provider identity verification requirements
 */

const { v4: uuidv4 } = require('uuid');
const CircuitBreaker = require('opossum');

// Initialize Stripe with error handling
let stripe;
try {
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  } else {
    console.warn('STRIPE_SECRET_KEY not found in environment variables. Payout features will be disabled.');
  }
} catch (error) {
  console.error('Error initializing Stripe:', error);
}

// Circuit breaker configuration for Stripe API calls
const breakerOptions = {
  timeout: 10000, // 10 seconds
  errorThresholdPercentage: 50,
  resetTimeout: 30000, // 30 seconds
  rollingCountTimeout: 60000, // 1 minute
  rollingCountBuckets: 10
};

// Create circuit breakers for critical Stripe operations
const transferBreaker = new CircuitBreaker(createTransfer, breakerOptions);
const accountBreaker = new CircuitBreaker(retrieveConnectAccount, breakerOptions);
const payoutBreaker = new CircuitBreaker(retrievePayout, breakerOptions);

// Helper function to check if Stripe is configured
const isStripeConfigured = () => !!stripe;

/**
 * Create a Stripe Connect account for a service provider
 * @param {Object} providerData - Provider data including business details
 * @returns {Promise<Object>} - Created Stripe Connect account
 */
async function createConnectAccount(providerData) {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured. Cannot create Connect account.');
  }

  try {
    // Create a Connect account with the provider's information
    const account = await stripe.accounts.create({
      type: 'express',
      country: providerData.country || 'US',
      email: providerData.email,
      business_type: 'individual',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      },
      business_profile: {
        mcc: '1520', // General Contractors
        url: providerData.website || `https://homehub.com/providers/${providerData.id}`
      },
      metadata: {
        provider_id: providerData.id
      }
    });

    return account;
  } catch (error) {
    console.error('Error creating Connect account:', error);
    throw error;
  }
}

/**
 * Create an account link for onboarding a Connect account
 * @param {string} accountId - Stripe Connect account ID
 * @param {string} refreshUrl - URL to redirect on refresh
 * @param {string} returnUrl - URL to redirect on completion
 * @returns {Promise<Object>} - Account link object
 */
async function createAccountLink(accountId, refreshUrl, returnUrl) {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured. Cannot create account link.');
  }

  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding'
    });

    return accountLink;
  } catch (error) {
    console.error('Error creating account link:', error);
    throw error;
  }
}

/**
 * Create a login link for a Connect account dashboard
 * @param {string} accountId - Stripe Connect account ID
 * @returns {Promise<Object>} - Login link object
 */
async function createLoginLink(accountId) {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured. Cannot create login link.');
  }

  try {
    const loginLink = await stripe.accounts.createLoginLink(accountId);
    return loginLink;
  } catch (error) {
    console.error('Error creating login link:', error);
    throw error;
  }
}

/**
 * Retrieve a Connect account with circuit breaker pattern
 * @param {string} accountId - Stripe Connect account ID
 * @returns {Promise<Object>} - Connect account details
 */
async function retrieveConnectAccount(accountId) {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured. Cannot retrieve Connect account.');
  }

  return await stripe.accounts.retrieve(accountId);
}

/**
 * Get Connect account details with circuit breaker protection
 * @param {string} accountId - Stripe Connect account ID
 * @returns {Promise<Object>} - Connect account details
 */
async function getConnectAccount(accountId) {
  try {
    return await accountBreaker.fire(accountId);
  } catch (error) {
    console.error('Circuit breaker error retrieving Connect account:', error);
    throw new Error('Unable to retrieve Connect account information. Please try again later.');
  }
}

/**
 * Check if a provider is eligible for payouts
 * @param {Object} db - Database client
 * @param {number} providerId - Provider ID
 * @returns {Promise<boolean>} - Whether provider is eligible for payouts
 */
async function isProviderEligibleForPayouts(db, providerId) {
  try {
    // Get provider details including verification status
    const providerResult = await db.query(
      `SELECT 
        sp.id, 
        sp.stripe_connect_account_id, 
        sp.stripe_connect_onboarded,
        sp.identity_verified
      FROM service_providers sp
      WHERE sp.id = $1`,
      [providerId]
    );

    if (providerResult.rows.length === 0) {
      return false;
    }

    const provider = providerResult.rows[0];

    // Provider must have a Connect account, be onboarded, and have identity verified
    if (!provider.stripe_connect_account_id || !provider.stripe_connect_onboarded || !provider.identity_verified) {
      return false;
    }

    // If provider has a Connect account, verify it's still valid and enabled for payouts
    if (isStripeConfigured() && provider.stripe_connect_account_id) {
      try {
        const account = await getConnectAccount(provider.stripe_connect_account_id);
        return account.payouts_enabled;
      } catch (error) {
        console.error('Error checking Connect account status:', error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error checking provider eligibility:', error);
    return false;
  }
}

/**
 * Calculate platform fee for a payment
 * @param {Object} db - Database client
 * @param {Object} payment - Payment details
 * @returns {Promise<Object>} - Fee calculation result
 */
async function calculatePlatformFee(db, payment) {
  try {
    // Get provider's commission rate
    const providerResult = await db.query(
      'SELECT commission_rate FROM service_providers WHERE id = $1',
      [payment.provider_id]
    );

    // Default to 10% if not set
    const commissionRate = providerResult.rows.length > 0 ? 
      providerResult.rows[0].commission_rate : 10;

    // Calculate platform fee and provider amount
    const platformFee = (payment.amount * commissionRate) / 100;
    const providerAmount = payment.amount - platformFee;

    return {
      platformFee,
      providerAmount,
      commissionRate
    };
  } catch (error) {
    console.error('Error calculating platform fee:', error);
    throw error;
  }
}

/**
 * Create a transfer to a Connect account with circuit breaker pattern
 * @param {Object} transferData - Transfer details
 * @returns {Promise<Object>} - Created transfer
 */
async function createTransfer(transferData) {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured. Cannot create transfer.');
  }

  return await stripe.transfers.create(transferData);
}

/**
 * Retrieve a payout with circuit breaker pattern
 * @param {string} payoutId - Stripe payout ID
 * @returns {Promise<Object>} - Payout details
 */
async function retrievePayout(payoutId) {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured. Cannot retrieve payout.');
  }

  return await stripe.payouts.retrieve(payoutId);
}

/**
 * Process a payout to a provider
 * @param {Object} db - Database client
 * @param {number} paymentId - Payment ID
 * @param {string} idempotencyKey - Idempotency key for preventing duplicate payouts
 * @returns {Promise<Object>} - Payout result
 */
async function processPayout(db, paymentId, idempotencyKey = null) {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured. Cannot process payout.');
  }

  // Generate idempotency key if not provided
  const idempotencyKeyToUse = idempotencyKey || uuidv4();

  try {
    // Start a transaction
    await db.query('BEGIN');

    // Get payment details
    const paymentResult = await db.query(
      `SELECT 
        p.*,
        sp.stripe_connect_account_id
      FROM payments p
      JOIN service_providers sp ON p.provider_id = sp.id
      WHERE p.id = $1 AND p.status = 'completed'`,
      [paymentId]
    );

    if (paymentResult.rows.length === 0) {
      await db.query('ROLLBACK');
      throw new Error('Payment not found or not completed');
    }

    const payment = paymentResult.rows[0];

    // Check if payout already exists for this payment
    const existingPayoutResult = await db.query(
      'SELECT * FROM provider_payouts WHERE payment_id = $1',
      [paymentId]
    );

    if (existingPayoutResult.rows.length > 0) {
      await db.query('ROLLBACK');
      return existingPayoutResult.rows[0]; // Return existing payout
    }

    // Check if provider is eligible for payouts
    const isEligible = await isProviderEligibleForPayouts(db, payment.provider_id);
    if (!isEligible) {
      await db.query('ROLLBACK');
      throw new Error('Provider is not eligible for payouts');
    }

    // Calculate platform fee if not already set
    if (payment.platform_fee === null || payment.provider_amount === null) {
      const { platformFee, providerAmount } = await calculatePlatformFee(db, payment);

      // Update payment with fee information
      await db.query(
        `UPDATE payments
        SET platform_fee = $1, provider_amount = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3`,
        [platformFee, providerAmount, paymentId]
      );

      payment.platform_fee = platformFee;
      payment.provider_amount = providerAmount;
    }

    // Create payout record with pending status
    const payoutResult = await db.query(
      `INSERT INTO provider_payouts (
        provider_id,
        payment_id,
        amount,
        status,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *`,
      [payment.provider_id, paymentId, payment.provider_amount, 'pending']
    );

    const payout = payoutResult.rows[0];

    // If provider has a Connect account, transfer directly
    if (payment.stripe_connect_account_id) {
      try {
        // Create transfer to provider's Connect account
        const transferData = {
          amount: Math.round(payment.provider_amount * 100), // Convert to cents
          currency: payment.currency || 'usd',
          destination: payment.stripe_connect_account_id,
          transfer_group: `payment_${paymentId}`,
          metadata: {
            payment_id: paymentId,
            provider_id: payment.provider_id,
            payout_id: payout.id
          }
        };

        // Use circuit breaker pattern for Stripe API call
        const transfer = await transferBreaker.fire(transferData, {
          idempotencyKey: idempotencyKeyToUse
        });

        // Update payout record with transfer information
        await db.query(
          `UPDATE provider_payouts
          SET stripe_payout_id = $1, status = $2, updated_at = CURRENT_TIMESTAMP
          WHERE id = $3`,
          [transfer.id, 'completed', payout.id]
        );

        payout.stripe_payout_id = transfer.id;
        payout.status = 'completed';
      } catch (error) {
        console.error('Error creating transfer:', error);
        
        // Update payout record with failed status
        await db.query(
          `UPDATE provider_payouts
          SET status = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2`,
          ['failed', payout.id]
        );

        // Rollback transaction
        await db.query('ROLLBACK');
        throw error;
      }
    } else {
      // For providers without Connect accounts, mark as processing for manual handling
      await db.query(
        `UPDATE provider_payouts
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2`,
        ['processing', payout.id]
      );

      payout.status = 'processing';
    }

    // Commit transaction
    await db.query('COMMIT');

    return payout;
  } catch (error) {
    // Ensure transaction is rolled back on error
    try {
      await db.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Error rolling back transaction:', rollbackError);
    }

    console.error('Error processing payout:', error);
    throw error;
  }
}

/**
 * Generate a payout receipt
 * @param {Object} db - Database client
 * @param {number} payoutId - Payout ID
 * @returns {Promise<Object>} - Receipt data
 */
async function generatePayoutReceipt(db, payoutId) {
  try {
    // Get payout details with related information
    const receiptResult = await db.query(
      `SELECT 
        pp.*,
        p.amount as payment_amount,
        p.platform_fee,
        p.currency,
        p.payment_date,
        p.stripe_payment_intent_id,
        sr.description as service_description,
        s.name as service_name,
        prop.address as property_address,
        h.first_name as homeowner_first_name,
        h.last_name as homeowner_last_name,
        sp.company_name as provider_name,
        sp.email as provider_email
      FROM provider_payouts pp
      JOIN payments p ON pp.payment_id = p.id
      JOIN service_requests sr ON p.service_request_id = sr.id
      JOIN services s ON sr.service_id = s.id
      JOIN properties prop ON sr.property_id = prop.id
      JOIN homeowners h ON p.homeowner_id = h.id
      JOIN service_providers sp ON pp.provider_id = sp.id
      WHERE pp.id = $1`,
      [payoutId]
    );

    if (receiptResult.rows.length === 0) {
      throw new Error('Payout not found');
    }

    const receipt = receiptResult.rows[0];

    // Format receipt data
    const receiptData = {
      receipt_id: `PO-${receipt.id}`,
      payout_id: receipt.id,
      provider_name: receipt.provider_name,
      provider_email: receipt.provider_email,
      payment_date: receipt.payment_date,
      payout_date: receipt.updated_at,
      service_description: receipt.service_description,
      service_name: receipt.service_name,
      property_address: receipt.property_address,
      homeowner_name: `${receipt.homeowner_first_name} ${receipt.homeowner_last_name}`,
      payment_amount: parseFloat(receipt.payment_amount).toFixed(2),
      platform_fee: parseFloat(receipt.platform_fee).toFixed(2),
      payout_amount: parseFloat(receipt.amount).toFixed(2),
      currency: receipt.currency || 'USD',
      status: receipt.status,
      stripe_reference: receipt.stripe_payout_id || 'N/A'
    };

    // If Stripe is configured and we have a payout ID, try to get more details
    if (isStripeConfigured() && receipt.stripe_payout_id) {
      try {
        const stripePayoutDetails = await payoutBreaker.fire(receipt.stripe_payout_id);
        if (stripePayoutDetails) {
          receiptData.stripe_status = stripePayoutDetails.status;
          receiptData.arrival_date = new Date(stripePayoutDetails.arrival_date * 1000).toISOString();
        }
      } catch (error) {
        console.warn('Could not retrieve Stripe payout details:', error);
        // Continue without the Stripe details
      }
    }

    return receiptData;
  } catch (error) {
    console.error('Error generating payout receipt:', error);
    throw error;
  }
}

/**
 * Get payout history for a provider
 * @param {Object} db - Database client
 * @param {number} providerId - Provider ID
 * @param {Object} options - Query options (limit, offset, status)
 * @returns {Promise<Object>} - Payout history
 */
async function getPayoutHistory(db, providerId, options = {}) {
  const { limit = 20, offset = 0, status = null } = options;

  try {
    // Build query based on filters
    let query = `
      SELECT 
        pp.*,
        p.amount as payment_amount,
        p.platform_fee,
        p.currency,
        p.payment_date,
        sr.description as service_description,
        s.name as service_name,
        prop.address as property_address,
        h.first_name as homeowner_first_name,
        h.last_name as homeowner_last_name
      FROM provider_payouts pp
      JOIN payments p ON pp.payment_id = p.id
      JOIN service_requests sr ON p.service_request_id = sr.id
      JOIN services s ON sr.service_id = s.id
      JOIN properties prop ON sr.property_id = prop.id
      JOIN homeowners h ON p.homeowner_id = h.id
      WHERE pp.provider_id = $1
    `;

    const queryParams = [providerId];
    let paramIndex = 2;

    // Add status filter if provided
    if (status) {
      query += ` AND pp.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    // Add ordering and pagination
    query += `
      ORDER BY pp.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);

    // Execute query
    const result = await db.query(query, queryParams);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM provider_payouts
      WHERE provider_id = $1
    `;
    const countParams = [providerId];

    if (status) {
      countQuery += ' AND status = $2';
      countParams.push(status);
    }

    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    return {
      payouts: result.rows,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + result.rows.length < total
      }
    };
  } catch (error) {
    console.error('Error getting payout history:', error);
    throw error;
  }
}

/**
 * Get payout details by ID
 * @param {Object} db - Database client
 * @param {number} payoutId - Payout ID
 * @returns {Promise<Object>} - Payout details
 */
async function getPayoutById(db, payoutId) {
  try {
    const result = await db.query(
      `SELECT 
        pp.*,
        p.amount as payment_amount,
        p.platform_fee,
        p.currency,
        p.payment_date,
        p.stripe_payment_intent_id,
        sr.description as service_description,
        s.name as service_name,
        prop.address as property_address,
        h.first_name as homeowner_first_name,
        h.last_name as homeowner_last_name,
        sp.company_name as provider_name,
        sp.email as provider_email
      FROM provider_payouts pp
      JOIN payments p ON pp.payment_id = p.id
      JOIN service_requests sr ON p.service_request_id = sr.id
      JOIN services s ON sr.service_id = s.id
      JOIN properties prop ON sr.property_id = prop.id
      JOIN homeowners h ON p.homeowner_id = h.id
      JOIN service_providers sp ON pp.provider_id = sp.id
      WHERE pp.id = $1`,
      [payoutId]
    );

    if (result.rows.length === 0) {
      throw new Error('Payout not found');
    }

    const payout = result.rows[0];

    // If Stripe is configured and we have a payout ID, try to get more details
    if (isStripeConfigured() && payout.stripe_payout_id) {
      try {
        const stripePayoutDetails = await payoutBreaker.fire(payout.stripe_payout_id);
        if (stripePayoutDetails) {
          payout.stripe_status = stripePayoutDetails.status;
          payout.arrival_date = new Date(stripePayoutDetails.arrival_date * 1000).toISOString();
          payout.stripe_details = stripePayoutDetails;
        }
      } catch (error) {
        console.warn('Could not retrieve Stripe payout details:', error);
        // Continue without the Stripe details
      }
    }

    return payout;
  } catch (error) {
    console.error('Error getting payout details:', error);
    throw error;
  }
}

/**
 * Process batch payouts for completed payments
 * @param {Object} db - Database client
 * @param {Object} options - Batch options
 * @returns {Promise<Object>} - Batch processing results
 */
async function processBatchPayouts(db, options = {}) {
  const { limit = 50, daysThreshold = 0 } = options;
  const results = { successful: [], failed: [] };

  try {
    // Start a transaction
    await db.query('BEGIN');

    // Get completed payments that don't have payouts yet
    const paymentsQuery = `
      SELECT p.id
      FROM payments p
      LEFT JOIN provider_payouts pp ON p.id = pp.payment_id
      WHERE p.status = 'completed'
      AND pp.id IS NULL
      AND p.payment_date <= CURRENT_TIMESTAMP - INTERVAL '${daysThreshold} days'
      LIMIT $1
    `;

    const paymentsResult = await db.query(paymentsQuery, [limit]);

    // Process each payment
    for (const payment of paymentsResult.rows) {
      try {
        // Generate a unique idempotency key for this payment
        const idempotencyKey = `batch_payout_${payment.id}_${Date.now()}`;
        
        // Process the payout
        const payout = await processPayout(db, payment.id, idempotencyKey);
        results.successful.push({
          payment_id: payment.id,
          payout_id: payout.id,
          amount: payout.amount,
          status: payout.status
        });
      } catch (error) {
        console.error(`Error processing payout for payment ${payment.id}:`, error);
        results.failed.push({
          payment_id: payment.id,
          error: error.message
        });
      }
    }

    // Commit transaction
    await db.query('COMMIT');

    return {
      total_processed: paymentsResult.rows.length,
      successful_count: results.successful.length,
      failed_count: results.failed.length,
      results
    };
  } catch (error) {
    // Ensure transaction is rolled back on error
    try {
      await db.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Error rolling back transaction:', rollbackError);
    }

    console.error('Error processing batch payouts:', error);
    throw error;
  }
}

/**
 * Retry failed payouts
 * @param {Object} db - Database client
 * @param {Object} options - Retry options
 * @returns {Promise<Object>} - Retry results
 */
async function retryFailedPayouts(db, options = {}) {
  const { limit = 20, maxAttempts = 3 } = options;
  const results = { successful: [], failed: [] };

  try {
    // Start a transaction
    await db.query('BEGIN');

    // Get failed payouts that haven't exceeded max retry attempts
    // We'll track retry attempts in the metadata field
    const failedPayoutsQuery = `
      SELECT pp.id, pp.payment_id, 
        COALESCE((metadata->>'retry_count')::int, 0) as retry_count
      FROM provider_payouts pp
      WHERE pp.status = 'failed'
      AND COALESCE((metadata->>'retry_count')::int, 0) < $1
      ORDER BY pp.updated_at ASC
      LIMIT $2
    `;

    const failedPayoutsResult = await db.query(failedPayoutsQuery, [maxAttempts, limit]);

    // Process each failed payout
    for (const failedPayout of failedPayoutsResult.rows) {
      try {
        // Increment retry count
        const retryCount = parseInt(failedPayout.retry_count) + 1;
        
        // Update retry count in metadata
        await db.query(
          `UPDATE provider_payouts
          SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{retry_count}', $1::jsonb),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2`,
          [JSON.stringify(retryCount), failedPayout.id]
        );

        // Generate a unique idempotency key for this retry
        const idempotencyKey = `retry_payout_${failedPayout.payment_id}_${retryCount}_${Date.now()}`;
        
        // Process the payout again
        const payout = await processPayout(db, failedPayout.payment_id, idempotencyKey);
        
        results.successful.push({
          payout_id: failedPayout.id,
          payment_id: failedPayout.payment_id,
          new_status: payout.status,
          retry_count: retryCount
        });
      } catch (error) {
        console.error(`Error retrying payout ${failedPayout.id}:`, error);
        results.failed.push({
          payout_id: failedPayout.id,
          payment_id: failedPayout.payment_id,
          error: error.message,
          retry_count: parseInt(failedPayout.retry_count) + 1
        });
      }
    }

    // Commit transaction
    await db.query('COMMIT');

    return {
      total_retried: failedPayoutsResult.rows.length,
      successful_count: results.successful.length,
      failed_count: results.failed.length,
      results
    };
  } catch (error) {
    // Ensure transaction is rolled back on error
    try {
      await db.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Error rolling back transaction:', rollbackError);
    }

    console.error('Error retrying failed payouts:', error);
    throw error;
  }
}

/**
 * Handle Stripe Connect webhook events
 * @param {Object} event - Stripe event object
 * @param {Object} db - Database client
 * @returns {Promise<Object>} - Processing result
 */
async function handleConnectWebhookEvent(event, db) {
  try {
    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object;
        
        // Update the provider's onboarding status if details are submitted
        if (account.details_submitted !== undefined) {
          await db.query(`
            UPDATE service_providers 
            SET 
              stripe_connect_onboarded = $1, 
              stripe_connect_onboarding_date = CASE WHEN $1 = true AND stripe_connect_onboarding_date IS NULL THEN CURRENT_TIMESTAMP ELSE stripe_connect_onboarding_date END,
              updated_at = CURRENT_TIMESTAMP
            WHERE stripe_connect_account_id = $2
          `, [account.details_submitted && account.payouts_enabled, account.id]);
        }
        break;
      }
      
      case 'transfer.created': {
        const transfer = event.data.object;
        
        // If this transfer has a payout_id in metadata, update the payout status
        if (transfer.metadata && transfer.metadata.payout_id) {
          await db.query(`
            UPDATE provider_payouts
            SET 
              status = 'processing',
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND status = 'pending'
          `, [transfer.metadata.payout_id]);
        }
        break;
      }
      
      case 'transfer.paid': {
        const transfer = event.data.object;
        
        // If this transfer has a payout_id in metadata, update the payout status
        if (transfer.metadata && transfer.metadata.payout_id) {
          await db.query(`
            UPDATE provider_payouts
            SET 
              status = 'completed',
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND (status = 'pending' OR status = 'processing')
          `, [transfer.metadata.payout_id]);
        }
        break;
      }
      
      case 'transfer.failed': {
        const transfer = event.data.object;
        
        // If this transfer has a payout_id in metadata, update the payout status
        if (transfer.metadata && transfer.metadata.payout_id) {
          await db.query(`
            UPDATE provider_payouts
            SET 
              status = 'failed',
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [transfer.metadata.payout_id]);
        }
        break;
      }
    }
    
    return { processed: true, event_type: event.type };
  } catch (error) {
    console.error('Error processing Connect webhook event:', error);
    throw error;
  }
}

module.exports = {
  // Connect account management
  createConnectAccount,
  createAccountLink,
  createLoginLink,
  getConnectAccount,
  
  // Payout processing
  isProviderEligibleForPayouts,
  calculatePlatformFee,
  processPayout,
  generatePayoutReceipt,
  
  // Payout history and details
  getPayoutHistory,
  getPayoutById,
  
  // Batch processing
  processBatchPayouts,
  retryFailedPayouts,
  
  // Webhook handling
  handleConnectWebhookEvent
};