/**
 * Auth Schemas
 *
 * Zod schemas for auth-related request validation
 */
import { z } from 'zod';

// ============================================================================
// Field Validators
// ============================================================================

/**
 * OAuth provider validator
 */
export const oauthProviderSchema = z.enum(['wechat', 'google']);

// ============================================================================
// Request Schemas
// ============================================================================

/**
 * User registration request - accepts email OR phone (not both required)
 */
export const registerSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Phone must be in international format').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
  verificationCode: z.string().optional(),
}).refine(
  (data) => data.email || data.phone,
  { message: 'Email or phone is required', path: ['email'] }
);

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * User login request - accepts email OR phone
 */
export const loginSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Phone must be in international format').optional(),
  password: z.string().min(1, 'Password is required'),
  verificationCode: z.string().optional(),
  rememberMe: z.boolean().optional().default(false),
}).refine(
  (data) => data.email || data.phone,
  { message: 'Email or phone is required', path: ['email'] }
);

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Refresh token request
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

/**
 * Forgot password request
 */
export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Phone must be in international format').optional(),
}).refine(
  (data) => data.email || data.phone,
  { message: 'Email or phone is required', path: ['email'] }
);

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/**
 * Reset password request
 */
export const resetPasswordSchema = z.object({
  resetToken: z.string().min(1, 'Reset token is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one digit')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/**
 * Change password request
 */
export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Old password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one digit')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/**
 * OAuth bind request
 */
export const oauthBindSchema = z.object({
  code: z.string().min(1, 'OAuth code is required'),
});

export type OAuthBindInput = z.infer<typeof oauthBindSchema>;
