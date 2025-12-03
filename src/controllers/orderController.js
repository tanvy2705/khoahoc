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

  // Get all orders
  getOrders = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status } = req.query;
    const pagination = Helpers.getPagination(page, limit);
    
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
}

module.exports = new OrderController();