const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { generateAccessToken, generateRefreshToken } = require('../config/jwt');
const Helpers = require('../utils/helpers');

class AuthService {
  // Generate tokens for user
  async generateTokens(user) {
    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role_id: user.role_id
    });
    
    const refreshToken = generateRefreshToken({
      id: user.id
    });
    
    // Save refresh token to database
    const expiresAt = Helpers.addDays(new Date(), 30);
    await RefreshToken.create(user.id, refreshToken, expiresAt);
    
    return { accessToken, refreshToken };
  }

  // Revoke all tokens for user
  async revokeUserTokens(userId) {
    await RefreshToken.deleteByUserId(userId);
  }

  // Clean expired tokens
  async cleanExpiredTokens() {
    const deletedCount = await RefreshToken.cleanExpired();
    console.log(`Cleaned ${deletedCount} expired tokens`);
    return deletedCount;
  }
}

module.exports = new AuthService();