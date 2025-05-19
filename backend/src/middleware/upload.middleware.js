/**
 * Upload Middleware
 * Handles file uploads using Multer middleware
 */

const multer = require('multer');
const path = require('path');

// Constants for file validation
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

/**
 * Configure multer storage to use memory storage
 * Files will be stored in memory as buffers and then passed to the AWS S3 service
 */
const storage = multer.memoryStorage();

/**
 * File filter function to validate file types
 * @param {Object} req - Express request object
 * @param {Object} file - File object from multer
 * @param {Function} cb - Callback function
 */
const fileFilter = (req, file, cb) => {
  // Check if the file type is allowed
  if (ALLOWED_FILE_TYPES[file.mimetype]) {
    // Accept the file
    cb(null, true);
  } else {
    // Reject the file
    cb(new Error(`File type not allowed. Allowed types: ${Object.keys(ALLOWED_FILE_TYPES).join(', ')}`), false);
  }
};

/**
 * Configure multer with storage, file size limits, and file filter
 */
const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: fileFilter
});

/**
 * Error handling middleware for multer errors
 */
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`
    });
  } else if (err) {
    // An unknown error occurred
    return res.status(500).json({
      success: false,
      message: err.message || 'An unknown error occurred during file upload'
    });
  }
  // If no error, continue
  next();
};

module.exports = {
  upload,
  handleMulterError
};