const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const userController = require('../controllers/userController');
const auth = require('../middlewares/auth');
const { isAdmin } = require('../middlewares/roleCheck');
const { uploadSingle } = require('../middlewares/upload');
const validate = require('../middlewares/validator');

// User profile routes
router.put('/profile', auth, userController.updateProfile);
router.post('/avatar', auth, uploadSingle('avatar'), userController.updateAvatar);

const changePasswordValidation = [
  body('current_password').notEmpty().withMessage('Current password is required'),
  body('new_password').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
];

router.post('/change-password', auth, changePasswordValidation, validate, userController.changePassword);
router.get('/:userId/stats', auth, userController.getUserStats);

// Admin routes
router.get('/', auth, isAdmin, userController.getAllUsers);
router.get('/:id', auth, isAdmin, userController.getUserById);

const createUserValidation = [
  body('full_name').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Invalid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role_id').isInt().withMessage('Role ID must be an integer')
];

router.post('/', auth, isAdmin, createUserValidation, validate, userController.createUser);
router.put('/:id', auth, isAdmin, userController.updateUser);
router.delete('/:id', auth, isAdmin, userController.deleteUser);
router.patch('/:id/status', auth, isAdmin, userController.updateUserStatus);
router.patch('/:id/role', auth, isAdmin, userController.assignRole);

module.exports = router;