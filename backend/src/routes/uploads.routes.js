/**
 * Upload Routes
 * Centralized router for file upload management across the platform
 */

const express = require('express');
const router = express.Router();
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');
const { upload, handleMulterError } = require('../middleware/upload.middleware');
const fileUploadService = require('../services/file-upload.service');

/**
 * @route POST /api/uploads
 * @desc Upload a single file with metadata
 * @access Private
 */
router.post('/', 
  authMiddleware, 
  upload.single('file'), 
  handleMulterError, 
  async (req, res) => {
    try {
      // Check if file exists in the request
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      // Validate required metadata
      const { relatedTo, relatedId, description } = req.body;
      
      if (!relatedTo || !relatedId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required metadata: relatedTo and relatedId are required'
        });
      }

      // Validate relatedTo value
      if (!['PROPERTY', 'SERVICE_REQUEST'].includes(relatedTo.toUpperCase())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid relatedTo value. Must be PROPERTY or SERVICE_REQUEST'
        });
      }

      // Check if user has permission to upload files for this entity
      const client = req.db;
      let hasPermission = false;
      
      // Begin transaction
      await client.query('BEGIN');
      
      try {
        if (relatedTo.toUpperCase() === 'PROPERTY') {
          // Check property ownership
          const propertyResult = await client.query(`
            SELECT p.*, h.user_id as homeowner_user_id
            FROM properties p
            JOIN homeowners h ON p.homeowner_id = h.id
            WHERE p.id = $1
          `, [relatedId]);
          
          if (propertyResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
              success: false,
              message: 'Property not found'
            });
          }
          
          const property = propertyResult.rows[0];
          
          // Allow admin, property owner, or service provider to upload files
          hasPermission = req.user.role === 'admin' || 
                          req.user.id === property.homeowner_user_id || 
                          req.user.role === 'provider';
        } 
        else if (relatedTo.toUpperCase() === 'SERVICE_REQUEST') {
          // Check service request access
          const serviceRequestResult = await client.query(`
            SELECT sr.*, h.user_id as homeowner_user_id
            FROM service_requests sr
            JOIN homeowners h ON sr.homeowner_id = h.id
            WHERE sr.id = $1
          `, [relatedId]);
          
          if (serviceRequestResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
              success: false,
              message: 'Service request not found'
            });
          }
          
          const serviceRequest = serviceRequestResult.rows[0];
          
          // Check if user is the homeowner or an assigned provider
          hasPermission = req.user.role === 'admin' || 
                          req.user.id === serviceRequest.homeowner_user_id;
                          
          // If user is a provider, check if they have a bid on this service request
          if (req.user.role === 'provider' && !hasPermission) {
            const providerResult = await client.query(`
              SELECT sp.id as provider_id
              FROM service_providers sp
              WHERE sp.user_id = $1
            `, [req.user.id]);
            
            if (providerResult.rows.length > 0) {
              const providerId = providerResult.rows[0].provider_id;
              
              // Check if provider has a bid on this service request
              const bidResult = await client.query(`
                SELECT id FROM bids
                WHERE service_request_id = $1 AND provider_id = $2
              `, [relatedId, providerId]);
              
              hasPermission = bidResult.rows.length > 0;
            }
          }
        }
        
        if (!hasPermission) {
          await client.query('ROLLBACK');
          return res.status(403).json({
            success: false,
            message: `Not authorized to upload files for this ${relatedTo.toLowerCase()}`
          });
        }
        
        // Upload file to S3 using the file upload service
        const entityType = relatedTo.toLowerCase() === 'property' ? 'property' : 'service-request';
        const fileMetadata = await fileUploadService.uploadFile(req.file, {
          entityType,
          entityId: relatedId,
          description: description || ''
        });
        
        // Store file metadata in the database
        const fileResult = await client.query(`
          INSERT INTO file_uploads 
            (user_id, related_to, related_id, file_url, metadata)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, file_url, metadata, created_at
        `, [
          req.user.id,
          relatedTo.toUpperCase(),
          relatedId,
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
        
        // Commit transaction
        await client.query('COMMIT');
        
        // Return success response with file metadata
        res.status(201).json({
          success: true,
          message: 'File uploaded successfully',
          data: {
            id: fileResult.rows[0].id,
            fileUrl: fileResult.rows[0].file_url,
            metadata: JSON.parse(fileResult.rows[0].metadata),
            createdAt: fileResult.rows[0].created_at
          }
        });
      } catch (error) {
        // Rollback transaction on error
        await client.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({
        success: false,
        message: 'Error uploading file',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @route POST /api/uploads/batch
 * @desc Upload multiple files at once
 * @access Private
 */
router.post('/batch', 
  authMiddleware, 
  upload.array('files', 5), // Allow up to 5 files at once
  handleMulterError, 
  async (req, res) => {
    try {
      // Check if files exist in the request
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded'
        });
      }

      // Validate required metadata
      const { relatedTo, relatedId, description } = req.body;
      
      if (!relatedTo || !relatedId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required metadata: relatedTo and relatedId are required'
        });
      }

      // Validate relatedTo value
      if (!['PROPERTY', 'SERVICE_REQUEST'].includes(relatedTo.toUpperCase())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid relatedTo value. Must be PROPERTY or SERVICE_REQUEST'
        });
      }

      // Check if user has permission to upload files for this entity
      const client = req.db;
      let hasPermission = false;
      
      // Begin transaction
      await client.query('BEGIN');
      
      try {
        if (relatedTo.toUpperCase() === 'PROPERTY') {
          // Check property ownership
          const propertyResult = await client.query(`
            SELECT p.*, h.user_id as homeowner_user_id
            FROM properties p
            JOIN homeowners h ON p.homeowner_id = h.id
            WHERE p.id = $1
          `, [relatedId]);
          
          if (propertyResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
              success: false,
              message: 'Property not found'
            });
          }
          
          const property = propertyResult.rows[0];
          
          // Allow admin, property owner, or service provider to upload files
          hasPermission = req.user.role === 'admin' || 
                          req.user.id === property.homeowner_user_id || 
                          req.user.role === 'provider';
        } 
        else if (relatedTo.toUpperCase() === 'SERVICE_REQUEST') {
          // Check service request access
          const serviceRequestResult = await client.query(`
            SELECT sr.*, h.user_id as homeowner_user_id
            FROM service_requests sr
            JOIN homeowners h ON sr.homeowner_id = h.id
            WHERE sr.id = $1
          `, [relatedId]);
          
          if (serviceRequestResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
              success: false,
              message: 'Service request not found'
            });
          }
          
          const serviceRequest = serviceRequestResult.rows[0];
          
          // Check if user is the homeowner or an assigned provider
          hasPermission = req.user.role === 'admin' || 
                          req.user.id === serviceRequest.homeowner_user_id;
                          
          // If user is a provider, check if they have a bid on this service request
          if (req.user.role === 'provider' && !hasPermission) {
            const providerResult = await client.query(`
              SELECT sp.id as provider_id
              FROM service_providers sp
              WHERE sp.user_id = $1
            `, [req.user.id]);
            
            if (providerResult.rows.length > 0) {
              const providerId = providerResult.rows[0].provider_id;
              
              // Check if provider has a bid on this service request
              const bidResult = await client.query(`
                SELECT id FROM bids
                WHERE service_request_id = $1 AND provider_id = $2
              `, [relatedId, providerId]);
              
              hasPermission = bidResult.rows.length > 0;
            }
          }
        }
        
        if (!hasPermission) {
          await client.query('ROLLBACK');
          return res.status(403).json({
            success: false,
            message: `Not authorized to upload files for this ${relatedTo.toLowerCase()}`
          });
        }
        
        // Upload each file and collect results
        const entityType = relatedTo.toLowerCase() === 'property' ? 'property' : 'service-request';
        const uploadResults = [];
        
        for (const file of req.files) {
          // Upload file to S3
          const fileMetadata = await fileUploadService.uploadFile(file, {
            entityType,
            entityId: relatedId,
            description: description || ''
          });
          
          // Store file metadata in the database
          const fileResult = await client.query(`
            INSERT INTO file_uploads 
              (user_id, related_to, related_id, file_url, metadata)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, file_url, metadata, created_at
          `, [
            req.user.id,
            relatedTo.toUpperCase(),
            relatedId,
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
          
          uploadResults.push({
            id: fileResult.rows[0].id,
            fileUrl: fileResult.rows[0].file_url,
            metadata: JSON.parse(fileResult.rows[0].metadata),
            createdAt: fileResult.rows[0].created_at
          });
        }
        
        // Commit transaction
        await client.query('COMMIT');
        
        // Return success response with file metadata
        res.status(201).json({
          success: true,
          message: `${uploadResults.length} files uploaded successfully`,
          data: uploadResults
        });
      } catch (error) {
        // Rollback transaction on error
        await client.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      res.status(500).json({
        success: false,
        message: 'Error uploading files',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @route GET /api/uploads
 * @desc Get list of uploaded files with filtering options
 * @access Private
 */
router.get('/', 
  authMiddleware, 
  async (req, res) => {
    try {
      const { relatedTo, relatedId, limit = 50, offset = 0 } = req.query;
      const client = req.db;
      
      // Build query based on filters
      let query = `
        SELECT fu.id, fu.user_id, fu.related_to, fu.related_id, fu.file_url, fu.metadata, fu.created_at
        FROM file_uploads fu
      `;
      
      const queryParams = [];
      const whereConditions = [];
      
      // Add filters if provided
      if (relatedTo) {
        queryParams.push(relatedTo.toUpperCase());
        whereConditions.push(`fu.related_to = $${queryParams.length}`);
      }
      
      if (relatedId) {
        queryParams.push(relatedId);
        whereConditions.push(`fu.related_id = $${queryParams.length}`);
      }
      
      // Add role-based access control
      if (req.user.role !== 'admin') {
        // For non-admin users, only show files they have access to
        if (req.user.role === 'homeowner') {
          // Get homeowner ID
          const homeownerResult = await client.query(
            'SELECT id FROM homeowners WHERE user_id = $1',
            [req.user.id]
          );
          
          if (homeownerResult.rows.length > 0) {
            const homeownerId = homeownerResult.rows[0].id;
            
            // Add conditions to show only files related to properties owned by this homeowner
            // or service requests created by this homeowner
            whereConditions.push(`(
              (fu.related_to = 'PROPERTY' AND fu.related_id IN (
                SELECT id FROM properties WHERE homeowner_id = $${queryParams.length + 1}
              )) OR
              (fu.related_to = 'SERVICE_REQUEST' AND fu.related_id IN (
                SELECT id FROM service_requests WHERE homeowner_id = $${queryParams.length + 1}
              ))
            )`);
            
            queryParams.push(homeownerId);
          } else {
            // If homeowner profile not found, return empty result
            return res.status(200).json({
              success: true,
              count: 0,
              data: []
            });
          }
        } else if (req.user.role === 'provider') {
          // Get provider ID
          const providerResult = await client.query(
            'SELECT id FROM service_providers WHERE user_id = $1',
            [req.user.id]
          );
          
          if (providerResult.rows.length > 0) {
            const providerId = providerResult.rows[0].id;
            
            // Add conditions to show only files related to service requests where this provider has a bid
            whereConditions.push(`(
              (fu.related_to = 'SERVICE_REQUEST' AND fu.related_id IN (
                SELECT service_request_id FROM bids WHERE provider_id = $${queryParams.length + 1}
              ))
            )`);
            
            queryParams.push(providerId);
          } else {
            // If provider profile not found, return empty result
            return res.status(200).json({
              success: true,
              count: 0,
              data: []
            });
          }
        }
      }
      
      // Add WHERE clause if conditions exist
      if (whereConditions.length > 0) {
        query += ` WHERE ${whereConditions.join(' AND ')}`;
      }
      
      // Add pagination
      query += `
        ORDER BY fu.created_at DESC
        LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
      `;
      
      queryParams.push(limit, offset);
      
      // Execute query
      const filesResult = await client.query(query, queryParams);
      
      // Get total count for pagination
      let countQuery = `SELECT COUNT(*) FROM file_uploads fu`;
      if (whereConditions.length > 0) {
        countQuery += ` WHERE ${whereConditions.join(' AND ')}`;
      }
      
      const countResult = await client.query(countQuery, queryParams.slice(0, -2));
      const totalCount = parseInt(countResult.rows[0].count);
      
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
          relatedTo: file.related_to,
          relatedId: file.related_id,
          fileUrl: accessUrl,
          metadata: metadata,
          createdAt: file.created_at
        };
      }));
      
      // Return success response with files
      res.status(200).json({
        success: true,
        count: files.length,
        total: totalCount,
        data: files,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + files.length < totalCount
        }
      });
    } catch (error) {
      console.error('Error getting files:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving files',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @route GET /api/uploads/:id
 * @desc Get a specific file by ID with a pre-signed URL for access
 * @access Private
 */
router.get('/:id', 
  authMiddleware, 
  async (req, res) => {
    try {
      const { id } = req.params;
      const client = req.db;
      
      // Get file from the database
      const fileResult = await client.query(`
        SELECT fu.id, fu.user_id, fu.related_to, fu.related_id, fu.file_url, fu.metadata, fu.created_at
        FROM file_uploads fu
        WHERE fu.id = $1
      `, [id]);
      
      if (fileResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }
      
      const file = fileResult.rows[0];
      
      // Check if user has permission to access this file
      if (req.user.role !== 'admin') {
        let hasPermission = false;
        
        if (file.related_to === 'PROPERTY') {
          // Check if user owns this property
          const propertyResult = await client.query(`
            SELECT p.*, h.user_id as homeowner_user_id
            FROM properties p
            JOIN homeowners h ON p.homeowner_id = h.id
            WHERE p.id = $1
          `, [file.related_id]);
          
          if (propertyResult.rows.length > 0) {
            const property = propertyResult.rows[0];
            hasPermission = req.user.id === property.homeowner_user_id || req.user.role === 'provider';
          }
        } 
        else if (file.related_to === 'SERVICE_REQUEST') {
          // Check if user is the homeowner or has a bid on this service request
          const serviceRequestResult = await client.query(`
            SELECT sr.*, h.user_id as homeowner_user_id
            FROM service_requests sr
            JOIN homeowners h ON sr.homeowner_id = h.id
            WHERE sr.id = $1
          `, [file.related_id]);
          
          if (serviceRequestResult.rows.length > 0) {
            const serviceRequest = serviceRequestResult.rows[0];
            hasPermission = req.user.id === serviceRequest.homeowner_user_id;
            
            // If user is a provider, check if they have a bid on this service request
            if (req.user.role === 'provider' && !hasPermission) {
              const providerResult = await client.query(`
                SELECT sp.id as provider_id
                FROM service_providers sp
                WHERE sp.user_id = $1
              `, [req.user.id]);
              
              if (providerResult.rows.length > 0) {
                const providerId = providerResult.rows[0].provider_id;
                
                // Check if provider has a bid on this service request
                const bidResult = await client.query(`
                  SELECT id FROM bids
                  WHERE service_request_id = $1 AND provider_id = $2
                `, [file.related_id, providerId]);
                
                hasPermission = bidResult.rows.length > 0;
              }
            }
          }
        }
        
        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            message: 'Not authorized to access this file'
          });
        }
      }
      
      // Generate pre-signed URL for access
      const metadata = JSON.parse(file.metadata);
      let accessUrl = file.file_url;
      
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
          relatedTo: file.related_to,
          relatedId: file.related_id,
          fileUrl: accessUrl,
          metadata: metadata,
          createdAt: file.created_at
        }
      });
    } catch (error) {
      console.error('Error getting file:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving file',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @route DELETE /api/uploads/:id
 * @desc Delete a file
 * @access Private
 */
router.delete('/:id', 
  authMiddleware, 
  async (req, res) => {
    try {
      const { id } = req.params;
      const client = req.db;
      
      // Begin transaction
      await client.query('BEGIN');
      
      try {
        // Get file from the database
        const fileResult = await client.query(`
          SELECT fu.id, fu.user_id, fu.related_to, fu.related_id, fu.metadata
          FROM file_uploads fu
          WHERE fu.id = $1
        `, [id]);
        
        if (fileResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({
            success: false,
            message: 'File not found'
          });
        }
        
        const file = fileResult.rows[0];
        
        // Check if user has permission to delete this file
        let hasPermission = req.user.role === 'admin' || file.user_id === req.user.id;
        
        if (!hasPermission) {
          if (file.related_to === 'PROPERTY') {
            // Check if user owns this property
            const propertyResult = await client.query(`
              SELECT p.*, h.user_id as homeowner_user_id
              FROM properties p
              JOIN homeowners h ON p.homeowner_id = h.id
              WHERE p.id = $1
            `, [file.related_id]);
            
            if (propertyResult.rows.length > 0) {
              const property = propertyResult.rows[0];
              hasPermission = req.user.id === property.homeowner_user_id;
            }
          } 
          else if (file.related_to === 'SERVICE_REQUEST') {
            // Check if user is the homeowner of this service request
            const serviceRequestResult = await client.query(`
              SELECT sr.*, h.user_id as homeowner_user_id
              FROM service_requests sr
              JOIN homeowners h ON sr.homeowner_id = h.id
              WHERE sr.id = $1
            `, [file.related_id]);
            
            if (serviceRequestResult.rows.length > 0) {
              const serviceRequest = serviceRequestResult.rows[0];
              hasPermission = req.user.id === serviceRequest.homeowner_user_id;
            }
          }
        }
        
        if (!hasPermission) {
          await client.query('ROLLBACK');
          return res.status(403).json({
            success: false,
            message: 'Not authorized to delete this file'
          });
        }
        
        // Delete file from S3 if key exists
        const metadata = JSON.parse(file.metadata);
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
        `, [id]);
        
        // Commit transaction
        await client.query('COMMIT');
        
        // Return success response
        res.status(200).json({
          success: true,
          message: 'File deleted successfully'
        });
      } catch (error) {
        // Rollback transaction on error
        await client.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting file',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @route GET /api/uploads/:id/url
 * @desc Get a pre-signed URL for a file
 * @access Private
 */
router.get('/:id/url', 
  authMiddleware, 
  async (req, res) => {
    try {
      const { id } = req.params;
      const { expiresIn = 3600 } = req.query; // Default 1 hour expiration
      const client = req.db;
      
      // Get file from the database
      const fileResult = await client.query(`
        SELECT fu.id, fu.user_id, fu.related_to, fu.related_id, fu.file_url, fu.metadata
        FROM file_uploads fu
        WHERE fu.id = $1
      `, [id]);
      
      if (fileResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }
      
      const file = fileResult.rows[0];
      
      // Check if user has permission to access this file
      if (req.user.role !== 'admin') {
        let hasPermission = false;
        
        if (file.related_to === 'PROPERTY') {
          // Check if user owns this property
          const propertyResult = await client.query(`
            SELECT p.*, h.user_id as homeowner_user_id
            FROM properties p
            JOIN homeowners h ON p.homeowner_id = h.id
            WHERE p.id = $1
          `, [file.related_id]);
          
          if (propertyResult.rows.length > 0) {
            const property = propertyResult.rows[0];
            hasPermission = req.user.id === property.homeowner_user_id || req.user.role === 'provider';
          }
        } 
        else if (file.related_to === 'SERVICE_REQUEST') {
          // Check if user is the homeowner or has a bid on this service request
          const serviceRequestResult = await client.query(`
            SELECT sr.*, h.user_id as homeowner_user_id
            FROM service_requests sr
            JOIN homeowners h ON sr.homeowner_id = h.id
            WHERE sr.id = $1
          `, [file.related_id]);
          
          if (serviceRequestResult.rows.length > 0) {
            const serviceRequest = serviceRequestResult.rows[0];
            hasPermission = req.user.id === serviceRequest.homeowner_user_id;
            
            // If user is a provider, check if they have a bid on this service request
            if (req.user.role === 'provider' && !hasPermission) {
              const providerResult = await client.query(`
                SELECT sp.id as provider_id
                FROM service_providers sp
                WHERE sp.user_id = $1
              `, [req.user.id]);
              
              if (providerResult.rows.length > 0) {
                const providerId = providerResult.rows[0].provider_id;
                
                // Check if provider has a bid on this service request
                const bidResult = await client.query(`
                  SELECT id FROM bids
                  WHERE service_request_id = $1 AND provider_id = $2
                `, [file.related_id, providerId]);
                
                hasPermission = bidResult.rows.length > 0;
              }
            }
          }
        }
        
        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            message: 'Not authorized to access this file'
          });
        }
      }
      
      // Generate pre-signed URL for access
      const metadata = JSON.parse(file.metadata);
      
      if (!metadata.key) {
        return res.status(400).json({
          success: false,
          message: 'File does not support pre-signed URLs'
        });
      }
      
      const url = await fileUploadService.generatePresignedUrl(metadata.key, {
        operation: 'getObject',
        expiresIn: parseInt(expiresIn),
        user: req.user
      });
      
      // Return success response with URL
      res.status(200).json({
        success: true,
        data: {
          url,
          expiresIn: parseInt(expiresIn),
          fileId: file.id,
          fileName: metadata.originalFilename
        }
      });
    } catch (error) {
      console.error('Error generating pre-signed URL:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating file access URL',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @route GET /api/uploads/entity/:type/:id
 * @desc Get all files for a specific entity
 * @access Private
 */
router.get('/entity/:type/:id', 
  authMiddleware, 
  async (req, res) => {
    try {
      const { type, id } = req.params;
      const client = req.db;
      
      // Validate entity type
      if (!['property', 'service-request'].includes(type.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid entity type. Must be property or service-request'
        });
      }
      
      const relatedTo = type.toLowerCase() === 'property' ? 'PROPERTY' : 'SERVICE_REQUEST';
      
      // Check if user has permission to access files for this entity
      let hasPermission = req.user.role === 'admin';
      
      if (!hasPermission) {
        if (relatedTo === 'PROPERTY') {
          // Check if user owns this property
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
          hasPermission = req.user.id === property.homeowner_user_id || req.user.role === 'provider';
        } 
        else if (relatedTo === 'SERVICE_REQUEST') {
          // Check if user is the homeowner or has a bid on this service request
          const serviceRequestResult = await client.query(`
            SELECT sr.*, h.user_id as homeowner_user_id
            FROM service_requests sr
            JOIN homeowners h ON sr.homeowner_id = h.id
            WHERE sr.id = $1
          `, [id]);
          
          if (serviceRequestResult.rows.length === 0) {
            return res.status(404).json({
              success: false,
              message: 'Service request not found'
            });
          }
          
          const serviceRequest = serviceRequestResult.rows[0];
          hasPermission = req.user.id === serviceRequest.homeowner_user_id;
          
          // If user is a provider, check if they have a bid on this service request
          if (req.user.role === 'provider' && !hasPermission) {
            const providerResult = await client.query(`
              SELECT sp.id as provider_id
              FROM service_providers sp
              WHERE sp.user_id = $1
            `, [req.user.id]);
            
            if (providerResult.rows.length > 0) {
              const providerId = providerResult.rows[0].provider_id;
              
              // Check if provider has a bid on this service request
              const bidResult = await client.query(`
                SELECT id FROM bids
                WHERE service_request_id = $1 AND provider_id = $2
              `, [id, providerId]);
              
              hasPermission = bidResult.rows.length > 0;
            }
          }
        }
      }
      
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Not authorized to access files for this ${type}`
        });
      }
      
      // Get files from the database
      const filesResult = await client.query(`
        SELECT id, user_id, file_url, metadata, created_at
        FROM file_uploads
        WHERE related_to = $1 AND related_id = $2
        ORDER BY created_at DESC
      `, [relatedTo, id]);
      
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
      console.error('Error getting entity files:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving files',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

module.exports = router;