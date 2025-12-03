const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const Lesson = require('../models/Lesson');
const ResponseHandler = require('../utils/responseHandler');
const asyncHandler = require('../middlewares/asyncHandler');
const auth = require('../middlewares/auth');
const { isAdmin } = require('../middlewares/roleCheck');
const validate = require('../middlewares/validator');

// Get lessons by course ID
router.get('/course/:courseId', asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const lessons = await Lesson.getByCourseId(courseId);
  return ResponseHandler.success(res, lessons);
}));

// Get lesson by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const lesson = await Lesson.findById(id);
  
  if (!lesson) {
    return ResponseHandler.notFound(res, 'Lesson not found');
  }
  
  return ResponseHandler.success(res, lesson);
}));

// Create lesson (Admin)
const createLessonValidation = [
  body('course_id')
    .notEmpty().withMessage('Course ID không được để trống')
    .isInt().withMessage('Course ID không hợp lệ'),
  body('title')
    .trim()
    .notEmpty().withMessage('Tiêu đề không được để trống')
    .isLength({ min: 3, max: 500 }).withMessage('Tiêu đề phải từ 3-500 ký tự'),
  body('video_url')
    .notEmpty().withMessage('URL video không được để trống')
    .isURL().withMessage('URL video không hợp lệ'),
  body('order_index')
    .notEmpty().withMessage('Thứ tự không được để trống')
    .isInt({ min: 0 }).withMessage('Thứ tự phải là số nguyên dương')
];

router.post('/', auth, isAdmin, createLessonValidation, validate, asyncHandler(async (req, res) => {
  const lessonId = await Lesson.create(req.body);
  const lesson = await Lesson.findById(lessonId);
  return ResponseHandler.created(res, lesson, 'Lesson created successfully');
}));

// Update lesson (Admin)
router.put('/:id', auth, isAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const lesson = await Lesson.findById(id);
  if (!lesson) {
    return ResponseHandler.notFound(res, 'Lesson not found');
  }
  
  const updatedLesson = await Lesson.update(id, req.body);
  return ResponseHandler.success(res, updatedLesson, 'Lesson updated successfully');
}));

// Delete lesson (Admin)
router.delete('/:id', auth, isAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const lesson = await Lesson.findById(id);
  if (!lesson) {
    return ResponseHandler.notFound(res, 'Lesson not found');
  }
  
  await Lesson.delete(id);
  return ResponseHandler.success(res, null, 'Lesson deleted successfully');
}));

// Reorder lessons (Admin)
router.post('/reorder', auth, isAdmin, asyncHandler(async (req, res) => {
  const { course_id, lesson_orders } = req.body;
  
  if (!course_id || !lesson_orders || !Array.isArray(lesson_orders)) {
    return ResponseHandler.badRequest(res, 'Invalid request data');
  }
  
  await Lesson.reorder(course_id, lesson_orders);
  return ResponseHandler.success(res, null, 'Lessons reordered successfully');
}));

module.exports = router;
