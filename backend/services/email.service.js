import nodemailer from 'nodemailer';
import crypto from 'crypto';

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.initTransporter();
  }

  initTransporter() {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (user && pass) {
      if (process.env.EMAIL_HOST) {
        this.transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: parseInt(process.env.EMAIL_PORT, 10) || 587,
          secure: process.env.EMAIL_PORT === '465',
          auth: { user, pass },
          connectionTimeout: 10000, // 10s timeout
          greetingTimeout: 10000,
        });
      } else {
        // Default to Gmail service
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user, pass },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
        });
      }
      this.isConfigured = true;
      console.log('[EmailService] SMTP transporter configured with account:', user);
    } else {
      this.isConfigured = false;
      console.warn('[EmailService Notice] EMAIL_USER / EMAIL_PASS not set. Running in local development mode (verification links will be printed to console).');
    }
  }

  /**
   * Hashes a raw verification token using SHA-256 for secure DB storage
   */
  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generates a secure random 32-byte hex token
   */
  generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Masks email address for public display (e.g., hathisoham9@gmail.com -> h***9@gmail.com)
   */
  maskEmail(email = '') {
    const [name, domain] = email.split('@');
    if (!domain) return email;
    if (name.length <= 2) {
      return `${name[0]}*@${domain}`;
    }
    const maskedName = `${name[0]}${'*'.repeat(name.length - 2)}${name[name.length - 1]}`;
    return `${maskedName}@${domain}`;
  }

  /**
   * Sends or outputs a verification email
   */
  async sendVerificationEmail({ email, fullname, rawToken }) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
    
    // Direct verification callback link
    const verificationLink = `${backendUrl}/user/verify-email?token=${rawToken}`;
    const masked = this.maskEmail(email);

    if (!this.isConfigured || !this.transporter) {
      // Local development preview fallback
      console.log('\n======================================================');
      console.log(' [EMAIL SERVICE - LOCAL DEVELOPMENT PREVIEW]');
      console.log(` To: ${email} (${fullname})`);
      console.log(` Subject: Verify your E-Library Account`);
      console.log(` Verification URL:`);
      console.log(` ${verificationLink}`);
      console.log('======================================================\n');

      return {
        success: true,
        status: 'dev_preview',
        maskedEmail: masked,
        previewUrl: verificationLink,
        messageId: `dev_${Date.now()}`,
      };
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: 'Verify your E-Library Account',
      text: `Hello ${fullname},\n\nPlease verify your email by clicking the link below:\n${verificationLink}\n\nThis link will expire in 24 hours.\n\nThank you,\nE-Library Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #2563eb; text-align: center;">Welcome to E-Library</h2>
          <p>Hello <strong>${fullname}</strong>,</p>
          <p>Thank you for signing up! Please verify your email address to activate your account and start reading.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p style="color: #6b7280; font-size: 13px;">Or copy and paste this link into your browser:</p>
          <p style="color: #2563eb; font-size: 12px; word-break: break-all;">${verificationLink}</p>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">
            This link will expire in 24 hours. If you did not create an account, you can safely ignore this email.
          </p>
        </div>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`[EmailService] Verification email accepted by provider for ${masked}. Message ID: ${info.messageId}`);
      return {
        success: true,
        status: 'sent',
        messageId: info.messageId,
        maskedEmail: masked,
      };
    } catch (err) {
      console.error(`[EmailService Delivery Error] Failed to send to ${masked}:`, err.message);
      return {
        success: false,
        status: 'failed',
        error: err.message,
        maskedEmail: masked,
      };
    }
  }

  /**
   * Sends or outputs a password reset OTP email
   */
  async sendPasswordResetOtp({ email, fullname, otp }) {
    const masked = this.maskEmail(email);

    if (!this.isConfigured || !this.transporter) {
      console.log('\n======================================================');
      console.log(' [EMAIL SERVICE - PASSWORD RESET OTP (DEV PREVIEW)]');
      console.log(` To: ${email} (${fullname || 'User'})`);
      console.log(` Subject: Your Password Reset OTP`);
      console.log(` OTP Code: [ ${otp} ] (Valid for 10 minutes)`);
      console.log('======================================================\n');

      return {
        success: true,
        status: 'dev_preview',
        maskedEmail: masked,
        previewOtp: otp,
        messageId: `dev_otp_${Date.now()}`,
      };
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: 'Your Password Reset OTP - E-Library',
      text: `Hello ${fullname || 'User'},\n\nYour 6-digit password reset OTP is: ${otp}\n\nThis OTP will expire in 10 minutes.\n\nIf you did not request this, please ignore this email.\n\nE-Library Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #2563eb; text-align: center;">Reset Your Password</h2>
          <p>Hello <strong>${fullname || 'User'}</strong>,</p>
          <p>We received a request to reset your password. Use the verification OTP code below:</p>
          <div style="text-align: center; margin: 25px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1e3a8a; background: #eff6ff; padding: 10px 24px; border-radius: 8px; border: 1px dashed #3b82f6; display: inline-block;">
              ${otp}
            </span>
          </div>
          <p style="color: #6b7280; font-size: 13px;">This OTP will expire in 10 minutes.</p>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 25px; border-top: 1px solid #eee; padding-top: 15px;">
            If you did not make this request, please ignore this email. Your password will remain unchanged.
          </p>
        </div>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`[EmailService] Password reset OTP accepted by provider for ${masked}. Message ID: ${info.messageId}`);
      return {
        success: true,
        status: 'sent',
        messageId: info.messageId,
        maskedEmail: masked,
      };
    } catch (err) {
      console.error(`[EmailService Delivery Error] Failed to send OTP to ${masked}:`, err.message);
      return {
        success: false,
        status: 'failed',
        error: err.message,
        maskedEmail: masked,
      };
    }
  }

  /**
   * Sends order confirmation email safely with dev fallback
   */
  /**
   * Sends order confirmation email safely with dev fallback
   */
  async sendOrderConfirmationEmail({ email, name, orderId, productName, quantity, totalPrice, phoneNumber = '', address = '' }) {
    const masked = this.maskEmail(email);

    if (!this.isConfigured || !this.transporter) {
      console.log('\n======================================================');
      console.log(' [EMAIL SERVICE - ORDER CONFIRMATION (DEV PREVIEW)]');
      console.log(` To: ${email} (${name})`);
      console.log(` Order ID: ${orderId}`);
      console.log(` Item: ${productName} x ${quantity} (Total: ₹${totalPrice})`);
      if (phoneNumber) console.log(` Contact Phone: ${phoneNumber}`);
      if (address) console.log(` Delivery Address: ${address}`);
      console.log('======================================================\n');
      return { success: true, status: 'dev_preview' };
    }

    try {
      const customerMailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: `Order Confirmation #${orderId.toString().slice(-6).toUpperCase()} - E-Library`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px;">
              <h2 style="color: #2563eb; margin: 0; font-size: 24px;">E-Library</h2>
              <p style="color: #64748b; font-size: 13px; margin: 4px 0 0;">Thank you for your purchase!</p>
            </div>
            <p style="font-size: 15px; color: #1e293b;">Hello <strong>${name}</strong>,</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.5;">Your book order has been confirmed successfully. Here is your order breakdown:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
              <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b;">Order Reference:</td><td style="font-weight: 600; color: #0f172a; text-align: right;">${orderId}</td></tr>
              <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b;">Book:</td><td style="font-weight: 600; color: #0f172a; text-align: right;">${productName}</td></tr>
              <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b;">Quantity:</td><td style="font-weight: 600; color: #0f172a; text-align: right;">${quantity} copy</td></tr>
              ${phoneNumber ? `<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b;">Contact Phone:</td><td style="font-weight: 600; color: #0f172a; text-align: right;">${phoneNumber}</td></tr>` : ''}
              ${address ? `<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b;">Delivery Note / Address:</td><td style="font-weight: 600; color: #0f172a; text-align: right;">${address}</td></tr>` : ''}
              <tr><td style="padding: 12px 0; color: #0f172a; font-weight: bold; font-size: 16px;">Total Amount:</td><td style="font-weight: bold; color: #16a34a; font-size: 18px; text-align: right;">₹${totalPrice}</td></tr>
            </table>
            <div style="margin-top: 24px; padding: 14px; background: #f8fafc; border-radius: 8px; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #475569;">You can view and read your digital books anytime in your account at E-Library.</p>
            </div>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 24px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px;">
              This is an automated confirmation sent to ${masked}. Please do not reply directly to this email.
            </p>
          </div>
        `,
      };

      await this.transporter.sendMail(customerMailOptions);

      if (process.env.ADMIN_EMAIL) {
        await this.transporter.sendMail({
          from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
          to: process.env.ADMIN_EMAIL,
          subject: 'New Order Received - E-Library',
          html: `<p>New order received from ${name} (${email}) for "${productName}". Total: ₹${totalPrice}. Order ID: ${orderId}</p>`,
        });
      }

      console.log(`[EmailService] Order confirmation email accepted by provider for ${masked}`);
      return { success: true, status: 'sent' };
    } catch (err) {
      console.error(`[EmailService Delivery Error] Failed to send order email to ${masked}:`, err.message);
      return { success: false, status: 'failed', error: err.message };
    }
  }
}

export const emailService = new EmailService();
