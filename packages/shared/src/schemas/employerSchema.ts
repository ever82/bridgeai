/**
 * Employer Schemas
 *
 * Zod schemas for employer profile validation
 */
import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================

export const companySizeSchema = z.enum([
  'STARTUP',
  'SMALL',
  'MEDIUM',
  'LARGE',
  'ENTERPRISE',
]);

export const companyIndustrySchema = z.enum([
  'TECH',
  'FINANCE',
  'HEALTHCARE',
  'EDUCATION',
  'MANUFACTURING',
  'RETAIL',
  'CONSULTING',
  'MEDIA',
  'REAL_ESTATE',
  'OTHER',
]);

export const verificationStatusSchema = z.enum([
  'UNVERIFIED',
  'PENDING',
  'EMAIL_VERIFIED',
  'BUSINESS_VERIFIED',
  'REJECTED',
]);

export const workModeSchema = z.enum([
  'REMOTE',
  'ONSITE',
  'HYBRID',
]);

// ============================================================================
// Field Validators
// ============================================================================

export const companyNameSchema = z
  .string()
  .min(1, 'Company name is required')
  .max(100, 'Company name must be less than 100 characters')
  .trim();

export const companyWebsiteSchema = z
  .string()
  .url('Invalid website URL')
  .max(200, 'Website URL must be less than 200 characters')
  .optional()
  .or(z.literal(''));

export const companyAddressSchema = z
  .string()
  .min(1, 'Address is required')
  .max(500, 'Address must be less than 500 characters')
  .trim();

export const companyDescriptionSchema = z
  .string()
  .max(5000, 'Company description must be less than 5000 characters')
  .optional()
  .or(z.literal(''));

export const recruiterNameSchema = z
  .string()
  .min(1, 'Recruiter name is required')
  .max(50, 'Name must be less than 50 characters')
  .trim();

export const recruiterTitleSchema = z
  .string()
  .min(1, 'Title is required')
  .max(100, 'Title must be less than 100 characters')
  .trim();

export const recruiterEmailSchema = z
  .string()
  .email('Invalid email address')
  .min(1, 'Email is required')
  .max(100, 'Email must be less than 100 characters')
  .trim();

export const recruiterPhoneSchema = z
  .string()
  .regex(/^\+?[\d\s-()]{8,20}$/, 'Invalid phone number')
  .optional()
  .or(z.literal(''));

// ============================================================================
// Complex Schemas
// ============================================================================

export const companyInfoSchema = z.object({
  name: companyNameSchema,
  size: companySizeSchema,
  industry: companyIndustrySchema,
  website: companyWebsiteSchema,
  address: companyAddressSchema,
  city: z.string().min(1).max(100),
  description: companyDescriptionSchema,
  logoUrl: z.string().url().optional(),
  coverImageUrl: z.string().url().optional(),
});

export const recruiterInfoSchema = z.object({
  name: recruiterNameSchema,
  title: recruiterTitleSchema,
  email: recruiterEmailSchema,
  phone: recruiterPhoneSchema,
  avatarUrl: z.string().url().optional(),
});

export const companyBrandingSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  logoUrl: z.string().url().optional(),
  coverImageUrl: z.string().url().optional(),
  companyPhotos: z.array(z.string().url()).max(10).optional(),
  videoUrl: z.string().url().optional(),
});

export const companyVerificationSchema = z.object({
  status: verificationStatusSchema,
  emailVerifiedAt: z.string().datetime().optional(),
  businessLicenseUrl: z.string().url().optional(),
  businessLicenseVerifiedAt: z.string().datetime().optional(),
  rejectedReason: z.string().max(500).optional(),
  submittedAt: z.string().datetime().optional(),
  reviewedAt: z.string().datetime().optional(),
});

// ============================================================================
// Request Schemas
// ============================================================================

export const createEmployerProfileSchema = z.object({
  companyInfo: z.object({
    name: companyNameSchema,
    size: companySizeSchema,
    industry: companyIndustrySchema,
    website: companyWebsiteSchema,
    address: companyAddressSchema,
    city: z.string().min(1).max(100),
    description: companyDescriptionSchema,
  }),
  recruiterInfo: z.object({
    name: recruiterNameSchema,
    title: recruiterTitleSchema,
    email: recruiterEmailSchema,
    phone: recruiterPhoneSchema,
  }),
});

export const updateEmployerProfileSchema = z.object({
  companyInfo: z.object({
    name: companyNameSchema.optional(),
    size: companySizeSchema.optional(),
    industry: companyIndustrySchema.optional(),
    website: companyWebsiteSchema.optional(),
    address: companyAddressSchema.optional(),
    city: z.string().min(1).max(100).optional(),
    description: companyDescriptionSchema.optional(),
    logoUrl: z.string().url().optional(),
    coverImageUrl: z.string().url().optional(),
  }).optional(),
  recruiterInfo: z.object({
    name: recruiterNameSchema.optional(),
    title: recruiterTitleSchema.optional(),
    email: recruiterEmailSchema.optional(),
    phone: recruiterPhoneSchema.optional(),
    avatarUrl: z.string().url().optional(),
  }).optional(),
  branding: companyBrandingSchema.optional(),
});

export const updateEmployerBrandingSchema = companyBrandingSchema;

export const companyVerificationRequestSchema = z.object({
  businessLicenseUrl: z.string().url('Business license image URL is required'),
  businessRegistrationNumber: z.string().min(1).max(100),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

// ============================================================================
// Response Schemas
// ============================================================================

export const employerProfileResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  agentId: z.string().uuid(),
  companyInfo: companyInfoSchema,
  recruiterInfo: recruiterInfoSchema,
  verification: companyVerificationSchema,
  branding: companyBrandingSchema,
  activeJobIds: z.array(z.string().uuid()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
