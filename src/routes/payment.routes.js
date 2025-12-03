const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const auth = require('../middlewares/auth');
const { isStaffOrAdmin } = require('../middlewares/roleCheck');
const { uploadSingle } = require('../middlewares/upload');

// Public routes (webhooks)
router.post('/momo-notify', paymentController.handleMoMoCallback);

// Protected routes
router.post('/create-url', auth, paymentController.createPaymentUrl);
router.get('/history', auth, paymentController.getPaymentHistory);
router.post('/manual-transfer', auth, uploadSingle('bill_image'), paymentController.uploadTransferBill);

// Admin/Staff routes
router.get('/', auth, isStaffOrAdmin, paymentController.getAllPayments);
router.get('/pending-transfers', auth, isStaffOrAdmin, paymentController.getPendingManualTransfers);
router.post('/verify-transfer', auth, isStaffOrAdmin, paymentController.verifyManualTransfer);

module.exports = router;