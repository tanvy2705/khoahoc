const crypto = require('crypto');
const querystring = require('qs');

/**
 * Sort object by key (alphabet order)
 * @param {Object} obj - Object to sort
 * @returns {Object} Sorted object
 */
function sortObject(obj) {
  const sorted = {};
  const str = [];
  
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(encodeURIComponent(key));
    }
  }
  
  str.sort();
  
  for (let key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, '+');
  }
  
  return sorted;
}

/**
 * Create secure hash for VNPay
 * @param {Object} params - Parameters to hash
 * @param {String} hashSecret - Hash secret key
 * @returns {String} Hashed string
 */
function createSecureHash(params, hashSecret) {
  const signData = querystring.stringify(params, { encode: false });
  const hmac = crypto.createHmac('sha512', hashSecret);
  return hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
}

/**
 * Verify secure hash from VNPay
 * @param {Object} params - Parameters to verify
 * @param {String} secureHash - Hash to verify against
 * @param {String} hashSecret - Hash secret key
 * @returns {Boolean} True if valid
 */
function verifySecureHash(params, secureHash, hashSecret) {
  const signData = querystring.stringify(params, { encode: false });
  const hmac = crypto.createHmac('sha512', hashSecret);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
  return secureHash === signed;
}

/**
 * Format date for VNPay (YYYYMMDDHHmmss)
 * @param {Date} date - Date to format
 * @returns {String} Formatted date string
 */
function formatDate(date = new Date()) {
  return date.toISOString().slice(0, 19).replace(/[-:T]/g, '');
}

/**
 * Get VNPay response message
 * @param {String} responseCode - Response code from VNPay
 * @returns {String} Message
 */
function getResponseMessage(responseCode) {
  const messages = {
    '00': 'Giao dịch thành công',
    '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).',
    '09': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking tại ngân hàng.',
    '10': 'Giao dịch không thành công do: Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
    '11': 'Giao dịch không thành công do: Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại giao dịch.',
    '12': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa.',
    '13': 'Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch (OTP). Xin quý khách vui lòng thực hiện lại giao dịch.',
    '24': 'Giao dịch không thành công do: Khách hàng hủy giao dịch',
    '51': 'Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch.',
    '65': 'Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày.',
    '75': 'Ngân hàng thanh toán đang bảo trì.',
    '79': 'Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định. Xin quý khách vui lòng thực hiện lại giao dịch',
    '99': 'Các lỗi khác (lỗi còn lại, không có trong danh sách mã lỗi đã liệt kê)'
  };

  return messages[responseCode] || 'Lỗi không xác định';
}

module.exports = {
  sortObject,
  createSecureHash,
  verifySecureHash,
  formatDate,
  getResponseMessage
};