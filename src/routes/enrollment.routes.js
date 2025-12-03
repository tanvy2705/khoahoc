const express = require('express');
const router = express.Router();
const enrollmentController = require('../controllers/enrollmentController');
const auth = require('../middlewares/auth');
const { isStaffOrAdmin } = require('../middlewares/roleCheck');

// All enrollment routes require authentication
router.use(auth);

// User routes
router.get('/my-enrollments', enrollmentController.getUserEnrollments);
router.post('/courses/:courseId/enroll', enrollmentController.enrollCourse);
router.get('/:id', enrollmentController.getEnrollmentById);
router.put('/:enrollmentId/lessons/:lessonId/progress', enrollmentController.updateLessonProgress);
router.get('/courses/:courseId/progress', enrollmentController.getCourseProgress);

// Admin/Staff routes
router.get('/', isStaffOrAdmin, enrollmentController.getAllEnrollments);

module.exports = router;