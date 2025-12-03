const { validationResult } = require('express-validator');
const ResponseHandler = require('../utils/responseHandler');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.param,
      message: err.msg
    }));
    
    return ResponseHandler.badRequest(res, 'Validation failed', formattedErrors);
  }
  
  next();
};

module.exports = validate;
