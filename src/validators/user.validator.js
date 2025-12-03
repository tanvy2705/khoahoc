const { body, param } = require('express-validator');

const userValidators = {
  create: [
    body('full_name')
      .trim()
      .notEmpty().withMessage('Họ tên không được để trống')
      .isLength({ min: 2, max: 100 }).withMessage('Họ tên phải từ 2-100 ký tự'),
    
    body('email')
      .trim()
      .notEmpty().withMessage('Email không được để trống')
      .isEmail().withMessage('Email không hợp lệ'),
    
    body('password')
      .notEmpty().withMessage('Mật khẩu không được để trống')
      .isLength({ min: 6 }).withMessage('Mật khẩu phải có ít nhất 6 ký tự'),
    
    body('role_id')
      .notEmpty().withMessage('Vai trò không được để trống')
      .isInt({ min: 1, max: 3 }).withMessage('Vai trò không hợp lệ')
  ],

  update: [
    body('full_name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 }).withMessage('Họ tên phải từ 2-100 ký tự'),
    
    body('phone')
      .optional()
      .matches(/^[0-9]{10,11}$/).withMessage('Số điện thoại không hợp lệ'),
    
    body('status')
      .optional()
      .isIn(['active', 'inactive', 'banned']).withMessage('Trạng thái không hợp lệ'),
    
    body('role_id')
      .optional()
      .isInt({ min: 1, max: 3 }).withMessage('Vai trò không hợp lệ')
  ]
};

module.exports = userValidators;