/**
 * File Upload Service
 * Manages secure file uploads, storage, and retrieval for the platform using AWS S3
 */

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const crypto = require('crypto');

// Constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'text/csv': '.csv'
};

// Temporary local storage path for fallback
const TEMP_STORAGE_PATH = process.env.TEMP_STORAGE_PATH || path.join(process.cwd(), 'temp_uploads');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_STORAGE_PATH)) {
  fs.mkdirSync(TEMP_STORAGE_PATH, { recursive: true });
}

/**
 * Initialize S3 client with configuration
 * @returns {AWS.S3} Configured S3 client
 */
const initS3Client = () => {
  // Configure AWS SDK
  const s3Config = {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    signatureVersion: 'v4',
    // Configure retry behavior with exponential backoff
    maxRetries: 10,
    retryDelayOptions: {
      base: 300 // Start with 300ms delay for retries
    }
  };

  return new AWS.S3(s3Config);
};

/**
 * File Upload Service
 */
class FileUploadService {
  constructor() {
    this.s3Client = initS3Client();
    this.bucketName = process.env.AWS_S3_BUCKET_NAME;
    this.uploadInProgress = new Map(); // Track uploads in progress
    this.circuitBreaker = {
      failures: 0,
      lastFailure: null,
      isOpen: false,
      threshold: 5, // Number of failures before opening circuit
      resetTimeout: 30000 // 30 seconds before trying again
    };
  }

  /**
   * Validate file before upload
   * @param {Object} file - File object with buffer, originalname, mimetype, and size
   * @returns {Object} Validation result with isValid and message
   */
  validateFile(file) {
    // Check if file exists
    if (!file || !file.buffer) {
      return { isValid: false, message: 'No file provided' };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return { 
        isValid: false, 
        message: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
      };
    }

    // Check file type
    if (!ALLOWED_FILE_TYPES[file.mimetype]) {
      return { 
        isValid: false, 
        message: 'File type not allowed. Allowed types: ' + Object.keys(ALLOWED_FILE_TYPES).join(', ') 
      };
    }

    // Basic security scan (could be expanded with more sophisticated scanning)
    if (this.hasSecurityRisk(file)) {
      return { isValid: false, message: 'File failed security scan' };
    }

    return { isValid: true };
  }

  /**
   * Basic security scan for files
   * @param {Object} file - File object
   * @returns {boolean} True if security risk detected
   */
  hasSecurityRisk(file) {
    // Check for executable files
    const executableExtensions = ['.exe', '.bat', '.cmd', '.sh', '.js'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (executableExtensions.includes(fileExtension)) {
      return true;
    }

    // For images and PDFs, could implement more sophisticated scanning here
    // This is a placeholder for more advanced security scanning

    return false;
  }

  /**
   * Generate a secure, unique filename for storage
   * @param {string} originalFilename - Original filename
   * @param {string} mimetype - File MIME type
   * @param {string} entityType - Type of entity (property, service-request)
   * @param {string} entityId - ID of the related entity
   * @returns {string} Secure filename with path
   */
  generateSecureFilename(originalFilename, mimetype, entityType, entityId) {
    const fileExtension = ALLOWED_FILE_TYPES[mimetype];
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const sanitizedOriginalName = path.basename(originalFilename, path.extname(originalFilename))
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 30);

    return `${entityType}/${entityId}/${timestamp}-${randomString}-${sanitizedOriginalName}${fileExtension}`;
  }

  /**
   * Upload file to S3 with retry logic
   * @param {Object} file - File object with buffer, originalname, and mimetype
   * @param {Object} options - Upload options
   * @param {string} options.entityType - Type of entity (property, service-request)
   * @param {string} options.entityId - ID of the related entity
   * @param {string} options.description - Optional file description
   * @param {Function} options.onProgress - Optional progress callback
   * @returns {Promise<Object>} Upload result with file metadata
   */
  async uploadFile(file, options) {
    const { entityType, entityId, description, onProgress } = options;
    
    // Check circuit breaker
    if (this.isCircuitOpen()) {
      console.log('Circuit breaker open, using fallback storage');
      return this.fallbackUpload(file, options);
    }

    // Validate file
    const validation = this.validateFile(file);
    if (!validation.isValid) {
      throw new Error(validation.message);
    }

    // Generate secure filename
    const key = this.generateSecureFilename(
      file.originalname,
      file.mimetype,
      entityType,
      entityId
    );

    // Generate a unique upload ID to track this upload
    const uploadId = uuidv4();
    this.uploadInProgress.set(uploadId, {
      status: 'preparing',
      progress: 0,
      key,
      startTime: Date.now()
    });

    try {
      // Prepare upload parameters
      const params = {
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          'original-filename': encodeURIComponent(file.originalname),
          'entity-type': entityType,
          'entity-id': entityId,
          'description': description || '',
          'upload-id': uploadId
        }
      };

      // Update status
      this.uploadInProgress.set(uploadId, {
        ...this.uploadInProgress.get(uploadId),
        status: 'uploading'
      });

      // Upload to S3 with progress tracking
      const managedUpload = this.s3Client.upload(params);
      
      // Set up progress tracking if callback provided
      if (typeof onProgress === 'function') {
        managedUpload.on('httpUploadProgress', (progress) => {
          const progressPercentage = Math.round((progress.loaded / progress.total) * 100);
          this.uploadInProgress.set(uploadId, {
            ...this.uploadInProgress.get(uploadId),
            progress: progressPercentage
          });
          onProgress({
            uploadId,
            loaded: progress.loaded,
            total: progress.total,
            percentage: progressPercentage
          });
        });
      }

      // Execute upload
      const uploadResult = await managedUpload.promise();
      
      // Reset circuit breaker on success
      this.resetCircuitBreaker();
      
      // Update status to completed
      this.uploadInProgress.set(uploadId, {
        ...this.uploadInProgress.get(uploadId),
        status: 'completed',
        progress: 100,
        endTime: Date.now(),
        location: uploadResult.Location
      });

      // Prepare metadata for database
      const fileMetadata = {
        uploadId,
        key,
        bucket: this.bucketName,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        entityType,
        entityId,
        description: description || '',
        location: uploadResult.Location,
        etag: uploadResult.ETag
      };

      return fileMetadata;
    } catch (error) {
      // Update circuit breaker
      this.recordFailure();
      
      // Update status to failed
      this.uploadInProgress.set(uploadId, {
        ...this.uploadInProgress.get(uploadId),
        status: 'failed',
        error: error.message,
        endTime: Date.now()
      });

      console.error('Error uploading file to S3:', error);
      
      // Try fallback storage if S3 upload fails
      if (this.isCircuitOpen()) {
        console.log('Circuit breaker tripped, using fallback storage');
        return this.fallbackUpload(file, options);
      }
      
      throw error;
    } finally {
      // Clean up tracking after some time
      setTimeout(() => {
        this.uploadInProgress.delete(uploadId);
      }, 3600000); // Clean up after 1 hour
    }
  }

  /**
   * Fallback upload to local storage when S3 is unavailable
   * @param {Object} file - File object
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result with file metadata
   */
  async fallbackUpload(file, options) {
    const { entityType, entityId, description } = options;
    
    // Generate secure filename
    const filename = this.generateSecureFilename(
      file.originalname,
      file.mimetype,
      entityType,
      entityId
    );
    
    const localPath = path.join(TEMP_STORAGE_PATH, filename);
    
    // Ensure directory exists
    const directory = path.dirname(localPath);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    
    try {
      // Write file to local storage
      await fs.promises.writeFile(localPath, file.buffer);
      
      // Generate a unique ID for this upload
      const uploadId = uuidv4();
      
      // Prepare metadata for database
      const fileMetadata = {
        uploadId,
        key: filename,
        bucket: 'local-fallback',
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        entityType,
        entityId,
        description: description || '',
        location: `file://${localPath}`,
        isFallback: true,
        needsSync: true // Flag to indicate this needs to be synced to S3 later
      };
      
      // Schedule background sync to S3 when available
      this.scheduleBackgroundSync(localPath, filename, fileMetadata);
      
      return fileMetadata;
    } catch (error) {
      console.error('Error in fallback upload:', error);
      throw new Error('Failed to store file in fallback storage: ' + error.message);
    }
  }

  /**
   * Schedule background sync of fallback files to S3
   * @param {string} localPath - Path to local file
   * @param {string} key - S3 key for the file
   * @param {Object} metadata - File metadata
   */
  scheduleBackgroundSync(localPath, key, metadata) {
    // This would typically be implemented with a job queue
    // For simplicity, we're just logging the intent here
    console.log(`Scheduled background sync for file: ${localPath} to S3 key: ${key}`);
    
    // In a real implementation, you would add this to a persistent queue
    // that would be processed by a worker to sync to S3 when available
  }

  /**
   * Generate a pre-signed URL for temporary file access
   * @param {string} key - S3 object key
   * @param {Object} options - Options for URL generation
   * @param {string} options.operation - S3 operation ('getObject' or 'putObject')
   * @param {number} options.expiresIn - Expiration time in seconds (default: 3600)
   * @param {Object} options.user - User requesting the URL (for access control)
   * @returns {Promise<string>} Pre-signed URL
   */
  async generatePresignedUrl(key, options) {
    const { operation = 'getObject', expiresIn = 3600, user } = options;
    
    // Check if user has permission to access this file
    if (user && !await this.checkFileAccess(key, user)) {
      throw new Error('Access denied to this file');
    }
    
    // Check circuit breaker
    if (this.isCircuitOpen()) {
      throw new Error('S3 service currently unavailable');
    }
    
    try {
      const params = {
        Bucket: this.bucketName,
        Key: key,
        Expires: expiresIn
      };
      
      // For putObject, we can set content type and other restrictions
      if (operation === 'putObject') {
        params.ContentType = options.contentType || 'application/octet-stream';
      }
      
      const url = await this.s3Client.getSignedUrlPromise(operation, params);
      
      // Reset circuit breaker on success
      this.resetCircuitBreaker();
      
      return url;
    } catch (error) {
      // Update circuit breaker
      this.recordFailure();
      
      console.error('Error generating pre-signed URL:', error);
      throw new Error('Failed to generate file access URL: ' + error.message);
    }
  }

  /**
   * Check if user has access to a file
   * @param {string} key - S3 object key
   * @param {Object} user - User object with id and role
   * @returns {Promise<boolean>} Whether user has access
   */
  async checkFileAccess(key, user) {
    try {
      // Extract entity type and ID from the key
      // Format: entityType/entityId/filename
      const keyParts = key.split('/');
      if (keyParts.length < 2) {
        return false;
      }
      
      const entityType = keyParts[0];
      const entityId = keyParts[1];
      
      // Admin has access to everything
      if (user.role === 'admin') {
        return true;
      }
      
      // Check based on entity type
      if (entityType === 'property') {
        // Check if user owns this property
        // This would typically query the database
        return true; // Placeholder - implement actual check
      } else if (entityType === 'service-request') {
        // Check if user is the homeowner or the assigned provider
        // This would typically query the database
        return true; // Placeholder - implement actual check
      }
      
      return false;
    } catch (error) {
      console.error('Error checking file access:', error);
      return false;
    }
  }

  /**
   * Delete a file from S3
   * @param {string} key - S3 object key
   * @param {Object} user - User requesting deletion (for access control)
   * @returns {Promise<boolean>} Success status
   */
  async deleteFile(key, user) {
    // Check if user has permission to delete this file
    if (user && !await this.checkFileAccess(key, user)) {
      throw new Error('Access denied to delete this file');
    }
    
    // Check circuit breaker
    if (this.isCircuitOpen()) {
      throw new Error('S3 service currently unavailable');
    }
    
    try {
      await this.s3Client.deleteObject({
        Bucket: this.bucketName,
        Key: key
      }).promise();
      
      // Reset circuit breaker on success
      this.resetCircuitBreaker();
      
      return true;
    } catch (error) {
      // Update circuit breaker
      this.recordFailure();
      
      console.error('Error deleting file from S3:', error);
      throw new Error('Failed to delete file: ' + error.message);
    }
  }

  /**
   * Get file metadata from S3
   * @param {string} key - S3 object key
   * @param {Object} user - User requesting metadata (for access control)
   * @returns {Promise<Object>} File metadata
   */
  async getFileMetadata(key, user) {
    // Check if user has permission to access this file
    if (user && !await this.checkFileAccess(key, user)) {
      throw new Error('Access denied to this file');
    }
    
    // Check circuit breaker
    if (this.isCircuitOpen()) {
      throw new Error('S3 service currently unavailable');
    }
    
    try {
      const result = await this.s3Client.headObject({
        Bucket: this.bucketName,
        Key: key
      }).promise();
      
      // Reset circuit breaker on success
      this.resetCircuitBreaker();
      
      // Extract and return metadata
      return {
        key,
        bucket: this.bucketName,
        size: result.ContentLength,
        lastModified: result.LastModified,
        contentType: result.ContentType,
        metadata: result.Metadata
      };
    } catch (error) {
      // Update circuit breaker
      this.recordFailure();
      
      console.error('Error getting file metadata from S3:', error);
      throw new Error('Failed to get file metadata: ' + error.message);
    }
  }

  /**
   * List files for a specific entity
   * @param {string} entityType - Type of entity (property, service-request)
   * @param {string} entityId - ID of the entity
   * @param {Object} user - User requesting the list (for access control)
   * @returns {Promise<Array>} List of file metadata
   */
  async listFiles(entityType, entityId, user) {
    // Check if user has permission to access files for this entity
    // This would be implemented based on your access control logic
    
    // Check circuit breaker
    if (this.isCircuitOpen()) {
      throw new Error('S3 service currently unavailable');
    }
    
    try {
      const prefix = `${entityType}/${entityId}/`;
      
      const result = await this.s3Client.listObjectsV2({
        Bucket: this.bucketName,
        Prefix: prefix
      }).promise();
      
      // Reset circuit breaker on success
      this.resetCircuitBreaker();
      
      // Map results to a more usable format
      const files = result.Contents.map(item => ({
        key: item.Key,
        size: item.Size,
        lastModified: item.LastModified,
        etag: item.ETag
      }));
      
      return files;
    } catch (error) {
      // Update circuit breaker
      this.recordFailure();
      
      console.error('Error listing files from S3:', error);
      throw new Error('Failed to list files: ' + error.message);
    }
  }

  /**
   * Check if circuit breaker is open
   * @returns {boolean} Whether circuit is open
   */
  isCircuitOpen() {
    if (!this.circuitBreaker.isOpen) {
      return false;
    }
    
    // Check if it's time to try again
    const now = Date.now();
    if (this.circuitBreaker.lastFailure && 
        (now - this.circuitBreaker.lastFailure) > this.circuitBreaker.resetTimeout) {
      // Try again after timeout
      this.circuitBreaker.isOpen = false;
      return false;
    }
    
    return true;
  }

  /**
   * Record a failure for circuit breaker
   */
  recordFailure() {
    this.circuitBreaker.failures += 1;
    this.circuitBreaker.lastFailure = Date.now();
    
    // Open circuit if threshold reached
    if (this.circuitBreaker.failures >= this.circuitBreaker.threshold) {
      this.circuitBreaker.isOpen = true;
      console.log('Circuit breaker opened due to multiple failures');
    }
  }

  /**
   * Reset circuit breaker after successful operation
   */
  resetCircuitBreaker() {
    this.circuitBreaker.failures = 0;
    this.circuitBreaker.isOpen = false;
  }

  /**
   * Get upload status
   * @param {string} uploadId - Upload ID to check
   * @returns {Object|null} Upload status or null if not found
   */
  getUploadStatus(uploadId) {
    return this.uploadInProgress.get(uploadId) || null;
  }
}

module.exports = new FileUploadService();