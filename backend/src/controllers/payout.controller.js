/**
 * Payout Controller
 * Handles all payout-related operations for service providers using Stripe Connect
 */
let stripe;

try {
  // Initialize Stripe only if API key is available
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  } else {
    console.warn('STRIPE_SECRET_KEY not found in environment variables. Payment features will be disabled.');
  }
} catch (error) {
  console.error('Error initializing Stripe:', error);
}

// Import notification helper functions
const { createNotification } = require('./notification.controller');

// Helper function to check if Stripe is configured
const isStripeConfigured = () => !!stripe;

/**
 * Create a Connect account for a service provider
 * @route POST /api/payments/connect/create-account
 */
const createConnectAccount = async (req, res) => {
  // Check if Stripe is configured
  if (!isStripeConfigured()) {
    return res.status(503).json({
      success: false,
      message: 'Payment service is currently unavailable. Please configure Stripe API keys.'
    });
  }

  const client = req.db;
  
  try {
    // Verify the user is a service provider
    if (req.user.role !== 'provider') {
      return res.status(403).json({
        success: false,
        message: 'Only service providers can create Connect accounts'
      });
    }
    
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
    
    // Check if provider already has a Connect account
    if (provider.stripe_connect_account_id) {
      return res.status(400).json({
        success: false,
        message: 'Provider already has a Connect account'
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
    
    // Create a Connect Express account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US', // Default to US, can be made dynamic based on user's country
      email: user.email,
      capabilities: {
        card_payments: {requested: true},
        transfers: {requested: true},
      },
      business_type: 'individual',
      business_profile: {
        name: provider.company_name || `${user.first_name} ${user.last_name}`,
        url: provider.website || `https://homehub.com/providers/${provider.id}`,
      },
      metadata: {
        provider_id: provider.id,
        user_id: req.user.id
      }
    });
    
    // Update the provider record with the Connect account ID
    await client.query(
      'UPDATE service_providers SET stripe_connect_account_id = $1 WHERE id = $2',
      [account.id, provider.id]
    );
    
    res.status(201).json({
      success: true,
      message: 'Connect account created successfully',
      data: {
        account_id: account.id
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
 * Create an account link for onboarding
 * @route POST /api/payments/connect/create-account-link
 */
const createAccountLink = async (req, res) => {
  // Check if Stripe is configured
  if (!isStripeConfigured()) {
    return res.status(503).json({
      success: false,
      message: 'Payment service is currently unavailable. Please configure Stripe API keys.'
    });
  }

  const client = req.db;
  
  try {
    // Verify the user is a service provider
    if (req.user.role !== 'provider') {
      return res.status(403).json({
        success: false,
        message: 'Only service providers can access Connect onboarding'
      });
    }
    
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
    
    // Check if provider has a Connect account
    if (!provider.stripe_connect_account_id) {
      return res.status(400).json({
        success: false,
        message: 'Provider does not have a Connect account yet'
      });
    }
    
    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: provider.stripe_connect_account_id,
      refresh_url: `${process.env.FRONTEND_URL}/provider/connect/refresh`,
      return_url: `${process.env.FRONTEND_URL}/provider/connect/complete`,
      type: 'account_onboarding',
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
 * Get Connect account details
 * @route GET /api/payments/connect/account
 */
const getConnectAccount = async (req, res) => {
  // Check if Stripe is configured
  if (!isStripeConfigured()) {
    return res.status(503).json({
      success: false,
      message: 'Payment service is currently unavailable. Please configure Stripe API keys.'
    });
  }

  const client = req.db;
  
  try {
    // Verify the user is a service provider
    if (req.user.role !== 'provider') {
      return res.status(403).json({
        success: false,
        message: 'Only service providers can access Connect account details'
      });
    }
    
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
    
    // Check if provider has a Connect account
    if (!provider.stripe_connect_account_id) {
      return res.status(400).json({
        success: false,
        message: 'Provider does not have a Connect account yet'
      });
    }
    
    // Retrieve the Connect account
    const account = await stripe.accounts.retrieve(provider.stripe_connect_account_id);
    
    // Check if the account is fully onboarded
    const isOnboarded = 
      account.details_submitted && 
      account.payouts_enabled && 
      account.capabilities.card_payments === 'active' && 
      account.capabilities.transfers === 'active';
    
    // Update the onboarding status if needed
    if (isOnboarded && !provider.stripe_connect_onboarded) {
      await client.query(
        'UPDATE service_providers SET stripe_connect_onboarded = true, stripe_connect_onboarding_date = CURRENT_TIMESTAMP WHERE id = $1',
        [provider.id]
      );
    }
    
    res.status(200).json({
      success: true,
      data: {
        account_id: account.id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        is_onboarded: isOnboarded,
        default_currency: account.default_currency,
        business_profile: account.business_profile,
        capabilities: account.capabilities,
        requirements: account.requirements
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
 * Create a login link for the Connect dashboard
 * @route POST /api/payments/connect/create-login-link
 */
const createLoginLink = async (req, res) => {
  // Check if Stripe is configured
  if (!isStripeConfigured()) {
    return res.status(503).json({
      success: false,
      message: 'Payment service is currently unavailable. Please configure Stripe API keys.'
    });
  }

  const client = req.db;
  
  try {
    // Verify the user is a service provider
    if (req.user.role !== 'provider') {
      return res.status(403).json({
        success: false,
        message: 'Only service providers can access Connect dashboard'
      });
    }
    
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
    
    // Check if provider has a Connect account
    if (!provider.stripe_connect_account_id) {
      return res.status(400).json({
        success: false,
        message: 'Provider does not have a Connect account yet'
      });
    }
    
    // Create a login link for the Connect dashboard
    const loginLink = await stripe.accounts.createLoginLink(provider.stripe_connect_account_id);
    
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
 * Process a payout to a provider
 * @route POST /api/payments/connect/payout
 */
const processPayout = async (req, res) => {
  // Check if Stripe is configured
  if (!isStripeConfigured()) {
    return res.status(503).json({
      success: false,
      message: 'Payment service is currently unavailable. Please configure Stripe API keys.'
    });
  }

  const { payment_id } = req.body;
  const client = req.db;
  
  try {
    // Validate required fields
    if (!payment_id) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID is required'
      });
    }
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Retrieve the payment from the database
    const paymentResult = await client.query(`
      SELECT p.*, 
        sp.id as provider_id, 
        sp.stripe_connect_account_id, 
        sp.commission_rate,
        sp.user_id as provider_user_id
      FROM payments p
      JOIN service_providers sp ON p.provider_id = sp.id
      WHERE p.id = $1 AND p.status = 'completed'
    `, [payment_id]);
    
    if (paymentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Completed payment not found'
      });
    }
    
    const payment = paymentResult.rows[0];
    
    // Check if the provider has a Connect account
    if (!payment.stripe_connect_account_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Provider does not have a Connect account set up'
      });
    }
    
    // Check if this payment has already been processed for payout
    const existingPayoutResult = await client.query(
      'SELECT * FROM provider_payouts WHERE payment_id = $1',
      [payment_id]
    );
    
    if (existingPayoutResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'This payment has already been processed for payout'
      });
    }
    
    // Calculate platform fee
    const commissionRate = payment.commission_rate || 10; // Default to 10% if not set
    const platformFee = (payment.amount * commissionRate) / 100;
    const payoutAmount = payment.amount - platformFee;
    
    // Create a transfer to the provider's Connect account
    const transfer = await stripe.transfers.create({
      amount: Math.round(payoutAmount * 100), // Convert to cents for Stripe
      currency: payment.currency || 'usd',
      destination: payment.stripe_connect_account_id,
      source_transaction: payment.stripe_payment_intent_id,
      description: `Payout for payment #${payment.id}`,
      metadata: {
        payment_id: payment.id,
        provider_id: payment.provider_id,
        platform_fee: platformFee,
        original_amount: payment.amount
      }
    });
    
    // Record the payout in the database
    const payoutResult = await client.query(`
      INSERT INTO provider_payouts (
        provider_id,
        payment_id,
        stripe_transfer_id,
        amount,
        platform_fee,
        original_amount,
        currency,
        status,
        payout_date,
        description
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, $9)
      RETURNING *
    `, [
      payment.provider_id,
      payment.id,
      transfer.id,
      payoutAmount,
      platformFee,
      payment.amount,
      payment.currency || 'usd',
      'completed',
      `Payout for payment #${payment.id}`
    ]);
    
    // Create notification for provider
    await createNotification({
      client,
      user_id: payment.provider_user_id,
      title: 'Payment Received',
      message: `You have received a payment of ${payoutAmount.toFixed(2)} ${payment.currency || 'USD'} for service #${payment.service_request_id}`,
      type: 'success',
      related_to: 'payment',
      related_id: payment.id
    });
    
    // Commit the transaction
    await client.query('COMMIT');
    
    res.status(200).json({
      success: true,
      message: 'Payout processed successfully',
      data: {
        payout_id: payoutResult.rows[0].id,
        transfer_id: transfer.id,
        amount: payoutAmount,
        platform_fee: platformFee,
        original_amount: payment.amount,
        currency: payment.currency || 'usd',
        status: 'completed'
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
 * Get provider payout history
 * @route GET /api/payments/connect/payouts
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
          p.service_request_id,
          sr.description as service_description,
          s.name as service_name,
          prop.address as property_address
        FROM provider_payouts pp
        JOIN payments p ON pp.payment_id = p.id
        JOIN service_requests sr ON p.service_request_id = sr.id
        JOIN services s ON sr.service_id = s.id
        JOIN properties prop ON sr.property_id = prop.id
        WHERE pp.provider_id = $1
        ORDER BY pp.created_at DESC
      `;
      queryParams = [providerId];
      
    } else if (req.user.role === 'admin') {
      // Admins can see all payouts
      query = `
        SELECT 
          pp.*,
          p.service_request_id,
          sr.description as service_description,
          s.name as service_name,
          prop.address as property_address,
          sp.company_name as provider_name
        FROM provider_payouts pp
        JOIN payments p ON pp.payment_id = p.id
        JOIN service_requests sr ON p.service_request_id = sr.id
        JOIN services s ON sr.service_id = s.id
        JOIN properties prop ON sr.property_id = prop.id
        JOIN service_providers sp ON pp.provider_id = sp.id
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
 * @route GET /api/payments/connect/payouts/:id
 */
const getPayoutById = async (req, res) => {
  const { id } = req.params;
  const client = req.db;
  
  try {
    // Get the payout with related information
    const payoutResult = await client.query(`
      SELECT 
        pp.*,
        p.service_request_id,
        sr.description as service_description, sr.status as service_status,
        s.name as service_name,
        prop.address as property_address,
        sp.company_name as provider_name,
        sp.user_id as provider_user_id
      FROM provider_payouts pp
      JOIN payments p ON pp.payment_id = p.id
      JOIN service_requests sr ON p.service_request_id = sr.id
      JOIN services s ON sr.service_id = s.id
      JOIN properties prop ON sr.property_id = prop.id
      JOIN service_providers sp ON pp.provider_id = sp.id
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
 * @route POST /api/payments/connect/webhook
 */
const handleConnectWebhook = async (req, res) => {
  // Check if Stripe is configured
  if (!isStripeConfigured()) {
    return res.status(503).json({
      success: false,
      message: 'Payment service is currently unavailable. Please configure Stripe API keys.'
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
        
        // Update the provider's onboarding status if details are submitted
        if (account.details_submitted) {
          await client.query(`
            UPDATE service_providers 
            SET 
              stripe_connect_onboarded = $1, 
              stripe_connect_onboarding_date = CASE WHEN $1 = true AND stripe_connect_onboarding_date IS NULL THEN CURRENT_TIMESTAMP ELSE stripe_connect_onboarding_date END 
            WHERE stripe_connect_account_id = $2
          `, [account.details_submitted && account.payouts_enabled, account.id]);
          
          // Get the provider to send a notification
          const providerResult = await client.query(
            'SELECT * FROM service_providers WHERE stripe_connect_account_id = $1',
            [account.id]
          );
          
          if (providerResult.rows.length > 0) {
            const provider = providerResult.rows[0];
            
            // Create notification for provider
            if (account.details_submitted && account.payouts_enabled) {
              await createNotification({
                client,
                user_id: provider.user_id,
                title: 'Stripe Connect Onboarding Complete',
                message: 'Your Stripe Connect account has been successfully set up. You can now receive payments for your services.',
                type: 'success',
                related_to: 'provider',
                related_id: provider.id
              });
            }
          }
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
            WHERE payment_id = $1 AND stripe_transfer_id = $2
          `, [transfer.metadata.payment_id, transfer.id]);
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
            WHERE payment_id = $1 AND stripe_transfer_id = $2
          `, [transfer.metadata.payment_id, transfer.id]);
          
          // Get the provider to send a notification
          if (transfer.metadata.provider_id) {
            const providerResult = await client.query(
              'SELECT * FROM service_providers WHERE id = $1',
              [transfer.metadata.provider_id]
            );
            
            if (providerResult.rows.length > 0) {
              const provider = providerResult.rows[0];
              
              // Create notification for provider
              await createNotification({
                client,
                user_id: provider.user_id,
                title: 'Payout Completed',
                message: `Your payout of ${(transfer.amount / 100).toFixed(2)} ${transfer.currency.toUpperCase()} has been sent to your bank account.`,
                type: 'success',
                related_to: 'payment',
                related_id: transfer.metadata.payment_id
              });
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
            WHERE payment_id = $1 AND stripe_transfer_id = $2
          `, [transfer.metadata.payment_id, transfer.id]);
          
          // Get the provider to send a notification
          if (transfer.metadata.provider_id) {
            const providerResult = await client.query(
              'SELECT * FROM service_providers WHERE id = $1',
              [transfer.metadata.provider_id]
            );
            
            if (providerResult.rows.length > 0) {
              const provider = providerResult.rows[0];
              
              // Create notification for provider
              await createNotification({
                client,
                user_id: provider.user_id,
                title: 'Payout Failed',
                message: `Your payout of ${(transfer.amount / 100).toFixed(2)} ${transfer.currency.toUpperCase()} has failed. Please check your Stripe Connect account for more details.`,
                type: 'error',
                related_to: 'payment',
                related_id: transfer.metadata.payment_id
              });
            }
          }
        }
        break;
      }
      
      // Add handling for other webhook events as needed
    }
    
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Connect webhook error:', error);
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