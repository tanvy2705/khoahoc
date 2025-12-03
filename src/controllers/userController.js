const User = require('../models/User');
const ResponseHandler = require('../utils/responseHandler');
const asyncHandler = require('../middlewares/asyncHandler');
const Helpers = require('../utils/helpers');

class UserController {
  // Get all users (Admin)
  getAllUsers = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, role_id, status, search } = req.query;
    const pagination = Helpers.getPagination(page, limit);

    const users = await User.getAll({
      ...pagination,
      role_id,
      status,
      search
    });

    const total = await User.count({ role_id, status });

    return ResponseHandler.paginated(res, users, {
      page: pagination.page,
      limit: pagination.limit,
      total
    });
  });

  // Get user by ID (Admin)
  getUserById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await User.findById(id);
    
    if (!user) {
      return ResponseHandler.notFound(res, 'User not found');
    }

    return ResponseHandler.success(res, user);
  });

  // Create user (Admin)
  createUser = asyncHandler(async (req, res) => {
    const { full_name, email, password, role_id } = req.body;

    // Check if email exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return ResponseHandler.conflict(res, 'Email already exists');
    }

    const userId = await User.create({
      full_name,
      email,
      password,
      role_id,
      verification_token: null,
      verification_expires: null
    });

    // Set as verified since created by admin
    await User.update(userId, { email_verified: true });

    const user = await User.findById(userId);

    return ResponseHandler.created(res, user, 'User created successfully');
  });

  // Update user (Admin)
  updateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return ResponseHandler.notFound(res, 'User not found');
    }

    const updatedUser = await User.update(id, req.body);

    return ResponseHandler.success(res, updatedUser, 'User updated successfully');
  });

  // Delete user (Admin)
  deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return ResponseHandler.notFound(res, 'User not found');
    }

    // Don't allow deleting admin
    if (user.role_id === 1) {
      return ResponseHandler.forbidden(res, 'Cannot delete admin user');
    }

    await User.delete(id);

    return ResponseHandler.success(res, null, 'User deleted successfully');
  });

  // Update profile
  updateProfile = asyncHandler(async (req, res) => {
    const { full_name, phone } = req.body;

    const updatedUser = await User.update(req.user.id, {
      full_name,
      phone
    });

    return ResponseHandler.success(res, updatedUser, 'Profile updated successfully');
  });

  // Update avatar
  updateAvatar = asyncHandler(async (req, res) => {
    if (!req.file) {
      return ResponseHandler.badRequest(res, 'No file uploaded');
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    const updatedUser = await User.update(req.user.id, { avatar: avatarUrl });

    return ResponseHandler.success(res, { avatar: avatarUrl }, 'Avatar updated successfully');
  });

  // Change password
  changePassword = asyncHandler(async (req, res) => {
    const { current_password, new_password } = req.body;

    const user = await User.findByEmail(req.user.email);

    // Verify current password
    const isValid = await User.verifyPassword(current_password, user.password);
    if (!isValid) {
      return ResponseHandler.badRequest(res, 'Current password is incorrect');
    }

    await User.updatePassword(req.user.id, new_password);

    return ResponseHandler.success(res, null, 'Password changed successfully');
  });

  // Get user stats
  getUserStats = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // Check authorization
    if (req.user.role_id !== 1 && req.user.id !== parseInt(userId)) {
      return ResponseHandler.forbidden(res, 'You do not have permission');
    }

    const { queryOne } = require('../config/database');

    // Get enrollment stats
    const enrollmentStats = await queryOne(
      `SELECT 
         COUNT(*) as total_courses,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_courses,
         AVG(progress) as avg_progress
       FROM enrollments 
       WHERE user_id = ?`,
      [userId]
    );

    // Get order stats
    const orderStats = await queryOne(
      `SELECT 
         COUNT(*) as total_orders,
         SUM(final_amount) as total_spent
       FROM orders 
       WHERE user_id = ? AND payment_status = 'paid'`,
      [userId]
    );

    return ResponseHandler.success(res, {
      enrollments: enrollmentStats,
      orders: orderStats
    });
  });

  // Update user status (Admin)
  updateUserStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return ResponseHandler.notFound(res, 'User not found');
    }

    await User.update(id, { status });

    return ResponseHandler.success(res, null, 'User status updated successfully');
  });

  // Assign role (Admin)
  assignRole = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { role_id } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return ResponseHandler.notFound(res, 'User not found');
    }

    await User.update(id, { role_id });

    return ResponseHandler.success(res, null, 'Role assigned successfully');
  });
}

module.exports = new UserController();