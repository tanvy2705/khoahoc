const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const promotionController = require('../controllers/promotionController');
const auth = require('../middlewares/auth');
const { isAdmin } = require('../middlewares/roleCheck');
const validate = require('../middlewares/validator');

// Public/User routes
router.get('/active', promotionController.getActivePromotions);
router.post('/validate', auth, promotionController.validatePromoCode);

// Admin routes
router.get('/', auth, isAdmin, promotionController.getAllPromotions);
router.get('/:id', auth, isAdmin, promotionController.getPromotionById);
router.get('/:id/stats', auth, isAdmin, promotionController.getPromotionStats);

const createPromotionValidation = [
  body('code').trim().notEmpty().withMessage('Code is required'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('discount_type').isIn(['percentage', 'fixed']).withMessage('Invalid discount type'),
  body('discount_value').isNumeric().withMessage('Discount value must be a number'),
  body('start_date').isISO8601().withMessage('Invalid start date'),
  body('end_date').isISO8601().withMessage('Invalid end date')
];

router.post('/', auth, isAdmin, createPromotionValidation, validate, promotionController.createPromotion);
router.put('/:id', auth, isAdmin, promotionController.updatePromotion);
router.delete('/:id', auth, isAdmin, promotionController.deletePromotion);

module.exports = router;
