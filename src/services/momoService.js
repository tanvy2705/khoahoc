
const crypto = require('crypto');
const axios = require('axios');

class MoMoService {
  constructor() {
    this.partnerCode = process.env.MOMO_PARTNER_CODE;
    this.accessKey = process.env.MOMO_ACCESS_KEY;
    this.secretKey = process.env.MOMO_SECRET_KEY;
    this.endpoint = process.env.MOMO_ENDPOINT;
    this.returnUrl = process.env.MOMO_RETURN_URL;
    this.notifyUrl = process.env.MOMO_NOTIFY_URL;
  }

  // Generate signature
  generateSignature(rawData) {
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(rawData)
      .digest('hex');
  }

  // Create payment
  async createPayment({ orderId, amount, orderInfo }) {
    const requestId = `${orderId}_${Date.now()}`;
    const requestType = 'captureWallet';
    const extraData = '';

    // Create raw signature
    const rawSignature = `accessKey=${this.accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${this.notifyUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${this.partnerCode}&redirectUrl=${this.returnUrl}&requestId=${requestId}&requestType=${requestType}`;

    const signature = this.generateSignature(rawSignature);

    const requestBody = {
      partnerCode: this.partnerCode,
      accessKey: this.accessKey,
      requestId: requestId,
      amount: amount.toString(),
      orderId: orderId,
      orderInfo: orderInfo,
      redirectUrl: this.returnUrl,
      ipnUrl: this.notifyUrl,
      extraData: extraData,
      requestType: requestType,
      signature: signature,
      lang: 'vi'
    };

    try {
      const response = await axios.post(`${this.endpoint}/v2/gateway/api/create`, requestBody, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.resultCode === 0) {
        return response.data.payUrl;
      } else {
        throw new Error(response.data.message || 'MoMo payment creation failed');
      }
    } catch (error) {
      console.error('MoMo API Error:', error.message);
      throw new Error('Failed to create MoMo payment');
    }
  }

  // Verify callback signature
  verifySignature(callbackData) {
    const {
      partnerCode,
      orderId,
      requestId,
      amount,
      orderInfo,
      orderType,
      transId,
      resultCode,
      message,
      payType,
      responseTime,
      extraData,
      signature
    } = callbackData;

    const rawSignature = `accessKey=${this.accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;

    const calculatedSignature = this.generateSignature(rawSignature);

    return signature === calculatedSignature;
  }

  // Query transaction status
  async queryTransaction(orderId, requestId) {
    const rawSignature = `accessKey=${this.accessKey}&orderId=${orderId}&partnerCode=${this.partnerCode}&requestId=${requestId}`;
    const signature = this.generateSignature(rawSignature);

    const requestBody = {
      partnerCode: this.partnerCode,
      accessKey: this.accessKey,
      requestId: requestId,
      orderId: orderId,
      signature: signature,
      lang: 'vi'
    };

    try {
      const response = await axios.post(`${this.endpoint}/v2/gateway/api/query`, requestBody, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('MoMo Query Error:', error.message);
      throw new Error('Failed to query MoMo transaction');
    }
  }
}

module.exports = new MoMoService();