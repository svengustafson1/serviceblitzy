const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');
const stripe = require('stripe');
require('dotenv').config();

// Initialize PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Validates required environment variables
 */
function validateEnvironmentVariables() {
  const requiredVars = [
    'DATABASE_URL',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_REGION',
    'AWS_S3_BUCKET',
    'STRIPE_SECRET_KEY',
    'STRIPE_CONNECT_CLIENT_ID'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error(`Error: Missing required environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
  }

  console.log('Environment variables validated successfully');
}

/**
 * Verifies AWS S3 bucket configuration
 */
async function verifyAwsS3Bucket() {
  try {
    console.log('Verifying AWS S3 bucket configuration...');
    
    // Configure AWS SDK
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION
    });

    // Create S3 service object
    const s3 = new AWS.S3();
    
    // Check if bucket exists and is accessible
    const params = {
      Bucket: process.env.AWS_S3_BUCKET
    };
    
    await s3.headBucket(params).promise();
    console.log(`AWS S3 bucket '${process.env.AWS_S3_BUCKET}' verified successfully`);
  } catch (err) {
    console.error('AWS S3 bucket verification error:', err);
    process.exit(1);
  }
}

/**
 * Verifies Stripe Connect configuration
 */
async function verifyStripeConnect() {
  try {
    console.log('Verifying Stripe Connect configuration...');
    
    // Initialize Stripe with API key
    const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);
    
    // Verify API key by making a simple request
    await stripeClient.accounts.list({ limit: 1 });
    
    console.log('Stripe Connect configuration verified successfully');
  } catch (err) {
    console.error('Stripe Connect verification error:', err);
    process.exit(1);
  }
}

/**
 * Sets up the database schema
 */
async function setupDatabase() {
  try {
    const client = await pool.connect();
    console.log('Connected to PostgreSQL database');

    // Read and execute main SQL schema file
    const schemaFilePath = path.join(__dirname, 'config', 'db.sql');
    const schema = fs.readFileSync(schemaFilePath, 'utf8');

    console.log('Initializing database schema...');
    await client.query(schema);
    
    // Read and execute migration files for new tables
    const migrationFiles = [
      'recurring-schedules.sql',
      'file-uploads.sql',
      'provider-payouts.sql',
      'admin-audit-logs.sql'
    ];
    
    for (const migrationFile of migrationFiles) {
      try {
        const migrationPath = path.join(__dirname, 'db', 'migrations', migrationFile);
        if (fs.existsSync(migrationPath)) {
          console.log(`Applying migration: ${migrationFile}`);
          const migration = fs.readFileSync(migrationPath, 'utf8');
          await client.query(migration);
        } else {
          console.warn(`Migration file not found: ${migrationFile}`);
        }
      } catch (migrationErr) {
        console.error(`Error applying migration ${migrationFile}:`, migrationErr);
      }
    }
    
    console.log('Database setup completed successfully!');
    
    client.release();
    await pool.end();
  } catch (err) {
    console.error('Database setup error:', err);
    process.exit(1);
  }
}

/**
 * Main setup function
 */
async function main() {
  try {
    // Validate environment variables
    validateEnvironmentVariables();
    
    // Verify AWS S3 bucket configuration
    await verifyAwsS3Bucket();
    
    // Verify Stripe Connect configuration
    await verifyStripeConnect();
    
    // Setup database schema
    await setupDatabase();
    
    console.log('Setup completed successfully!');
  } catch (err) {
    console.error('Setup failed:', err);
    process.exit(1);
  }
}

// Run the main setup function
main();