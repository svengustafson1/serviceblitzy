/**
 * Payout Controller
 * Manages automated payment distribution to service providers using Stripe Connect
 * Implements payout scheduling, history tracking, and notification generation
 */

// Initialize Stripe with API key from environment variables
let stripe;

try {
  // Initialize Stripe only if API key is available
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  } else {
    console.warn('STRIPE_SECRET_KEY not found in environment variables. Payout features will be disabled.');
  }
} catch (error) {
  console.error('Error initializing Stripe:', error);
}

// Import notification helper functions
const { createPaymentNotification } = require('./notification.controller');

// Helper function to check if Stripe is configured
const isStripeConfigured = () => !!stripe;

/**
 * Create a Stripe Connect account for a service provider
 * @route POST /api/payouts/connect/create-account
 */
const createConnectAccount = async (req, res) => {
  // Check if Stripe is configured
  if (!isStripeConfigured()) {
    return res.status(503).json({
      success: false,
      message: 'Payout service is currently unavailable. Please configure Stripe API keys.'
    });
  }

  const client = req.db;
  
  try {
    // Get provider details
    const providerResult = await client.query(
      'SELECT * FROM service_providers WHERE user_id = $1',
      [req.user.id]
    );
    
    if (providerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Provider profile not found'
      });
    }
    
    const provider = providerResult.rows[0];
    
    // Check if provider already has a Stripe Connect account
    if (provider.stripe_account_id) {
      return res.status(400).json({
        success: false,
        message: 'Provider already has a Stripe Connect account'
      });
    }
    
    // Get user details for the account
    const userResult = await client.query(
      'SELECT * FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const user = userResult.rows[0];
    
    // Create a Custom Connect account
    const account = await stripe.accounts.create({
      type: 'custom',
      country: 'US', // Default to US, can be made configurable
      email: user.email,
      capabilities: {
        card_payments: {requested: true},
        transfers: {requested: true},
      },
      business_type: 'individual',
      business_profile: {
        name: provider.company_name,
        url: process.env.WEBSITE_URL || 'https://homehub.com',
      },
      metadata: {
        provider_id: provider.id,
        user_id: req.user.id
      }
    });
    
    // Update provider record with Stripe account ID
    await client.query(
      'UPDATE service_providers SET stripe_account_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [account.id, provider.id]
    );
    
    res.status(201).json({
      success: true,
      message: 'Stripe Connect account created successfully',
      data: {
        account_id: account.id,
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled
      }
    });
  } catch (error) {
    console.error('Error creating Connect account:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating Connect account',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create an account link for Stripe Connect onboarding
 * @route POST /api/payouts/connect/create-account-link
 */
const createAccountLink = async (req, res) => {
  // Check if Stripe is configured
  if (!isStripeConfigured()) {
    return res.status(503).json({
      success: false,
      message: 'Payout service is currently unavailable. Please configure Stripe API keys.'
    });
  }

  const client = req.db;
  
  try {
    // Get provider details
    const providerResult = await client.query(
      'SELECT * FROM service_providers WHERE user_id = $1',
      [req.user.id]
    );
    
    if (providerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Provider profile not found'
      });
    }
    
    const provider = providerResult.rows[0];
    
    // Check if provider has a Stripe Connect account
    if (!provider.stripe_account_id) {
      return res.status(400).json({
        success: false,
        message: 'Provider does not have a Stripe Connect account. Please create one first.'
      });
    }
    
    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: provider.stripe_account_id,
      refresh_url: `${process.env.FRONTEND_URL}/dashboard/provider/connect/refresh`,
      return_url: `${process.env.FRONTEND_URL}/dashboard/provider/connect/complete`,
      type: 'account_onboarding',
      collect: 'eventually_due'
    });
    
    res.status(200).json({
      success: true,
      data: {
        url: accountLink.url
      }
    });
  } catch (error) {
    console.error('Error creating account link:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating account link',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get Stripe Connect account details
 * @route GET /api/payouts/connect/account
 */
const getConnectAccount = async (req, res) => {
  // Check if Stripe is configured
  if (!isStripeConfigured()) {
    return res.status(503).json({
      success: false,
      message: 'Payout service is currently unavailable. Please configure Stripe API keys.'
    });
  }

  const client = req.db;
  
  try {
    // Get provider details
    const providerResult = await client.query(
      'SELECT * FROM service_providers WHERE user_id = $1',
      [req.user.id]
    );
    
    if (providerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Provider profile not found'
      });
    }
    
    const provider = providerResult.rows[0];
    
    // Check if provider has a Stripe Connect account
    if (!provider.stripe_account_id) {
      return res.status(404).json({
        success: false,
        message: 'Provider does not have a Stripe Connect account'
      });
    }
    
    // Retrieve the account from Stripe
    const account = await stripe.accounts.retrieve(provider.stripe_account_id);
    
    res.status(200).json({
      success: true,
      data: {
        account_id: account.id,
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        requirements: account.requirements,
        external_accounts: account.external_accounts,
        settings: account.settings
      }
    });
  } catch (error) {
    console.error('Error retrieving Connect account:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving Connect account',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create a login link for Stripe Connect dashboard
 * @route POST /api/payouts/connect/create-login-link
 */
const createLoginLink = async (req, res) => {
  // Check if Stripe is configured
  if (!isStripeConfigured()) {
    return res.status(503).json({
      success: false,
      message: 'Payout service is currently unavailable. Please configure Stripe API keys.'
    });
  }

  const client = req.db;
  
  try {
    // Get provider details
    const providerResult = await client.query(
      'SELECT * FROM service_providers WHERE user_id = $1',
      [req.user.id]
    );
    
    if (providerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Provider profile not found'
      });
    }
    
    const provider = providerResult.rows[0];
    
    // Check if provider has a Stripe Connect account
    if (!provider.stripe_account_id) {
      return res.status(404).json({
        success: false,
        message: 'Provider does not have a Stripe Connect account'
      });
    }
    
    // Create a login link
    const loginLink = await stripe.accounts.createLoginLink(provider.stripe_account_id);
    
    res.status(200).json({
      success: true,
      data: {
        url: loginLink.url
      }
    });
  } catch (error) {
    console.error('Error creating login link:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating login link',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Process a payout to a service provider
 * @route POST /api/payouts/process
 */
const processPayout = async (req, res) => {
  // Check if Stripe is configured
  if (!isStripeConfigured()) {
    return res.status(503).json({
      success: false,
      message: 'Payout service is currently unavailable. Please configure Stripe API keys.'
    });
  }

  const { payment_id, provider_id, amount } = req.body;
  const client = req.db;
  
  try {
    // Validate required fields
    if (!payment_id || !provider_id) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID and provider ID are required'
      });
    }
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Get payment details
    const paymentResult = await client.query(
      'SELECT * FROM payments WHERE id = $1',
      [payment_id]
    );
    
    if (paymentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    const payment = paymentResult.rows[0];
    
    // Verify payment status
    if (payment.status !== 'completed') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Cannot process payout for payment with status '${payment.status}'`
      });
    }
    
    // Verify provider ID matches payment
    if (payment.provider_id !== parseInt(provider_id)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Provider ID does not match payment'
      });
    }
    
    // Get provider details
    const providerResult = await client.query(
      'SELECT * FROM service_providers WHERE id = $1',
      [provider_id]
    );
    
    if (providerResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }
    
    const provider = providerResult.rows[0];
    
    // Check if provider has a Stripe Connect account
    if (!provider.stripe_account_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Provider does not have a Stripe Connect account'
      });
    }
    
    // Calculate payout amount (payment amount minus platform fee)
    // If amount is provided, use that instead
    const payoutAmount = amount ? parseFloat(amount) : payment.amount * 0.8; // Default 20% platform fee
    
    // Create a transfer to the provider's Stripe account
    const transfer = await stripe.transfers.create({
      amount: Math.round(payoutAmount * 100), // Convert to cents
      currency: payment.currency || 'usd',
      destination: provider.stripe_account_id,
      source_transaction: payment.stripe_payment_intent_id,
      description: `Payout for payment #${payment.id}`,
      metadata: {
        payment_id: payment.id,
        provider_id: provider.id,
        platform_fee: (payment.amount - payoutAmount).toFixed(2)
      }
    });
    
    // Record the payout in the database
    const payoutResult = await client.query(
      `INSERT INTO provider_payouts (
        provider_id,
        payment_id,
        stripe_payout_id,
        amount,
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        provider_id,
        payment_id,
        transfer.id,
        payoutAmount,
        'pending'
      ]
    );
    
    // Get user ID for notification
    const userResult = await client.query(
      'SELECT user_id FROM service_providers WHERE id = $1',
      [provider_id]
    );
    
    if (userResult.rows.length > 0) {
      // Create notification for provider
      await createPaymentNotification(
        client,
        payment.id,
        userResult.rows[0].user_id,
        'payout_processed'
      );
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    
    res.status(200).json({
      success: true,
      message: 'Payout processed successfully',
      data: {
        payout_id: payoutResult.rows[0].id,
        transfer_id: transfer.id,
        amount: payoutAmount,
        status: 'pending'
      }
    });
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
    console.error('Error processing payout:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing payout',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get payout history for a provider
 * @route GET /api/payouts/history
 */
const getPayoutHistory = async (req, res) => {
  const client = req.db;
  
  try {
    let query;
    let queryParams = [];
    
    if (req.user.role === 'provider') {
      // Get provider ID
      const providerResult = await client.query(
        'SELECT id FROM service_providers WHERE user_id = $1',
        [req.user.id]
      );
      
      if (providerResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Provider profile not found'
        });
      }
      
      const providerId = providerResult.rows[0].id;
      
      // Get payouts for this provider
      query = `
        SELECT 
          pp.*,
          p.stripe_payment_intent_id,
          p.amount as payment_amount,
          sr.description as service_description,
          s.name as service_name,
          h.user_id as homeowner_user_id,
          u.first_name as homeowner_first_name,
          u.last_name as homeowner_last_name
        FROM provider_payouts pp
        JOIN payments p ON pp.payment_id = p.id
        JOIN service_requests sr ON p.service_request_id = sr.id
        JOIN services s ON sr.service_id = s.id
        JOIN homeowners h ON p.homeowner_id = h.id
        JOIN users u ON h.user_id = u.id
        WHERE pp.provider_id = $1
        ORDER BY pp.created_at DESC
      `;
      queryParams = [providerId];
      
    } else if (req.user.role === 'admin') {
      // Admins can see all payouts
      query = `
        SELECT 
          pp.*,
          p.stripe_payment_intent_id,
          p.amount as payment_amount,
          sr.description as service_description,
          s.name as service_name,
          sp.company_name as provider_name,
          h.user_id as homeowner_user_id,
          u.first_name as homeowner_first_name,
          u.last_name as homeowner_last_name
        FROM provider_payouts pp
        JOIN payments p ON pp.payment_id = p.id
        JOIN service_requests sr ON p.service_request_id = sr.id
        JOIN services s ON sr.service_id = s.id
        JOIN service_providers sp ON pp.provider_id = sp.id
        JOIN homeowners h ON p.homeowner_id = h.id
        JOIN users u ON h.user_id = u.id
        ORDER BY pp.created_at DESC
        LIMIT 100
      `;
    } else {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view payout history'
      });
    }
    
    const result = await client.query(query, queryParams);
    
    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting payout history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payout history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get a single payout by ID
 * @route GET /api/payouts/:id
 */
const getPayoutById = async (req, res) => {
  const { id } = req.params;
  const client = req.db;
  
  try {
    // Get the payout with related information
    const payoutResult = await client.query(`
      SELECT 
        pp.*,
        p.stripe_payment_intent_id,
        p.amount as payment_amount,
        sr.description as service_description,
        s.name as service_name,
        sp.company_name as provider_name,
        sp.user_id as provider_user_id,
        h.user_id as homeowner_user_id,
        u.first_name as homeowner_first_name,
        u.last_name as homeowner_last_name
      FROM provider_payouts pp
      JOIN payments p ON pp.payment_id = p.id
      JOIN service_requests sr ON p.service_request_id = sr.id
      JOIN services s ON sr.service_id = s.id
      JOIN service_providers sp ON pp.provider_id = sp.id
      JOIN homeowners h ON p.homeowner_id = h.id
      JOIN users u ON h.user_id = u.id
      WHERE pp.id = $1
    `, [id]);
    
    if (payoutResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payout not found'
      });
    }
    
    const payout = payoutResult.rows[0];
    
    // Check authorization
    if (req.user.role === 'provider' && req.user.id !== parseInt(payout.provider_user_id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this payout'
      });
    }
    
    // If the payout has a Stripe ID, get additional details from Stripe
    if (isStripeConfigured() && payout.stripe_payout_id) {
      try {
        const transfer = await stripe.transfers.retrieve(payout.stripe_payout_id);
        payout.stripe_details = {
          created: transfer.created,
          amount: transfer.amount / 100, // Convert from cents
          currency: transfer.currency,
          description: transfer.description,
          destination: transfer.destination,
          destination_payment: transfer.destination_payment,
          source_transaction: transfer.source_transaction
        };
      } catch (stripeError) {
        console.warn('Could not retrieve Stripe transfer details:', stripeError);
        // Continue without the Stripe details
      }
    }
    
    res.status(200).json({
      success: true,
      data: payout
    });
  } catch (error) {
    console.error('Error getting payout details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payout details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Handle Stripe Connect webhook events
 * @route POST /api/payouts/webhook
 */
const handleConnectWebhook = async (req, res) => {
  // Check if Stripe is configured
  if (!isStripeConfigured()) {
    return res.status(503).json({
      success: false,
      message: 'Payout service is currently unavailable. Please configure Stripe API keys.'
    });
  }

  const signature = req.headers['stripe-signature'];
  const client = req.db;
  
  try {
    // Parse and verify the webhook payload
    const event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_CONNECT_WEBHOOK_SECRET
    );
    
    // Handle the event based on its type
    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object;
        
        // Update the provider's account status in the database
        await client.query(`
          UPDATE service_providers
          SET 
            is_verified = $1,
            updated_at = CURRENT_TIMESTAMP
          WHERE stripe_account_id = $2
        `, [
          account.details_submitted && account.charges_enabled && account.payouts_enabled,
          account.id
        ]);
        
        // Get the provider to send notification
        const providerResult = await client.query(
          'SELECT user_id FROM service_providers WHERE stripe_account_id = $1',
          [account.id]
        );
        
        if (providerResult.rows.length > 0) {
          // Create notification for account update
          await createPaymentNotification(
            client,
            null, // No payment ID for this notification
            providerResult.rows[0].user_id,
            'account_updated'
          );
        }
        break;
      }
      
      case 'transfer.created': {
        const transfer = event.data.object;
        
        // Update the payout status in the database
        if (transfer.metadata && transfer.metadata.payment_id) {
          await client.query(`
            UPDATE provider_payouts
            SET 
              status = 'processing',
              updated_at = CURRENT_TIMESTAMP
            WHERE payment_id = $1 AND stripe_payout_id = $2
          `, [
            transfer.metadata.payment_id,
            transfer.id
          ]);
        }
        break;
      }
      
      case 'transfer.paid': {
        const transfer = event.data.object;
        
        // Update the payout status in the database
        if (transfer.metadata && transfer.metadata.payment_id) {
          await client.query(`
            UPDATE provider_payouts
            SET 
              status = 'completed',
              updated_at = CURRENT_TIMESTAMP
            WHERE payment_id = $1 AND stripe_payout_id = $2
          `, [
            transfer.metadata.payment_id,
            transfer.id
          ]);
          
          // Get the provider to send notification
          if (transfer.metadata.provider_id) {
            const providerResult = await client.query(
              'SELECT user_id FROM service_providers WHERE id = $1',
              [transfer.metadata.provider_id]
            );
            
            if (providerResult.rows.length > 0) {
              // Create notification for successful payout
              await createPaymentNotification(
                client,
                transfer.metadata.payment_id,
                providerResult.rows[0].user_id,
                'payout_completed'
              );
            }
          }
        }
        break;
      }
      
      case 'transfer.failed': {
        const transfer = event.data.object;
        
        // Update the payout status in the database
        if (transfer.metadata && transfer.metadata.payment_id) {
          await client.query(`
            UPDATE provider_payouts
            SET 
              status = 'failed',
              updated_at = CURRENT_TIMESTAMP
            WHERE payment_id = $1 AND stripe_payout_id = $2
          `, [
            transfer.metadata.payment_id,
            transfer.id
          ]);
          
          // Get the provider to send notification
          if (transfer.metadata.provider_id) {
            const providerResult = await client.query(
              'SELECT user_id FROM service_providers WHERE id = $1',
              [transfer.metadata.provider_id]
            );
            
            if (providerResult.rows.length > 0) {
              // Create notification for failed payout
              await createPaymentNotification(
                client,
                transfer.metadata.payment_id,
                providerResult.rows[0].user_id,
                'payout_failed'
              );
            }
          }
        }
        break;
      }
      
      // Add handling for other webhook events as needed
    }
    
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }
};

module.exports = {
  createConnectAccount,
  createAccountLink,
  getConnectAccount,
  createLoginLink,
  processPayout,
  getPayoutHistory,
  getPayoutById,
  handleConnectWebhook
};