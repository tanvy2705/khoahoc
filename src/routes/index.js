const express = require('express');
const router = express.Router();

// Import all route modules
const authRoutes = require('./auth.routes');
const courseRoutes = require('./course.routes');
const categoryRoutes = require('./category.routes');
const lessonRoutes = require('./lesson.routes');
const cartRoutes = require('./cart.routes');
const orderRoutes = require('./order.routes');
const paymentRoutes = require('./payment.routes');
const enrollmentRoutes = require('./enrollment.routes');
const notificationRoutes = require('./notification.routes');
const promotionRoutes = require('./promotion.routes');
const userRoutes = require('./user.routes');
const reviewRoutes = require('./review.routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/courses', courseRoutes);
router.use('/categories', categoryRoutes);
router.use('/lessons', lessonRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/enrollments', enrollmentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/promotions', promotionRoutes);
router.use('/users', userRoutes);
router.use('/reviews', reviewRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    message: 'Learning Platform API',
    version: '1.0.0',
    status: 'active',
    endpoints: {
      auth: '/api/auth',
      courses: '/api/courses',
      categories: '/api/categories',
      lessons: '/api/lessons',
      cart: '/api/cart',
      orders: '/api/orders',
      payments: '/api/payments',
      enrollments: '/api/enrollments',
      notifications: '/api/notifications',
      promotions: '/api/promotions',
      users: '/api/users',
      reviews: '/api/reviews'
    },
    documentation: '/api/docs'
  });
});

module.exports = router;