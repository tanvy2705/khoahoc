const { verifyAccessToken } = require('../config/jwt');
const { query } = require('../config/database');
const ResponseHandler = require('../utils/responseHandler');

const auth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ResponseHandler.unauthorized(res, 'No token provided');
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = verifyAccessToken(token);

    // Get user from database
    const user = await query(
      'SELECT id, email, full_name, role_id, status FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!user || user.length === 0) {
      return ResponseHandler.unauthorized(res, 'User not found');
    }

    if (user[0].status !== 'active') {
      return ResponseHandler.forbidden(res, 'Account is not active');
    }

    // Attach user to request
    req.user = {
      id: user[0].id,
      email: user[0].email,
      full_name: user[0].full_name,
      role_id: user[0].role_id,
      status: user[0].status
    };

    next();
  } catch (error) {
    if (error.message.includes('expired')) {
      return ResponseHandler.unauthorized(res, 'Token expired');
    }
    return ResponseHandler.unauthorized(res, 'Invalid token');
  }
};

module.exports = auth;