const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const categoryController = require('../controllers/categoryController');
const auth = require('../middlewares/auth');
const { isAdmin } = require('../middlewares/roleCheck');
const validate = require('../middlewares/validator');

// Public routes
router.get('/', categoryController.getAllCategories);
router.get('/with-course-count', categoryController.getCategoriesWithCourseCount);
router.get('/:id', categoryController.getCategoryById);

// Admin routes
const createCategoryValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Tên danh mục không được để trống')
    .isLength({ min: 2, max: 100 }).withMessage('Tên danh mục phải từ 2-100 ký tự')
];

router.post('/', auth, isAdmin, createCategoryValidation, validate, categoryController.createCategory);
router.put('/:id', auth, isAdmin, categoryController.updateCategory);
router.delete('/:id', auth, isAdmin, categoryController.deleteCategory);

module.exports = router;