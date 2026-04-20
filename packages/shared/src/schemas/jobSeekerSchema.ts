/**
 * Job Seeker Schemas
 *
 * Zod schemas for job seeker profile and resume validation
 */
import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================

export const skillLevelSchema = z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']);

export const resumeVisibilitySchema = z.enum(['PUBLIC', 'APPLICATION_ONLY', 'HIDDEN']);

export const workModeSchema = z.enum(['REMOTE', 'ONSITE', 'HYBRID']);

export const jobTypeSchema = z.enum([
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'INTERNSHIP',
  'FREELANCE',
]);

export const experienceLevelSchema = z.enum([
  'ENTRY',
  'JUNIOR',
  'MID',
  'SENIOR',
  'EXPERT',
]);

export const salaryPeriodSchema = z.enum(['MONTHLY', 'YEARLY']);

export const maskingTypeSchema = z.enum(['PHONE', 'EMAIL', 'NAME']);

// ============================================================================
// Field Validators
// ============================================================================

export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(50, 'Name must be less than 50 characters')
  .trim();

export const phoneSchema = z
  .string()
  .regex(/^\+?[\d\s-()]{8,20}$/, 'Invalid phone number')
  .optional()
  .or(z.literal(''));

export const emailSchema = z
  .string()
  .email('Invalid email address')
  .max(100)
  .optional()
  .or(z.literal(''));

// ============================================================================
// Work Experience
// ============================================================================

export const workExperienceSchema = z.object({
  id: z.string().uuid().optional(),
  company: z.string().min(1, 'Company is required').max(100),
  title: z.string().min(1, 'Job title is required').max(100),
  startDate: z.string().regex(/^\d{4}-\d{2}$/, 'Start date must be YYYY-MM format'),
  endDate: z.string().regex(/^\d{4}-\d{2}$/, 'End date must be YYYY-MM format').optional(),
  isCurrent: z.boolean().default(false),
  description: z.string().max(2000).optional(),
  achievements: z.array(z.string().max(500)).max(10).optional(),
  skills: z.array(z.string().max(50)).max(20).optional(),
  location: z.string().max(100).optional(),
});

// ============================================================================
// Education
// ============================================================================

export const educationSchema = z.object({
  id: z.string().uuid().optional(),
  institution: z.string().min(1, 'Institution is required').max(200),
  degree: z.string().min(1, 'Degree is required').max(100),
  field: z.string().min(1, 'Field of study is required').max(100),
  startDate: z.string().regex(/^\d{4}$/, 'Start date must be YYYY format'),
  endDate: z.string().regex(/^\d{4}$/, 'End date must be YYYY format').optional(),
  isCurrent: z.boolean().default(false),
  gpa: z.string().max(10).optional(),
  description: z.string().max(1000).optional(),
});

// ============================================================================
// Skills
// ============================================================================

export const skillTagSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Skill name is required').max(50),
  category: z.string().max(50).optional(),
  level: skillLevelSchema.optional(),
  yearsOfExperience: z.number().int().min(0).max(50).optional(),
  verified: z.boolean().optional(),
});

// ============================================================================
// Salary Expectations
// ============================================================================

export const salaryExpectationSchema = z.object({
  min: z.number().int().min(0),
  max: z.number().int().min(0),
  period: salaryPeriodSchema,
  currency: z.string().length(3).default('CNY'),
  isNegotiable: z.boolean().default(false),
}).refine(data => data.max >= data.min, {
  message: 'Maximum salary must be greater than or equal to minimum salary',
  path: ['max'],
});

// ============================================================================
// Job Preferences
// ============================================================================

export const jobPreferencesSchema = z.object({
  preferredJobTypes: z.array(jobTypeSchema).min(1).max(5),
  preferredWorkModes: z.array(workModeSchema).min(1).max(3),
  preferredLocations: z.array(z.string().max(100)).min(1).max(10),
  preferredIndustries: z.array(z.string().max(100)).max(10).optional(),
  preferredCompanies: z.array(z.string().max(100)).max(10).optional(),
  preferredSalary: salaryExpectationSchema.optional(),
  noticePeriodDays: z.number().int().min(0).max(365).optional(),
  willingToRelocate: z.boolean().default(false),
  remoteOnly: z.boolean().default(false),
});

// ============================================================================
// Contact Info
// ============================================================================

export const contactInfoSchema = z.object({
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  wechat: z.string().max(50).optional(),
  linkedin: z.string().url().max(200).optional(),
  github: z.string().url().max(200).optional(),
  portfolio: z.string().url().max(200).optional(),
});

// ============================================================================
// Profile Request Schemas
// ============================================================================

export const createJobSeekerProfileSchema = z.object({
  name: nameSchema,
  age: z.string().max(10).optional(),
  gender: z.string().max(20).optional(),
  location: z.string().max(100).optional(),
  currentTitle: z.string().max(100).optional(),
  summary: z.string().max(2000).optional(),
  skills: z.array(skillTagSchema).max(50).optional(),
  workExperiences: z.array(workExperienceSchema).max(20).optional(),
  educations: z.array(educationSchema).max(10).optional(),
  certifications: z.array(z.string().max(100)).max(20).optional(),
  languages: z.array(z.string().max(50)).max(10).optional(),
  preferences: jobPreferencesSchema.optional(),
  contactInfo: contactInfoSchema.optional(),
  visibility: resumeVisibilitySchema.default('APPLICATION_ONLY'),
  resumeUrl: z.string().url().optional(),
  resumeFileName: z.string().max(255).optional(),
  isPrimary: z.boolean().default(true),
});

export const updateJobSeekerProfileSchema = z.object({
  name: nameSchema.optional(),
  age: z.string().max(10).optional(),
  gender: z.string().max(20).optional(),
  location: z.string().max(100).optional(),
  currentTitle: z.string().max(100).optional(),
  summary: z.string().max(2000).optional(),
  skills: z.array(skillTagSchema).max(50).optional(),
  workExperiences: z.array(workExperienceSchema).max(20).optional(),
  educations: z.array(educationSchema).max(10).optional(),
  certifications: z.array(z.string().max(100)).max(20).optional(),
  languages: z.array(z.string().max(50)).max(10).optional(),
  preferences: jobPreferencesSchema.optional(),
  contactInfo: contactInfoSchema.optional(),
  visibility: resumeVisibilitySchema.optional(),
  resumeUrl: z.string().url().optional(),
  resumeFileName: z.string().max(255).optional(),
  isPrimary: z.boolean().optional(),
});

export const updateVisibilitySchema = z.object({
  visibility: resumeVisibilitySchema,
  maskedFields: z.array(z.string()).optional(),
});

export const profileFilterSchema = z.object({
  isPrimary: z.boolean().optional(),
  visibility: resumeVisibilitySchema.optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// ============================================================================
// Resume Export
// ============================================================================

export const resumeExportFormatSchema = z.enum(['PDF', 'MARKDOWN', 'JSON', 'HTML']);

export const exportResumeSchema = z.object({
  format: resumeExportFormatSchema.default('MARKDOWN'),
  includeContactInfo: z.boolean().default(true),
  includeSkills: z.boolean().default(true),
  includeWorkExperience: z.boolean().default(true),
  includeEducation: z.boolean().default(true),
  includeCertifications: z.boolean().default(true),
  includeSummary: z.boolean().default(true),
});

// ============================================================================
// Quality Report
// ============================================================================

export const resumeQualityReportSchema = z.object({
  overallScore: z.number().min(0).max(100),
  completenessScore: z.number().min(0).max(100),
  clarityScore: z.number().min(0).max(100),
  keywordScore: z.number().min(0).max(100),
  achievementScore: z.number().min(0).max(100),
  missingFields: z.array(z.string()),
  suggestions: z.array(z.string()),
  skillMatchScore: z.number().min(0).max(100).optional(),
  competitivenessScore: z.number().min(0).max(100).optional(),
});

// ============================================================================
// Work Timeline
// ============================================================================

export const workTimelineItemSchema = z.object({
  type: z.enum(['work', 'education', 'certification']),
  title: z.string().max(100),
  organization: z.string().max(200),
  startDate: z.string(),
  endDate: z.string().optional(),
  isCurrent: z.boolean(),
  description: z.string().max(1000).optional(),
});

export const workTimelineSchema = z.object({
  items: z.array(workTimelineItemSchema),
  totalYears: z.number().min(0),
});

// ============================================================================
// Disclosure
// ============================================================================

export const disclosureRuleSchema = z.object({
  field: z.string(),
  type: maskingTypeSchema,
  visibleTo: z.array(resumeVisibilitySchema),
});

export const revokeDisclosureSchema = z.object({
  field: z.string().min(1),
  reason: z.string().max(500).optional(),
});
