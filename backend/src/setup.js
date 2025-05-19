const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');
const Stripe = require('stripe');
require('dotenv').config();

// Validate required environment variables
function validateEnvironmentVariables() {
  const requiredVars = [
    'DATABASE_URL',
    'AWS_S3_BUCKET',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_REGION',
    'STRIPE_SECRET_KEY',
    'STRIPE_CONNECT_CLIENT_ID',
    'STRIPE_CONNECT_WEBHOOK_SECRET'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('Error: Missing required environment variables:', missingVars.join(', '));
    process.exit(1);
  }

  console.log('Environment variables validated successfully');
}

// Verify AWS S3 bucket exists and is accessible
async function verifyS3Bucket() {
  try {
    console.log('Verifying AWS S3 bucket...');
    
    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION
    });

    const params = {
      Bucket: process.env.AWS_S3_BUCKET
    };

    await s3.headBucket(params).promise();
    console.log(`AWS S3 bucket '${process.env.AWS_S3_BUCKET}' verified successfully`);
    return true;
  } catch (err) {
    if (err.statusCode === 404) {
      console.error(`AWS S3 bucket '${process.env.AWS_S3_BUCKET}' does not exist`);
    } else if (err.statusCode === 403) {
      console.error(`AWS S3 bucket '${process.env.AWS_S3_BUCKET}' exists but you don't have access to it`);
    } else {
      console.error('AWS S3 bucket verification error:', err);
    }
    return false;
  }
}

// Verify Stripe Connect account
async function verifyStripeConnect() {
  try {
    console.log('Verifying Stripe Connect configuration...');
    
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    
    // Verify the API key is valid by making a simple request
    const account = await stripe.account.retrieve();
    
    if (!account || !account.id) {
      throw new Error('Invalid Stripe account');
    }
    
    console.log('Stripe Connect configuration verified successfully');
    return true;
  } catch (err) {
    console.error('Stripe Connect verification error:', err);
    return false;
  }
}

// Create database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Setup database schema and tables
async function setupDatabase() {
  let client;
  try {
    client = await pool.connect();
    console.log('Connected to PostgreSQL database');

    // Read main SQL schema file
    const schemaFilePath = path.join(__dirname, 'config', 'db.sql');
    const schema = fs.readFileSync(schemaFilePath, 'utf8');

    // Execute the main schema
    console.log('Initializing database schema...');
    await client.query(schema);
    
    // Initialize new tables
    console.log('Creating new database tables...');
    
    // Create recurring_schedules table
    await client.query(`
      CREATE TABLE IF NOT EXISTS recurring_schedules (
        id SERIAL PRIMARY KEY,
        service_request_id INTEGER NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
        rrule_pattern VARCHAR(255) NOT NULL,
        next_run TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_recurring_schedules_service_request ON recurring_schedules(service_request_id);
      CREATE INDEX IF NOT EXISTS idx_recurring_schedules_next_run ON recurring_schedules(next_run);
    `);
    
    // Create file_uploads table
    await client.query(`
      CREATE TABLE IF NOT EXISTS file_uploads (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        related_to VARCHAR(50) NOT NULL,
        related_id INTEGER NOT NULL,
        file_url VARCHAR(255) NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_file_uploads_user ON file_uploads(user_id);
      CREATE INDEX IF NOT EXISTS idx_file_uploads_related ON file_uploads(related_to, related_id);
    `);
    
    // Create provider_payouts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS provider_payouts (
        id SERIAL PRIMARY KEY,
        provider_id INTEGER NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
        payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
        stripe_payout_id VARCHAR(128),
        amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_provider_payouts_provider ON provider_payouts(provider_id);
      CREATE INDEX IF NOT EXISTS idx_provider_payouts_payment ON provider_payouts(payment_id);
    `);
    
    // Create admin_audit_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id SERIAL PRIMARY KEY,
        admin_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action_type VARCHAR(50) NOT NULL,
        entity_name VARCHAR(50) NOT NULL,
        entity_id INTEGER,
        details JSONB,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin ON admin_audit_logs(admin_user_id);
      CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_entity ON admin_audit_logs(entity_name, entity_id);
      CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_timestamp ON admin_audit_logs(timestamp);
    `);
    
    // Update existing tables with new columns
    console.log('Updating existing tables with new columns...');
    
    // Add recommendation_score and recommendation_confidence to bids table
    await client.query(`
      ALTER TABLE bids ADD COLUMN IF NOT EXISTS recommendation_score DECIMAL(5,2);
      ALTER TABLE bids ADD COLUMN IF NOT EXISTS recommendation_confidence FLOAT;
      CREATE INDEX IF NOT EXISTS idx_bids_recommendation_score ON bids(recommendation_score);
    `);
    
    // Add delivery_status to notifications table
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_status_enum') THEN
          CREATE TYPE delivery_status_enum AS ENUM ('pending', 'sent', 'failed');
        END IF;
      END
      $$;
      
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS delivery_status delivery_status_enum DEFAULT 'pending';
      CREATE INDEX IF NOT EXISTS idx_notifications_delivery_status ON notifications(delivery_status);
    `);
    
    // Add attachment_ids to service_requests table
    await client.query(`
      ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS attachment_ids JSONB DEFAULT '[]';
    `);
    
    // Add stripe_account_id to service_providers table if not already exists
    await client.query(`
      ALTER TABLE service_providers ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR(128);
    `);
    
    console.log('Database setup completed successfully!');
    
  } catch (err) {
    console.error('Database setup error:', err);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Main setup function
async function setup() {
  try {
    // Validate environment variables
    validateEnvironmentVariables();
    
    // Verify external services
    const s3Verified = await verifyS3Bucket();
    const stripeVerified = await verifyStripeConnect();
    
    if (!s3Verified || !stripeVerified) {
      console.error('External service verification failed. Please check your configuration.');
      process.exit(1);
    }
    
    // Setup database
    await setupDatabase();
    
    console.log('Setup completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Setup failed:', err);
    process.exit(1);
  }
}

// Run the setup
setup();