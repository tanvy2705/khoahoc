const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const Review = require('../models/Review');
const Enrollment = require('../models/Enrollment');
const ResponseHandler = require('../utils/responseHandler');
const asyncHandler = require('../middlewares/asyncHandler');
const auth = require('../middlewares/auth');
const { isStaffOrAdmin } = require('../middlewares/roleCheck');
const validate = require('../middlewares/validator');

// Get reviews for a course (Public)
router.get('/course/:courseId', asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { page = 1, limit = 10, status = 'approved' } = req.query;
  
  const pagination = require('../utils/helpers').getPagination(page, limit);
  
  const reviews = await Review.getByCourseId(courseId, {
    ...pagination,
    status
  });
  
  return ResponseHandler.success(res, reviews);
}));

// Get course rating stats (Public)
router.get('/course/:courseId/stats', asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const stats = await Review.getCourseRatingStats(courseId);
  return ResponseHandler.success(res, stats);
}));

// Get user's review for a course
router.get('/course/:courseId/my-review', auth, asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const review = await Review.getUserReview(req.user.id, courseId);
  
  if (!review) {
    return ResponseHandler.notFound(res, 'Review not found');
  }
  
  return ResponseHandler.success(res, review);
}));

// Create review
const createReviewValidation = [
  body('course_id')
    .notEmpty().withMessage('Course ID không được để trống')
    .isInt().withMessage('Course ID không hợp lệ'),
  body('rating')
    .notEmpty().withMessage('Đánh giá không được để trống')
    .isInt({ min: 1, max: 5 }).withMessage('Đánh giá phải từ 1-5 sao'),
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Nhận xét không được quá 1000 ký tự')
];

router.post('/', auth, createReviewValidation, validate, asyncHandler(async (req, res) => {
  const { course_id, rating, comment } = req.body;
  
  // Check if user is enrolled in the course
  const isEnrolled = await Enrollment.isEnrolled(req.user.id, course_id);
  if (!isEnrolled) {
    return ResponseHandler.forbidden(res, 'You must be enrolled in this course to review');
  }
  
  // Check if user already reviewed
  const existingReview = await Review.getUserReview(req.user.id, course_id);
  if (existingReview) {
    return ResponseHandler.conflict(res, 'You have already reviewed this course');
  }
  
  const reviewId = await Review.create({
    course_id,
    user_id: req.user.id,
    rating,
    comment
  });
  
  const review = await Review.findById(reviewId);
  return ResponseHandler.created(res, review, 'Review submitted successfully');
}));

// Update review
router.put('/:id', auth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;
  
  const review = await Review.findById(id);
  if (!review) {
    return ResponseHandler.notFound(res, 'Review not found');
  }
  
  if (review.user_id !== req.user.id) {
    return ResponseHandler.forbidden(res, 'You can only update your own review');
  }
  
  const updatedReview = await Review.update(id, { rating, comment, status: 'pending' });
  return ResponseHandler.success(res, updatedReview, 'Review updated successfully');
}));

// Delete review
router.delete('/:id', auth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const review = await Review.findById(id);
  if (!review) {
    return ResponseHandler.notFound(res, 'Review not found');
  }
  
  if (review.user_id !== req.user.id && req.user.role_id !== 1) {
    return ResponseHandler.forbidden(res, 'You do not have permission');
  }
  
  await Review.delete(id);
  return ResponseHandler.success(res, null, 'Review deleted successfully');
}));

// Approve/Reject review (Admin/Staff)
router.patch('/:id/status', auth, isStaffOrAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!['approved', 'rejected'].includes(status)) {
    return ResponseHandler.badRequest(res, 'Invalid status');
  }
  
  const review = await Review.findById(id);
  if (!review) {
    return ResponseHandler.notFound(res, 'Review not found');
  }
  
  await Review.update(id, { status });
  return ResponseHandler.success(res, null, `Review ${status} successfully`);
}));

module.exports = router;