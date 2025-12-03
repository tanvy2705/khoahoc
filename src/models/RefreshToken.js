const { query, queryOne } = require('../config/database');

class RefreshToken {
  // Create refresh token
  static async create(userId, token, expiresAt) {
    const result = await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [userId, token, expiresAt]
    );
    
    return result.insertId;
  }

  // Find by token
  static async findByToken(token) {
    return await queryOne(
      'SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > NOW()',
      [token]
    );
  }

  // Find by user ID
  static async findByUserId(userId) {
    return await query(
      'SELECT * FROM refresh_tokens WHERE user_id = ? AND expires_at > NOW() ORDER BY created_at DESC',
      [userId]
    );
  }

  // Delete token
  static async delete(token) {
    await query('DELETE FROM refresh_tokens WHERE token = ?', [token]);
  }

  // Delete all tokens for user
  static async deleteByUserId(userId) {
    await query('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);
  }

  // Clean expired tokens
  static async cleanExpired() {
    const result = await query('DELETE FROM refresh_tokens WHERE expires_at <= NOW()');
    return result.affectedRows;
  }

  // Check if token is valid
  static async isValid(token) {
    const refreshToken = await this.findByToken(token);
    return !!refreshToken;
  }
}

module.exports = RefreshToken;