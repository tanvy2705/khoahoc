const nodemailer = require('nodemailer');

const emailConfig = {
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  tls: {
    rejectUnauthorized: false
  }
};

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport(emailConfig);
};

// Verify email configuration
const verifyEmailConfig = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log(' Email configuration is valid');
    return true;
  } catch (error) {
    console.error(' Email configuration error:', error.message);
    return false;
  }
};

// Email sender info
const emailFrom = process.env.EMAIL_FROM || 'Learning Platform <noreply@learning.com>';

// Email templates configuration
const emailTemplates = {
  verification: {
    subject: 'Xác thực email - Learning Platform'
  },
  passwordReset: {
    subject: 'Đặt lại mật khẩu - Learning Platform'
  },
  orderConfirmation: {
    subject: 'Xác nhận đơn hàng - Learning Platform'
  },
  paymentSuccess: {
    subject: 'Thanh toán thành công - Learning Platform'
  },
  courseEnrollment: {
    subject: 'Ghi danh khóa học thành công - Learning Platform'
  },
  welcome: {
    subject: 'Chào mừng đến với Learning Platform'
  }
};

module.exports = {
  emailConfig,
  createTransporter,
  verifyEmailConfig,
  emailFrom,
  emailTemplates
};