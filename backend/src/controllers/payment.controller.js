/**
 * Payment Controller
 * Handles all payment-related operations using Stripe
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
const { createPaymentNotification } = require('./notification.controller');

// Helper function to check if Stripe is configured
const isStripeConfigured = () => !!stripe;

/**
 * Create a payment intent for a service request
 * @route POST /api/payments/create-intent
 */
const createPaymentIntent = async (req, res) => {
  // Check if Stripe is configured
  if (!isStripeConfigured()) {
    return res.status(503).json({
      success: false,
      message: 'Payment service is currently unavailable. Please configure Stripe API keys.'
    });
  }

  const { amount, service_request_id, bid_id, currency = 'usd', description } = req.body;
  const client = req.db;
  
  try {
    // Validate required fields
    if (!amount || !service_request_id || !bid_id) {
      return res.status(400).json({
        success: false,
        message: 'Amount, service request ID, and bid ID are required'
      });
    }
    
    // Verify the service request exists and belongs to the user
    const serviceRequestCheck = await client.query(`
      SELECT sr.*, h.user_id as homeowner_user_id
      FROM service_requests sr
      JOIN homeowners h ON sr.homeowner_id = h.id
      WHERE sr.id = $1
    `, [service_request_id]);
    
    if (serviceRequestCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }
    
    const serviceRequest = serviceRequestCheck.rows[0];
    
    // Only homeowner who owns this request can create a payment for it
    if (req.user.id !== parseInt(serviceRequest.homeowner_user_id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create payment for this service request'
      });
    }
    
    // Verify the bid exists and is accepted for this service request
    const bidCheck = await client.query(`
      SELECT b.*, sp.user_id as provider_user_id, sp.company_name
      FROM bids b
      JOIN service_providers sp ON b.provider_id = sp.id
      WHERE b.id = $1 AND b.service_request_id = $2 AND b.status = 'accepted'
    `, [bid_id, service_request_id]);
    
    if (bidCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Accepted bid not found for this service request'
      });
    }
    
    const bid = bidCheck.rows[0];
    
    // Create a Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents for Stripe
      currency,
      description: description || `Payment for service: ${serviceRequest.description} to ${bid.company_name}`,
      metadata: {
        service_request_id,
        bid_id,
        homeowner_id: serviceRequest.homeowner_id,
        provider_id: bid.provider_id
      }
    });
    
    // Save the payment intent to the database
    const paymentResult = await client.query(`
      INSERT INTO payments (
        stripe_payment_intent_id,
        service_request_id,
        bid_id,
        homeowner_id,
        provider_id,
        amount,
        currency,
        status,
        description
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      paymentIntent.id,
      service_request_id,
      bid_id,
      serviceRequest.homeowner_id,
      bid.provider_id,
      amount,
      currency,
      'pending',
      description || `Payment for service request #${service_request_id}`
    ]);
    
    // Create notification for homeowner
    await createPaymentNotification(
      client, 
      paymentResult.rows[0].id, 
      req.user.id, 
      'created'
    );
    
    res.status(201).json({
      success: true,
      message: 'Payment intent created successfully',
      data: {
        payment_id: paymentResult.rows[0].id,
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id
      }
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating payment intent',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Confirm a payment was successful (client-side confirmation)
 * @route POST /api/payments/confirm
 */
const confirmPayment = async (req, res) => {
  // Check if Stripe is configured
  if (!isStripeConfigured()) {
    return res.status(503).json({
      success: false,
      message: 'Payment service is currently unavailable. Please configure Stripe API keys.'
    });
  }

  const { payment_intent_id } = req.body;
  const client = req.db;
  
  try {
    // Validate required fields
    if (!payment_intent_id) {
      return res.status(400).json({
        success: false,
        message: 'Payment intent ID is required'
      });
    }
    
    // Retrieve the payment from the database
    const paymentCheck = await client.query(`
      SELECT p.*, h.user_id as homeowner_user_id, sp.user_id as provider_user_id
      FROM payments p
      JOIN homeowners h ON p.homeowner_id = h.id
      JOIN service_providers sp ON p.provider_id = sp.id
      WHERE p.stripe_payment_intent_id = $1
    `, [payment_intent_id]);
    
    if (paymentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    const payment = paymentCheck.rows[0];
    
    // Only the homeowner who created the payment can confirm it
    if (req.user.id !== parseInt(payment.homeowner_user_id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to confirm this payment'
      });
    }
    
    // Retrieve the payment intent from Stripe to verify its status
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: `Payment not successful. Current status: ${paymentIntent.status}`
      });
    }
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Update the payment status in the database
    await client.query(`
      UPDATE payments
      SET 
        status = 'completed',
        updated_at = CURRENT_TIMESTAMP,
        payment_date = CURRENT_TIMESTAMP
      WHERE stripe_payment_intent_id = $1
    `, [payment_intent_id]);
    
    // Update the service request status to in_progress if it's still in scheduled status
    const serviceRequestCheck = await client.query(`
      SELECT status FROM service_requests WHERE id = $1
    `, [payment.service_request_id]);
    
    if (serviceRequestCheck.rows.length > 0 && serviceRequestCheck.rows[0].status === 'scheduled') {
      await client.query(`
        UPDATE service_requests
        SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [payment.service_request_id]);
    }
    
    // Create notification for homeowner
    await createPaymentNotification(
      client, 
      payment.id, 
      payment.homeowner_user_id, 
      'completed'
    );
    
    // Create notification for provider
    await createPaymentNotification(
      client, 
      payment.id, 
      payment.provider_user_id, 
      'received'
    );
    
    // Commit the transaction
    await client.query('COMMIT');
    
    res.status(200).json({
      success: true,
      message: 'Payment confirmed successfully',
      data: {
        payment_id: payment.id,
        service_request_id: payment.service_request_id,
        amount: payment.amount,
        status: 'completed'
      }
    });
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
    console.error('Error confirming payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error confirming payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Process Stripe webhook events
 * @route POST /api/payments/webhook
 */
const handleWebhook = async (req, res) => {
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
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    // Handle the event based on its type
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        
        // Update the payment status in the database
        await client.query(`
          UPDATE payments
          SET 
            status = 'completed',
            updated_at = CURRENT_TIMESTAMP,
            payment_date = CURRENT_TIMESTAMP
          WHERE stripe_payment_intent_id = $1
        `, [paymentIntent.id]);
        
        // Get the service request ID from the payment record
        const paymentCheck = await client.query(`
          SELECT 
            p.id, p.service_request_id, p.provider_id, 
            h.user_id as homeowner_user_id, 
            sp.user_id as provider_user_id
          FROM payments p
          JOIN homeowners h ON p.homeowner_id = h.id
          JOIN service_providers sp ON p.provider_id = sp.id
          WHERE p.stripe_payment_intent_id = $1
        `, [paymentIntent.id]);
        
        if (paymentCheck.rows.length > 0) {
          const { id, service_request_id, homeowner_user_id, provider_user_id } = paymentCheck.rows[0];
          
          // Update the service request status to in_progress if it's still in scheduled status
          const serviceRequestCheck = await client.query(`
            SELECT status FROM service_requests WHERE id = $1
          `, [service_request_id]);
          
          if (serviceRequestCheck.rows.length > 0 && serviceRequestCheck.rows[0].status === 'scheduled') {
            await client.query(`
              UPDATE service_requests
              SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP
              WHERE id = $1
            `, [service_request_id]);
          }
          
          // Create notifications
          await createPaymentNotification(client, id, homeowner_user_id, 'completed');
          await createPaymentNotification(client, id, provider_user_id, 'received');
        }
        break;
      }
      
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        
        // Update the payment status in the database
        await client.query(`
          UPDATE payments
          SET 
            status = 'failed',
            updated_at = CURRENT_TIMESTAMP
          WHERE stripe_payment_intent_id = $1
        `, [paymentIntent.id]);
        
        // Get the user ID to notify
        const paymentCheck = await client.query(`
          SELECT p.id, h.user_id as homeowner_user_id
          FROM payments p
          JOIN homeowners h ON p.homeowner_id = h.id
          WHERE p.stripe_payment_intent_id = $1
        `, [paymentIntent.id]);
        
        if (paymentCheck.rows.length > 0) {
          // Create notification for payment failure
          await createPaymentNotification(
            client, 
            paymentCheck.rows[0].id, 
            paymentCheck.rows[0].homeowner_user_id, 
            'failed'
          );
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
 * Get payment history for a user
 * @route GET /api/payments/history
 */
const getPaymentHistory = async (req, res) => {
  const client = req.db;
  
  try {
    let query;
    let queryParams = [];
    
    if (req.user.role === 'homeowner') {
      // Get homeowner ID
      const homeownerResult = await client.query(
        'SELECT id FROM homeowners WHERE user_id = $1',
        [req.user.id]
      );
      
      if (homeownerResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Homeowner profile not found'
        });
      }
      
      const homeownerId = homeownerResult.rows[0].id;
      
      // Get payments made by this homeowner
      query = `
        SELECT 
          p.*,
          sr.description as service_description,
          s.name as service_name,
          prop.address as property_address,
          sp.company_name as provider_name
        FROM payments p
        JOIN service_requests sr ON p.service_request_id = sr.id
        JOIN services s ON sr.service_id = s.id
        JOIN properties prop ON sr.property_id = prop.id
        JOIN service_providers sp ON p.provider_id = sp.id
        WHERE p.homeowner_id = $1
        ORDER BY p.created_at DESC
      `;
      queryParams = [homeownerId];
      
    } else if (req.user.role === 'provider') {
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
      
      // Get payments received by this provider
      query = `
        SELECT 
          p.*,
          sr.description as service_description,
          s.name as service_name,
          prop.address as property_address,
          u.first_name as homeowner_first_name, u.last_name as homeowner_last_name
        FROM payments p
        JOIN service_requests sr ON p.service_request_id = sr.id
        JOIN services s ON sr.service_id = s.id
        JOIN properties prop ON sr.property_id = prop.id
        JOIN homeowners h ON p.homeowner_id = h.id
        JOIN users u ON h.user_id = u.id
        WHERE p.provider_id = $1
        ORDER BY p.created_at DESC
      `;
      queryParams = [providerId];
      
    } else if (req.user.role === 'admin') {
      // Admins can see all payments
      query = `
        SELECT 
          p.*,
          sr.description as service_description,
          s.name as service_name,
          prop.address as property_address,
          sp.company_name as provider_name,
          u.first_name as homeowner_first_name, u.last_name as homeowner_last_name
        FROM payments p
        JOIN service_requests sr ON p.service_request_id = sr.id
        JOIN services s ON sr.service_id = s.id
        JOIN properties prop ON sr.property_id = prop.id
        JOIN service_providers sp ON p.provider_id = sp.id
        JOIN homeowners h ON p.homeowner_id = h.id
        JOIN users u ON h.user_id = u.id
        ORDER BY p.created_at DESC
        LIMIT 100
      `;
    } else {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view payment history'
      });
    }
    
    const result = await client.query(query, queryParams);
    
    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting payment history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get a single payment by ID
 * @route GET /api/payments/:id
 */
const getPaymentById = async (req, res) => {
  const { id } = req.params;
  const client = req.db;
  
  try {
    // Get the payment with related information
    const paymentResult = await client.query(`
      SELECT 
        p.*,
        sr.description as service_description, sr.status as service_status,
        s.name as service_name,
        prop.address as property_address,
        sp.company_name as provider_name,
        h.user_id as homeowner_user_id,
        prov.user_id as provider_user_id
      FROM payments p
      JOIN service_requests sr ON p.service_request_id = sr.id
      JOIN services s ON sr.service_id = s.id
      JOIN properties prop ON sr.property_id = prop.id
      JOIN service_providers sp ON p.provider_id = sp.id
      JOIN homeowners h ON p.homeowner_id = h.id
      JOIN service_providers prov ON p.provider_id = prov.id
      WHERE p.id = $1
    `, [id]);
    
    if (paymentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    const payment = paymentResult.rows[0];
    
    // Check authorization
    if (req.user.role === 'homeowner' && req.user.id !== parseInt(payment.homeowner_user_id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this payment'
      });
    }
    
    if (req.user.role === 'provider' && req.user.id !== parseInt(payment.provider_user_id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this payment'
      });
    }
    
    // If the payment is completed, try to get the receipt URL from Stripe
    if (isStripeConfigured() && payment.status === 'completed' && payment.stripe_payment_intent_id) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id);
        const charge = paymentIntent.latest_charge;
        
        if (charge) {
          const chargeDetails = await stripe.charges.retrieve(charge);
          payment.receipt_url = chargeDetails.receipt_url;
        }
      } catch (stripeError) {
        console.warn('Could not retrieve Stripe receipt:', stripeError);
        // Continue without the receipt URL
      }
    }
    
    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Error getting payment details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create a refund for a payment
 * @route POST /api/payments/:id/refund
 */
const createRefund = async (req, res) => {
  // Check if Stripe is configured
  if (!isStripeConfigured()) {
    return res.status(503).json({
      success: false,
      message: 'Payment service is currently unavailable. Please configure Stripe API keys.'
    });
  }

  const { id } = req.params;
  const { amount, reason } = req.body;
  const client = req.db;
  
  try {
    // Retrieve the payment from the database
    const paymentCheck = await client.query(`
      SELECT 
        p.*,
        h.user_id as homeowner_user_id,
        prov.user_id as provider_user_id
      FROM payments p
      JOIN homeowners h ON p.homeowner_id = h.id
      JOIN service_providers prov ON p.provider_id = prov.id
      WHERE p.id = $1
    `, [id]);
    
    if (paymentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    const payment = paymentCheck.rows[0];
    
    // Only allow refunds for completed payments
    if (payment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: `Cannot refund a payment with status '${payment.status}'`
      });
    }
    
    // Only allow homeowner, provider involved in the payment, or admin to create a refund
    if (req.user.role === 'homeowner' && req.user.id !== parseInt(payment.homeowner_user_id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to refund this payment'
      });
    }
    
    if (req.user.role === 'provider' && req.user.id !== parseInt(payment.provider_user_id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to refund this payment'
      });
    }
    
    // Retrieve the payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(
      payment.stripe_payment_intent_id
    );
    
    if (!paymentIntent.latest_charge) {
      return res.status(400).json({
        success: false,
        message: 'No charge found for this payment'
      });
    }
    
    // Create a refund in Stripe
    const refundAmount = amount ? Math.round(amount * 100) : undefined;
    const refund = await stripe.refunds.create({
      charge: paymentIntent.latest_charge,
      amount: refundAmount, // If undefined, refund the full amount
      reason: reason || 'requested_by_customer'
    });
    
    // Save the refund to the database
    const refundResult = await client.query(`
      INSERT INTO refunds (
        payment_id,
        stripe_refund_id,
        amount,
        reason,
        status,
        initiated_by_user_id,
        initiated_by_role
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      id,
      refund.id,
      refundAmount ? refundAmount / 100 : payment.amount, // Convert back from cents
      reason || 'Customer requested',
      refund.status,
      req.user.id,
      req.user.role
    ]);
    
    // Update the payment status
    await client.query(`
      UPDATE payments
      SET 
        status = CASE 
          WHEN $1 IS NULL OR $1 = $2 THEN 'refunded' 
          ELSE 'partially_refunded' 
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [
      refundAmount,
      Math.round(payment.amount * 100), // Compare with original amount in cents
      id
    ]);
    
    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      data: {
        refund_id: refundResult.rows[0].id,
        payment_id: id,
        amount: refundAmount ? refundAmount / 100 : payment.amount,
        status: refund.status
      }
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing refund',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get payment analytics for provider
 * @route GET /api/payments/analytics
 */
const getPaymentAnalytics = async (req, res) => {
  const { period = 'month' } = req.query; // 'week', 'month', 'year'
  const client = req.db;
  
  try {
    // Only providers and admins can access analytics
    if (!['provider', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access payment analytics'
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
          DATE_TRUNC('day', payment_date) as day,
          SUM(amount) as total_amount,
          COUNT(*) as transaction_count
        FROM payments
        WHERE provider_id = $${paramIndex} AND status = 'completed'
          AND payment_date >= $${paramIndex + 1} AND payment_date <= $${paramIndex + 2}
        GROUP BY DATE_TRUNC('day', payment_date)
        ORDER BY day ASC
      `;
      queryParams.push(providerId, startDateStr, endDateStr);
    } else {
      // Admin can see all payments summarized
      query = `
        SELECT 
          DATE_TRUNC('day', payment_date) as day,
          SUM(amount) as total_amount,
          COUNT(*) as transaction_count
        FROM payments
        WHERE status = 'completed'
          AND payment_date >= $1 AND payment_date <= $2
        GROUP BY DATE_TRUNC('day', payment_date)
        ORDER BY day ASC
      `;
      queryParams.push(startDateStr, endDateStr);
    }
    
    const result = await client.query(query, queryParams);
    
    // Calculate summary statistics
    let totalAmount = 0;
    let totalTransactions = 0;
    
    result.rows.forEach(row => {
      totalAmount += parseFloat(row.total_amount);
      totalTransactions += parseInt(row.transaction_count);
    });
    
    const averageTransactionValue = totalTransactions > 0 
      ? totalAmount / totalTransactions 
      : 0;
    
    res.status(200).json({
      success: true,
      data: {
        daily_data: result.rows,
        summary: {
          total_amount: totalAmount.toFixed(2),
          total_transactions: totalTransactions,
          average_transaction_value: averageTransactionValue.toFixed(2),
          period: period,
          start_date: startDateStr,
          end_date: endDateStr
        }
      }
    });
  } catch (error) {
    console.error('Error getting payment analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createPaymentIntent,
  confirmPayment,
  handleWebhook,
  getPaymentHistory,
  getPaymentById,
  createRefund,
  getPaymentAnalytics
}; 