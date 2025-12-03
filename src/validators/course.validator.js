const { body, param } = require('express-validator');

const courseValidators = {
  create: [
    body('title')
      .trim()
      .notEmpty().withMessage('Tiêu đề không được để trống')
      .isLength({ min: 5, max: 500 }).withMessage('Tiêu đề phải từ 5-500 ký tự'),
    
    body('description')
      .trim()
      .notEmpty().withMessage('Mô tả không được để trống'),
    
    body('category_id')
      .notEmpty().withMessage('Danh mục không được để trống')
      .isInt().withMessage('Danh mục không hợp lệ'),
    
    body('price')
      .notEmpty().withMessage('Giá không được để trống')
      .isFloat({ min: 0 }).withMessage('Giá phải là số dương'),
    
    body('discount_price')
      .optional()
      .isFloat({ min: 0 }).withMessage('Giá giảm phải là số dương')
      .custom((value, { req }) => {
        if (value && parseFloat(value) >= parseFloat(req.body.price)) {
          throw new Error('Giá giảm phải nhỏ hơn giá gốc');
        }
        return true;
      }),
    
    body('level')
      .optional()
      .isIn(['beginner', 'intermediate', 'advanced']).withMessage('Level không hợp lệ'),
    
    body('duration')
      .optional()
      .isInt({ min: 0 }).withMessage('Thời lượng phải là số nguyên dương')
  ],

  update: [
    body('title')
      .optional()
      .trim()
      .isLength({ min: 5, max: 500 }).withMessage('Tiêu đề phải từ 5-500 ký tự'),
    
    body('price')
      .optional()
      .isFloat({ min: 0 }).withMessage('Giá phải là số dương'),
    
    body('discount_price')
      .optional()
      .isFloat({ min: 0 }).withMessage('Giá giảm phải là số dương'),
    
    body('level')
      .optional()
      .isIn(['beginner', 'intermediate', 'advanced']).withMessage('Level không hợp lệ'),
    
    body('status')
      .optional()
      .isIn(['draft', 'active', 'inactive']).withMessage('Status không hợp lệ')
  ],

  id: [
    param('id')
      .isInt().withMessage('ID không hợp lệ')
  ]
};

module.exports = courseValidators;