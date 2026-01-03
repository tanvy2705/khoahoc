const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Cart = require('../models/Cart');
const Enrollment = require('../models/Enrollment');
const Promotion = require('../models/Promotion');
const Course = require('../models/Course');
const ResponseHandler = require('../utils/responseHandler');
const asyncHandler = require('../middlewares/asyncHandler');
const momoService = require('../services/momoService');
const vnpayService = require('../services/vnpayService');
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

  // Create payment URL
  createPaymentUrl = asyncHandler(async (req, res) => {
    const { order_id, payment_method } = req.body;

    const order = await Order.findById(order_id);
    
    if (!order) {
      return ResponseHandler.notFound(res, 'Order not found');
    }

    if (order.user_id !== req.user.id) {
      return ResponseHandler.forbidden(res, 'You do not have permission to pay for this order');
    }

    if (order.payment_status === 'paid') {
      return ResponseHandler.conflict(res, 'Order already paid');
    }

    // Convert IPv6 to IPv4
    let ipAddr = req.headers['x-forwarded-for'] || 
                 req.connection.remoteAddress || 
                 req.socket.remoteAddress ||
                 req.ip ||
                 '127.0.0.1';

    if (ipAddr === '::1' || ipAddr === '::ffff:127.0.0.1') {
      ipAddr = '127.0.0.1';
    }

    if (ipAddr.startsWith('::ffff:')) {
      ipAddr = ipAddr.substring(7);
    }

    console.log('🌐 Client IP (fixed):', ipAddr);

    // Handle VNPay payment
    if (payment_method === PAYMENT_METHODS.VNPAY || payment_method === 'VNPAY' || payment_method === 'vnpay') {
      const paymentUrl = await vnpayService.createPayment({
        orderId: order.order_code,
        amount: order.final_amount,
        orderInfo: `Thanh toan don hang ${order.order_code}`
      }, ipAddr);

      await Payment.create({
        order_id: order.id,
        transaction_code: order.order_code,
        payment_method: 'vnpay',
        amount: order.final_amount,
        status: 'pending'
      });

      return ResponseHandler.success(res, { payment_url: paymentUrl });
    }

    // Handle MoMo payment
    if (payment_method === PAYMENT_METHODS.MOMO) {
      const paymentUrl = await momoService.createPayment({
        orderId: order.order_code,
        amount: order.final_amount,
        orderInfo: `Payment for order ${order.order_code}`
      });

      await Payment.create({
        order_id: order.id,
        transaction_code: order.order_code,
        payment_method: PAYMENT_METHODS.MOMO,
        amount: order.final_amount,
        status: 'pending'
      });

      return ResponseHandler.success(res, { payment_url: paymentUrl });
    }

    // Handle Manual Transfer
    if (payment_method === PAYMENT_METHODS.MANUAL_TRANSFER) {
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

      // Enroll user in courses with error handling
      console.log('🎓 MoMo: Starting enrollment process...');
      const orderItems = await Order.getItems(order.id);
      
      for (const item of orderItems) {
        try {
          const isEnrolled = await Enrollment.isEnrolled(order.user_id, item.course_id);
          if (!isEnrolled) {
            await Enrollment.create(order.user_id, item.course_id);
            await Course.updateStudentCount(item.course_id);
            console.log(`✅ MoMo: Enrolled course ${item.course_id}`);
          }
        } catch (enrollError) {
          console.error(`❌ MoMo: Error enrolling course ${item.course_id}:`, enrollError.message);
        }
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

  // VNPay return URL handler
  handleVNPayReturn = asyncHandler(async (req, res) => {
    try {
      const vnpayData = req.query;

      // Verify signature
      const isValid = vnpayService.verifySignature(vnpayData);
      if (!isValid) {
        console.log('❌ Invalid VNPay signature');
        return res.redirect(`${process.env.FRONTEND_URL}/payment-failed?error=invalid_signature`);
      }

      // Parse return data
      const paymentResult = vnpayService.parseReturnData(vnpayData);
      
      console.log('✅ VNPay return data:', paymentResult);

      // Find order
      const order = await Order.findByCode(paymentResult.orderId);
      if (!order) {
        console.log('❌ Order not found:', paymentResult.orderId);
        return res.redirect(`${process.env.FRONTEND_URL}/payment-failed?error=order_not_found`);
      }

      // Find payment
      const payment = await Payment.findByOrderId(order.id);

      if (paymentResult.isSuccess) {
        // Payment successful
        console.log('✅ Payment successful:', {
          orderId: paymentResult.orderId,
          amount: paymentResult.amount,
          transactionNo: paymentResult.transactionNo
        });

        await Payment.updateStatus(payment.id, 'success', new Date());
        
        // Save VNPay details
        if (Payment.saveVNPayDetails) {
          await Payment.saveVNPayDetails(payment.id, paymentResult.rawData);
        }

        await Order.updatePaymentStatus(order.id, 'paid');
        await Order.updateStatus(order.id, 'confirmed');

        // ⭐ ENROLL USER IN COURSES - WITH BETTER ERROR HANDLING
        console.log('🎓 Starting enrollment process...');
        const orderItems = await Order.getItems(order.id);
        console.log(`📚 Found ${orderItems.length} courses to enroll`);
        
        for (const item of orderItems) {
          try {
            // Kiểm tra xem đã enroll chưa
            const isEnrolled = await Enrollment.isEnrolled(order.user_id, item.course_id);
            
            if (isEnrolled) {
              console.log(`✅ User already enrolled in course ${item.course_id} (${item.course_title})`);
              continue;
            }
            
            // Tạo enrollment mới
            await Enrollment.create(order.user_id, item.course_id);
            console.log(`✅ Enrolled user ${order.user_id} in course ${item.course_id} (${item.course_title})`);
            
            // Update student count
            await Course.updateStudentCount(item.course_id);
            console.log(`✅ Updated student count for course ${item.course_id}`);
            
          } catch (enrollError) {
            // Log lỗi nhưng không dừng process
            console.error(`❌ Error enrolling course ${item.course_id}:`, enrollError.message);
          }
        }
        console.log('🎉 Enrollment process completed');

        // Clear cart
        await Cart.clear(order.user_id);
        console.log('🧹 Cart cleared');

        // Send notification
        try {
          await notificationService.sendPaymentSuccessNotification(order.user_id, order);
          console.log('📧 Success notification sent');
        } catch (notifError) {
          console.error('Email error:', notifError);
        }

        // Redirect to success page
        return res.redirect(
          `${process.env.FRONTEND_URL}/payment-success?orderId=${paymentResult.orderId}&amount=${paymentResult.amount}&transactionNo=${paymentResult.transactionNo}`
        );
      } else {
        // Payment failed
        console.log('❌ Payment failed:', {
          orderId: paymentResult.orderId,
          responseCode: paymentResult.responseCode,
          message: paymentResult.message
        });

        await Payment.updateStatus(payment.id, 'failed');
        
        if (Payment.saveVNPayDetails) {
          await Payment.saveVNPayDetails(payment.id, paymentResult.rawData);
        }

        await Order.updatePaymentStatus(order.id, 'failed');

        // Send notification
        try {
          await notificationService.sendPaymentFailedNotification(order.user_id, order);
        } catch (notifError) {
          console.error('Email error:', notifError);
        }

        // Redirect to failed page
        return res.redirect(
          `${process.env.FRONTEND_URL}/payment-failed?orderId=${paymentResult.orderId}&code=${paymentResult.responseCode}&message=${encodeURIComponent(paymentResult.message)}`
        );
      }
    } catch (error) {
      console.error('❌ Error processing VNPay return:', error);
      return res.redirect(`${process.env.FRONTEND_URL}/payment-failed?error=server_error`);
    }
  });

  // VNPay IPN (Instant Payment Notification) handler
  handleVNPayIPN = asyncHandler(async (req, res) => {
    try {
      const vnpayData = req.query;

      // Verify signature
      const isValid = vnpayService.verifySignature(vnpayData);
      if (!isValid) {
        return res.json({ RspCode: '97', Message: 'Invalid signature' });
      }

      // Parse data
      const paymentResult = vnpayService.parseReturnData(vnpayData);

      // Find order
      const order = await Order.findByCode(paymentResult.orderId);
      if (!order) {
        return res.json({ RspCode: '01', Message: 'Order not found' });
      }

      // Check if order is already paid
      if (order.payment_status === 'paid') {
        return res.json({ RspCode: '02', Message: 'Order already confirmed' });
      }

      // Find payment
      const payment = await Payment.findByOrderId(order.id);

      if (paymentResult.isSuccess) {
        // Update payment and order status
        await Payment.updateStatus(payment.id, 'success', new Date());
        await Order.updatePaymentStatus(order.id, 'paid');
        await Order.updateStatus(order.id, 'confirmed');

        // Process enrollment with error handling
        console.log('🎓 IPN: Starting enrollment process...');
        const orderItems = await Order.getItems(order.id);
        
        for (const item of orderItems) {
          try {
            const isEnrolled = await Enrollment.isEnrolled(order.user_id, item.course_id);
            if (!isEnrolled) {
              await Enrollment.create(order.user_id, item.course_id);
              await Course.updateStudentCount(item.course_id);
              console.log(`✅ IPN: Enrolled course ${item.course_id}`);
            }
          } catch (enrollError) {
            console.error(`❌ IPN: Error enrolling course ${item.course_id}:`, enrollError.message);
          }
        }

        return res.json({ RspCode: '00', Message: 'Success' });
      } else {
        // Payment failed
        await Payment.updateStatus(payment.id, 'failed');
        await Order.updatePaymentStatus(order.id, 'failed');

        return res.json({ RspCode: '00', Message: 'Confirmed' });
      }
    } catch (error) {
      console.error('❌ Error processing VNPay IPN:', error);
      return res.json({ RspCode: '99', Message: 'Unknown error' });
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

      // Enroll user in courses with error handling
      console.log('🎓 Manual Transfer: Starting enrollment process...');
      const orderItems = await Order.getItems(order.id);
      
      for (const item of orderItems) {
        try {
          const isEnrolled = await Enrollment.isEnrolled(order.user_id, item.course_id);
          if (!isEnrolled) {
            await Enrollment.create(order.user_id, item.course_id);
            await Course.updateStudentCount(item.course_id);
            console.log(`✅ Manual: Enrolled course ${item.course_id}`);
          }
        } catch (enrollError) {
          console.error(`❌ Manual: Error enrolling course ${item.course_id}:`, enrollError.message);
        }
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