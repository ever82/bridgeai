/**
 * Validation utilities for mobile app
 *
 * Provides validation functions and schemas for React Native forms.
 * Validation rules are synchronized with server-side schemas.
 */

import { z } from 'zod';

// ============================================================================
// Legacy Validation Functions (backward compatibility)
// ============================================================================

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * Requires at least 6 characters
 */
export function isValidPassword(password: string): boolean {
  return password.length >= 6;
}

/**
 * Validate username
 * Requires 3-20 characters, alphanumeric and underscores
 */
export function isValidUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
}

// ============================================================================
// Shared Validation Rules (aligned with server schemas)
// ============================================================================

/**
 * Email validation rule
 */
export const emailRule = z
  .string()
  .min(1, 'Email is required')
  .max(255, 'Email must be less than 255 characters')
  .email('Invalid email format');

/**
 * Password validation rule with security requirements
 */
export const passwordRule = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/\d/, 'Password must contain at least one digit')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

/**
 * Username validation rule
 */
export const usernameRule = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username can only contain letters, numbers, underscores, and hyphens')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens');

/**
 * Display name validation rule
 */
export const displayNameRule = z
  .string()
  .min(1, 'Display name is required')
  .max(50, 'Display name must be less than 50 characters');

/**
 * Phone number validation rule (international format)
 */
export const phoneRule = z
  .string()
  .regex(/^\+[1-9]\d{1,14}$/, 'Phone number must be in international format (+1234567890)')
  .optional()
  .or(z.literal(''));

/**
 * Bio validation rule
 */
export const bioRule = z
  .string()
  .max(500, 'Bio must be less than 500 characters')
  .optional()
  .or(z.literal(''));

// ============================================================================
// Form Validation Schemas
// ============================================================================

/**
 * Login form schema
 */
export const loginSchema = z.object({
  email: emailRule,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Registration form schema
 */
export const registerSchema = z
  .object({
    email: emailRule,
    username: usernameRule,
    displayName: displayNameRule.optional(),
    password: passwordRule,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    phone: phoneRule,
    agreeToTerms: z.boolean().refine((val) => val === true, {
      message: 'You must agree to the terms and conditions',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

/**
 * Profile update form schema
 */
export const updateProfileSchema = z.object({
  displayName: displayNameRule.optional(),
  phone: phoneRule,
  bio: bioRule,
});

export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;

/**
 * Change password form schema
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordRule,
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New passwords do not match',
    path: ['confirmPassword'],
  });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

/**
 * Forgot password form schema
 */
export const forgotPasswordSchema = z.object({
  email: emailRule,
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

/**
 * Reset password form schema
 */
export const resetPasswordSchema = z
  .object({
    password: passwordRule,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

// ============================================================================
// Chat/Message Validation Schemas
// ============================================================================

/**
 * Send message form schema
 */
export const sendMessageSchema = z.object({
  content: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(10000, 'Message is too long'),
});

export type SendMessageFormData = z.infer<typeof sendMessageSchema>;

/**
 * Create conversation form schema
 */
export const createConversationSchema = z.object({
  title: z
    .string()
    .max(200, 'Title must be less than 200 characters')
    .optional(),
});

export type CreateConversationFormData = z.infer<typeof createConversationSchema>;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validate a single field against a Zod schema
 */
export function validateField<T>(
  schema: z.ZodType<T>,
  value: unknown
): { valid: boolean; error?: string } {
  const result = schema.safeParse(value);
  if (result.success) {
    return { valid: true };
  }

  const errorMessage = result.error.errors[0]?.message || 'Invalid value';
  return { valid: false, error: errorMessage };
}

/**
 * Validate an entire form object
 */
export function validateForm<T extends z.ZodType>(
  schema: T,
  data: unknown
): { valid: boolean; errors?: Record<string, string>; data?: z.infer<T> } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { valid: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  for (const error of result.error.errors) {
    const path = error.path.join('.');
    if (!errors[path]) {
      errors[path] = error.message;
    }
  }

  return { valid: false, errors };
}

/**
 * Get password strength score (0-5)
 */
export function getPasswordStrength(password: string): number {
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  return Math.min(score, 5);
}

/**
 * Get password strength label
 */
export function getPasswordStrengthLabel(score: number): {
  label: string;
  color: string;
} {
  const labels = [
    { label: 'Very Weak', color: '#FF4444' },
    { label: 'Weak', color: '#FF8844' },
    { label: 'Fair', color: '#FFAA44' },
    { label: 'Good', color: '#44AA44' },
    { label: 'Strong', color: '#44CC44' },
    { label: 'Very Strong', color: '#228B22' },
  ];

  return labels[score] || labels[0];
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';

  // Remove all non-numeric characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');

  // Format based on length
  if (cleaned.startsWith('+1') && cleaned.length === 12) {
    // US format: +1 (XXX) XXX-XXXX
    return `+1 (${cleaned.slice(2, 5)}) ${cleaned.slice(5, 8)}-${cleaned.slice(8)}`;
  }

  if (cleaned.startsWith('+86') && cleaned.length === 14) {
    // China format: +86 XXX XXXX XXXX
    return `+86 ${cleaned.slice(3, 6)} ${cleaned.slice(6, 10)} ${cleaned.slice(10)}`;
  }

  return cleaned;
}

/**
 * Validate file type
 */
export function validateFileType(
  file: { name: string; type: string },
  allowedTypes: string[]
): boolean {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  return allowedTypes.includes(extension) || allowedTypes.includes(file.type);
}

/**
 * Validate file size
 */
export function validateFileSize(file: { size: number }, maxSize: number): boolean {
  return file.size <= maxSize;
}

// ============================================================================
// Re-export Zod for convenience
// ============================================================================

export { z };

// ============================================================================
// Default Export
// ============================================================================

export default {
  isValidEmail,
  isValidPassword,
  isValidUsername,
  loginSchema,
  registerSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  sendMessageSchema,
  createConversationSchema,
  validateField,
  validateForm,
  getPasswordStrength,
  getPasswordStrengthLabel,
  formatPhoneNumber,
  validateFileType,
  validateFileSize,
};

