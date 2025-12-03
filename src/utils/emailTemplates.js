const emailTemplates = {
  // Base template wrapper
  baseTemplate: (content) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        ${content}
        <div class="footer">
          <p>© 2024 Learning Platform. All rights reserved.</p>
          <p>Nếu bạn có câu hỏi, vui lòng liên hệ: support@learning.com</p>
        </div>
      </div>
    </body>
    </html>
  `,

  // Email verification
  verification: (name, verificationUrl) => emailTemplates.baseTemplate(`
    <div class="header">
      <h1> Learning Platform</h1>
      <p>Xác thực email của bạn</p>
    </div>
    <div class="content">
      <p>Xin chào <strong>${name}</strong>,</p>
      <p>Cảm ơn bạn đã đăng ký tài khoản tại Learning Platform!</p>
      <p>Vui lòng nhấn vào nút bên dưới để xác thực email của bạn:</p>
      <div style="text-align: center;">
        <a href="${verificationUrl}" class="button">Xác thực Email</a>
      </div>
      <p>Hoặc copy link sau vào trình duyệt:</p>
      <p style="word-break: break-all; background: #fff; padding: 10px; border-radius: 5px;">${verificationUrl}</p>
      <p><strong>Lưu ý:</strong> Link này sẽ hết hạn sau 24 giờ.</p>
    </div>
  `),

  // Password reset
  passwordReset: (name, resetUrl) => emailTemplates.baseTemplate(`
    <div class="header">
      <h1>Đặt lại mật khẩu</h1>
    </div>
    <div class="content">
      <p>Xin chào <strong>${name}</strong>,</p>
      <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
      <div style="text-align: center;">
        <a href="${resetUrl}" class="button">Đặt lại mật khẩu</a>
      </div>
      <p>Hoặc copy link sau vào trình duyệt:</p>
      <p style="word-break: break-all; background: #fff; padding: 10px; border-radius: 5px;">${resetUrl}</p>
      <p><strong>Lưu ý:</strong> Link này sẽ hết hạn sau 1 giờ.</p>
      <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
    </div>
  `),

  // Payment success
  paymentSuccess: (name, order) => emailTemplates.baseTemplate(`
    <div class="header">
      <h1>Thanh toán thành công</h1>
    </div>
    <div class="content">
      <p>Xin chào <strong>${name}</strong>,</p>
      <p>Thanh toán của bạn đã được xử lý thành công!</p>
      <div style="background: #e8f5e9; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Mã đơn hàng:</strong> ${order.order_code}</p>
        <p><strong>Số tiền:</strong> ${order.final_amount.toLocaleString('vi-VN')}đ</p>
        <p><strong>Ngày thanh toán:</strong> ${new Date().toLocaleDateString('vi-VN')}</p>
      </div>
      <p>Bạn có thể truy cập các khóa học đã mua ngay bây giờ!</p>
      <div style="text-align: center;">
        <a href="${process.env.FRONTEND_URL}/my-courses" class="button">Xem khóa học của tôi</a>
      </div>
    </div>
  `),

  // Order confirmation
  orderConfirmation: (name, order) => emailTemplates.baseTemplate(`
    <div class="header">
      <h1>Xác nhận đơn hàng</h1>
    </div>
    <div class="content">
      <p>Xin chào <strong>${name}</strong>,</p>
      <p>Cảm ơn bạn đã đặt hàng tại Learning Platform!</p>
      <div style="background: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Mã đơn hàng:</strong> ${order.order_code}</p>
        <p><strong>Tổng tiền:</strong> ${order.final_amount.toLocaleString('vi-VN')}đ</p>
        <p><strong>Phương thức thanh toán:</strong> ${order.payment_method}</p>
      </div>
      <p>Chúng tôi sẽ thông báo cho bạn khi đơn hàng được xử lý.</p>
    </div>
  `)
};

module.exports = emailTemplates;