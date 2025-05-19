/**
 * File Upload Controller
 * Handles file upload operations for properties and service requests
 */

const fileUploadService = require('../services/file-upload.service');

/**
 * Upload files for a property
 * @route POST /api/properties/:id/files
 */
const uploadPropertyFiles = async (req, res) => {
  try {
    const { id } = req.params;
    const client = req.db;
    
    // Check if property exists and user has permission
    const propertyResult = await client.query(`
      SELECT p.*, h.user_id as homeowner_user_id
      FROM properties p
      JOIN homeowners h ON p.homeowner_id = h.id
      WHERE p.id = $1
    `, [id]);
    
    if (propertyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }
    
    const property = propertyResult.rows[0];
    
    // Check if user is authorized to upload files for this property
    if (req.user.role !== 'admin' && req.user.id !== property.homeowner_user_id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to upload files for this property'
      });
    }
    
    // Check if file exists in the request
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    // Upload file to S3 using the file upload service
    const fileMetadata = await fileUploadService.uploadFile(req.file, {
      entityType: 'property',
      entityId: id,
      description: req.body.description || ''
    });
    
    // Store file metadata in the database
    const fileResult = await client.query(`
      INSERT INTO file_uploads 
        (user_id, related_to, related_id, file_url, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, file_url, metadata
    `, [
      req.user.id,
      'PROPERTY',
      id,
      fileMetadata.location,
      JSON.stringify({
        originalFilename: fileMetadata.originalFilename,
        mimeType: fileMetadata.mimeType,
        size: fileMetadata.size,
        description: fileMetadata.description,
        uploadId: fileMetadata.uploadId,
        key: fileMetadata.key
      })
    ]);
    
    // Return success response with file metadata
    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        id: fileResult.rows[0].id,
        fileUrl: fileResult.rows[0].file_url,
        metadata: JSON.parse(fileResult.rows[0].metadata)
      }
    });
  } catch (error) {
    console.error('Error uploading property file:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading file',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get files for a property
 * @route GET /api/properties/:id/files
 */
const getPropertyFiles = async (req, res) => {
  try {
    const { id } = req.params;
    const client = req.db;
    
    // Check if property exists and user has permission
    const propertyResult = await client.query(`
      SELECT p.*, h.user_id as homeowner_user_id
      FROM properties p
      JOIN homeowners h ON p.homeowner_id = h.id
      WHERE p.id = $1
    `, [id]);
    
    if (propertyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }
    
    const property = propertyResult.rows[0];
    
    // Check if user is authorized to view files for this property
    // Allow admin, property owner, or service provider to view files
    if (req.user.role !== 'admin' && 
        req.user.id !== property.homeowner_user_id && 
        req.user.role !== 'provider') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view files for this property'
      });
    }
    
    // Get files from the database
    const filesResult = await client.query(`
      SELECT id, user_id, file_url, metadata, created_at
      FROM file_uploads
      WHERE related_to = 'PROPERTY' AND related_id = $1
      ORDER BY created_at DESC
    `, [id]);
    
    // Process files to include pre-signed URLs for access
    const files = await Promise.all(filesResult.rows.map(async (file) => {
      const metadata = JSON.parse(file.metadata);
      let accessUrl = file.file_url;
      
      // Generate pre-signed URL if the file is stored in S3
      if (metadata.key) {
        try {
          accessUrl = await fileUploadService.generatePresignedUrl(metadata.key, {
            operation: 'getObject',
            expiresIn: 3600, // 1 hour
            user: req.user
          });
        } catch (error) {
          console.error('Error generating pre-signed URL:', error);
          // Continue with the original URL if pre-signed URL generation fails
        }
      }
      
      return {
        id: file.id,
        userId: file.user_id,
        fileUrl: accessUrl,
        metadata: metadata,
        createdAt: file.created_at
      };
    }));
    
    // Return success response with files
    res.status(200).json({
      success: true,
      count: files.length,
      data: files
    });
  } catch (error) {
    console.error('Error getting property files:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving files',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete a file from a property
 * @route DELETE /api/properties/:propertyId/files/:fileId
 */
const deletePropertyFile = async (req, res) => {
  try {
    const { propertyId, fileId } = req.params;
    const client = req.db;
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Check if property exists and user has permission
    const propertyResult = await client.query(`
      SELECT p.*, h.user_id as homeowner_user_id
      FROM properties p
      JOIN homeowners h ON p.homeowner_id = h.id
      WHERE p.id = $1
    `, [propertyId]);
    
    if (propertyResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }
    
    const property = propertyResult.rows[0];
    
    // Check if user is authorized to delete files for this property
    if (req.user.role !== 'admin' && req.user.id !== property.homeowner_user_id) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete files for this property'
      });
    }
    
    // Get file from the database
    const fileResult = await client.query(`
      SELECT id, metadata
      FROM file_uploads
      WHERE id = $1 AND related_to = 'PROPERTY' AND related_id = $2
    `, [fileId, propertyId]);
    
    if (fileResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    const file = fileResult.rows[0];
    const metadata = JSON.parse(file.metadata);
    
    // Delete file from S3 if key exists
    if (metadata.key) {
      try {
        await fileUploadService.deleteFile(metadata.key, req.user);
      } catch (error) {
        console.error('Error deleting file from S3:', error);
        // Continue with database deletion even if S3 deletion fails
      }
    }
    
    // Delete file from database
    await client.query(`
      DELETE FROM file_uploads
      WHERE id = $1
    `, [fileId]);
    
    // Commit transaction
    await client.query('COMMIT');
    
    // Return success response
    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    // Rollback transaction on error
    try {
      await req.db.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Error rolling back transaction:', rollbackError);
    }
    
    console.error('Error deleting property file:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting file',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get a single file by ID with a pre-signed URL for access
 * @route GET /api/properties/:propertyId/files/:fileId
 */
const getPropertyFileById = async (req, res) => {
  try {
    const { propertyId, fileId } = req.params;
    const client = req.db;
    
    // Check if property exists and user has permission
    const propertyResult = await client.query(`
      SELECT p.*, h.user_id as homeowner_user_id
      FROM properties p
      JOIN homeowners h ON p.homeowner_id = h.id
      WHERE p.id = $1
    `, [propertyId]);
    
    if (propertyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }
    
    const property = propertyResult.rows[0];
    
    // Check if user is authorized to view files for this property
    if (req.user.role !== 'admin' && 
        req.user.id !== property.homeowner_user_id && 
        req.user.role !== 'provider') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view files for this property'
      });
    }
    
    // Get file from the database
    const fileResult = await client.query(`
      SELECT id, user_id, file_url, metadata, created_at
      FROM file_uploads
      WHERE id = $1 AND related_to = 'PROPERTY' AND related_id = $2
    `, [fileId, propertyId]);
    
    if (fileResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    const file = fileResult.rows[0];
    const metadata = JSON.parse(file.metadata);
    let accessUrl = file.file_url;
    
    // Generate pre-signed URL if the file is stored in S3
    if (metadata.key) {
      try {
        accessUrl = await fileUploadService.generatePresignedUrl(metadata.key, {
          operation: 'getObject',
          expiresIn: 3600, // 1 hour
          user: req.user
        });
      } catch (error) {
        console.error('Error generating pre-signed URL:', error);
        // Continue with the original URL if pre-signed URL generation fails
      }
    }
    
    // Return success response with file
    res.status(200).json({
      success: true,
      data: {
        id: file.id,
        userId: file.user_id,
        fileUrl: accessUrl,
        metadata: metadata,
        createdAt: file.created_at
      }
    });
  } catch (error) {
    console.error('Error getting property file:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving file',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  uploadPropertyFiles,
  getPropertyFiles,
  deletePropertyFile,
  getPropertyFileById
};