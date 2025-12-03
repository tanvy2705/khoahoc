const ResponseHandler = require('../utils/responseHandler');

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // MySQL errors
  if (err.code === 'ER_DUP_ENTRY') {
    return ResponseHandler.conflict(res, 'Duplicate entry. This record already exists.');
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return ResponseHandler.badRequest(res, 'Referenced record does not exist.');
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return ResponseHandler.unauthorized(res, 'Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    return ResponseHandler.unauthorized(res, 'Token expired');
  }

  // Multer errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return ResponseHandler.badRequest(res, 'File size too large');
    }
    return ResponseHandler.badRequest(res, 'File upload error');
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return ResponseHandler.badRequest(res, err.message);
  }

  // Default error
  return ResponseHandler.internalError(
    res,
    process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  );
};

module.exports = errorHandler;