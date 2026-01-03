const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const courseController = require('../controllers/courseController');
const auth = require('../middlewares/auth');
const { isAdmin, isAuthenticated } = require('../middlewares/roleCheck');
const { uploadSingle } = require('../middlewares/upload');
const validate = require('../middlewares/validator');

// Public routes
router.get('/', courseController.getAllCourses);
router.get('/categories', courseController.getCategories);
router.get('/category/:categoryId', courseController.getCoursesByCategory);

// ⚠️ QUAN TRỌNG: Các route cụ thể PHẢI đặt TRƯỚC route /:id
// Protected routes - User (ĐẶT TRƯỚC /:id)
router.get('/enrolled', auth, isAuthenticated, courseController.getEnrolledCourses);

// Route với dynamic ID (ĐẶT SAU các route cụ thể)
router.get('/:id', courseController.getCourseById);

// Các route khác với /:id
router.post('/:id/enroll', auth, isAuthenticated, courseController.enrollCourse);
router.get('/:id/progress', auth, isAuthenticated, courseController.getCourseProgress);
router.post('/:courseId/lessons/:lessonId/complete', auth, isAuthenticated, courseController.completeLesson);

// Protected routes - Admin
const createCourseValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('price').isNumeric().withMessage('Price must be a number'),
  body('category_id').isInt().withMessage('Category ID must be an integer')
];

router.post('/', auth, isAdmin, createCourseValidation, validate, courseController.createCourse);
router.put('/:id', auth, isAdmin, courseController.updateCourse);
router.delete('/:id', auth, isAdmin, courseController.deleteCourse);
router.post('/:id/thumbnail', auth, isAdmin, uploadSingle('thumbnail'), courseController.uploadThumbnail);

module.exports = router;