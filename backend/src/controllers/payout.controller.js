/**
 * Payout Controller
 * Handles automated payment distribution to service providers using Stripe Connect
 */
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
    // Get the provider's information
    const providerResult = await client.query(`
      SELECT sp.*, u.email, u.first_name, u.last_name, u.phone
      FROM service_providers sp
      JOIN users u ON sp.user_id = u.id
      WHERE sp.user_id = $1
    `, [req.user.id]);
    
    if (providerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Provider profile not found'
      });
    }
    
    const provider = providerResult.rows[0];
    
    // Check if provider already has a Stripe Connect account
    if (provider.stripe_connect_id) {
      return res.status(400).json({
        success: false,
        message: 'Provider already has a Stripe Connect account'
      });
    }
    
    // Create a Custom Connect account
    const account = await stripe.accounts.create({
      type: 'custom',
      country: 'US', // Default to US, can be made configurable
      email: provider.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      business_profile: {
        mcc: '1520', // General Contractors
        url: process.env.WEBSITE_URL || 'https://homehub.com',
        product_description: `Home services provided by ${provider.company_name}`
      },
      metadata: {
        provider_id: provider.id,
        user_id: req.user.id
      }
    });
    
    // Update the provider record with the Stripe Connect account ID
    await client.query(`
      UPDATE service_providers
      SET 
        stripe_connect_id = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [account.id, provider.id]);
    
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
 * Create an account link for onboarding a Connect account
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
    // Get the provider's Stripe Connect account ID
    const providerResult = await client.query(`
      SELECT stripe_connect_id
      FROM service_providers
      WHERE user_id = $1
    `, [req.user.id]);
    
    if (providerResult.rows.length === 0 || !providerResult.rows[0].stripe_connect_id) {
      return res.status(404).json({
        success: false,
        message: 'Provider does not have a Stripe Connect account'
      });
    }
    
    const stripeConnectId = providerResult.rows[0].stripe_connect_id;
    
    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeConnectId,
      refresh_url: `${process.env.FRONTEND_URL}/dashboard/provider/connect/refresh`,
      return_url: `${process.env.FRONTEND_URL}/dashboard/provider/connect/complete`,
      type: 'account_onboarding',
      collect: 'eventually_due'
    });
    
    res.status(200).json({
      success: true,
      data: {
        url: accountLink.url,
        expires_at: accountLink.expires_at
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
 * Get a provider's Stripe Connect account details
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
    // Get the provider's Stripe Connect account ID
    const providerResult = await client.query(`
      SELECT stripe_connect_id
      FROM service_providers
      WHERE user_id = $1
    `, [req.user.id]);
    
    if (providerResult.rows.length === 0 || !providerResult.rows[0].stripe_connect_id) {
      return res.status(404).json({
        success: false,
        message: 'Provider does not have a Stripe Connect account'
      });
    }
    
    const stripeConnectId = providerResult.rows[0].stripe_connect_id;
    
    // Retrieve the account details from Stripe
    const account = await stripe.accounts.retrieve(stripeConnectId);
    
    // Return a sanitized version of the account details
    res.status(200).json({
      success: true,
      data: {
        id: account.id,
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        requirements: account.requirements,
        capabilities: account.capabilities,
        external_accounts: account.external_accounts ? {
          total_count: account.external_accounts.total_count,
          has_bank_account: account.external_accounts.data.some(item => item.object === 'bank_account'),
          default_account_last4: account.external_accounts.data.length > 0 ? 
            account.external_accounts.data[0].last4 : null
        } : null,
        settings: account.settings ? {
          payouts: account.settings.payouts
        } : null
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
 * Create a login link for a provider to access their Stripe Connect dashboard
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
    // Get the provider's Stripe Connect account ID
    const providerResult = await client.query(`
      SELECT stripe_connect_id
      FROM service_providers
      WHERE user_id = $1
    `, [req.user.id]);
    
    if (providerResult.rows.length === 0 || !providerResult.rows[0].stripe_connect_id) {
      return res.status(404).json({
        success: false,
        message: 'Provider does not have a Stripe Connect account'
      });
    }
    
    const stripeConnectId = providerResult.rows[0].stripe_connect_id;
    
    // Create a login link for the Connect account dashboard
    const loginLink = await stripe.accounts.createLoginLink(stripeConnectId);
    
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
    
    // Get the payment details
    const paymentResult = await client.query(`
      SELECT 
        p.*,
        sp.stripe_connect_id,
        sp.user_id as provider_user_id,
        sp.commission_rate
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
    
    // Check if the provider has a Stripe Connect account
    if (!payment.stripe_connect_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Provider does not have a Stripe Connect account set up'
      });
    }
    
    // Check if a payout already exists for this payment
    const existingPayoutResult = await client.query(`
      SELECT id FROM provider_payouts
      WHERE payment_id = $1
    `, [payment_id]);
    
    if (existingPayoutResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'A payout already exists for this payment'
      });
    }
    
    // Calculate the platform fee (commission)
    const commissionRate = payment.commission_rate || 0.10; // Default to 10% if not specified
    const platformFee = Math.round(payment.amount * commissionRate * 100) / 100;
    const providerAmount = Math.round((payment.amount - platformFee) * 100) / 100;
    
    // Create a transfer to the provider's Connect account
    const transfer = await stripe.transfers.create({
      amount: Math.round(providerAmount * 100), // Convert to cents for Stripe
      currency: payment.currency || 'usd',
      destination: payment.stripe_connect_id,
      source_transaction: payment.stripe_payment_intent_id,
      description: `Payout for payment #${payment.id}`,
      metadata: {
        payment_id: payment.id,
        provider_id: payment.provider_id,
        service_request_id: payment.service_request_id,
        platform_fee: platformFee
      }
    });
    
    // Create a record of the payout in the database
    const payoutResult = await client.query(`
      INSERT INTO provider_payouts (
        provider_id,
        payment_id,
        stripe_payout_id,
        amount,
        status
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      payment.provider_id,
      payment_id,
      transfer.id,
      providerAmount,
      'completed'
    ]);
    
    // Create notification for the provider
    await createPaymentNotification(
      client,
      payment.id,
      payment.provider_user_id,
      'payout_completed',
      {
        amount: providerAmount,
        currency: payment.currency || 'usd',
        payout_id: payoutResult.rows[0].id
      }
    );
    
    // Commit the transaction
    await client.query('COMMIT');
    
    res.status(200).json({
      success: true,
      message: 'Payout processed successfully',
      data: {
        payout_id: payoutResult.rows[0].id,
        transfer_id: transfer.id,
        provider_id: payment.provider_id,
        payment_id: payment.id,
        amount: providerAmount,
        platform_fee: platformFee,
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
          p.service_request_id,
          sr.description as service_description,
          s.name as service_name,
          prop.address as property_address,
          h.user_id as homeowner_user_id,
          u.first_name as homeowner_first_name, u.last_name as homeowner_last_name
        FROM provider_payouts pp
        JOIN payments p ON pp.payment_id = p.id
        JOIN service_requests sr ON p.service_request_id = sr.id
        JOIN services s ON sr.service_id = s.id
        JOIN properties prop ON sr.property_id = prop.id
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
          p.service_request_id,
          sr.description as service_description,
          s.name as service_name,
          prop.address as property_address,
          sp.company_name as provider_name,
          h.user_id as homeowner_user_id,
          u.first_name as homeowner_first_name, u.last_name as homeowner_last_name
        FROM provider_payouts pp
        JOIN payments p ON pp.payment_id = p.id
        JOIN service_requests sr ON p.service_request_id = sr.id
        JOIN services s ON sr.service_id = s.id
        JOIN properties prop ON sr.property_id = prop.id
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
        p.service_request_id, p.amount as payment_amount, p.currency,
        sr.description as service_description, sr.status as service_status,
        s.name as service_name,
        prop.address as property_address,
        sp.company_name as provider_name, sp.user_id as provider_user_id,
        h.user_id as homeowner_user_id,
        u.first_name as homeowner_first_name, u.last_name as homeowner_last_name
      FROM provider_payouts pp
      JOIN payments p ON pp.payment_id = p.id
      JOIN service_requests sr ON p.service_request_id = sr.id
      JOIN services s ON sr.service_id = s.id
      JOIN properties prop ON sr.property_id = prop.id
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
    
    // Calculate platform fee
    const platformFee = Math.round((payout.payment_amount - payout.amount) * 100) / 100;
    payout.platform_fee = platformFee;
    
    // If the payout is completed and has a Stripe payout ID, try to get more details from Stripe
    if (isStripeConfigured() && payout.status === 'completed' && payout.stripe_payout_id) {
      try {
        const transfer = await stripe.transfers.retrieve(payout.stripe_payout_id);
        payout.stripe_details = {
          created: transfer.created,
          arrival_date: transfer.arrival_date,
          description: transfer.description,
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
        
        // Update the provider's Connect account status
        await client.query(`
          UPDATE service_providers
          SET 
            stripe_connect_verified = $1,
            updated_at = CURRENT_TIMESTAMP
          WHERE stripe_connect_id = $2
        `, [
          account.details_submitted && account.charges_enabled && account.payouts_enabled,
          account.id
        ]);
        
        // Get the provider's user ID for notification
        const providerResult = await client.query(`
          SELECT user_id FROM service_providers WHERE stripe_connect_id = $1
        `, [account.id]);
        
        if (providerResult.rows.length > 0) {
          // Create notification for account update
          await createPaymentNotification(
            client,
            null, // No payment ID for this notification
            providerResult.rows[0].user_id,
            'connect_account_updated',
            {
              details_submitted: account.details_submitted,
              charges_enabled: account.charges_enabled,
              payouts_enabled: account.payouts_enabled
            }
          );
        }
        break;
      }
      
      case 'account.application.deauthorized': {
        const account = event.data.object;
        
        // Update the provider's Connect account status
        await client.query(`
          UPDATE service_providers
          SET 
            stripe_connect_verified = false,
            updated_at = CURRENT_TIMESTAMP
          WHERE stripe_connect_id = $1
        `, [account.id]);
        
        // Get the provider's user ID for notification
        const providerResult = await client.query(`
          SELECT user_id FROM service_providers WHERE stripe_connect_id = $1
        `, [account.id]);
        
        if (providerResult.rows.length > 0) {
          // Create notification for account deauthorization
          await createPaymentNotification(
            client,
            null, // No payment ID for this notification
            providerResult.rows[0].user_id,
            'connect_account_deauthorized'
          );
        }
        break;
      }
      
      case 'transfer.created': {
        const transfer = event.data.object;
        
        // Update the payout status if we can find it
        if (transfer.metadata && transfer.metadata.payment_id) {
          await client.query(`
            UPDATE provider_payouts
            SET 
              status = 'processing',
              updated_at = CURRENT_TIMESTAMP
            WHERE payment_id = $1 AND stripe_payout_id = $2
          `, [transfer.metadata.payment_id, transfer.id]);
        }
        break;
      }
      
      case 'transfer.paid': {
        const transfer = event.data.object;
        
        // Update the payout status if we can find it
        if (transfer.metadata && transfer.metadata.payment_id) {
          await client.query(`
            UPDATE provider_payouts
            SET 
              status = 'completed',
              updated_at = CURRENT_TIMESTAMP
            WHERE payment_id = $1 AND stripe_payout_id = $2
          `, [transfer.metadata.payment_id, transfer.id]);
          
          // Get the provider's user ID for notification
          const payoutResult = await client.query(`
            SELECT pp.*, sp.user_id as provider_user_id
            FROM provider_payouts pp
            JOIN service_providers sp ON pp.provider_id = sp.id
            WHERE pp.payment_id = $1 AND pp.stripe_payout_id = $2
          `, [transfer.metadata.payment_id, transfer.id]);
          
          if (payoutResult.rows.length > 0) {
            // Create notification for successful payout
            await createPaymentNotification(
              client,
              transfer.metadata.payment_id,
              payoutResult.rows[0].provider_user_id,
              'payout_completed',
              {
                amount: payoutResult.rows[0].amount,
                payout_id: payoutResult.rows[0].id
              }
            );
          }
        }
        break;
      }
      
      case 'transfer.failed': {
        const transfer = event.data.object;
        
        // Update the payout status if we can find it
        if (transfer.metadata && transfer.metadata.payment_id) {
          await client.query(`
            UPDATE provider_payouts
            SET 
              status = 'failed',
              updated_at = CURRENT_TIMESTAMP
            WHERE payment_id = $1 AND stripe_payout_id = $2
          `, [transfer.metadata.payment_id, transfer.id]);
          
          // Get the provider's user ID for notification
          const payoutResult = await client.query(`
            SELECT pp.*, sp.user_id as provider_user_id
            FROM provider_payouts pp
            JOIN service_providers sp ON pp.provider_id = sp.id
            WHERE pp.payment_id = $1 AND pp.stripe_payout_id = $2
          `, [transfer.metadata.payment_id, transfer.id]);
          
          if (payoutResult.rows.length > 0) {
            // Create notification for failed payout
            await createPaymentNotification(
              client,
              transfer.metadata.payment_id,
              payoutResult.rows[0].provider_user_id,
              'payout_failed'
            );
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

/**
 * Schedule automated payouts for completed payments
 * This function would typically be called by a scheduled job
 */
const scheduleAutomatedPayouts = async (client) => {
  // Check if Stripe is configured
  if (!isStripeConfigured()) {
    console.warn('Payout service is currently unavailable. Please configure Stripe API keys.');
    return { success: false, message: 'Stripe not configured' };
  }
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    // Find completed payments that haven't been paid out yet
    const eligiblePaymentsResult = await client.query(`
      SELECT 
        p.*,
        sp.stripe_connect_id,
        sp.user_id as provider_user_id,
        sp.commission_rate,
        sp.stripe_connect_verified
      FROM payments p
      JOIN service_providers sp ON p.provider_id = sp.id
      LEFT JOIN provider_payouts pp ON p.id = pp.payment_id
      WHERE 
        p.status = 'completed' 
        AND pp.id IS NULL
        AND sp.stripe_connect_id IS NOT NULL
        AND sp.stripe_connect_verified = true
        AND p.created_at < NOW() - INTERVAL '24 hours' -- Only process payments older than 24 hours
    `);
    
    if (eligiblePaymentsResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: true, message: 'No eligible payments found for payout', count: 0 };
    }
    
    let successCount = 0;
    let failureCount = 0;
    
    // Process each eligible payment
    for (const payment of eligiblePaymentsResult.rows) {
      try {
        // Calculate the platform fee (commission)
        const commissionRate = payment.commission_rate || 0.10; // Default to 10% if not specified
        const platformFee = Math.round(payment.amount * commissionRate * 100) / 100;
        const providerAmount = Math.round((payment.amount - platformFee) * 100) / 100;
        
        // Create a transfer to the provider's Connect account
        const transfer = await stripe.transfers.create({
          amount: Math.round(providerAmount * 100), // Convert to cents for Stripe
          currency: payment.currency || 'usd',
          destination: payment.stripe_connect_id,
          source_transaction: payment.stripe_payment_intent_id,
          description: `Automated payout for payment #${payment.id}`,
          metadata: {
            payment_id: payment.id,
            provider_id: payment.provider_id,
            service_request_id: payment.service_request_id,
            platform_fee: platformFee,
            automated: true
          }
        });
        
        // Create a record of the payout in the database
        await client.query(`
          INSERT INTO provider_payouts (
            provider_id,
            payment_id,
            stripe_payout_id,
            amount,
            status
          )
          VALUES ($1, $2, $3, $4, $5)
        `, [
          payment.provider_id,
          payment.id,
          transfer.id,
          providerAmount,
          'processing'
        ]);
        
        // Create notification for the provider
        await createPaymentNotification(
          client,
          payment.id,
          payment.provider_user_id,
          'payout_processing',
          {
            amount: providerAmount,
            currency: payment.currency || 'usd'
          }
        );
        
        successCount++;
      } catch (payoutError) {
        console.error(`Error processing automated payout for payment ${payment.id}:`, payoutError);
        failureCount++;
        // Continue with the next payment
      }
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    
    return { 
      success: true, 
      message: 'Automated payouts processed', 
      count: successCount,
      failures: failureCount
    };
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('Error scheduling automated payouts:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Get payout analytics for provider or admin
 * @route GET /api/payouts/analytics
 */
const getPayoutAnalytics = async (req, res) => {
  const { period = 'month' } = req.query; // 'week', 'month', 'year'
  const client = req.db;
  
  try {
    // Only providers and admins can access analytics
    if (!['provider', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access payout analytics'
      });
    }
    
    let providerId;
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
      
      providerId = providerResult.rows[0].id;
    }
    
    // Calculate date range based on period
    let startDate;
    const now = new Date();
    
    if (period === 'week') {
      // Last 7 days
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else if (period === 'month') {
      // Last 30 days
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 30);
    } else if (period === 'year') {
      // Last 365 days
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 365);
    } else {
      return res.status(400).json({
        success: false,
        message: "Period must be 'week', 'month', or 'year'"
      });
    }
    
    // Format dates for SQL
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = now.toISOString().split('T')[0];
    
    // Build query based on user role
    let query;
    const queryParams = [];
    let paramIndex = 1;
    
    if (req.user.role === 'provider') {
      query = `
        SELECT 
          DATE_TRUNC('day', created_at) as day,
          SUM(amount) as total_amount,
          COUNT(*) as payout_count
        FROM provider_payouts
        WHERE provider_id = $${paramIndex} AND status = 'completed'
          AND created_at >= $${paramIndex + 1} AND created_at <= $${paramIndex + 2}
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY day ASC
      `;
      queryParams.push(providerId, startDateStr, endDateStr);
    } else {
      // Admin can see all payouts summarized
      query = `
        SELECT 
          DATE_TRUNC('day', created_at) as day,
          SUM(amount) as total_amount,
          COUNT(*) as payout_count
        FROM provider_payouts
        WHERE status = 'completed'
          AND created_at >= $1 AND created_at <= $2
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY day ASC
      `;
      queryParams.push(startDateStr, endDateStr);
    }
    
    const result = await client.query(query, queryParams);
    
    // Calculate summary statistics
    let totalAmount = 0;
    let totalPayouts = 0;
    
    result.rows.forEach(row => {
      totalAmount += parseFloat(row.total_amount);
      totalPayouts += parseInt(row.payout_count);
    });
    
    const averagePayoutValue = totalPayouts > 0 
      ? totalAmount / totalPayouts 
      : 0;
    
    // Get additional statistics for providers
    let additionalStats = {};
    
    if (req.user.role === 'provider') {
      // Get pending payouts
      const pendingResult = await client.query(`
        SELECT COUNT(*) as count, SUM(amount) as total
        FROM provider_payouts
        WHERE provider_id = $1 AND status IN ('pending', 'processing')
      `, [providerId]);
      
      // Get failed payouts
      const failedResult = await client.query(`
        SELECT COUNT(*) as count, SUM(amount) as total
        FROM provider_payouts
        WHERE provider_id = $1 AND status = 'failed'
          AND created_at >= $2 AND created_at <= $3
      `, [providerId, startDateStr, endDateStr]);
      
      additionalStats = {
        pending_payouts: parseInt(pendingResult.rows[0].count) || 0,
        pending_amount: parseFloat(pendingResult.rows[0].total) || 0,
        failed_payouts: parseInt(failedResult.rows[0].count) || 0,
        failed_amount: parseFloat(failedResult.rows[0].total) || 0
      };
    }
    
    res.status(200).json({
      success: true,
      data: {
        daily_data: result.rows,
        summary: {
          total_amount: totalAmount.toFixed(2),
          total_payouts: totalPayouts,
          average_payout_value: averagePayoutValue.toFixed(2),
          period: period,
          start_date: startDateStr,
          end_date: endDateStr,
          ...additionalStats
        }
      }
    });
  } catch (error) {
    console.error('Error getting payout analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payout analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
  handleConnectWebhook,
  scheduleAutomatedPayouts,
  getPayoutAnalytics
};