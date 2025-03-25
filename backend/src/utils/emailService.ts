import nodemailer from 'nodemailer';

interface VerificationEmailParams {
  email: string;
  token: string;
  firstName: string;
  frontendUrl?: string;
}

interface AccountLockoutEmailParams {
  email: string;
  firstName: string;
  lockoutDuration: number; // in minutes
  lockedUntil: Date;
  frontendUrl?: string;
  requiresAdminUnlock?: boolean;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // In test mode, create a testing transporter
    if (process.env.NODE_ENV === 'test') {
      this.transporter = nodemailer.createTransport({
        host: 'localhost',
        port: 1025,
        secure: false,
        auth: {
          user: 'testuser',
          pass: 'testpass',
        },
        tls: {
          rejectUnauthorized: false
        }
      });
    } else {
      // Use environment variables directly
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          // Do not fail on invalid certs
          rejectUnauthorized: false,
          // Use TLS 1.2
          minVersion: 'TLSv1.2'
        }
      });
    }
  }

  async sendVerificationEmail(params: VerificationEmailParams): Promise<void> {
    const { email, token, firstName, frontendUrl: userProvidedUrl } = params;
    
    // In test mode, don't actually send emails
    if (process.env.NODE_ENV === 'test') {
      console.log('Test mode: Verification email would be sent to', email);
      return;
    }
    
    // Use provided frontendUrl, env frontendUrl, or default
    const frontendUrl = userProvidedUrl || process.env.FRONTEND_URL || 'http://localhost:5173';
    // Update URL format to match the frontend route structure
    const verificationUrl = `${frontendUrl}/verify-email/${token}`;
    
    console.log(`Sending verification email to ${email} with verification URL: ${verificationUrl}`);
    
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@tradingjournal.com',
      to: email,
      subject: 'Verify your email address',
      html: `
        <h1>Welcome to Trading Journal, ${firstName}!</h1>
        <p>Please click the link below to verify your email address:</p>
        <a href="${verificationUrl}">${verificationUrl}</a>
        <p>This link will expire in 24 hours.</p>
      `,
    });
  }

  async sendResetPasswordEmail(email: string, token: string): Promise<void> {
    try {
      console.log('[EmailService] Starting reset password email process');
      console.log('[EmailService] Sending to:', email);
      
    // In test mode, don't actually send emails
      if (process.env.NODE_ENV === 'test') {
        console.log('[EmailService] Test mode: Password reset email would be sent to', email);
      return;
    }
    
      // Use FRONTEND_URL directly from process.env, just like in verification email
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      // Update URL format to match the route format in our React app
      const resetUrl = `${frontendUrl}/reset-password/${token}`;
      
      console.log(`[EmailService] Preparing reset email to ${email} with reset URL: ${resetUrl}`);
      console.log(`[EmailService] SMTP Settings: Host=${process.env.SMTP_HOST}, Port=${process.env.SMTP_PORT}, User=${process.env.SMTP_USER}, From=${process.env.SMTP_FROM}`);
      
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@tradingjournal.com',
      to: email,
        subject: 'Reset your password - Trading Journal',
      html: `
        <h1>Password Reset Request</h1>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
          <hr>
          <p><em>Note: This email may appear in your spam/junk folder. If you don't see it in your inbox, please check there.</em></p>
        `,
      };
      
      console.log('[EmailService] Sending email with options:', {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject
      });
      
      try {
        const info = await this.transporter.sendMail(mailOptions);
        console.log('[EmailService] Email sent successfully:', info.messageId);
        console.log('[EmailService] Response:', info.response);
      } catch (sendError) {
        console.error('[EmailService] Failed to send email through SMTP:', sendError);
        
        // Check for common Gmail issues
        const errorMessage = sendError instanceof Error ? sendError.message : String(sendError);
        if (errorMessage.includes('Invalid login')) {
          console.error('[EmailService] Gmail authentication failed - check app password');
        } else if (errorMessage.includes('Authorization failed')) {
          console.error('[EmailService] Gmail authorization failed - enable "Less secure app access" or use app password');
        } else if (errorMessage.includes('Rate limit exceeded')) {
          console.error('[EmailService] Gmail rate limit exceeded - try again later');
        }
        
        throw sendError;
      }
    } catch (error) {
      console.error('[EmailService] Failed to send reset password email:', error);
      throw error;
    }
  }

  async sendAccountLockoutEmail(params: AccountLockoutEmailParams): Promise<void> {
    const { email, firstName, lockoutDuration, lockedUntil, frontendUrl: userProvidedUrl, requiresAdminUnlock } = params;
    
    // In test mode, don't actually send emails
    if (process.env.NODE_ENV === 'test') {
      console.log('Test mode: Account lockout email would be sent to', email);
      return;
    }
    
    // Use provided frontendUrl, env frontendUrl, or default
    const frontendUrl = userProvidedUrl || process.env.FRONTEND_URL || 'http://localhost:5173';
    
    // Format the lockout time into a readable string
    const lockedUntilTime = lockedUntil.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    
    // Format the date
    const lockedUntilDate = lockedUntil.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
    
    // Customize message based on whether admin unlock is required
    const adminUnlockMessage = requiresAdminUnlock 
      ? `<p><strong>Note:</strong> Due to multiple lockouts, your account now requires administrator assistance to unlock. Please contact support for help.</p>`
      : '';
    
    const adminUnlockTextMessage = requiresAdminUnlock
      ? `Note: Due to multiple lockouts, your account now requires administrator assistance to unlock. Please contact support for help.`
      : '';
    
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'Trading Journal <noreply@trading-journal.com>',
        to: email,
        subject: 'Account Security Alert - Your Account Has Been Locked',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <h2 style="color: #d32f2f;">Account Security Alert</h2>
            <p>Hello ${firstName},</p>
            <p>We've detected multiple failed login attempts to your Trading Journal account. For your security, we've temporarily locked your account.</p>
            <p><strong>Account Status:</strong> Locked</p>
            <p><strong>Lockout Duration:</strong> ${lockoutDuration} minute${lockoutDuration !== 1 ? 's' : ''}</p>
            <p><strong>Account will be unlocked at:</strong> ${lockedUntilTime} on ${lockedUntilDate}</p>
            ${adminUnlockMessage}
            <p>If you didn't attempt to log in recently, we recommend changing your password immediately once your account is unlocked.</p>
            <p>To reset your password once your account is unlocked, visit <a href="${frontendUrl}/forgot-password">Reset Password</a>.</p>
            <p>If you need immediate assistance, please contact our support team.</p>
            <p style="margin-top: 30px;">Regards,<br>The Trading Journal Team</p>
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #777;">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        `,
        text: `
          Account Security Alert
          
          Hello ${firstName},
          
          We've detected multiple failed login attempts to your Trading Journal account. For your security, we've temporarily locked your account.
          
          Account Status: Locked
          Lockout Duration: ${lockoutDuration} minute${lockoutDuration !== 1 ? 's' : ''}
          Account will be unlocked at: ${lockedUntilTime} on ${lockedUntilDate}
          
          ${adminUnlockTextMessage}
          
          If you didn't attempt to log in recently, we recommend changing your password immediately once your account is unlocked.
          
          To reset your password once your account is unlocked, visit: ${frontendUrl}/forgot-password
          
          If you need immediate assistance, please contact our support team.
          
          Regards,
          The Trading Journal Team
          
          This is an automated message. Please do not reply to this email.
        `
      });
      console.log(`Account lockout notification email sent to ${email}`);
    } catch (error) {
      console.error('Error sending account lockout email:', error);
      throw new Error('Failed to send account lockout email');
    }
  }

  async sendAccountUnlockEmail(email: string, firstName: string): Promise<void> {
    // In test mode, don't actually send emails
    if (process.env.NODE_ENV === 'test') {
      console.log('Test mode: Account unlock email would be sent to', email);
      return;
    }
    
    // Use environment variable or default frontend URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'Trading Journal <noreply@trading-journal.com>',
        to: email,
        subject: 'Your Account Has Been Unlocked',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <h2 style="color: #4caf50;">Account Unlocked</h2>
            <p>Hello ${firstName},</p>
            <p>Your Trading Journal account has been unlocked by an administrator. You can now log in to your account.</p>
            <p>If you believe this was done in error or have any questions, please contact support.</p>
            <p>You can login to your account at <a href="${frontendUrl}/login">${frontendUrl}/login</a></p>
            <p style="margin-top: 30px;">Regards,<br>The Trading Journal Team</p>
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #777;">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        `,
        text: `
          Account Unlocked
          
          Hello ${firstName},
          
          Your Trading Journal account has been unlocked by an administrator. You can now log in to your account.
          
          If you believe this was done in error or have any questions, please contact support.
          
          You can login to your account at ${frontendUrl}/login
          
          Regards,
          The Trading Journal Team
          
          This is an automated message. Please do not reply to this email.
        `
      });
      console.log(`Account unlock notification email sent to ${email}`);
    } catch (error) {
      console.error('Error sending account unlock email:', error);
      throw new Error('Failed to send account unlock email');
    }
  }

  /**
   * Send password reset confirmation email
   */
  async sendPasswordResetConfirmationEmail({
    email,
    firstName
  }: {
    email: string;
    firstName: string;
  }): Promise<void> {
    const subject = 'Password Reset Confirmation';
    
    // In test mode, don't actually send emails
    if (process.env.NODE_ENV === 'test') {
      console.log('Test mode: Password reset confirmation email would be sent to', email);
      return;
    }
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Successful</h2>
        <p>Hello ${firstName},</p>
        <p>Your password has been successfully reset. If you did not initiate this change, please contact our support team immediately.</p>
        <p>For security reasons, we recommend that you:</p>
        <ul>
          <li>Log out of all active sessions</li>
          <li>Review your recent account activity</li>
          <li>Update any other accounts where you use the same password</li>
        </ul>
        <p>Thank you for using our service!</p>
        <p>Best regards,<br>The Trading Journal Team</p>
      </div>
    `;

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@tradingjournal.com',
      to: email,
      subject,
      html
    });
  }
}

export const emailService = new EmailService(); 