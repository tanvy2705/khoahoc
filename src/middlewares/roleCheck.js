const { ROLES } = require('../utils/constants');
const ResponseHandler = require('../utils/responseHandler');

// Check if user has specific role
const hasRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res, 'Authentication required');
    }

    if (!allowedRoles.includes(req.user.role_id)) {
      return ResponseHandler.forbidden(res, 'You do not have permission to access this resource');
    }

    next();
  };
};

// Admin only
const isAdmin = hasRole(ROLES.ADMIN);

// Admin or Staff
const isStaffOrAdmin = hasRole(ROLES.ADMIN, ROLES.STAFF);

// Any authenticated user
const isAuthenticated = (req, res, next) => {
  if (!req.user) {
    return ResponseHandler.unauthorized(res, 'Authentication required');
  }
  next();
};

module.exports = {
  hasRole,
  isAdmin,
  isStaffOrAdmin,
  isAuthenticated
};

