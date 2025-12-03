const crypto = require('crypto');

const momoConfig = {
  // MoMo credentials
  partnerCode: process.env.MOMO_PARTNER_CODE,
  accessKey: process.env.MOMO_ACCESS_KEY,
  secretKey: process.env.MOMO_SECRET_KEY,
  
  // MoMo endpoints
  endpoint: process.env.MOMO_ENDPOINT,
  createPaymentUrl: `${process.env.MOMO_ENDPOINT}/v2/gateway/api/create`,
  queryUrl: `${process.env.MOMO_ENDPOINT}/v2/gateway/api/query`,
  refundUrl: `${process.env.MOMO_ENDPOINT}/v2/gateway/api/refund`,
  
  // Redirect URLs
  returnUrl: process.env.MOMO_RETURN_URL,
  notifyUrl: process.env.MOMO_NOTIFY_URL,
  
  // Manual transfer info
  manualTransfer: {
    phone: process.env.MOMO_PHONE,
    name: process.env.MOMO_NAME,
    qrCode: process.env.MOMO_QR_CODE
  },
  
  // Request config
  requestType: 'captureWallet',
  lang: 'vi',
  
  // Timeout (ms)
  timeout: 30000
};

// Generate signature for MoMo request
const generateSignature = (rawData, secretKey) => {
  return crypto
    .createHmac('sha256', secretKey)
    .update(rawData)
    .digest('hex');
};

// Build raw signature string for payment creation
const buildPaymentSignature = (params) => {
  const {
    accessKey,
    amount,
    extraData,
    ipnUrl,
    orderId,
    orderInfo,
    partnerCode,
    redirectUrl,
    requestId,
    requestType
  } = params;
  
  return `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
};

// Build raw signature for callback verification
const buildCallbackSignature = (params) => {
  const {
    accessKey,
    amount,
    extraData,
    message,
    orderId,
    orderInfo,
    orderType,
    partnerCode,
    payType,
    requestId,
    responseTime,
    resultCode,
    transId
  } = params;
  
  return `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
};

// Verify MoMo signature
const verifySignature = (rawSignature, signature, secretKey) => {
  const calculatedSignature = generateSignature(rawSignature, secretKey);
  return signature === calculatedSignature;
};

// MoMo result codes
const momoResultCodes = {
  0: 'Success',
  9000: 'Transaction confirmed',
  1000: 'Transaction initiated',
  1001: 'Transaction declined by issuer',
  1002: 'Transaction declined',
  1003: 'Transaction cancelled',
  1004: 'Transaction failed',
  1005: 'Transaction timeout',
  1006: 'Transaction rejected',
  1007: 'Transaction pending',
  2001: 'Invalid access key',
  3001: 'Internal server error',
  3002: 'Invalid request',
  3003: 'Payment expired',
  4001: 'Invalid amount',
  4002: 'Order not found',
  4100: 'Insufficient balance'
};

// Get result code message
const getResultCodeMessage = (resultCode) => {
  return momoResultCodes[resultCode] || 'Unknown error';
};

// Validate MoMo config
const validateConfig = () => {
  const required = ['partnerCode', 'accessKey', 'secretKey', 'endpoint', 'returnUrl', 'notifyUrl'];
  const missing = required.filter(key => !momoConfig[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing MoMo configuration: ${missing.join(', ')}`);
  }
  
  return true;
};

module.exports = {
  momoConfig,
  generateSignature,
  buildPaymentSignature,
  buildCallbackSignature,
  verifySignature,
  momoResultCodes,
  getResultCodeMessage,
  validateConfig
};
