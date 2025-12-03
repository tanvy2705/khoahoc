const auth = require('./auth');
const roleCheck = require('./roleCheck');
const upload = require('./upload');
const validator = require('./validator');
const errorHandler = require('./errorHandler');
const asyncHandler = require('./asyncHandler');
const rateLimiter = require('./rateLimiter');
const sanitize = require('./sanitize');

module.exports = {
  auth,
  ...roleCheck,
  ...upload,
  validate: validator,
  errorHandler,
  asyncHandler,
  ...rateLimiter,
  ...sanitize
};