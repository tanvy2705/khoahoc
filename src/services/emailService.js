const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  // Send email
  async sendEmail({ to, subject, html }) {
    try {
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject,
        html
      });

      console.log('Email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('Email error:', error);
      return false;
    }
  }

  // Send verification email
  async sendVerificationEmail(email, token, name) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Xác thực email của bạn</h2>
        <p>Xin chào ${name},</p>
        <p>Cảm ơn bạn đã đăng ký tài khoản. Vui lòng nhấn vào nút bên dưới để xác thực email của bạn:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #4F46E5; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Xác thực Email
          </a>
        </div>
        <p>Hoặc copy link sau vào trình duyệt:</p>
        <p style="word-break: break-all;">${verificationUrl}</p>
        <p>Link này sẽ hết hạn sau 24 giờ.</p>
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          Nếu bạn không đăng ký tài khoản này, vui lòng bỏ qua email này.
        </p>
      </div>
    `;

    return await this.sendEmail({
      to: email,
      subject: 'Xác thực email - Learning Platform',
      html
    });
  }

  // Send password reset email
  async sendPasswordResetEmail(email, token, name) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Đặt lại mật khẩu</h2>
        <p>Xin chào ${name},</p>
        <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #4F46E5; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Đặt lại mật khẩu
          </a>
        </div>
        <p>Hoặc copy link sau vào trình duyệt:</p>
        <p style="word-break: break-all;">${resetUrl}</p>
        <p>Link này sẽ hết hạn sau 1 giờ.</p>
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
        </p>
      </div>
    `;

    return await this.sendEmail({
      to: email,
      subject: 'Đặt lại mật khẩu - Learning Platform',
      html
    });
  }

  // Send order confirmation email
  async sendOrderConfirmationEmail(email, order, name) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Xác nhận đơn hàng</h2>
        <p>Xin chào ${name},</p>
        <p>Cảm ơn bạn đã đặt hàng. Đây là thông tin đơn hàng của bạn:</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Mã đơn hàng:</strong> ${order.order_code}</p>
          <p><strong>Tổng tiền:</strong> ${order.final_amount.toLocaleString('vi-VN')}đ</p>
          <p><strong>Phương thức thanh toán:</strong> ${order.payment_method}</p>
        </div>
        <p>Chúng tôi sẽ thông báo cho bạn khi đơn hàng được xử lý.</p>
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.
        </p>
      </div>
    `;

    return await this.sendEmail({
      to: email,
      subject: `Xác nhận đơn hàng #${order.order_code}`,
      html
    });
  }

  // Send payment success email
  async sendPaymentSuccessEmail(email, order, name) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Thanh toán thành công</h2>
        <p>Xin chào ${name},</p>
        <p>Thanh toán của bạn đã được xử lý thành công!</p>
        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #10b981;">
          <p><strong>Mã đơn hàng:</strong> ${order.order_code}</p>
          <p><strong>Số tiền:</strong> ${order.final_amount.toLocaleString('vi-VN')}đ</p>
        </div>
        <p>Bạn có thể truy cập các khóa học đã mua trong phần "Khóa học của tôi".</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/my-courses" 
             style="background-color: #4F46E5; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Xem khóa học của tôi
          </a>
        </div>
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi!
        </p>
      </div>
    `;

    return await this.sendEmail({
      to: email,
      subject: 'Thanh toán thành công - Learning Platform',
      html
    });
  }
}

module.exports = new EmailService();