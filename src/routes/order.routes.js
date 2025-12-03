const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const auth = require('../middlewares/auth');

router.use(auth); // All order routes require authentication

router.post('/', paymentController.createOrder);
router.get('/', paymentController.getOrders);
router.get('/:id', paymentController.getOrderById);

module.exports = router;