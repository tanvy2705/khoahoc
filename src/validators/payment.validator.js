const { body } = require('express-validator');

const paymentValidators = {
  createOrder: [
    body('promotion_code')
      .optional()
      .trim()
      .isLength({ min: 3, max: 50 }).withMessage('Mã khuyến mãi không hợp lệ')
  ],

  createPaymentUrl: [
    body('order_id')
      .notEmpty().withMessage('Order ID không được để trống')
      .isInt().withMessage('Order ID không hợp lệ'),
    
    body('payment_method')
      .notEmpty().withMessage('Phương thức thanh toán không được để trống')
      .isIn(['momo', 'manual_transfer', 'vnpay', 'paypal']).withMessage('Phương thức thanh toán không hợp lệ')
  ],

  uploadTransferBill: [
    body('order_id')
      .notEmpty().withMessage('Order ID không được để trống')
      .isInt().withMessage('Order ID không hợp lệ'),
    
    body('transfer_phone')
      .notEmpty().withMessage('Số điện thoại không được để trống')
      .matches(/^[0-9]{10,11}$/).withMessage('Số điện thoại không hợp lệ'),
    
    body('transfer_name')
      .trim()
      .notEmpty().withMessage('Tên người chuyển không được để trống')
  ],

  verifyTransfer: [
    body('payment_id')
      .notEmpty().withMessage('Payment ID không được để trống')
      .isInt().withMessage('Payment ID không hợp lệ'),
    
    body('approved')
      .notEmpty().withMessage('Trạng thái duyệt không được để trống')
      .isBoolean().withMessage('Trạng thái duyệt phải là true/false')
  ]
};

module.exports = paymentValidators;