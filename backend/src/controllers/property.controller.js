const crypto = require('crypto');
const fileUploadService = require('../services/file-upload.service');
const multer = require('multer');
const path = require('path');

// Configure multer for memory storage (files stored in buffer for S3 upload)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check allowed file types
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif',
      'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'
    ];
    
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('File type not allowed'), false);
    }
    
    cb(null, true);
  }
}).array('files', 5); // Allow up to 5 files per request

/**
 * Get all properties (admin only)
 * @route GET /api/properties
 */
const getAllProperties = async (req, res) => {
  const client = req.db;
  
  try {
    const result = await client.query(`
      SELECT p.*, h.user_id as homeowner_user_id, 
        u.first_name as homeowner_first_name, u.last_name as homeowner_last_name
      FROM properties p
      JOIN homeowners h ON p.homeowner_id = h.id
      JOIN users u ON h.user_id = u.id
      ORDER BY p.created_at DESC
    `);
    
    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting properties:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching properties',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get property by ID
 * @route GET /api/properties/:id
 */
const getPropertyById = async (req, res) => {
  const { id } = req.params;
  const client = req.db;
  
  try {
    console.log(`Getting property ${id} for user ${req.user?.id} with role ${req.user?.role}`);
    
    const result = await client.query(`
      SELECT p.*, h.user_id as homeowner_user_id
      FROM properties p
      JOIN homeowners h ON p.homeowner_id = h.id
      WHERE p.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }
    
    const property = result.rows[0];
    
    // Add more detailed logging for debugging
    console.log('Authorization check details:');
    console.log(`- User role: ${req.user?.role}`);
    console.log(`- User ID: ${req.user?.id} (${typeof req.user?.id})`);
    console.log(`- Property homeowner user ID: ${property.homeowner_user_id} (${typeof property.homeowner_user_id})`);
    
    // Check if user is authorized to access this property
    // Convert both IDs to strings for consistent comparison
    if (req.user.role !== 'admin' && 
        String(req.user.id) !== String(property.homeowner_user_id) && 
        req.user.role !== 'provider') {
      console.log('\u26d4 Authorization failed: User not allowed to access this property');
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this property'
      });
    }
    
    console.log('\u2705 Authorization successful: User has access to this property');
    res.status(200).json({
      success: true,
      data: property
    });
  } catch (error) {
    console.error('Error getting property:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching property',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create new property
 * @route POST /api/properties
 */
const createProperty = async (req, res) => {
  const { 
    address, city, state, zipCode, 
    propertySize, propertyType, notes 
  } = req.body;
  const client = req.db;
  
  try {
    // Get homeowner id from the user id
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
    
    // Create the property
    const result = await client.query(`
      INSERT INTO properties 
        (homeowner_id, address, city, state, zip_code, property_size, property_type, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [homeownerId, address, city, state, zipCode, propertySize, propertyType, notes]);
    
    // Generate and store initial QR code
    const propertyId = result.rows[0].id;
    const qrCodeUrl = await generateAndStoreQrCode(client, propertyId);
    
    // Return the created property with QR code URL
    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      data: { ...result.rows[0], qr_code_url: qrCodeUrl }
    });
  } catch (error) {
    console.error('Error creating property:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating property',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update property
 * @route PUT /api/properties/:id
 */
const updateProperty = async (req, res) => {
  const { id } = req.params;
  const { 
    address, city, state, zipCode, 
    propertySize, propertyType, notes 
  } = req.body;
  const client = req.db;
  
  try {
    // Check if property exists and belongs to this user
    const checkResult = await client.query(`
      SELECT p.*, h.user_id as homeowner_user_id
      FROM properties p
      JOIN homeowners h ON p.homeowner_id = h.id
      WHERE p.id = $1
    `, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }
    
    const property = checkResult.rows[0];
    
    // Check if user is authorized to update this property
    if (req.user.role !== 'admin' && req.user.id !== property.homeowner_user_id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this property'
      });
    }
    
    // Update the property
    const result = await client.query(`
      UPDATE properties
      SET 
        address = COALESCE($1, address),
        city = COALESCE($2, city),
        state = COALESCE($3, state),
        zip_code = COALESCE($4, zip_code),
        property_size = COALESCE($5, property_size),
        property_type = COALESCE($6, property_type),
        notes = COALESCE($7, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [address, city, state, zipCode, propertySize, propertyType, notes, id]);
    
    res.status(200).json({
      success: true,
      message: 'Property updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating property:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating property',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete property
 * @route DELETE /api/properties/:id
 */
const deleteProperty = async (req, res) => {
  const { id } = req.params;
  const client = req.db;
  
  try {
    // Check if property exists and belongs to this user
    const checkResult = await client.query(`
      SELECT p.*, h.user_id as homeowner_user_id
      FROM properties p
      JOIN homeowners h ON p.homeowner_id = h.id
      WHERE p.id = $1
    `, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }
    
    const property = checkResult.rows[0];
    
    // Check if user is authorized to delete this property
    if (req.user.role !== 'admin' && req.user.id !== property.homeowner_user_id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this property'
      });
    }
    
    // Delete the property
    await client.query('DELETE FROM properties WHERE id = $1', [id]);
    
    res.status(200).json({
      success: true,
      message: 'Property deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting property:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting property',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Generate QR code for property
 * @route POST /api/properties/:id/qr-code
 */
const generateQrCode = async (req, res) => {
  const { id } = req.params;
  const client = req.db;
  
  try {
    console.log(`Generating QR code for property ${id} - User: ${req.user?.id} (${req.user?.role})`);
    
    // Check if property exists and belongs to this user
    const checkResult = await client.query(`
      SELECT p.*, h.user_id as homeowner_user_id
      FROM properties p
      JOIN homeowners h ON p.homeowner_id = h.id
      WHERE p.id = $1
    `, [id]);
    
    if (checkResult.rows.length === 0) {
      console.log(`Property ${id} not found`);
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }
    
    const property = checkResult.rows[0];
    
    // Log detailed information for debugging
    console.log('Authorization check for QR code generation:');
    console.log(`- User role: ${req.user?.role}`);
    console.log(`- User ID: ${req.user?.id} (${typeof req.user?.id})`);
    console.log(`- Property homeowner user ID: ${property.homeowner_user_id} (${typeof property.homeowner_user_id})`);
    
    // Convert both IDs to strings for consistent comparison
    const userId = String(req.user?.id);
    const homeownerId = String(property.homeowner_user_id);
    
    // Check if user is authorized to generate QR code for this property
    if (req.user.role !== 'admin' && userId !== homeownerId) {
      console.log('\u26d4 Authorization failed: User not allowed to generate QR code for this property');
      console.log(`User ${userId} attempted to generate QR code for property owned by ${homeownerId}`);
      return res.status(403).json({
        success: false,
        message: 'Not authorized to generate QR code for this property'
      });
    }
    
    console.log('\u2705 Authorization successful: User has access to generate QR code');
    
    // Generate and store QR code
    const qrCodeUrl = await generateAndStoreQrCode(client, id);
    console.log(`Generated QR code URL: ${qrCodeUrl}`);
    
    res.status(200).json({
      success: true,
      message: 'QR code generated successfully',
      data: { qr_code_url: qrCodeUrl }
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating QR code',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Helper function to generate and store QR code
 */
const generateAndStoreQrCode = async (client, propertyId) => {
  // In a real app, we would generate a proper QR code image
  // For now, we'll just generate a unique URL that would be used to create the QR code
  
  // Generate a unique hash for the property
  const hash = crypto.createHash('sha256')
    .update(`property-${propertyId}-${Date.now()}`)
    .digest('hex');
  
  // Use environment variable or fallback - make sure this matches the actual frontend URL
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3005'; // Updated to match current frontend
  const pageUrl = `${frontendUrl}/p/${hash}`;
  
  // This is using the Google Charts API to generate a QR code image
  // We encode the pageUrl to create an actual image URL that points to a QR code image
  const qrCodeImageUrl = `https://chart.googleapis.com/chart?cht=qr&chl=${encodeURIComponent(pageUrl)}&chs=300x300&choe=UTF-8&chld=L|2`;
  
  // Update the property with the QR code URL and save the access hash
  await client.query(
    'UPDATE properties SET qr_code_url = $1, access_hash = $2 WHERE id = $3',
    [qrCodeImageUrl, hash, propertyId]
  );
  
  console.log(`QR code generated for property ${propertyId}: ${pageUrl}`);
  console.log(`QR code image URL: ${qrCodeImageUrl}`);
  return qrCodeImageUrl;
};

/**
 * Get property by access hash (no authentication required)
 * @route GET /api/properties/access/:hash
 */
const getPropertyByHash = async (req, res) => {
  const { hash } = req.params;
  const client = req.db;
  
  try {
    console.log(`Accessing property with hash: ${hash}`);
    
    const result = await client.query(`
      SELECT p.*, h.user_id as homeowner_user_id
      FROM properties p
      JOIN homeowners h ON p.homeowner_id = h.id
      WHERE p.access_hash = $1
    `, [hash]);
    
    if (result.rows.length === 0) {
      console.log(`No property found with hash ${hash}`);
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }
    
    const property = result.rows[0];
    console.log(`Found property: ${property.id} - ${property.address}`);
    
    res.status(200).json({
      success: true,
      data: property
    });
  } catch (error) {
    console.error('Error getting property by hash:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching property',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Upload files to a property
 * @route POST /api/properties/:id/files
 */
const uploadPropertyFiles = async (req, res) => {
  const { id } = req.params;
  const client = req.db;
  
  try {
    // Check if property exists and belongs to this user
    const checkResult = await client.query(`
      SELECT p.*, h.user_id as homeowner_user_id
      FROM properties p
      JOIN homeowners h ON p.homeowner_id = h.id
      WHERE p.id = $1
    `, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }
    
    const property = checkResult.rows[0];
    
    // Check if user is authorized to upload files to this property
    if (req.user.role !== 'admin' && req.user.id !== property.homeowner_user_id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to upload files to this property'
      });
    }
    
    // Process file upload using multer
    upload(req, res, async (err) => {
      if (err) {
        console.error('Error processing file upload:', err);
        return res.status(400).json({
          success: false,
          message: err.message || 'Error processing file upload'
        });
      }
      
      // Check if files were uploaded
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded'
        });
      }
      
      try {
        const uploadResults = [];
        const fileUploads = [];
        
        // Upload each file to S3
        for (const file of req.files) {
          const description = req.body.descriptions ? 
            req.body.descriptions[req.files.indexOf(file)] : '';
          
          // Upload file to S3
          const fileMetadata = await fileUploadService.uploadFile(file, {
            entityType: 'property',
            entityId: id,
            description
          });
          
          // Store file metadata in database
          const fileUploadResult = await client.query(`
            INSERT INTO file_uploads 
              (user_id, related_to, related_id, file_url, metadata)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
          `, [
            req.user.id,
            'PROPERTY',
            id,
            fileMetadata.location,
            JSON.stringify({
              originalFilename: fileMetadata.originalFilename,
              mimeType: fileMetadata.mimeType,
              size: fileMetadata.size,
              key: fileMetadata.key,
              bucket: fileMetadata.bucket,
              description
            })
          ]);
          
          uploadResults.push({
            id: fileUploadResult.rows[0].id,
            url: fileMetadata.location,
            originalFilename: fileMetadata.originalFilename,
            mimeType: fileMetadata.mimeType,
            size: fileMetadata.size,
            description
          });
          
          fileUploads.push(fileUploadResult.rows[0].id);
        }
        
        res.status(200).json({
          success: true,
          message: `${uploadResults.length} file(s) uploaded successfully`,
          data: uploadResults
        });
      } catch (uploadError) {
        console.error('Error uploading files to S3:', uploadError);
        res.status(500).json({
          success: false,
          message: 'Error uploading files',
          error: process.env.NODE_ENV === 'development' ? uploadError.message : undefined
        });
      }
    });
  } catch (error) {
    console.error('Error in file upload process:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing file upload',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get files for a property
 * @route GET /api/properties/:id/files
 */
const getPropertyFiles = async (req, res) => {
  const { id } = req.params;
  const client = req.db;
  
  try {
    // Check if property exists and user has access
    const checkResult = await client.query(`
      SELECT p.*, h.user_id as homeowner_user_id
      FROM properties p
      JOIN homeowners h ON p.homeowner_id = h.id
      WHERE p.id = $1
    `, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }
    
    const property = checkResult.rows[0];
    
    // Check if user is authorized to access this property's files
    if (req.user.role !== 'admin' && 
        String(req.user.id) !== String(property.homeowner_user_id) && 
        req.user.role !== 'provider') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access files for this property'
      });
    }
    
    // Get files for this property
    const filesResult = await client.query(`
      SELECT f.id, f.user_id, f.file_url, f.metadata, f.created_at,
        u.first_name, u.last_name
      FROM file_uploads f
      JOIN users u ON f.user_id = u.id
      WHERE f.related_to = 'PROPERTY' AND f.related_id = $1
      ORDER BY f.created_at DESC
    `, [id]);
    
    // Format the response
    const files = filesResult.rows.map(file => {
      const metadata = file.metadata || {};
      return {
        id: file.id,
        url: file.file_url,
        uploadedBy: `${file.first_name} ${file.last_name}`,
        uploadedAt: file.created_at,
        originalFilename: metadata.originalFilename || 'Unknown',
        mimeType: metadata.mimeType || 'application/octet-stream',
        size: metadata.size || 0,
        description: metadata.description || ''
      };
    });
    
    res.status(200).json({
      success: true,
      count: files.length,
      data: files
    });
  } catch (error) {
    console.error('Error getting property files:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching property files',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete a file from a property
 * @route DELETE /api/properties/:propertyId/files/:fileId
 */
const deletePropertyFile = async (req, res) => {
  const { propertyId, fileId } = req.params;
  const client = req.db;
  
  try {
    // Check if property exists and user has access
    const checkResult = await client.query(`
      SELECT p.*, h.user_id as homeowner_user_id
      FROM properties p
      JOIN homeowners h ON p.homeowner_id = h.id
      WHERE p.id = $1
    `, [propertyId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }
    
    const property = checkResult.rows[0];
    
    // Check if user is authorized to delete files from this property
    if (req.user.role !== 'admin' && req.user.id !== property.homeowner_user_id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete files from this property'
      });
    }
    
    // Get file information
    const fileResult = await client.query(`
      SELECT * FROM file_uploads
      WHERE id = $1 AND related_to = 'PROPERTY' AND related_id = $2
    `, [fileId, propertyId]);
    
    if (fileResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'File not found for this property'
      });
    }
    
    const file = fileResult.rows[0];
    const metadata = file.metadata || {};
    
    // Delete file from S3 if key exists in metadata
    if (metadata.key) {
      try {
        await fileUploadService.deleteFile(metadata.key, req.user);
      } catch (s3Error) {
        console.error('Error deleting file from S3:', s3Error);
        // Continue with database deletion even if S3 deletion fails
      }
    }
    
    // Delete file record from database
    await client.query(
      'DELETE FROM file_uploads WHERE id = $1',
      [fileId]
    );
    
    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting property file:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting file',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Generate a pre-signed URL for file download
 * @route GET /api/properties/:propertyId/files/:fileId/download
 */
const getFileDownloadUrl = async (req, res) => {
  const { propertyId, fileId } = req.params;
  const client = req.db;
  
  try {
    // Check if property exists and user has access
    const checkResult = await client.query(`
      SELECT p.*, h.user_id as homeowner_user_id
      FROM properties p
      JOIN homeowners h ON p.homeowner_id = h.id
      WHERE p.id = $1
    `, [propertyId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }
    
    const property = checkResult.rows[0];
    
    // Check if user is authorized to access this property's files
    if (req.user.role !== 'admin' && 
        String(req.user.id) !== String(property.homeowner_user_id) && 
        req.user.role !== 'provider') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access files for this property'
      });
    }
    
    // Get file information
    const fileResult = await client.query(`
      SELECT * FROM file_uploads
      WHERE id = $1 AND related_to = 'PROPERTY' AND related_id = $2
    `, [fileId, propertyId]);
    
    if (fileResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'File not found for this property'
      });
    }
    
    const file = fileResult.rows[0];
    const metadata = file.metadata || {};
    
    if (!metadata.key) {
      return res.status(400).json({
        success: false,
        message: 'File metadata is missing required information'
      });
    }
    
    // Generate pre-signed URL for file download
    const downloadUrl = await fileUploadService.generatePresignedUrl(metadata.key, {
      operation: 'getObject',
      expiresIn: 3600, // URL expires in 1 hour
      user: req.user
    });
    
    res.status(200).json({
      success: true,
      data: {
        downloadUrl,
        expiresIn: 3600,
        filename: metadata.originalFilename || 'download'
      }
    });
  } catch (error) {
    console.error('Error generating download URL:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating download URL',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getAllProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  generateQrCode,
  getPropertyByHash,
  uploadPropertyFiles,
  getPropertyFiles,
  deletePropertyFile,
  getFileDownloadUrl
};