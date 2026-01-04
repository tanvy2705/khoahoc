const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController'); // ✅ ĐỔI: từ paymentController sang orderController
const auth = require('../middlewares/auth');

// All order routes require authentication
router.use(auth);

// User routes
router.post('/', orderController.createOrder); // ✅ Tạo order từ cart
router.get('/', orderController.getOrders); // ✅ Lấy danh sách orders
router.get('/:id', orderController.getOrderById); // ✅ Lấy chi tiết order
router.put('/:id/cancel', orderController.cancelOrder); // ✅ Hủy order

// Admin routes (nếu cần, uncomment khi có middleware checkRole)
// router.put('/:id/status', checkRole([1]), orderController.updateOrderStatus);
// router.put('/:id/payment-status', checkRole([1]), orderController.updatePaymentStatus);

module.exports = router;