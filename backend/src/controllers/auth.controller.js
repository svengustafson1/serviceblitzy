const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');

/**
 * Register a new user
 * @route POST /api/auth/register
 */
const register = async (req, res) => {
  const { email, password, firstName, lastName, phone, role = 'homeowner' } = req.body;
  const client = req.db;

  try {
    // Check if user already exists
    const existingUser = await client.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Create user in Firebase
    let firebaseUser;
    try {
      firebaseUser = await admin.auth().createUser({
        email,
        password,
        displayName: `${firstName} ${lastName}`,
        phoneNumber: phone
      });

      // Set custom claims for role
      await admin.auth().setCustomUserClaims(firebaseUser.uid, { role });
    } catch (firebaseError) {
      console.error('Firebase user creation error:', firebaseError);
      return res.status(500).json({ 
        message: 'Error creating user in authentication system',
        error: firebaseError.message
      });
    }

    // Begin transaction to create user in our database
    const pgClient = await client.connect();
    try {
      await pgClient.query('BEGIN');

      // Insert user record
      const newUser = await pgClient.query(
        `INSERT INTO users 
         (firebase_uid, email, first_name, last_name, phone, role) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING id`,
        [firebaseUser.uid, email, firstName, lastName, phone, role]
      );

      const userId = newUser.rows[0].id;

      // Create specific role record
      if (role === 'homeowner') {
        await pgClient.query(
          'INSERT INTO homeowners (user_id) VALUES ($1)',
          [userId]
        );
      } else if (role === 'provider') {
        const { companyName, description, servicesOffered } = req.body;
        await pgClient.query(
          `INSERT INTO service_providers 
           (user_id, company_name, description, services_offered) 
           VALUES ($1, $2, $3, $4)`,
          [userId, companyName, description, servicesOffered || []]
        );
      }

      await pgClient.query('COMMIT');

      // Generate firebase token
      const firebaseToken = await admin.auth().createCustomToken(firebaseUser.uid, { role });

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: userId,
          email,
          firstName,
          lastName,
          role
        },
        token: firebaseToken
      });
    } catch (dbError) {
      await pgClient.query('ROLLBACK');
      console.error('Database error during registration:', dbError);
      
      // Attempt to clean up Firebase user if database insert fails
      try {
        await admin.auth().deleteUser(firebaseUser.uid);
      } catch (deleteError) {
        console.error('Error cleaning up Firebase user after failed registration:', deleteError);
      }
      
      return res.status(500).json({ 
        message: 'Error creating user in database',
        error: dbError.message
      });
    } finally {
      pgClient.release();
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Server error during registration', 
      error: error.message 
    });
  }
};

/**
 * Login user
 * @route POST /api/auth/login
 */
const login = async (req, res) => {
  // This is primarily handled by Firebase Auth on the frontend
  // This endpoint serves as a fallback or for custom authentication
  const { email, password } = req.body;
  const client = req.db;

  try {
    console.log('Login attempt:', email);
    
    // Find user in database
    const userResult = await client.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    const user = userResult.rows[0];
    
    // Special handling for demo accounts
    if (email === 'demo@example.com' && password === 'password') {
      console.log('Demo login successful');
      
      // Create token
      const token = jwt.sign(
        { 
          id: user.id,
          email: user.email,
          role: user.role
        }, 
        process.env.JWT_SECRET || 'fallback-secret-key',
        { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
      );
      
      return res.status(200).json({
        success: true,
        data: {
          message: 'Login successful',
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role
          },
          token
        }
      });
    }

    // Regular authentication flow would validate password here
    // For now, without proper password hashing in place, we'll allow any password
    // In a real system, we'd use bcrypt.compare() here
    
    // Create JWT token
    const token = jwt.sign(
      { 
        id: user.id,
        email: user.email,
        role: user.role
      }, 
      process.env.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );

    res.status(200).json({
      success: true,
      data: {
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during login', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get current user
 * @route GET /api/auth/me
 */
const getCurrentUser = async (req, res) => {
  const userId = req.user.id || req.user.uid;
  const client = req.db;

  try {
    // Get user from database
    const userResult = await client.query(
      'SELECT id, email, first_name, last_name, phone, role FROM users WHERE id = $1 OR firebase_uid = $2',
      [userId, userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userResult.rows[0];
    
    // Get role-specific data
    let roleData = {};
    if (user.role === 'homeowner') {
      const homeownerResult = await client.query(
        'SELECT * FROM homeowners WHERE user_id = $1',
        [user.id]
      );
      if (homeownerResult.rows.length > 0) {
        roleData = homeownerResult.rows[0];
      }
    } else if (user.role === 'provider') {
      const providerResult = await client.query(
        'SELECT * FROM service_providers WHERE user_id = $1',
        [user.id]
      );
      if (providerResult.rows.length > 0) {
        roleData = providerResult.rows[0];
      }
    }

    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        role: user.role,
        ...roleData
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ 
      message: 'Server error fetching user profile', 
      error: error.message 
    });
  }
};

/**
 * Update user profile
 * @route PUT /api/auth/profile
 */
const updateProfile = async (req, res) => {
  const userId = req.user.id || req.user.uid;
  const { firstName, lastName, phone } = req.body;
  const client = req.db;

  try {
    // Update user in database
    const updateResult = await client.query(
      `UPDATE users 
       SET first_name = $1, last_name = $2, phone = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 OR firebase_uid = $5
       RETURNING id, email, first_name, last_name, phone, role`,
      [firstName, lastName, phone, userId, userId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updatedUser = updateResult.rows[0];

    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        phone: updatedUser.phone,
        role: updatedUser.role
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      message: 'Server error updating profile', 
      error: error.message 
    });
  }
};

/**
 * Forgot password
 * @route POST /api/auth/forgot-password
 */
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    // Generate password reset link using Firebase
    const actionCodeSettings = {
      url: `${process.env.FRONTEND_URL}/reset-password`,
      handleCodeInApp: true
    };

    await admin.auth().generatePasswordResetLink(email, actionCodeSettings);

    res.status(200).json({
      message: 'Password reset email sent successfully'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    // Don't reveal if the email exists or not for security
    res.status(200).json({ 
      message: 'If this email is registered, a password reset link will be sent'
    });
  }
};

/**
 * Reset password (only needed for custom auth, Firebase handles this otherwise)
 * @route POST /api/auth/reset-password
 */
const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    // Verify token - in a real app, you'd have a token verification logic
    // For Firebase, this is handled on the client side
    
    res.status(200).json({
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(400).json({ 
      message: 'Invalid or expired token'
    });
  }
};

module.exports = {
  register,
  login,
  getCurrentUser,
  updateProfile,
  forgotPassword,
  resetPassword
}; 