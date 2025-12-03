
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const ResponseHandler = require('../utils/responseHandler');
const asyncHandler = require('../middlewares/asyncHandler');
const Helpers = require('../utils/helpers');

class CourseController {
  // Get all courses
  getAllCourses = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status, category_id, search, featured } = req.query;
    
    const pagination = Helpers.getPagination(page, limit);
    
    const courses = await Course.getAll({
      ...pagination,
      status,
      category_id,
      search,
      featured: featured === 'true'
    });

    const total = await Course.count({ status, category_id, search });

    return ResponseHandler.paginated(res, courses, {
      page: pagination.page,
      limit: pagination.limit,
      total
    });
  });

  // Get course by ID
  getCourseById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const course = await Course.findById(id);
    
    if (!course) {
      return ResponseHandler.notFound(res, 'Course not found');
    }

    // Get lessons
    const lessons = await Course.getLessons(id);

    return ResponseHandler.success(res, {
      ...course,
      lessons
    });
  });

  // Create course (Admin)
  createCourse = asyncHandler(async (req, res) => {
    const {
      title,
      description,
      category_id,
      price,
      discount_price,
      level,
      duration,
      language,
      status,
      featured
    } = req.body;

    // Generate slug
    const slug = Helpers.slugify(title);

    // Check if slug exists
    const existingCourse = await Course.findBySlug(slug);
    if (existingCourse) {
      return ResponseHandler.conflict(res, 'Course with this title already exists');
    }

    const courseId = await Course.create({
      title,
      slug,
      description,
      category_id,
      instructor_id: req.user.id,
      price,
      discount_price,
      level,
      duration,
      language,
      status,
      featured
    });

    const course = await Course.findById(courseId);

    return ResponseHandler.created(res, course, 'Course created successfully');
  });

  // Update course (Admin)
  updateCourse = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const course = await Course.findById(id);
    if (!course) {
      return ResponseHandler.notFound(res, 'Course not found');
    }

    // Generate new slug if title changed
    let slug = course.slug;
    if (req.body.title && req.body.title !== course.title) {
      slug = Helpers.slugify(req.body.title);
    }

    const updatedCourse = await Course.update(id, {
      ...req.body,
      slug
    });

    return ResponseHandler.success(res, updatedCourse, 'Course updated successfully');
  });

  // Delete course (Admin)
  deleteCourse = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const course = await Course.findById(id);
    if (!course) {
      return ResponseHandler.notFound(res, 'Course not found');
    }

    await Course.delete(id);

    return ResponseHandler.success(res, null, 'Course deleted successfully');
  });

  // Upload thumbnail
  uploadThumbnail = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!req.file) {
      return ResponseHandler.badRequest(res, 'No file uploaded');
    }

    const course = await Course.findById(id);
    if (!course) {
      return ResponseHandler.notFound(res, 'Course not found');
    }

    const thumbnailUrl = `/uploads/thumbnails/${req.file.filename}`;

    await Course.update(id, { thumbnail: thumbnailUrl });

    return ResponseHandler.success(res, { thumbnail: thumbnailUrl }, 'Thumbnail uploaded successfully');
  });

  // Get categories
  getCategories = asyncHandler(async (req, res) => {
    const categories = await Course.getCategories();
    return ResponseHandler.success(res, categories);
  });

  // Get courses by category
  getCoursesByCategory = asyncHandler(async (req, res) => {
    const { categoryId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const pagination = Helpers.getPagination(page, limit);
    
    const courses = await Course.getAll({
      ...pagination,
      category_id: categoryId,
      status: 'active'
    });

    const total = await Course.count({ category_id: categoryId, status: 'active' });

    return ResponseHandler.paginated(res, courses, {
      page: pagination.page,
      limit: pagination.limit,
      total
    });
  });

  // Get enrolled courses (User)
  getEnrolledCourses = asyncHandler(async (req, res) => {
    const enrollments = await Enrollment.getUserEnrollments(req.user.id);
    return ResponseHandler.success(res, enrollments);
  });

  // Enroll in course (User)
  enrollCourse = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const course = await Course.findById(id);
    if (!course) {
      return ResponseHandler.notFound(res, 'Course not found');
    }

    // Check if already enrolled
    const isEnrolled = await Enrollment.isEnrolled(req.user.id, id);
    if (isEnrolled) {
      return ResponseHandler.conflict(res, 'Already enrolled in this course');
    }

    const enrollmentId = await Enrollment.create(req.user.id, id);

    // Update course student count
    await Course.updateStudentCount(id);

    return ResponseHandler.created(res, { enrollment_id: enrollmentId }, 'Enrolled successfully');
  });

  // Get course progress (User)
  getCourseProgress = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Find enrollment
    const enrollments = await Enrollment.getUserEnrollments(req.user.id);
    const enrollment = enrollments.find(e => e.course_id === parseInt(id));

    if (!enrollment) {
      return ResponseHandler.notFound(res, 'Not enrolled in this course');
    }

    const progress = await Enrollment.getProgress(enrollment.id);

    return ResponseHandler.success(res, {
      enrollment,
      progress
    });
  });

  // Complete lesson (User)
  completeLesson = asyncHandler(async (req, res) => {
    const { courseId, lessonId } = req.params;

    // Find enrollment
    const enrollments = await Enrollment.getUserEnrollments(req.user.id);
    const enrollment = enrollments.find(e => e.course_id === parseInt(courseId));

    if (!enrollment) {
      return ResponseHandler.notFound(res, 'Not enrolled in this course');
    }

    await Enrollment.updateLessonProgress(enrollment.id, lessonId, true);

    const newProgress = await Enrollment.recalculateProgress(enrollment.id);

    return ResponseHandler.success(res, { progress: newProgress }, 'Lesson marked as complete');
  });
}

module.exports = new CourseController();