const { query, queryOne } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  // Find user by ID
  static async findById(id) {
    return await queryOne(
      `SELECT id, full_name, email, phone, avatar, role_id, status, 
              email_verified, last_login, created_at, updated_at
       FROM users WHERE id = ?`,
      [id]
    );
  }

  // Find user by email
  static async findByEmail(email) {
    return await queryOne(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
  }

  // Create new user
  static async create(userData) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    const result = await query(
      `INSERT INTO users (full_name, email, password, role_id, email_verification_token, email_verification_expires)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userData.full_name,
        userData.email,
        hashedPassword,
        userData.role_id || 3, // Default to USER role
        userData.verification_token,
        userData.verification_expires
      ]
    );
    
    return result.insertId;
  }

  // Update user
  static async update(id, userData) {
    const fields = [];
    const values = [];
    
    if (userData.full_name) {
      fields.push('full_name = ?');
      values.push(userData.full_name);
    }
    if (userData.phone) {
      fields.push('phone = ?');
      values.push(userData.phone);
    }
    if (userData.avatar) {
      fields.push('avatar = ?');
      values.push(userData.avatar);
    }
    if (userData.status) {
      fields.push('status = ?');
      values.push(userData.status);
    }
    if (userData.email_verified !== undefined) {
      fields.push('email_verified = ?');
      values.push(userData.email_verified);
    }
    
    values.push(id);
    
    await query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    
    return await this.findById(id);
  }

  // Update password
  static async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, id]
    );
  }

  // Verify password
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Get all users (admin)
  static async getAll(filters = {}) {
    let sql = `SELECT id, full_name, email, phone, avatar, role_id, status, 
                      email_verified, last_login, created_at 
               FROM users WHERE 1=1`;
    const params = [];
    
    if (filters.role_id) {
      sql += ' AND role_id = ?';
      params.push(filters.role_id);
    }
    
    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    
    if (filters.search) {
      sql += ' AND (full_name LIKE ? OR email LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    if (filters.limit) {
      sql += ' LIMIT ? OFFSET ?';
      params.push(parseInt(filters.limit), parseInt(filters.offset || 0));
    }
    
    return await query(sql, params);
  }

  // Count users
  static async count(filters = {}) {
    let sql = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    const params = [];
    
    if (filters.role_id) {
      sql += ' AND role_id = ?';
      params.push(filters.role_id);
    }
    
    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    
    const result = await queryOne(sql, params);
    return result.total;
  }

  // Delete user
  static async delete(id) {
    await query('DELETE FROM users WHERE id = ?', [id]);
  }

  // Update last login
  static async updateLastLogin(id) {
    await query(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [id]
    );
  }

  // Save verification token
  static async saveVerificationToken(email, token, expires) {
    await query(
      `UPDATE users 
       SET email_verification_token = ?, email_verification_expires = ?
       WHERE email = ?`,
      [token, expires, email]
    );
  }

  // Verify email token
  static async verifyEmailToken(token) {
    const user = await queryOne(
      `SELECT * FROM users 
       WHERE email_verification_token = ? 
       AND email_verification_expires > NOW()`,
      [token]
    );
    
    if (user) {
      await query(
        `UPDATE users 
         SET email_verified = TRUE, 
             email_verification_token = NULL, 
             email_verification_expires = NULL
         WHERE id = ?`,
        [user.id]
      );
    }
    
    return user;
  }

  // Save reset password token
  static async saveResetToken(email, token, expires) {
    await query(
      `UPDATE users 
       SET reset_password_token = ?, reset_password_expires = ?
       WHERE email = ?`,
      [token, expires, email]
    );
  }

  // Verify reset token
  static async verifyResetToken(token) {
    return await queryOne(
      `SELECT * FROM users 
       WHERE reset_password_token = ? 
       AND reset_password_expires > NOW()`,
      [token]
    );
  }

  // Clear reset token
  static async clearResetToken(id) {
    await query(
      `UPDATE users 
       SET reset_password_token = NULL, reset_password_expires = NULL
       WHERE id = ?`,
      [id]
    );
  }
}

module.exports = User;