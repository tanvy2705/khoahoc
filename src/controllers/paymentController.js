const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Cart = require('../models/Cart');
const Enrollment = require('../models/Enrollment');
const Promotion = require('../models/Promotion');
const Course = require('../models/Course');
const ResponseHandler = require('../utils/responseHandler');
const asyncHandler = require('../middlewares/asyncHandler');
const momoService = require('../services/momoService');
const notificationService = require('../services/notificationService');
const { PAYMENT_METHODS } = require('../utils/constants');

class PaymentController {
  // Create order from cart
  createOrder = asyncHandler(async (req, res) => {
    const { promotion_code } = req.body;

    // Get cart items
    const cartItems = await Cart.getUserCart(req.user.id);
    
    if (!cartItems || cartItems.length === 0) {
      return ResponseHandler.badRequest(res, 'Cart is empty');
    }

    // Calculate total
    let totalAmount = 0;
    const orderItems = [];

    for (const item of cartItems) {
      const price = parseFloat(item.discount_price || item.price);
      totalAmount += price;
      
      orderItems.push({
        course_id: item.course_id,
        price: item.price,
        discount_price: item.discount_price
      });
    }

    // Apply promotion
    let discountAmount = 0;
    let promotionId = null;

    if (promotion_code) {
      try {
        const promotion = await Promotion.validate(promotion_code, req.user.id, totalAmount);
        discountAmount = Promotion.calculateDiscount(promotion, totalAmount);
        promotionId = promotion.id;
      } catch (error) {
        return ResponseHandler.badRequest(res, error.message);
      }
    }

    const finalAmount = totalAmount - discountAmount;

    // Create order
    const { orderId, orderCode } = await Order.create({
      user_id: req.user.id,
      total_amount: totalAmount,
      discount_amount: discountAmount,
      final_amount: finalAmount,
      promotion_id: promotionId,
      payment_method: 'momo',
      items: orderItems
    });

    // Record promotion usage
    if (promotionId) {
      await Promotion.recordUsage(promotionId, req.user.id, orderId, discountAmount);
    }

    return ResponseHandler.created(res, {
      order_id: orderId,
      order_code: orderCode,
      total_amount: totalAmount,
      discount_amount: discountAmount,
      final_amount: finalAmount
    }, 'Order created successfully');
  });

  // Get orders
  getOrders = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status } = req.query;
    const pagination = require('../utils/helpers').getPagination(page, limit);

    let orders;
    let total;

    if (req.user.role_id === 1) { // Admin
      orders = await Order.getAll({ ...pagination, status });
      total = await Order.count({ status });
    } else {
      orders = await Order.getUserOrders(req.user.id, { ...pagination, status });
      total = await Order.count({ user_id: req.user.id, status });
    }

    return ResponseHandler.paginated(res, orders, {
      page: pagination.page,
      limit: pagination.limit,
      total
    });
  });

  // Get order by ID
  getOrderById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const order = await Order.findById(id);
    
    if (!order) {
      return ResponseHandler.notFound(res, 'Order not found');
    }

    // Check authorization
    if (req.user.role_id !== 1 && order.user_id !== req.user.id) {
      return ResponseHandler.forbidden(res, 'You do not have permission to view this order');
    }

    const items = await Order.getItems(id);

    return ResponseHandler.success(res, {
      ...order,
      items
    });
  });

  // Create payment URL (MoMo)
  createPaymentUrl = asyncHandler(async (req, res) => {
    const { order_id, payment_method } = req.body;

    const order = await Order.findById(order_id);
    
    if (!order) {
      return ResponseHandler.notFound(res, 'Order not found');
    }

    // Check authorization
    if (order.user_id !== req.user.id) {
      return ResponseHandler.forbidden(res, 'You do not have permission to pay for this order');
    }

    if (order.payment_status === 'paid') {
      return ResponseHandler.conflict(res, 'Order already paid');
    }

    if (payment_method === PAYMENT_METHODS.MOMO) {
      // Create MoMo payment
      const paymentUrl = await momoService.createPayment({
        orderId: order.order_code,
        amount: order.final_amount,
        orderInfo: `Payment for order ${order.order_code}`
      });

      // Create payment record
      await Payment.create({
        order_id: order.id,
        transaction_code: order.order_code,
        payment_method: PAYMENT_METHODS.MOMO,
        amount: order.final_amount,
        status: 'pending'
      });

      return ResponseHandler.success(res, { payment_url: paymentUrl });
    }

    if (payment_method === PAYMENT_METHODS.MANUAL_TRANSFER) {
      // Return manual transfer info
      return ResponseHandler.success(res, {
        payment_method: PAYMENT_METHODS.MANUAL_TRANSFER,
        transfer_info: {
          phone: process.env.MOMO_PHONE,
          name: process.env.MOMO_NAME,
          qr_code: process.env.MOMO_QR_CODE,
          amount: order.final_amount,
          order_code: order.order_code,
          note: `Transfer for order ${order.order_code}`
        }
      });
    }

    return ResponseHandler.badRequest(res, 'Invalid payment method');
  });

  // MoMo callback (webhook)
  handleMoMoCallback = asyncHandler(async (req, res) => {
    const callbackData = req.body;

    // Verify signature
    const isValid = momoService.verifySignature(callbackData);
    if (!isValid) {
      return ResponseHandler.badRequest(res, 'Invalid signature');
    }

    const { orderId, resultCode, transId } = callbackData;

    // Find order
    const order = await Order.findByCode(orderId);
    if (!order) {
      return ResponseHandler.notFound(res, 'Order not found');
    }

    // Find payment
    const payment = await Payment.findByOrderId(order.id);

    if (resultCode === 0) {
      // Payment successful
      await Payment.updateStatus(payment.id, 'success', new Date());
      await Payment.saveMoMoDetails(payment.id, callbackData);
      await Order.updatePaymentStatus(order.id, 'paid');
      await Order.updateStatus(order.id, 'confirmed');

      // Enroll user in courses
      const orderItems = await Order.getItems(order.id);
      for (const item of orderItems) {
        await Enrollment.create(order.user_id, item.course_id);
        await Course.updateStudentCount(item.course_id);
      }

      // Clear cart
      await Cart.clear(order.user_id);

      // Send notification
      await notificationService.sendPaymentSuccessNotification(order.user_id, order);

      return ResponseHandler.success(res, null, 'Payment processed successfully');
    } else {
      // Payment failed
      await Payment.updateStatus(payment.id, 'failed');
      await Payment.saveMoMoDetails(payment.id, callbackData);
      await Order.updatePaymentStatus(order.id, 'failed');

      // Send notification
      await notificationService.sendPaymentFailedNotification(order.user_id, order);

      return ResponseHandler.success(res, null, 'Payment failed');
    }
  });

  // Upload manual transfer bill
  uploadTransferBill = asyncHandler(async (req, res) => {
    const { order_id, transfer_phone, transfer_name } = req.body;

    if (!req.file) {
      return ResponseHandler.badRequest(res, 'Bill image is required');
    }

    const order = await Order.findById(order_id);
    if (!order) {
      return ResponseHandler.notFound(res, 'Order not found');
    }

    if (order.user_id !== req.user.id) {
      return ResponseHandler.forbidden(res, 'You do not have permission');
    }

    const billImageUrl = `/uploads/bills/${req.file.filename}`;

    // Create or update payment
    let payment = await Payment.findByOrderId(order.id);
    
    if (!payment) {
      const paymentId = await Payment.create({
        order_id: order.id,
        transaction_code: order.order_code,
        payment_method: PAYMENT_METHODS.MANUAL_TRANSFER,
        amount: order.final_amount,
        status: 'pending'
      });
      payment = { id: paymentId };
    }

    await Payment.saveManualTransfer(payment.id, {
      phone: transfer_phone,
      name: transfer_name,
      bill_image: billImageUrl
    });

    await Order.updatePaymentStatus(order.id, 'pending');

    // Notify admin
    await notificationService.notifyAdminNewManualTransfer(order);

    return ResponseHandler.success(res, {
      bill_image: billImageUrl
    }, 'Bill uploaded successfully. Waiting for verification');
  });

  // Verify manual transfer (Admin/Staff)
  verifyManualTransfer = asyncHandler(async (req, res) => {
    const { payment_id, approved } = req.body;

    const payment = await Payment.findById(payment_id);
    if (!payment) {
      return ResponseHandler.notFound(res, 'Payment not found');
    }

    const order = await Order.findById(payment.order_id);

    if (approved) {
      await Payment.verifyManualTransfer(payment.id, req.user.id);
      await Order.updatePaymentStatus(order.id, 'paid');
      await Order.updateStatus(order.id, 'confirmed');

      // Enroll user in courses
      const orderItems = await Order.getItems(order.id);
      for (const item of orderItems) {
        await Enrollment.create(order.user_id, item.course_id);
        await Course.updateStudentCount(item.course_id);
      }

      // Clear cart
      await Cart.clear(order.user_id);

      // Send notification
      await notificationService.sendPaymentSuccessNotification(order.user_id, order);

      return ResponseHandler.success(res, null, 'Payment verified successfully');
    } else {
      await Payment.updateStatus(payment.id, 'failed');
      await Order.updatePaymentStatus(order.id, 'failed');

      // Send notification
      await notificationService.sendPaymentRejectedNotification(order.user_id, order);

      return ResponseHandler.success(res, null, 'Payment rejected');
    }
  });

  // Get payment history
  getPaymentHistory = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const pagination = require('../utils/helpers').getPagination(page, limit);

    const history = await Payment.getUserHistory(req.user.id, pagination);

    return ResponseHandler.success(res, history);
  });

  // Get all payments (Admin)
  getAllPayments = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status, payment_method } = req.query;
    const pagination = require('../utils/helpers').getPagination(page, limit);

    const payments = await Payment.getAll({
      ...pagination,
      status,
      payment_method
    });

    return ResponseHandler.success(res, payments);
  });

  // Get pending manual transfers (Admin/Staff)
  getPendingManualTransfers = asyncHandler(async (req, res) => {
    const pendingTransfers = await Payment.getPendingManualTransfers();
    return ResponseHandler.success(res, pendingTransfers);
  });
}

module.exports = new PaymentController();