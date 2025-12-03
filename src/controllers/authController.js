const User = require('../models/User');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../config/jwt');
const { query, queryOne } = require('../config/database');
const ResponseHandler = require('../utils/responseHandler');
const asyncHandler = require('../middlewares/asyncHandler');
const Helpers = require('../utils/helpers');
const emailService = require('../services/emailService');

class AuthController {
  // Register new user
  register = asyncHandler(async (req, res) => {
    const { full_name, email, password } = req.body;

    // Check if email exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return ResponseHandler.conflict(res, 'Email already registered');
    }

    // Generate verification token
    const verificationToken = Helpers.generateVerificationToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user
    const userId = await User.create({
      full_name,
      email,
      password,
      role_id: 3, // USER role
      verification_token: verificationToken,
      verification_expires: verificationExpires
    });

    // Send verification email
    await emailService.sendVerificationEmail(email, verificationToken, full_name);

    return ResponseHandler.created(res, {
      user_id: userId,
      message: 'Registration successful. Please check your email to verify your account.'
    });
  });

  // Login
  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      return ResponseHandler.unauthorized(res, 'Invalid email or password');
    }

    // Check password
    const isValidPassword = await User.verifyPassword(password, user.password);
    if (!isValidPassword) {
      return ResponseHandler.unauthorized(res, 'Invalid email or password');
    }

    // Check if account is active
    if (user.status !== 'active') {
      return ResponseHandler.forbidden(res, 'Your account is not active');
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role_id: user.role_id
    });

    const refreshToken = generateRefreshToken({
      id: user.id
    });

    // Save refresh token to database
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, refreshToken, expiresAt]
    );

    // Update last login
    await User.updateLastLogin(user.id);

    // Remove sensitive data
    delete user.password;
    delete user.email_verification_token;
    delete user.reset_password_token;

    return ResponseHandler.success(res, {
      access_token: accessToken,
      refresh_token: refreshToken,
      user
    }, 'Login successful');
  });

  // Refresh token
  refreshToken = asyncHandler(async (req, res) => {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return ResponseHandler.badRequest(res, 'Refresh token is required');
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refresh_token);
    } catch (error) {
      return ResponseHandler.unauthorized(res, 'Invalid or expired refresh token');
    }

    // Check if refresh token exists in database
    const tokenRecord = await queryOne(
      'SELECT * FROM refresh_tokens WHERE token = ? AND user_id = ? AND expires_at > NOW()',
      [refresh_token, decoded.id]
    );

    if (!tokenRecord) {
      return ResponseHandler.unauthorized(res, 'Invalid or expired refresh token');
    }

    // Get user
    const user = await User.findById(decoded.id);
    if (!user || user.status !== 'active') {
      return ResponseHandler.unauthorized(res, 'User not found or inactive');
    }

    // Generate new access token
    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role_id: user.role_id
    });

    return ResponseHandler.success(res, {
      access_token: accessToken
    }, 'Token refreshed successfully');
  });

  // Logout
  logout = asyncHandler(async (req, res) => {
    const { refresh_token } = req.body;

    if (refresh_token) {
      // Delete refresh token from database
      await query('DELETE FROM refresh_tokens WHERE token = ?', [refresh_token]);
    }

    return ResponseHandler.success(res, null, 'Logout successful');
  });

  // Verify email
  verifyEmail = asyncHandler(async (req, res) => {
    const { token } = req.body;

    const user = await User.verifyEmailToken(token);
    
    if (!user) {
      return ResponseHandler.badRequest(res, 'Invalid or expired verification token');
    }

    return ResponseHandler.success(res, null, 'Email verified successfully');
  });

  // Forgot password
  forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      return ResponseHandler.success(
        res, 
        null, 
        'If your email is registered, you will receive a password reset link'
      );
    }

    // Generate reset token
    const resetToken = Helpers.generateVerificationToken();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await User.saveResetToken(email, resetToken, resetExpires);

    // Send reset email
    await emailService.sendPasswordResetEmail(email, resetToken, user.full_name);

    return ResponseHandler.success(
      res, 
      null, 
      'If your email is registered, you will receive a password reset link'
    );
  });

  // Reset password
  resetPassword = asyncHandler(async (req, res) => {
    const { token, new_password } = req.body;

    const user = await User.verifyResetToken(token);
    
    if (!user) {
      return ResponseHandler.badRequest(res, 'Invalid or expired reset token');
    }

    // Update password
    await User.updatePassword(user.id, new_password);

    // Clear reset token
    await User.clearResetToken(user.id);

    return ResponseHandler.success(res, null, 'Password reset successful');
  });

  // Get current user
  getCurrentUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return ResponseHandler.notFound(res, 'User not found');
    }

    return ResponseHandler.success(res, { user });
  });

  // Update profile
  updateProfile = asyncHandler(async (req, res) => {
    const { full_name, phone } = req.body;

    const updatedUser = await User.update(req.user.id, {
      full_name,
      phone
    });

    return ResponseHandler.success(res, { user: updatedUser }, 'Profile updated successfully');
  });
}

module.exports = new AuthController();