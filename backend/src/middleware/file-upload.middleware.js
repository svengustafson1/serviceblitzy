/**
 * File Upload Middleware
 * Configures Multer for handling file uploads
 */

const multer = require('multer');
const path = require('path');

// Define file size limits and allowed types
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

// Configure storage
const storage = multer.memoryStorage(); // Use memory storage as we'll pass to S3 service

// File filter function to validate uploads
const fileFilter = (req, file, cb) => {
  // Check if the file type is allowed
  if (ALLOWED_FILE_TYPES[file.mimetype]) {
    // Accept the file
    cb(null, true);
  } else {
    // Reject the file
    cb(
      new Error(
        `File type not allowed. Allowed types: ${Object.keys(ALLOWED_FILE_TYPES).join(
          ', '
        )}`
      ),
      false
    );
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: fileFilter
});

// Middleware for single file upload
const uploadSingleFile = upload.single('file');

// Middleware for multiple file upload
const uploadMultipleFiles = upload.array('files', 5); // Allow up to 5 files

// Error handling middleware for multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `File size exceeds the limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
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
      message: err.message
    });
  }
  // No error occurred, continue
  next();
};

module.exports = {
  uploadSingleFile,
  uploadMultipleFiles,
  handleMulterError
};