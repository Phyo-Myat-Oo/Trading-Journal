import nodemailer from 'nodemailer';

interface VerificationEmailParams {
  email: string;
  token: string;
  firstName: string;
  frontendUrl?: string;
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
}

export const emailService = new EmailService(); 