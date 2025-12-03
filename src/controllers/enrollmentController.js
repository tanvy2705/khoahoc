const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const ResponseHandler = require('../utils/responseHandler');
const asyncHandler = require('../middlewares/asyncHandler');

class EnrollmentController {
  // Get all enrollments (Admin/Staff)
  getAllEnrollments = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, course_id, status } = req.query;
    const pagination = require('../utils/helpers').getPagination(page, limit);
    
    const enrollments = await Enrollment.getAll({
      ...pagination,
      course_id,
      status
    });
    
    return ResponseHandler.success(res, enrollments);
  });

  // Get user enrollments
  getUserEnrollments = asyncHandler(async (req, res) => {
    const { status } = req.query;
    
    const enrollments = await Enrollment.getUserEnrollments(req.user.id, { status });
    
    return ResponseHandler.success(res, enrollments);
  });

  // Get enrollment details
  getEnrollmentById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const enrollment = await Enrollment.findById(id);
    
    if (!enrollment) {
      return ResponseHandler.notFound(res, 'Enrollment not found');
    }
    
    // Check authorization
    if (req.user.role_id === 3 && enrollment.user_id !== req.user.id) {
      return ResponseHandler.forbidden(res, 'You do not have permission');
    }
    
    const progress = await Enrollment.getProgress(id);
    
    return ResponseHandler.success(res, {
      ...enrollment,
      progress
    });
  });

  // Enroll in course
  enrollCourse = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    
    const course = await Course.findById(courseId);
    if (!course) {
      return ResponseHandler.notFound(res, 'Course not found');
    }
    
    try {
      const enrollmentId = await Enrollment.create(req.user.id, courseId);
      
      // Update course student count
      await Course.updateStudentCount(courseId);
      
      return ResponseHandler.created(res, { enrollment_id: enrollmentId }, 'Enrolled successfully');
    } catch (error) {
      return ResponseHandler.conflict(res, error.message);
    }
  });

  // Update lesson progress
  updateLessonProgress = asyncHandler(async (req, res) => {
    const { enrollmentId, lessonId } = req.params;
    const { completed = true } = req.body;
    
    const enrollment = await Enrollment.findById(enrollmentId);
    
    if (!enrollment) {
      return ResponseHandler.notFound(res, 'Enrollment not found');
    }
    
    if (enrollment.user_id !== req.user.id) {
      return ResponseHandler.forbidden(res, 'You do not have permission');
    }
    
    await Enrollment.updateLessonProgress(enrollmentId, lessonId, completed);
    
    const newProgress = await Enrollment.recalculateProgress(enrollmentId);
    
    return ResponseHandler.success(res, { progress: newProgress }, 'Progress updated');
  });

  // Get course progress
  getCourseProgress = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    
    const enrollments = await Enrollment.getUserEnrollments(req.user.id);
    const enrollment = enrollments.find(e => e.course_id === parseInt(courseId));
    
    if (!enrollment) {
      return ResponseHandler.notFound(res, 'Not enrolled in this course');
    }
    
    const progress = await Enrollment.getProgress(enrollment.id);
    
    return ResponseHandler.success(res, {
      enrollment,
      progress
    });
  });
}

module.exports = new EnrollmentController();