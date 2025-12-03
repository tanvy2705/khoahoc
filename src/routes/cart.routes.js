const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const auth = require('../middlewares/auth');

router.use(auth); // All cart routes require authentication

router.get('/', cartController.getCart);
router.post('/add', cartController.addToCart);
router.delete('/remove/:itemId', cartController.removeFromCart);
router.delete('/clear', cartController.clearCart);
router.get('/count', cartController.getCartCount);

module.exports = router;