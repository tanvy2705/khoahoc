
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
    
    console.log('✅ MoMo Service initialized');
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
    try {
      console.log('🔵 Creating MoMo payment for order:', orderId);

      // ❗ QUAN TRỌNG: Chuyển amount thành integer
      const amountInt = Math.round(parseFloat(amount));
      
      const requestId = orderId;
      const requestType = 'captureWallet'; // ❗ Đổi lại về captureWallet
      const extraData = '';
      const lang = 'vi';

      // Build raw signature - amount phải là string của integer
      const rawSignature = 
        'accessKey=' + this.accessKey +
        '&amount=' + amountInt +
        '&extraData=' + extraData +
        '&ipnUrl=' + this.notifyUrl +
        '&orderId=' + orderId +
        '&orderInfo=' + orderInfo +
        '&partnerCode=' + this.partnerCode +
        '&redirectUrl=' + this.returnUrl +
        '&requestId=' + requestId +
        '&requestType=' + requestType;

      const signature = this.generateSignature(rawSignature);

      // Request body - amount phải là string của integer
      const requestBody = {
        partnerCode: this.partnerCode,
        requestId: requestId,
        amount: String(amountInt), // ❗ Chuyển thành string nhưng không có .00
        orderId: orderId,
        orderInfo: orderInfo,
        redirectUrl: this.returnUrl,
        ipnUrl: this.notifyUrl,
        lang: lang,
        requestType: requestType,
        extraData: extraData,
        signature: signature
      };

      console.log('📤 MoMo Request:');
      console.log('URL:', `${this.endpoint}/v2/gateway/api/create`);
      console.log('Amount (original):', amount);
      console.log('Amount (converted):', amountInt);
      console.log('Body:', JSON.stringify(requestBody, null, 2));

      const response = await axios.post(
        `${this.endpoint}/v2/gateway/api/create`, 
        requestBody, 
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      console.log('📥 MoMo Response:', JSON.stringify(response.data, null, 2));

      if (response.data.resultCode === 0) {
        console.log('✅ Payment URL created successfully');
        return response.data.payUrl;
      } else {
        console.error('❌ MoMo Error:', response.data);
        throw new Error(
          `MoMo error: ${response.data.message} (Code: ${response.data.resultCode})`
        );
      }
    } catch (error) {
      if (error.response) {
        console.error('❌ MoMo API Response Error:', error.response.data);
        throw new Error(
          `MoMo API error: ${JSON.stringify(error.response.data)}`
        );
      } else if (error.request) {
        console.error('❌ No response from MoMo API');
        throw new Error('Không thể kết nối tới MoMo API');
      } else {
        console.error('❌ Error:', error.message);
        throw error;
      }
    }
  }

  // Verify callback signature
  verifySignature(callbackData) {
    try {
      console.log('🔐 Verifying callback signature...');
      
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

      const rawSignature = 
        'accessKey=' + this.accessKey +
        '&amount=' + amount +
        '&extraData=' + extraData +
        '&message=' + message +
        '&orderId=' + orderId +
        '&orderInfo=' + orderInfo +
        '&orderType=' + orderType +
        '&partnerCode=' + partnerCode +
        '&payType=' + payType +
        '&requestId=' + requestId +
        '&responseTime=' + responseTime +
        '&resultCode=' + resultCode +
        '&transId=' + transId;

      const calculatedSignature = this.generateSignature(rawSignature);
      const isValid = signature === calculatedSignature;
      
      console.log('🔐 Signature verification:', isValid ? '✅ Valid' : '❌ Invalid');
      
      return isValid;
    } catch (error) {
      console.error('❌ Signature verification error:', error);
      return false;
    }
  }

  // Query transaction status
  async queryTransaction(orderId, requestId) {
    try {
      const rawSignature = 
        'accessKey=' + this.accessKey +
        '&orderId=' + orderId +
        '&partnerCode=' + this.partnerCode +
        '&requestId=' + requestId;
        
      const signature = this.generateSignature(rawSignature);

      const requestBody = {
        partnerCode: this.partnerCode,
        requestId: requestId,
        orderId: orderId,
        signature: signature,
        lang: 'vi'
      };

      const response = await axios.post(
        `${this.endpoint}/v2/gateway/api/query`, 
        requestBody, 
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      return response.data;
    } catch (error) {
      console.error('❌ MoMo Query Error:', error.response?.data || error.message);
      throw new Error('Failed to query MoMo transaction');
    }
  }
}

module.exports = new MoMoService();