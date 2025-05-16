const { Pool } = require('pg');
require('dotenv').config();

async function createDemoUser() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    const client = await pool.connect();
    
    // Check if demo user already exists
    const existingUser = await client.query('SELECT * FROM users WHERE email = $1', ['demo@example.com']);
    
    if (existingUser.rows.length > 0) {
      console.log('Demo user already exists!');
      console.log('Email: demo@example.com');
      console.log('Password: password');
      return;
    }
    
    // Create demo user
    const userResult = await client.query(
      `INSERT INTO users 
       (email, first_name, last_name, role, firebase_uid) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id`,
      ['demo@example.com', 'Demo', 'User', 'homeowner', 'demo123']
    );
    
    const userId = userResult.rows[0].id;
    
    // Create homeowner record
    await client.query(
      'INSERT INTO homeowners (user_id) VALUES ($1)',
      [userId]
    );
    
    console.log('Demo user created successfully!');
    console.log('Email: demo@example.com');
    console.log('Password: password');
    console.log('Role: homeowner');
    
    client.release();
    await pool.end();
  } catch (error) {
    console.error('Error creating demo user:', error);
  }
}

createDemoUser(); 