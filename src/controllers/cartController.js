const Cart = require('../models/Cart');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const ResponseHandler = require('../utils/responseHandler');
const asyncHandler = require('../middlewares/asyncHandler');

class CartController {
  // Get user cart
  getCart = asyncHandler(async (req, res) => {
    const cart = await Cart.getUserCart(req.user.id);
    const total = await Cart.getTotal(req.user.id);

    return ResponseHandler.success(res, {
      items: cart,
      total
    });
  });

  // Add to cart
  addToCart = asyncHandler(async (req, res) => {
    const { course_id } = req.body;

    // Check if course exists
    const course = await Course.findById(course_id);
    if (!course) {
      return ResponseHandler.notFound(res, 'Course not found');
    }

    // Check if already enrolled
    const isEnrolled = await Enrollment.isEnrolled(req.user.id, course_id);
    if (isEnrolled) {
      return ResponseHandler.conflict(res, 'Already enrolled in this course');
    }

    try {
      await Cart.addItem(req.user.id, course_id);
      return ResponseHandler.created(res, null, 'Added to cart successfully');
    } catch (error) {
      return ResponseHandler.conflict(res, error.message);
    }
  });

  // Remove from cart
  removeFromCart = asyncHandler(async (req, res) => {
    const { itemId } = req.params;

    await Cart.removeItem(req.user.id, itemId);

    return ResponseHandler.success(res, null, 'Removed from cart successfully');
  });

  // Clear cart
  clearCart = asyncHandler(async (req, res) => {
    await Cart.clear(req.user.id);
    return ResponseHandler.success(res, null, 'Cart cleared successfully');
  });

  // Get cart count
  getCartCount = asyncHandler(async (req, res) => {
    const count = await Cart.getCount(req.user.id);
    return ResponseHandler.success(res, { count });
  });
}

module.exports = new CartController();