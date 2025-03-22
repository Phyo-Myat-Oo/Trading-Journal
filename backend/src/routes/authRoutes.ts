import { register, login, requestPasswordReset, resetPassword, refreshToken, logout, checkCookies, verifyEmail, resendVerification, checkPermission } from '../controllers/authController';
import { validateRequest } from '../middleware/validateRequest';
import { loginSchema, registerSchema, resetPasswordSchema, forgotPasswordSchema, updatePasswordSchema } from '../schemas/authSchema';
import { asyncHandler } from '../middleware/asyncHandler';
import { emailService } from '../utils/emailService';
import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { Request, Response } from 'express';
import nodemailer from 'nodemailer';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication endpoints
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: "********"
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Doe
 *     responses:
 *       201:
 *         description: User successfully registered
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User registered successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register', validateRequest(registerSchema), asyncHandler(register));

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "********"
 *     responses:
 *       200:
 *         description: User successfully logged in
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', validateRequest(loginSchema), asyncHandler(login));

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Password reset email sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Password reset email sent
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/forgot-password', validateRequest(forgotPasswordSchema), asyncHandler(requestPasswordReset));

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password using token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: "********"
 *     responses:
 *       200:
 *         description: Password successfully reset
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Password reset successful
 *       400:
 *         description: Invalid token or password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/reset-password', validateRequest(updatePasswordSchema), asyncHandler(resetPassword));

// Test route for email service
router.post('/test-email', async (req, res) => {
  try {
    await emailService.sendResetPasswordEmail(
      'test@example.com',
      'test-token'
    );
    res.json({ message: 'Test email sent successfully' });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ message: 'Error sending test email' });
  }
});

// Test cookie route
router.get('/test-cookie', (req, res) => {
  // Set a test cookie
  res.cookie('testCookie', 'cookieValue', {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 900000, // 15 minutes
    path: '/'
  });
  
  res.json({
    message: 'Test cookie set',
    cookies: req.cookies
  });
});

// Refresh token
router.post('/refresh-token', asyncHandler(refreshToken));

// Protected auth routes
router.post('/logout', authenticate, asyncHandler(logout));

// Check user permissions for a resource
router.post('/check-permission', authenticate, asyncHandler(checkPermission));

// Debug route to check all cookies
router.get('/debug-cookies', (req, res) => {
  console.log('Debug cookies endpoint called');
  console.log('Cookies received:', req.cookies);
  console.log('Headers:', req.headers);
  
  res.json({
    message: 'Cookie debug info',
    cookies: req.cookies,
    headers: {
      cookie: req.headers.cookie,
      origin: req.headers.origin,
      referer: req.headers.referer
    }
  });
});

// New cookie check endpoint
router.get('/check-cookies', asyncHandler(checkCookies));

/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     summary: Verify user email with token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Email verification token
 *     responses:
 *       200:
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Email verified successfully
 *       401:
 *         description: Invalid or expired token
 *       404:
 *         description: User not found
 */
router.post('/verify-email', asyncHandler(verifyEmail));

/**
 * @swagger
 * /api/auth/resend-verification:
 *   post:
 *     summary: Resend verification email
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *     responses:
 *       200:
 *         description: Verification email sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Verification email sent successfully.
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post('/resend-verification', asyncHandler(resendVerification));

// Add a test endpoint for email sending (DEVELOPMENT ONLY)
if (process.env.NODE_ENV !== 'production') {
  router.post('/test-email', asyncHandler(async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }
      
      console.log('[TEST] Sending test email to:', email);
      
      // Generate a test token
      const testToken = 'test-token-' + Date.now();
      
      await emailService.sendResetPasswordEmail(email, testToken);
      
      res.json({ 
        message: 'Test email sent successfully',
        email,
        testToken
      });
    } catch (error) {
      console.error('[TEST] Error sending test email:', error);
      res.status(500).json({ 
        message: 'Failed to send test email', 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }));
}

// Add a diagnostic endpoint for email configuration (DEVELOPMENT ONLY)
if (process.env.NODE_ENV !== 'production') {
  router.get('/email-diagnostics', asyncHandler(async (_req: Request, res: Response) => {
    try {
      // Collect all email-related environment variables
      const emailConfig = {
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_PORT: process.env.SMTP_PORT,
        SMTP_SECURE: process.env.SMTP_SECURE,
        SMTP_USER: process.env.SMTP_USER ? 'Set' : 'Not set',
        SMTP_PASS: process.env.SMTP_PASS ? 'Set' : 'Not set',
        SMTP_FROM: process.env.SMTP_FROM,
        FRONTEND_URL: process.env.FRONTEND_URL,
        NODE_ENV: process.env.NODE_ENV,
        JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'Not set'
      };
      
      // Check if nodemailer can create a transport
      let transportStatus;
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });
        transportStatus = 'Transport created successfully';
        
        // Verify connection configuration
        await transporter.verify();
        transportStatus += ' - Connection verified';
      } catch (error) {
        transportStatus = `Error creating transport: ${error instanceof Error ? error.message : String(error)}`;
      }
      
      res.json({ 
        message: 'Email diagnostics', 
        emailConfig,
        transportStatus
      });
    } catch (error) {
      console.error('[Diagnostics] Error:', error);
      res.status(500).json({ 
        message: 'Failed to run diagnostics', 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }));
}

// Add a simple direct test email endpoint (DEVELOPMENT ONLY)
if (process.env.NODE_ENV !== 'production') {
  router.post('/simple-test-email', asyncHandler(async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }
      
      console.log('[SIMPLE-TEST] Sending simple test email to:', email);
      
      // Create transporter directly to test
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      
      // Send a very simple email
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@tradingjournal.com',
        to: email,
        subject: 'Simple Test Email',
        text: 'This is a simple test email to check if Gmail is delivering messages.'
      });
      
      res.json({ 
        message: 'Simple test email sent',
        email,
        messageId: info.messageId,
        response: info.response
      });
    } catch (error) {
      console.error('[SIMPLE-TEST] Error sending test email:', error);
      res.status(500).json({ 
        message: 'Failed to send simple test email', 
        error: error instanceof Error ? error.message : String(error),
        errorDetails: error
      });
    }
  }));
}

export default router; 