const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Promotion = require('../models/Promotion');
const ResponseHandler = require('../utils/responseHandler');
const asyncHandler = require('../middlewares/asyncHandler');
const Helpers = require('../utils/helpers');

class OrderController {
  // Create order from cart
  createOrder = asyncHandler(async (req, res) => {
    const { promotion_code } = req.body;
    
    console.log('🛒 Creating order for user:', req.user.id);
    console.log('🎟️ Promotion code:', promotion_code || 'None');
    
    // Get cart items with prices
    const cartItems = await Cart.getUserCart(req.user.id);
    
    console.log('📦 Cart items count:', cartItems.length);
    
    if (!cartItems || cartItems.length === 0) {
      console.log('❌ Cart is empty');
      return ResponseHandler.badRequest(res, 'Cart is empty');
    }
    
    // Log each item for debugging
    cartItems.forEach((item, index) => {
      console.log(`📚 Item ${index + 1}:`, {
        course_id: item.course_id,
        title: item.course.title,
        price: item.course.price,
        discount_price: item.course.discount_price,
        has_price: !!item.course.price,
        has_discount: !!item.course.discount_price
      });
    });
    
    // Calculate total and prepare order items
    let totalAmount = 0;
    const orderItems = [];
    
    for (const item of cartItems) {
      // ✅ FIX: Đọc price từ item.course (nested structure)
      const originalPrice = parseFloat(item.course.price);
      const discountPrice = item.course.discount_price ? parseFloat(item.course.discount_price) : null;
      
      // Validate price
      if (!originalPrice || originalPrice <= 0 || isNaN(originalPrice)) {
        console.warn(`⚠️ Invalid price for course ${item.course_id} (${item.course.title}):`, {
          originalPrice,
          discountPrice
        });
        continue; // Skip invalid items
      }
      
      // Use discount price if available, otherwise use original price
      const actualPrice = discountPrice || originalPrice;
      totalAmount += actualPrice;
      
      console.log(`✅ Valid item added:`, {
        course_id: item.course_id,
        originalPrice,
        discountPrice,
        actualPrice
      });
      
      orderItems.push({
        course_id: item.course_id,
        price: originalPrice,
        discount_price: discountPrice
      });
    }
    
    console.log('💰 Order items prepared:', {
      count: orderItems.length,
      totalAmount
    });
    
    // Double check after filtering
    if (orderItems.length === 0) {
      console.log('❌ No valid items in cart after filtering');
      return ResponseHandler.badRequest(res, 'No valid items in cart');
    }
    
    // Apply promotion
    let discountAmount = 0;
    let promotionId = null;
    
    if (promotion_code) {
      try {
        console.log('🎟️ Validating promotion code...');
        const promotion = await Promotion.validate(promotion_code, req.user.id, totalAmount);
        discountAmount = Promotion.calculateDiscount(promotion, totalAmount);
        promotionId = promotion.id;
        console.log('✅ Promotion applied:', {
          code: promotion_code,
          discount_percent: promotion.discount_percent,
          discountAmount
        });
      } catch (error) {
        console.error('❌ Promotion validation failed:', error.message);
        return ResponseHandler.badRequest(res, error.message);
      }
    }
    
    const finalAmount = totalAmount - discountAmount;
    
    console.log('📝 Creating order with data:', {
      user_id: req.user.id,
      total_amount: totalAmount,
      discount_amount: discountAmount,
      final_amount: finalAmount,
      promotion_id: promotionId,
      items_count: orderItems.length
    });
    
    try {
      // Create order
      const { orderId, orderCode } = await Order.create({
        user_id: req.user.id,
        total_amount: totalAmount,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        promotion_id: promotionId,
        payment_method: 'pending',
        items: orderItems
      });
      
      console.log('✅ Order created successfully:', { orderId, orderCode });
      
      // Record promotion usage
      if (promotionId) {
        await Promotion.recordUsage(promotionId, req.user.id, orderId, discountAmount);
        console.log('✅ Promotion usage recorded');
      }
      
      // ✅ FIX: Đổi clearCart → clear
      await Cart.clear(req.user.id);
      console.log('🧹 Cart cleared');
      
      return ResponseHandler.created(res, {
        order_id: orderId,
        order_code: orderCode,
        total_amount: totalAmount,
        discount_amount: discountAmount,
        final_amount: finalAmount
      }, 'Order created successfully');
      
    } catch (error) {
      console.error('❌ Error creating order:', error);
      throw error;
    }
  });

  // Get all orders
  getOrders = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status, payment_status } = req.query;
    const pagination = Helpers.getPagination(page, limit);
    
    let orders;
    let total;
    
    const filters = { 
      ...pagination, 
      status,
      payment_status
    };
    
    if (req.user.role_id === 1) { // Admin
      orders = await Order.getAll(filters);
      total = await Order.count({ status, payment_status });
    } else {
      orders = await Order.getUserOrders(req.user.id, filters);
      total = await Order.count({ 
        user_id: req.user.id, 
        status,
        payment_status
      });
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
      return ResponseHandler.forbidden(res, 'You do not have permission');
    }
    
    const items = await Order.getItems(id);
    
    return ResponseHandler.success(res, {
      ...order,
      items
    });
  });

  // Cancel order
  cancelOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const order = await Order.findById(id);
    
    if (!order) {
      return ResponseHandler.notFound(res, 'Order not found');
    }
    
    if (order.user_id !== req.user.id) {
      return ResponseHandler.forbidden(res, 'You do not have permission');
    }
    
    if (order.payment_status === 'paid') {
      return ResponseHandler.conflict(res, 'Cannot cancel paid order');
    }
    
    await Order.updateStatus(id, 'cancelled');
    
    return ResponseHandler.success(res, null, 'Order cancelled successfully');
  });

  // Admin: Update order status
  updateOrderStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['pending', 'processing', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return ResponseHandler.badRequest(res, 'Invalid status');
    }
    
    const order = await Order.findById(id);
    
    if (!order) {
      return ResponseHandler.notFound(res, 'Order not found');
    }
    
    await Order.updateStatus(id, status);
    
    return ResponseHandler.success(res, null, 'Order status updated successfully');
  });

  // Admin: Update payment status
  updatePaymentStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { payment_status } = req.body;
    
    // Validate payment status
    const validStatuses = ['pending', 'paid', 'failed', 'refunded'];
    if (!validStatuses.includes(payment_status)) {
      return ResponseHandler.badRequest(res, 'Invalid payment status');
    }
    
    const order = await Order.findById(id);
    
    if (!order) {
      return ResponseHandler.notFound(res, 'Order not found');
    }
    
    await Order.updatePaymentStatus(id, payment_status);
    
    return ResponseHandler.success(res, null, 'Payment status updated successfully');
  });
}

module.exports = new OrderController();