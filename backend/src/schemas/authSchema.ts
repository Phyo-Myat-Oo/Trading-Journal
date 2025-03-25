import { z } from 'zod';

// Strong password regex that requires at least one upper case letter, one lower case letter, one number, and one special character
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      strongPasswordRegex,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional()
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// Alias resetPasswordSchema as forgotPasswordSchema for backward compatibility
export const forgotPasswordSchema = resetPasswordSchema;

export const updatePasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      strongPasswordRegex,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
}); 