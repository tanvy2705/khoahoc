const sanitizeHtml = require('sanitize-html');
const validator = require('validator');

// Sanitize HTML content
const sanitizeHTML = (dirty) => {
  return sanitizeHtml(dirty, {
    allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    allowedAttributes: {
      'a': ['href', 'target']
    },
    allowedSchemes: ['http', 'https', 'mailto']
  });
};

// Sanitize string input
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  
  // Trim whitespace
  str = str.trim();
  
  // Escape HTML entities
  str = validator.escape(str);
  
  // Remove null bytes
  str = str.replace(/\0/g, '');
  
  return str;
};

// Sanitize object recursively
const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return typeof obj === 'string' ? sanitizeString(obj) : obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeObject(value);
  }
  
  return sanitized;
};

// Middleware to sanitize request body
const sanitizeBody = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  next();
};

// Middleware to sanitize query params
const sanitizeQuery = (req, res, next) => {
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  next();
};

// Middleware to sanitize params
const sanitizeParams = (req, res, next) => {
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  next();
};

// Sanitize all inputs
const sanitizeAll = (req, res, next) => {
  sanitizeBody(req, res, () => {
    sanitizeQuery(req, res, () => {
      sanitizeParams(req, res, next);
    });
  });
};

// Prevent XSS attacks
const xssProtection = (req, res, next) => {
  // Set XSS protection header
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Sanitize inputs
  sanitizeAll(req, res, next);
};

// Prevent SQL injection (basic)
const sqlInjectionProtection = (req, res, next) => {
  const checkForSQLInjection = (value) => {
    if (typeof value !== 'string') return false;
    
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
      /(UNION.*SELECT)/gi,
      /(\bOR\b.*=.*)/gi,
      /(--)/g,
      /;/g
    ];
    
    return sqlPatterns.some(pattern => pattern.test(value));
  };
  
  const checkObject = (obj) => {
    for (const value of Object.values(obj)) {
      if (typeof value === 'object' && value !== null) {
        if (checkObject(value)) return true;
      } else if (checkForSQLInjection(value)) {
        return true;
      }
    }
    return false;
  };
  
  if (checkObject(req.body) || checkObject(req.query) || checkObject(req.params)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid input detected'
    });
  }
  
  next();
};

module.exports = {
  sanitizeHTML,
  sanitizeString,
  sanitizeObject,
  sanitizeBody,
  sanitizeQuery,
  sanitizeParams,
  sanitizeAll,
  xssProtection,
  sqlInjectionProtection
};
