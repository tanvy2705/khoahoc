const { body } = require('express-validator');

const promotionValidators = {
  create: [
    body('code')
      .trim()
      .notEmpty().withMessage('Mã khuyến mãi không được để trống')
      .isLength({ min: 3, max: 50 }).withMessage('Mã khuyến mãi phải từ 3-50 ký tự')
      .matches(/^[A-Z0-9_-]+$/).withMessage('Mã khuyến mãi chỉ chứa chữ hoa, số, gạch dưới và gạch ngang'),
    
    body('name')
      .trim()
      .notEmpty().withMessage('Tên khuyến mãi không được để trống'),
    
    body('discount_type')
      .notEmpty().withMessage('Loại giảm giá không được để trống')
      .isIn(['percentage', 'fixed']).withMessage('Loại giảm giá không hợp lệ'),
    
    body('discount_value')
      .notEmpty().withMessage('Giá trị giảm không được để trống')
      .isFloat({ min: 0 }).withMessage('Giá trị giảm phải là số dương')
      .custom((value, { req }) => {
        if (req.body.discount_type === 'percentage' && parseFloat(value) > 100) {
          throw new Error('Giá trị giảm theo phần trăm không được vượt quá 100');
        }
        return true;
      }),
    
    body('start_date')
      .notEmpty().withMessage('Ngày bắt đầu không được để trống')
      .isISO8601().withMessage('Ngày bắt đầu không hợp lệ'),
    
    body('end_date')
      .notEmpty().withMessage('Ngày kết thúc không được để trống')
      .isISO8601().withMessage('Ngày kết thúc không hợp lệ')
      .custom((value, { req }) => {
        if (new Date(value) <= new Date(req.body.start_date)) {
          throw new Error('Ngày kết thúc phải sau ngày bắt đầu');
        }
        return true;
      }),
    
    body('min_order_value')
      .optional()
      .isFloat({ min: 0 }).withMessage('Giá trị đơn hàng tối thiểu phải là số dương')
  ]
};

module.exports = promotionValidators;
