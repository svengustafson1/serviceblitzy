const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function setupDatabase() {
  try {
    const client = await pool.connect();
    console.log('Connected to PostgreSQL database');

    // Read SQL schema file
    const schemaFilePath = path.join(__dirname, 'config', 'db.sql');
    const schema = fs.readFileSync(schemaFilePath, 'utf8');

    // Execute the schema
    console.log('Initializing database schema...');
    await client.query(schema);
    
    console.log('Database setup completed successfully!');
    
    client.release();
    await pool.end();
  } catch (err) {
    console.error('Database setup error:', err);
    process.exit(1);
  }
}

setupDatabase(); 