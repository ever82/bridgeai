"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.employerProfileResponseSchema = exports.verifyEmailSchema = exports.companyVerificationRequestSchema = exports.updateEmployerBrandingSchema = exports.updateEmployerProfileSchema = exports.createEmployerProfileSchema = exports.companyVerificationSchema = exports.companyBrandingSchema = exports.recruiterInfoSchema = exports.companyInfoSchema = exports.recruiterPhoneSchema = exports.recruiterEmailSchema = exports.recruiterTitleSchema = exports.recruiterNameSchema = exports.companyDescriptionSchema = exports.companyAddressSchema = exports.companyWebsiteSchema = exports.companyNameSchema = exports.workModeSchema = exports.verificationStatusSchema = exports.companyIndustrySchema = exports.companySizeSchema = void 0;
/**
 * Employer Schemas
 *
 * Zod schemas for employer profile validation
 */
const zod_1 = require("zod");
// ============================================================================
// Enums
// ============================================================================
exports.companySizeSchema = zod_1.z.enum([
    'STARTUP',
    'SMALL',
    'MEDIUM',
    'LARGE',
    'ENTERPRISE',
]);
exports.companyIndustrySchema = zod_1.z.enum([
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
exports.verificationStatusSchema = zod_1.z.enum([
    'UNVERIFIED',
    'PENDING',
    'EMAIL_VERIFIED',
    'BUSINESS_VERIFIED',
    'REJECTED',
]);
exports.workModeSchema = zod_1.z.enum([
    'REMOTE',
    'ONSITE',
    'HYBRID',
]);
// ============================================================================
// Field Validators
// ============================================================================
exports.companyNameSchema = zod_1.z
    .string()
    .min(1, 'Company name is required')
    .max(100, 'Company name must be less than 100 characters')
    .trim();
exports.companyWebsiteSchema = zod_1.z
    .string()
    .url('Invalid website URL')
    .max(200, 'Website URL must be less than 200 characters')
    .optional()
    .or(zod_1.z.literal(''));
exports.companyAddressSchema = zod_1.z
    .string()
    .min(1, 'Address is required')
    .max(500, 'Address must be less than 500 characters')
    .trim();
exports.companyDescriptionSchema = zod_1.z
    .string()
    .max(5000, 'Company description must be less than 5000 characters')
    .optional()
    .or(zod_1.z.literal(''));
exports.recruiterNameSchema = zod_1.z
    .string()
    .min(1, 'Recruiter name is required')
    .max(50, 'Name must be less than 50 characters')
    .trim();
exports.recruiterTitleSchema = zod_1.z
    .string()
    .min(1, 'Title is required')
    .max(100, 'Title must be less than 100 characters')
    .trim();
exports.recruiterEmailSchema = zod_1.z
    .string()
    .email('Invalid email address')
    .min(1, 'Email is required')
    .max(100, 'Email must be less than 100 characters')
    .trim();
exports.recruiterPhoneSchema = zod_1.z
    .string()
    .regex(/^\+?[\d\s-()]{8,20}$/, 'Invalid phone number')
    .optional()
    .or(zod_1.z.literal(''));
// ============================================================================
// Complex Schemas
// ============================================================================
exports.companyInfoSchema = zod_1.z.object({
    name: exports.companyNameSchema,
    size: exports.companySizeSchema,
    industry: exports.companyIndustrySchema,
    website: exports.companyWebsiteSchema,
    address: exports.companyAddressSchema,
    city: zod_1.z.string().min(1).max(100),
    description: exports.companyDescriptionSchema,
    logoUrl: zod_1.z.string().url().optional(),
    coverImageUrl: zod_1.z.string().url().optional(),
});
exports.recruiterInfoSchema = zod_1.z.object({
    name: exports.recruiterNameSchema,
    title: exports.recruiterTitleSchema,
    email: exports.recruiterEmailSchema,
    phone: exports.recruiterPhoneSchema,
    avatarUrl: zod_1.z.string().url().optional(),
});
exports.companyBrandingSchema = zod_1.z.object({
    primaryColor: zod_1.z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    logoUrl: zod_1.z.string().url().optional(),
    coverImageUrl: zod_1.z.string().url().optional(),
    companyPhotos: zod_1.z.array(zod_1.z.string().url()).max(10).optional(),
    videoUrl: zod_1.z.string().url().optional(),
});
exports.companyVerificationSchema = zod_1.z.object({
    status: exports.verificationStatusSchema,
    emailVerifiedAt: zod_1.z.string().datetime().optional(),
    businessLicenseUrl: zod_1.z.string().url().optional(),
    businessLicenseVerifiedAt: zod_1.z.string().datetime().optional(),
    rejectedReason: zod_1.z.string().max(500).optional(),
    submittedAt: zod_1.z.string().datetime().optional(),
    reviewedAt: zod_1.z.string().datetime().optional(),
});
// ============================================================================
// Request Schemas
// ============================================================================
exports.createEmployerProfileSchema = zod_1.z.object({
    companyInfo: zod_1.z.object({
        name: exports.companyNameSchema,
        size: exports.companySizeSchema,
        industry: exports.companyIndustrySchema,
        website: exports.companyWebsiteSchema,
        address: exports.companyAddressSchema,
        city: zod_1.z.string().min(1).max(100),
        description: exports.companyDescriptionSchema,
    }),
    recruiterInfo: zod_1.z.object({
        name: exports.recruiterNameSchema,
        title: exports.recruiterTitleSchema,
        email: exports.recruiterEmailSchema,
        phone: exports.recruiterPhoneSchema,
    }),
});
exports.updateEmployerProfileSchema = zod_1.z.object({
    companyInfo: zod_1.z.object({
        name: exports.companyNameSchema.optional(),
        size: exports.companySizeSchema.optional(),
        industry: exports.companyIndustrySchema.optional(),
        website: exports.companyWebsiteSchema.optional(),
        address: exports.companyAddressSchema.optional(),
        city: zod_1.z.string().min(1).max(100).optional(),
        description: exports.companyDescriptionSchema.optional(),
        logoUrl: zod_1.z.string().url().optional(),
        coverImageUrl: zod_1.z.string().url().optional(),
    }).optional(),
    recruiterInfo: zod_1.z.object({
        name: exports.recruiterNameSchema.optional(),
        title: exports.recruiterTitleSchema.optional(),
        email: exports.recruiterEmailSchema.optional(),
        phone: exports.recruiterPhoneSchema.optional(),
        avatarUrl: zod_1.z.string().url().optional(),
    }).optional(),
    branding: exports.companyBrandingSchema.optional(),
});
exports.updateEmployerBrandingSchema = exports.companyBrandingSchema;
exports.companyVerificationRequestSchema = zod_1.z.object({
    businessLicenseUrl: zod_1.z.string().url('Business license image URL is required'),
    businessRegistrationNumber: zod_1.z.string().min(1).max(100),
});
exports.verifyEmailSchema = zod_1.z.object({
    token: zod_1.z.string().min(1),
});
// ============================================================================
// Response Schemas
// ============================================================================
exports.employerProfileResponseSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    userId: zod_1.z.string().uuid(),
    agentId: zod_1.z.string().uuid(),
    companyInfo: exports.companyInfoSchema,
    recruiterInfo: exports.recruiterInfoSchema,
    verification: exports.companyVerificationSchema,
    branding: exports.companyBrandingSchema,
    activeJobIds: zod_1.z.array(zod_1.z.string().uuid()),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
//# sourceMappingURL=employerSchema.js.map