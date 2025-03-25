import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment variables
const envPath = path.join(__dirname, '../../.env');
dotenv.config({ path: envPath });

// Environment variable validation schema
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('5000'),
  
  // MongoDB
  MONGODB_URI: z.string().default('mongodb://localhost:27017/trading-journal'),
  
  // JWT
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_COOKIE_EXPIRES_IN: z.string().transform(Number).default('7'),
  JWT_REFRESH_SECRET: z.string().optional(),
  JWT_REFRESH_EXPIRES_IN: z.string().optional(),
  JWT_ACCESS_EXPIRES_IN: z.string().optional(),
  ABSOLUTE_SESSION_TIMEOUT: z.string().default('24h'),
  
  // CORS
  ALLOWED_ORIGINS: z.string().optional(),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
  // IP-based rate limiting
  IP_RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'), // 15 minutes
  IP_RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('500'), // Higher limit for IP-only
  
  // Security Headers
  CSP_REPORT_URI: z.string().optional(), // URI for CSP violation reports
  
  // Account Lockout
  MAX_LOGIN_ATTEMPTS: z.string().transform(Number).default('5'),
  ACCOUNT_LOCKOUT_DURATION: z.string().transform(Number).default('15'), // minutes
  ACCOUNT_LOCKOUT_MULTIPLIER: z.string().transform(Number).default('2'), // for progressive lockouts
  MAX_LOCKOUT_DURATION: z.string().transform(Number).default('60'), // minutes
  
  // Frontend
  FRONTEND_URL: z.string().optional(),
  
  // Email (SMTP)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_SECURE: z.string().transform(val => val === 'true').optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  
  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
});

// Validate environment variables
const envVars = envSchema.parse(process.env);

export const config = {
  env: envVars.NODE_ENV,
  isProduction: envVars.NODE_ENV === 'production',
  isDevelopment: envVars.NODE_ENV === 'development',
  isTest: envVars.NODE_ENV === 'test',
  
  server: {
    port: envVars.PORT,
  },
  
  db: {
    uri: envVars.MONGODB_URI,
  },
  
  jwt: {
    secret: envVars.JWT_SECRET,
    expiresIn: envVars.JWT_EXPIRES_IN,
    cookieExpiresIn: envVars.JWT_COOKIE_EXPIRES_IN,
    refreshSecret: envVars.JWT_REFRESH_SECRET || envVars.JWT_SECRET,
    refreshExpiresIn: envVars.JWT_REFRESH_EXPIRES_IN || '7d',
    accessExpiresIn: envVars.JWT_ACCESS_EXPIRES_IN || '15m',
    absoluteSessionTimeout: envVars.ABSOLUTE_SESSION_TIMEOUT,
  },
  
  cors: {
    allowedOrigins: envVars.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  },
  
  rateLimit: {
    windowMs: envVars.RATE_LIMIT_WINDOW_MS,
    maxRequests: envVars.RATE_LIMIT_MAX_REQUESTS,
    // IP-based rate limiting settings
    ip: {
      windowMs: envVars.IP_RATE_LIMIT_WINDOW_MS,
      maxRequests: envVars.IP_RATE_LIMIT_MAX_REQUESTS,
    }
  },
  
  security: {
    cspReportUri: envVars.CSP_REPORT_URI,
  },
  
  accountLockout: {
    maxLoginAttempts: envVars.MAX_LOGIN_ATTEMPTS,
    lockoutDuration: envVars.ACCOUNT_LOCKOUT_DURATION * 60 * 1000, // convert to milliseconds
    lockoutMultiplier: envVars.ACCOUNT_LOCKOUT_MULTIPLIER,
    maxLockoutDuration: envVars.MAX_LOCKOUT_DURATION * 60 * 1000, // convert to milliseconds
  },
  
  // Frontend URL for email links
  frontendUrl: envVars.FRONTEND_URL || 'http://localhost:5173',
  
  email: {
    host: envVars.SMTP_HOST,
    port: envVars.SMTP_PORT,
    secure: envVars.SMTP_SECURE,
    auth: {
      user: envVars.SMTP_USER,
      pass: envVars.SMTP_PASS,
    },
    from: envVars.SMTP_FROM,
  },
  
  cloudinary: {
    cloudName: envVars.CLOUDINARY_CLOUD_NAME,
    apiKey: envVars.CLOUDINARY_API_KEY,
    apiSecret: envVars.CLOUDINARY_API_SECRET,
  },
} as const; 