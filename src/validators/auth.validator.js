const { body } = require('express-validator');

const authValidators = {
  register: [
    body('full_name')
      .trim()
      .notEmpty().withMessage('Họ tên không được để trống')
      .isLength({ min: 2, max: 100 }).withMessage('Họ tên phải từ 2-100 ký tự'),
    
    body('email')
      .trim()
      .notEmpty().withMessage('Email không được để trống')
      .isEmail().withMessage('Email không hợp lệ')
      .normalizeEmail(),
    
    body('password')
      .notEmpty().withMessage('Mật khẩu không được để trống')
      .isLength({ min: 6 }).withMessage('Mật khẩu phải có ít nhất 6 ký tự')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Mật khẩu phải chứa chữ hoa, chữ thường và số')
  ],

  login: [
    body('email')
      .trim()
      .notEmpty().withMessage('Email không được để trống')
      .isEmail().withMessage('Email không hợp lệ'),
    
    body('password')
      .notEmpty().withMessage('Mật khẩu không được để trống')
  ],

  forgotPassword: [
    body('email')
      .trim()
      .notEmpty().withMessage('Email không được để trống')
      .isEmail().withMessage('Email không hợp lệ')
  ],

  resetPassword: [
    body('token')
      .notEmpty().withMessage('Token không được để trống'),
    
    body('new_password')
      .notEmpty().withMessage('Mật khẩu mới không được để trống')
      .isLength({ min: 6 }).withMessage('Mật khẩu phải có ít nhất 6 ký tự')
  ],

  changePassword: [
    body('current_password')
      .notEmpty().withMessage('Mật khẩu hiện tại không được để trống'),
    
    body('new_password')
      .notEmpty().withMessage('Mật khẩu mới không được để trống')
      .isLength({ min: 6 }).withMessage('Mật khẩu phải có ít nhất 6 ký tự')
      .custom((value, { req }) => {
        if (value === req.body.current_password) {
          throw new Error('Mật khẩu mới phải khác mật khẩu hiện tại');
        }
        return true;
      })
  ],

  updateProfile: [
    body('full_name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 }).withMessage('Họ tên phải từ 2-100 ký tự'),
    
    body('phone')
      .optional()
      .matches(/^[0-9]{10,11}$/).withMessage('Số điện thoại không hợp lệ')
  ]
};

module.exports = authValidators;
