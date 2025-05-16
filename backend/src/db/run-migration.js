/**
 * Database Migration Runner
 * Runs SQL migration files located in the migrations directory
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Run a specific migration file
 * @param {string} fileName - Name of the migration file to run
 */
async function runMigration(fileName) {
  console.log(`Running migration: ${fileName}`);
  
  const filePath = path.join(__dirname, 'migrations', fileName);
  const sql = fs.readFileSync(filePath, 'utf8');
  
  try {
    const client = await pool.connect();
    
    try {
      // Start a transaction
      await client.query('BEGIN');
      
      // Run the SQL script
      await client.query(sql);
      
      // Record the migration in the migrations table
      await client.query(
        'INSERT INTO migrations (name, applied_at) VALUES ($1, CURRENT_TIMESTAMP) ON CONFLICT (name) DO NOTHING',
        [fileName]
      );
      
      // Commit the transaction
      await client.query('COMMIT');
      
      console.log(`Migration ${fileName} applied successfully`);
    } catch (error) {
      // Rollback on error
      await client.query('ROLLBACK');
      console.error(`Error applying migration ${fileName}:`, error);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

/**
 * Ensure the migrations table exists
 */
async function ensureMigrationsTable() {
  try {
    const client = await pool.connect();
    
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating migrations table:', error);
    throw error;
  }
}

/**
 * Get a list of applied migrations
 * @returns {string[]} Array of migration file names that have been applied
 */
async function getAppliedMigrations() {
  try {
    const client = await pool.connect();
    
    try {
      const result = await client.query('SELECT name FROM migrations');
      return result.rows.map(row => row.name);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error getting applied migrations:', error);
    throw error;
  }
}

/**
 * Main function to run pending migrations
 */
async function main() {
  try {
    // Ensure the migrations table exists
    await ensureMigrationsTable();
    
    // Get applied migrations
    const appliedMigrations = await getAppliedMigrations();
    
    // Get all migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure migrations run in order
    
    // Determine which migrations need to be applied
    const pendingMigrations = migrationFiles.filter(file => !appliedMigrations.includes(file));
    
    if (pendingMigrations.length === 0) {
      console.log('No pending migrations to apply');
      process.exit(0);
    }
    
    console.log(`Found ${pendingMigrations.length} pending migrations`);
    
    // Run pending migrations
    for (const migration of pendingMigrations) {
      await runMigration(migration);
    }
    
    console.log('All migrations applied successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

// Run the migrations
main(); 