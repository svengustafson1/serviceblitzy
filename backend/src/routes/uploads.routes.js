const express = require('express');
const router = express.Router();
const multer = require('multer');
const multerS3 = require('multer-s3');
const AWS = require('aws-sdk');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// File type validation
const fileFilter = (req, file, cb) => {
  // Define allowed file types
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
  const allowedDocumentTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const allowedSpreadsheetTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'];
  
  const allowedTypes = [...allowedImageTypes, ...allowedDocumentTypes, ...allowedSpreadsheetTypes];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, PDF, DOCX, XLSX, and CSV files are allowed.'), false);
  }
};

// Configure multer-s3 upload
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET,
    acl: 'private', // Files are private by default, we'll generate signed URLs for access
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req, file, cb) => {
      cb(null, {
        fieldName: file.fieldname,
        relatedTo: req.body.relatedTo,
        relatedId: req.body.relatedId,
        uploadedBy: req.user.id
      });
    },
    key: (req, file, cb) => {
      const relatedTo = req.body.relatedTo?.toLowerCase() || 'misc';
      const relatedId = req.body.relatedId || 'unknown';
      const fileExtension = path.extname(file.originalname);
      const fileName = `${relatedTo}/${relatedId}/${uuidv4()}${fileExtension}`;
      cb(null, fileName);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: fileFilter
});

/**
 * @route   POST /api/uploads
 * @desc    Upload a file
 * @access  Private
 */
router.post('/', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Validate required fields
    if (!req.body.relatedTo || !req.body.relatedId) {
      // Delete the file from S3 if validation fails
      await s3.deleteObject({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: req.file.key
      }).promise();
      
      return res.status(400).json({ 
        success: false, 
        message: 'relatedTo and relatedId fields are required' 
      });
    }

    // Validate relatedTo value
    const validRelatedTo = ['PROPERTY', 'SERVICE_REQUEST'];
    if (!validRelatedTo.includes(req.body.relatedTo.toUpperCase())) {
      // Delete the file from S3 if validation fails
      await s3.deleteObject({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: req.file.key
      }).promise();
      
      return res.status(400).json({ 
        success: false, 
        message: 'relatedTo must be either PROPERTY or SERVICE_REQUEST' 
      });
    }

    // Check if user has permission to upload to this entity
    const hasPermission = await checkEntityPermission(req.user, req.body.relatedTo, req.body.relatedId, req.db);
    if (!hasPermission) {
      // Delete the file from S3 if permission check fails
      await s3.deleteObject({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: req.file.key
      }).promise();
      
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to upload files to this entity' 
      });
    }

    // Store file metadata in database
    const fileUpload = await req.db.query(
      `INSERT INTO file_uploads 
       (user_id, related_to, related_id, file_url, metadata) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, user_id, related_to, related_id, file_url, metadata, created_at`,
      [
        req.user.id,
        req.body.relatedTo.toUpperCase(),
        req.body.relatedId,
        req.file.location,
        JSON.stringify({
          originalName: req.file.originalname,
          encoding: req.file.encoding,
          mimetype: req.file.mimetype,
          size: req.file.size,
          key: req.file.key,
          bucket: req.file.bucket,
          description: req.body.description || null
        })
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: fileUpload.rows[0]
    });
  } catch (error) {
    console.error('File upload error:', error);
    
    // If file was uploaded to S3 but database operation failed, try to clean up
    if (req.file && req.file.key) {
      try {
        await s3.deleteObject({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: req.file.key
        }).promise();
      } catch (deleteError) {
        console.error('Error deleting file after failed upload:', deleteError);
      }
    }
    
    return res.status(500).json({
      success: false,
      message: 'Error uploading file',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/uploads/multiple
 * @desc    Upload multiple files
 * @access  Private
 */
router.post('/multiple', authMiddleware, upload.array('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    // Validate required fields
    if (!req.body.relatedTo || !req.body.relatedId) {
      // Delete the files from S3 if validation fails
      const deletePromises = req.files.map(file => {
        return s3.deleteObject({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: file.key
        }).promise();
      });
      
      await Promise.all(deletePromises);
      
      return res.status(400).json({ 
        success: false, 
        message: 'relatedTo and relatedId fields are required' 
      });
    }

    // Validate relatedTo value
    const validRelatedTo = ['PROPERTY', 'SERVICE_REQUEST'];
    if (!validRelatedTo.includes(req.body.relatedTo.toUpperCase())) {
      // Delete the files from S3 if validation fails
      const deletePromises = req.files.map(file => {
        return s3.deleteObject({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: file.key
        }).promise();
      });
      
      await Promise.all(deletePromises);
      
      return res.status(400).json({ 
        success: false, 
        message: 'relatedTo must be either PROPERTY or SERVICE_REQUEST' 
      });
    }

    // Check if user has permission to upload to this entity
    const hasPermission = await checkEntityPermission(req.user, req.body.relatedTo, req.body.relatedId, req.db);
    if (!hasPermission) {
      // Delete the files from S3 if permission check fails
      const deletePromises = req.files.map(file => {
        return s3.deleteObject({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: file.key
        }).promise();
      });
      
      await Promise.all(deletePromises);
      
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to upload files to this entity' 
      });
    }

    // Store file metadata in database
    const fileUploads = [];
    
    for (const file of req.files) {
      const result = await req.db.query(
        `INSERT INTO file_uploads 
         (user_id, related_to, related_id, file_url, metadata) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id, user_id, related_to, related_id, file_url, metadata, created_at`,
        [
          req.user.id,
          req.body.relatedTo.toUpperCase(),
          req.body.relatedId,
          file.location,
          JSON.stringify({
            originalName: file.originalname,
            encoding: file.encoding,
            mimetype: file.mimetype,
            size: file.size,
            key: file.key,
            bucket: file.bucket,
            description: req.body.description || null
          })
        ]
      );
      
      fileUploads.push(result.rows[0]);
    }

    return res.status(201).json({
      success: true,
      message: 'Files uploaded successfully',
      data: fileUploads
    });
  } catch (error) {
    console.error('Multiple file upload error:', error);
    
    // If files were uploaded to S3 but database operation failed, try to clean up
    if (req.files && req.files.length > 0) {
      try {
        const deletePromises = req.files.map(file => {
          return s3.deleteObject({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: file.key
          }).promise();
        });
        
        await Promise.all(deletePromises);
      } catch (deleteError) {
        console.error('Error deleting files after failed upload:', deleteError);
      }
    }
    
    return res.status(500).json({
      success: false,
      message: 'Error uploading files',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/uploads/:id
 * @desc    Get file metadata by ID and generate a signed URL for access
 * @access  Private
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const fileId = req.params.id;
    
    // Get file metadata from database
    const result = await req.db.query(
      'SELECT * FROM file_uploads WHERE id = $1',
      [fileId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    const fileUpload = result.rows[0];
    
    // Check if user has permission to access this file
    const hasPermission = await checkEntityPermission(req.user, fileUpload.related_to, fileUpload.related_id, req.db);
    if (!hasPermission && req.user.id !== fileUpload.user_id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this file'
      });
    }
    
    // Generate a signed URL for temporary access to the file
    const metadata = fileUpload.metadata;
    const signedUrl = await s3.getSignedUrlPromise('getObject', {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: metadata.key,
      Expires: 3600 // URL expires in 1 hour
    });
    
    // Add the signed URL to the response
    fileUpload.signedUrl = signedUrl;
    
    return res.json({
      success: true,
      data: fileUpload
    });
  } catch (error) {
    console.error('Error getting file:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving file',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/uploads/entity/:type/:id
 * @desc    Get all files for a specific entity (property or service request)
 * @access  Private
 */
router.get('/entity/:type/:id', authMiddleware, async (req, res) => {
  try {
    const { type, id } = req.params;
    
    // Validate entity type
    const validTypes = ['property', 'service-request'];
    if (!validTypes.includes(type.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid entity type. Must be either "property" or "service-request"'
      });
    }
    
    // Convert type to database format
    const relatedTo = type.toLowerCase() === 'property' ? 'PROPERTY' : 'SERVICE_REQUEST';
    
    // Check if user has permission to access this entity
    const hasPermission = await checkEntityPermission(req.user, relatedTo, id, req.db);
    if (!hasPermission && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access files for this entity'
      });
    }
    
    // Get all files for this entity
    const result = await req.db.query(
      'SELECT * FROM file_uploads WHERE related_to = $1 AND related_id = $2 ORDER BY created_at DESC',
      [relatedTo, id]
    );
    
    // Generate signed URLs for each file
    const filesWithUrls = await Promise.all(result.rows.map(async (file) => {
      const metadata = file.metadata;
      const signedUrl = await s3.getSignedUrlPromise('getObject', {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: metadata.key,
        Expires: 3600 // URL expires in 1 hour
      });
      
      return {
        ...file,
        signedUrl
      };
    }));
    
    return res.json({
      success: true,
      data: filesWithUrls
    });
  } catch (error) {
    console.error('Error getting entity files:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving entity files',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   DELETE /api/uploads/:id
 * @desc    Delete a file
 * @access  Private
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const fileId = req.params.id;
    
    // Begin transaction
    await req.db.query('BEGIN');
    
    // Get file metadata from database
    const result = await req.db.query(
      'SELECT * FROM file_uploads WHERE id = $1',
      [fileId]
    );
    
    if (result.rows.length === 0) {
      await req.db.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    const fileUpload = result.rows[0];
    
    // Check if user has permission to delete this file
    // Only the file uploader, entity owner, or admin can delete
    const hasPermission = await checkEntityPermission(req.user, fileUpload.related_to, fileUpload.related_id, req.db);
    if (!hasPermission && req.user.id !== fileUpload.user_id && req.user.role !== 'admin') {
      await req.db.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this file'
      });
    }
    
    // Delete file from S3
    await s3.deleteObject({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileUpload.metadata.key
    }).promise();
    
    // Delete file metadata from database
    await req.db.query(
      'DELETE FROM file_uploads WHERE id = $1',
      [fileId]
    );
    
    // Commit transaction
    await req.db.query('COMMIT');
    
    return res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    // Rollback transaction on error
    await req.db.query('ROLLBACK');
    
    console.error('Error deleting file:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting file',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Helper function to check if a user has permission to access/modify an entity
 * @param {Object} user - The user object from the request
 * @param {String} entityType - The type of entity (PROPERTY or SERVICE_REQUEST)
 * @param {String} entityId - The ID of the entity
 * @param {Object} db - The database connection
 * @returns {Boolean} - Whether the user has permission
 */
async function checkEntityPermission(user, entityType, entityId, db) {
  // Admin has access to everything
  if (user.role === 'admin') {
    return true;
  }
  
  try {
    if (entityType.toUpperCase() === 'PROPERTY') {
      // Check if user is the homeowner of this property
      if (user.role === 'homeowner') {
        const result = await db.query(
          'SELECT * FROM properties WHERE id = $1 AND homeowner_id = $2',
          [entityId, user.homeowner_id]
        );
        return result.rows.length > 0;
      }
      
      // Service providers can access properties they have active service requests for
      if (user.role === 'provider') {
        const result = await db.query(
          `SELECT sr.* FROM service_requests sr
           JOIN bids b ON sr.id = b.service_request_id
           WHERE sr.property_id = $1 AND b.provider_id = $2 AND b.status = 'accepted'`,
          [entityId, user.provider_id]
        );
        return result.rows.length > 0;
      }
    } else if (entityType.toUpperCase() === 'SERVICE_REQUEST') {
      // Check if user is the homeowner of this service request
      if (user.role === 'homeowner') {
        const result = await db.query(
          'SELECT * FROM service_requests WHERE id = $1 AND homeowner_id = $2',
          [entityId, user.homeowner_id]
        );
        return result.rows.length > 0;
      }
      
      // Check if user is a provider with an accepted bid on this service request
      if (user.role === 'provider') {
        const result = await db.query(
          `SELECT * FROM bids 
           WHERE service_request_id = $1 AND provider_id = $2 AND status = 'accepted'`,
          [entityId, user.provider_id]
        );
        return result.rows.length > 0;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking entity permission:', error);
    return false;
  }
}

module.exports = router;