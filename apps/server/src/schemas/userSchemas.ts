/**
 * User Schemas
 *
 * Zod schemas for user-related request validation
 */
import { z } from 'zod';

// ============================================================================
// Common Field Validators
// ============================================================================

/**
 * User ID validator - UUID v4 format
 */
export const userIdSchema = z
  .string()
  .uuid('Invalid user ID format')
  .describe('User ID in UUID v4 format');

/**
 * Email validator with strict validation
 */
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .max(255, 'Email must be less than 255 characters')
  .email('Invalid email format')
  .toLowerCase()
  .describe('Valid email address');

/**
 * Password validator with security requirements
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/\d/, 'Password must contain at least one digit')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
  .describe('Secure password with minimum requirements');

/**
 * Username validator
 */
export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be less than 30 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')
  .describe('Username for display');

/**
 * Display name validator
 */
export const displayNameSchema = z
  .string()
  .min(1, 'Display name is required')
  .max(50, 'Display name must be less than 50 characters')
  .trim()
  .describe('User display name');

/**
 * Phone number validator (international format)
 */
export const phoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{1,14}$/, 'Phone number must be in international format (+1234567890)')
  .optional()
  .or(z.literal(''))
  .describe('International phone number');

/**
 * Avatar URL validator
 */
export const avatarUrlSchema = z
  .string()
  .url('Invalid URL format')
  .max(2048, 'URL too long')
  .optional()
  .or(z.literal(''))
  .describe('Avatar image URL');

/**
 * Bio validator
 */
export const bioSchema = z
  .string()
  .max(500, 'Bio must be less than 500 characters')
  .optional()
  .or(z.literal(''))
  .describe('User biography');

// ============================================================================
// Request Schemas
// ============================================================================

/**
 * User registration request
 */
export const registerUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
  displayName: displayNameSchema.optional(),
  phone: phoneSchema,
  avatarUrl: avatarUrlSchema,
  bio: bioSchema,
});

export type RegisterUserInput = z.infer<typeof registerUserSchema>;

/**
 * User login request
 */
export const loginUserSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

export type LoginUserInput = z.infer<typeof loginUserSchema>;

/**
 * Update user profile request
 */
export const updateUserSchema = z.object({
  displayName: displayNameSchema.optional(),
  phone: phoneSchema,
  avatarUrl: avatarUrlSchema,
  bio: bioSchema,
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

/**
 * Change password request
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, 'Password confirmation is required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'New passwords do not match',
  path: ['confirmPassword'],
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/**
 * Reset password request
 */
export const resetPasswordSchema = z.object({
  email: emailSchema,
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/**
 * Set new password after reset
 */
export const setNewPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, 'Password confirmation is required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type SetNewPasswordInput = z.infer<typeof setNewPasswordSchema>;

// ============================================================================
// Params Schemas
// ============================================================================

/**
 * User ID param for routes like /users/:userId
 */
export const userIdParamsSchema = z.object({
  userId: userIdSchema,
});

export type UserIdParams = z.infer<typeof userIdParamsSchema>;

/**
 * Username param for routes like /users/:username
 */
export const usernameParamsSchema = z.object({
  username: usernameSchema,
});

export type UsernameParams = z.infer<typeof usernameParamsSchema>;

// ============================================================================
// Query Schemas
// ============================================================================

/**
 * User list query parameters
 */
export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'username', 'displayName']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  role: z.enum(['user', 'admin', 'moderator']).optional(),
  isActive: z.coerce.boolean().optional(),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

/**
 * Search users query
 */
export const searchUsersQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required').max(100),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type SearchUsersQuery = z.infer<typeof searchUsersQuerySchema>;
