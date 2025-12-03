const Promotion = require('../models/Promotion');
const ResponseHandler = require('../utils/responseHandler');
const asyncHandler = require('../middlewares/asyncHandler');
const Helpers = require('../utils/helpers');

class PromotionController {
  // Get all promotions
  getAllPromotions = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status } = req.query;
    const pagination = Helpers.getPagination(page, limit);

    const promotions = await Promotion.getAll({
      ...pagination,
      status
    });

    return ResponseHandler.success(res, promotions);
  });

  // Get active promotions
  getActivePromotions = asyncHandler(async (req, res) => {
    const promotions = await Promotion.getActive();
    return ResponseHandler.success(res, promotions);
  });

  // Get promotion by ID
  getPromotionById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const promotion = await Promotion.findById(id);
    
    if (!promotion) {
      return ResponseHandler.notFound(res, 'Promotion not found');
    }

    return ResponseHandler.success(res, promotion);
  });

  // Validate promotion code
  validatePromoCode = asyncHandler(async (req, res) => {
    const { code } = req.body;
    const { amount = 0 } = req.query;

    try {
      const promotion = await Promotion.validate(code, req.user.id, parseFloat(amount));
      const discount = Promotion.calculateDiscount(promotion, parseFloat(amount));

      return ResponseHandler.success(res, {
        valid: true,
        promotion: {
          id: promotion.id,
          code: promotion.code,
          name: promotion.name,
          discount_type: promotion.discount_type,
          discount_value: promotion.discount_value
        },
        discount_amount: discount
      });
    } catch (error) {
      return ResponseHandler.badRequest(res, error.message);
    }
  });

  // Create promotion (Admin)
  createPromotion = asyncHandler(async (req, res) => {
    const {
      code,
      name,
      description,
      discount_type,
      discount_value,
      max_discount,
      min_order_value,
      usage_limit,
      user_usage_limit,
      start_date,
      end_date
    } = req.body;

    // Check if code exists
    const existingPromotion = await Promotion.findByCode(code);
    if (existingPromotion) {
      return ResponseHandler.conflict(res, 'Promotion code already exists');
    }

    const promotionId = await Promotion.create({
      code,
      name,
      description,
      discount_type,
      discount_value,
      max_discount,
      min_order_value,
      usage_limit,
      user_usage_limit,
      start_date,
      end_date,
      created_by: req.user.id
    });

    const promotion = await Promotion.findById(promotionId);

    return ResponseHandler.created(res, promotion, 'Promotion created successfully');
  });

  // Update promotion (Admin)
  updatePromotion = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const promotion = await Promotion.findById(id);
    if (!promotion) {
      return ResponseHandler.notFound(res, 'Promotion not found');
    }

    await Promotion.update(id, req.body);

    const updatedPromotion = await Promotion.findById(id);

    return ResponseHandler.success(res, updatedPromotion, 'Promotion updated successfully');
  });

  // Delete promotion (Admin)
  deletePromotion = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const promotion = await Promotion.findById(id);
    if (!promotion) {
      return ResponseHandler.notFound(res, 'Promotion not found');
    }

    await Promotion.delete(id);

    return ResponseHandler.success(res, null, 'Promotion deleted successfully');
  });

  // Get promotion stats (Admin)
  getPromotionStats = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const stats = await Promotion.getStats(id);
    
    if (!stats) {
      return ResponseHandler.notFound(res, 'Promotion not found');
    }

    return ResponseHandler.success(res, stats);
  });
}

module.exports = new PromotionController();