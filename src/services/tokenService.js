const RefreshToken = require('../models/RefreshToken');
const { verifyRefreshToken, generateAccessToken } = require('../config/jwt');

class TokenService {
  // Refresh access token
  async refreshAccessToken(refreshToken) {
    // Verify token
    const decoded = verifyRefreshToken(refreshToken);
    
    // Check if token exists in database
    const tokenRecord = await RefreshToken.findByToken(refreshToken);
    
    if (!tokenRecord) {
      throw new Error('Invalid refresh token');
    }
    
    // Generate new access token
    const accessToken = generateAccessToken({
      id: decoded.id,
      email: decoded.email,
      role_id: decoded.role_id
    });
    
    return accessToken;
  }

  // Validate refresh token
  async validateRefreshToken(token) {
    return await RefreshToken.isValid(token);
  }

  // Revoke token
  async revokeToken(token) {
    await RefreshToken.delete(token);
  }
}

module.exports = new TokenService();