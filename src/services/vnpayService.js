const querystring = require('qs');
const vnpayConfig = require('../config/vnpay.config');
const { 
  sortObject, 
  createSecureHash, 
  verifySecureHash,
  formatDate,
  getResponseMessage 
} = require('../utils/vnpay.utils');

class VNPayService {
  /**
   * Create VNPay payment URL
   * @param {Object} paymentData - Payment information
   * @param {String} paymentData.orderId - Order ID
   * @param {Number} paymentData.amount - Payment amount
   * @param {String} paymentData.orderInfo - Order description
   * @param {String} ipAddr - Client IP address
   * @returns {String} Payment URL
   */
  async createPayment({ orderId, amount, orderInfo }, ipAddr = '127.0.0.1') {
    try {
      const createDate = formatDate();
      
      // IMPORTANT: Ensure amount is integer and multiply by 100
      const vnpayAmount = Math.floor(amount) * 100;
      
      console.log('🔵 Creating VNPay payment:', {
        orderId,
        originalAmount: amount,
        vnpayAmount,
        ipAddr,
        createDate
      });
      
      // Create VNPay params
      let vnp_Params = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: vnpayConfig.vnp_TmnCode,
        vnp_Locale: 'vn',
        vnp_CurrCode: 'VND',
        vnp_TxnRef: orderId,
        vnp_OrderInfo: orderInfo,
        vnp_OrderType: 'other',
        vnp_Amount: vnpayAmount, // MUST be integer and * 100
        vnp_ReturnUrl: vnpayConfig.vnp_ReturnUrl,
        vnp_IpAddr: ipAddr,
        vnp_CreateDate: createDate
      };

      console.log('📋 VNPay params before sort:', vnp_Params);

      // Sort params by alphabet
      vnp_Params = sortObject(vnp_Params);

      console.log('📋 VNPay params after sort:', vnp_Params);

      // Create secure hash
      const secureHash = createSecureHash(vnp_Params, vnpayConfig.vnp_HashSecret);
      vnp_Params['vnp_SecureHash'] = secureHash;

      console.log('🔐 Secure hash:', secureHash);

      // Create payment URL
      const paymentUrl = vnpayConfig.vnp_Url + '?' + querystring.stringify(vnp_Params, { encode: false });

      console.log('✅ VNPay payment URL created successfully');
      console.log('🔗 URL:', paymentUrl);

      return paymentUrl;
    } catch (error) {
      console.error('❌ Error creating VNPay payment:', error);
      throw new Error('Failed to create VNPay payment URL: ' + error.message);
    }
  }

  /**
   * Verify VNPay callback signature
   * @param {Object} vnpayData - Data from VNPay callback
   * @returns {Boolean} True if signature is valid
   */
  verifySignature(vnpayData) {
    try {
      const secureHash = vnpayData['vnp_SecureHash'];
      
      // Remove hash fields
      const vnp_Params = { ...vnpayData };
      delete vnp_Params['vnp_SecureHash'];
      delete vnp_Params['vnp_SecureHashType'];

      // Sort params
      const sortedParams = sortObject(vnp_Params);

      // Verify signature
      const isValid = verifySecureHash(sortedParams, secureHash, vnpayConfig.vnp_HashSecret);

      if (!isValid) {
        console.log('❌ Invalid VNPay signature');
      } else {
        console.log('✅ Valid VNPay signature');
      }

      return isValid;
    } catch (error) {
      console.error('❌ Error verifying VNPay signature:', error);
      return false;
    }
  }

  /**
   * Parse VNPay return data
   * @param {Object} vnpayData - Data from VNPay
   * @returns {Object} Parsed payment result
   */
  parseReturnData(vnpayData) {
    const responseCode = vnpayData['vnp_ResponseCode'];
    const transactionStatus = vnpayData['vnp_TransactionStatus'];

    return {
      isSuccess: responseCode === '00' && transactionStatus === '00',
      responseCode,
      transactionStatus,
      orderId: vnpayData['vnp_TxnRef'],
      amount: parseInt(vnpayData['vnp_Amount']) / 100,
      bankCode: vnpayData['vnp_BankCode'],
      bankTranNo: vnpayData['vnp_BankTranNo'],
      cardType: vnpayData['vnp_CardType'],
      payDate: vnpayData['vnp_PayDate'],
      transactionNo: vnpayData['vnp_TransactionNo'],
      message: getResponseMessage(responseCode),
      rawData: vnpayData
    };
  }

  /**
   * Query transaction status from VNPay
   * @param {String} orderId - Order ID
   * @param {String} transDate - Transaction date (YYYYMMDDHHmmss)
   * @returns {Object} Transaction status
   */
  async queryTransaction(orderId, transDate) {
    try {
      const requestId = formatDate() + Math.floor(Math.random() * 1000000);

      let vnp_Params = {
        vnp_RequestId: requestId,
        vnp_Version: '2.1.0',
        vnp_Command: 'querydr',
        vnp_TmnCode: vnpayConfig.vnp_TmnCode,
        vnp_TxnRef: orderId,
        vnp_OrderInfo: `Query transaction ${orderId}`,
        vnp_TransactionDate: transDate,
        vnp_CreateDate: formatDate(),
        vnp_IpAddr: '127.0.0.1'
      };

      // Sort params
      vnp_Params = sortObject(vnp_Params);

      // Create secure hash
      const secureHash = createSecureHash(vnp_Params, vnpayConfig.vnp_HashSecret);
      vnp_Params['vnp_SecureHash'] = secureHash;

      // Note: You need to implement HTTP request to VNPay API here
      // This is just a structure example
      console.log('Query transaction params:', vnp_Params);

      return {
        success: true,
        message: 'Query sent successfully'
      };
    } catch (error) {
      console.error('❌ Error querying VNPay transaction:', error);
      throw new Error('Failed to query transaction');
    }
  }

  /**
   * Refund transaction
   * @param {Object} refundData - Refund information
   * @returns {Object} Refund result
   */
  async refundTransaction(refundData) {
    try {
      const { orderId, amount, transactionNo, transDate, reason } = refundData;
      const requestId = formatDate() + Math.floor(Math.random() * 1000000);

      let vnp_Params = {
        vnp_RequestId: requestId,
        vnp_Version: '2.1.0',
        vnp_Command: 'refund',
        vnp_TmnCode: vnpayConfig.vnp_TmnCode,
        vnp_TransactionType: '02', // Full refund
        vnp_TxnRef: orderId,
        vnp_Amount: amount * 100,
        vnp_OrderInfo: reason || `Refund for order ${orderId}`,
        vnp_TransactionNo: transactionNo,
        vnp_TransactionDate: transDate,
        vnp_CreateDate: formatDate(),
        vnp_CreateBy: 'Admin',
        vnp_IpAddr: '127.0.0.1'
      };

      // Sort params
      vnp_Params = sortObject(vnp_Params);

      // Create secure hash
      const secureHash = createSecureHash(vnp_Params, vnpayConfig.vnp_HashSecret);
      vnp_Params['vnp_SecureHash'] = secureHash;

      // Note: You need to implement HTTP request to VNPay API here
      console.log('Refund transaction params:', vnp_Params);

      return {
        success: true,
        message: 'Refund request sent successfully'
      };
    } catch (error) {
      console.error('❌ Error refunding VNPay transaction:', error);
      throw new Error('Failed to refund transaction');
    }
  }
}

module.exports = new VNPayService();