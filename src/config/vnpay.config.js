module.exports = {
  vnp_TmnCode: process.env.VNPAY_TMN_CODE || 'YWB053P6',
  vnp_HashSecret: process.env.VNPAY_HASH_SECRET || '3DYGLHMRHQ7QFWCBQQ7OTMLWY9NMYCGT',
  vnp_Url: process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  vnp_ReturnUrl: process.env.VNPAY_RETURN_URL || 'http://localhost:8000/api/payment/vnpay_return', // thay bằng ngrok/domain thật
  vnp_IpnUrl: process.env.VNPAY_IPN_URL || 'http://localhost:8000/api/payment/vnpay_ipn' // thay bằng ngrok/domain thật
};