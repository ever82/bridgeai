/**
 * Job Posting Schemas
 *
 * Zod schemas for job posting validation
 */
import { z } from 'zod';
import { workModeSchema, companySizeSchema, companyIndustrySchema } from './employerSchema';

// ============================================================================
// Enums
// ============================================================================

export const jobStatusSchema = z.enum([
  'DRAFT',
  'PUBLISHED',
  'PAUSED',
  'CLOSED',
  'EXPIRED',
]);

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

export const educationLevelSchema = z.enum([
  'HIGH_SCHOOL',
  'ASSOCIATE',
  'BACHELOR',
  'MASTER',
  'DOCTORATE',
  'NO_REQUIREMENT',
]);

export const salaryPeriodSchema = z.enum([
  'MONTHLY',
  'YEARLY',
  'HOURLY',
  'DAILY',
]);

export const applicationStatusSchema = z.enum([
  'PENDING',
  'VIEWED',
  'SHORTLISTED',
  'REJECTED',
  'INTERVIEWING',
  'OFFERED',
  'HIRED',
  'WITHDRAWN',
]);

// ============================================================================
// Field Validators
// ============================================================================

export const jobTitleSchema = z
  .string()
  .min(1, 'Job title is required')
  .max(100, 'Job title must be less than 100 characters')
  .trim();

export const jobDepartmentSchema = z
  .string()
  .min(1, 'Department is required')
  .max(100, 'Department must be less than 100 characters')
  .trim();

export const jobDescriptionSchema = z
  .string()
  .min(50, 'Job description must be at least 50 characters')
  .max(10000, 'Job description must be less than 10000 characters')
  .trim();

export const skillSchema = z
  .string()
  .min(1, 'Skill cannot be empty')
  .max(50, 'Skill must be less than 50 characters')
  .trim();

// ============================================================================
// Complex Schemas
// ============================================================================

export const salaryRangeSchema = z.object({
  min: z.number().int().min(0),
  max: z.number().int().min(0),
  period: salaryPeriodSchema,
  currency: z.string().length(3).default('CNY'),
  isNegotiable: z.boolean().default(false),
}).refine(data => data.max >= data.min, {
  message: 'Maximum salary must be greater than or equal to minimum salary',
  path: ['max'],
});

export const jobRequirementSchema = z.object({
  skills: z.array(skillSchema).min(1, 'At least one skill is required').max(20),
  experienceLevel: experienceLevelSchema,
  educationLevel: educationLevelSchema,
  minExperienceYears: z.number().int().min(0).optional(),
  maxExperienceYears: z.number().int().min(0).optional(),
  languages: z.array(z.string()).max(5).optional(),
  certifications: z.array(z.string()).max(10).optional(),
});

export const jobBenefitsSchema = z.object({
  healthInsurance: z.boolean().default(false),
  dentalInsurance: z.boolean().default(false),
  visionInsurance: z.boolean().default(false),
  lifeInsurance: z.boolean().default(false),
  retirementPlan: z.boolean().default(false),
  paidTimeOff: z.number().int().min(0).default(0),
  flexibleSchedule: z.boolean().default(false),
  remoteWork: z.boolean().default(false),
  professionalDevelopment: z.boolean().default(false),
  gymMembership: z.boolean().default(false),
  freeMeals: z.boolean().default(false),
  transportation: z.boolean().default(false),
  stockOptions: z.boolean().default(false),
  bonus: z.boolean().default(false),
  other: z.array(z.string()).max(10).optional(),
});

export const jobLocationSchema = z.object({
  address: z.string().min(1).max(500),
  city: z.string().min(1).max(100),
  district: z.string().max(100).optional(),
  country: z.string().min(1).max(100).default('China'),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isRemote: z.boolean().default(false),
  workMode: workModeSchema,
});

export const jobDescriptionStructuredSchema = z.object({
  summary: z.string().min(10).max(1000),
  responsibilities: z.array(z.string().min(1).max(500)).min(1).max(20),
  requirements: z.array(z.string().min(1).max(500)).min(1).max(20),
  preferredQualifications: z.array(z.string().min(1).max(500)).max(10).optional(),
  benefits: z.array(z.string().min(1).max(500)).max(10).optional(),
  companyDescription: z.string().max(2000).optional(),
  teamDescription: z.string().max(2000).optional(),
});

export const jobStatsSchema = z.object({
  views: z.number().int().min(0).default(0),
  uniqueViews: z.number().int().min(0).default(0),
  applications: z.number().int().min(0).default(0),
  interested: z.number().int().min(0).default(0),
  saved: z.number().int().min(0).default(0),
  shared: z.number().int().min(0).default(0),
  clickThroughRate: z.number().min(0).max(1).default(0),
  conversionRate: z.number().min(0).max(1).default(0),
});

// ============================================================================
// Request Schemas
// ============================================================================

export const createJobPostingSchema = z.object({
  title: jobTitleSchema,
  department: jobDepartmentSchema,
  type: jobTypeSchema,
  positions: z.number().int().min(1).max(100).default(1),
  description: z.union([jobDescriptionSchema, jobDescriptionStructuredSchema]),
  requirements: jobRequirementSchema,
  salary: salaryRangeSchema,
  benefits: jobBenefitsSchema.optional(),
  location: jobLocationSchema,
  validUntil: z.string().datetime(),
  isUrgent: z.boolean().default(false),
});

export const updateJobPostingSchema = z.object({
  title: jobTitleSchema.optional(),
  department: jobDepartmentSchema.optional(),
  type: jobTypeSchema.optional(),
  positions: z.number().int().min(1).max(100).optional(),
  description: z.union([jobDescriptionSchema, jobDescriptionStructuredSchema]).optional(),
  requirements: jobRequirementSchema.optional(),
  salary: salaryRangeSchema.optional(),
  benefits: jobBenefitsSchema.optional(),
  location: jobLocationSchema.optional(),
  validUntil: z.string().datetime().optional(),
  isUrgent: z.boolean().optional(),
});

export const updateJobStatusSchema = z.object({
  status: jobStatusSchema,
  reason: z.string().max(500).optional(),
});

export const refreshJobSchema = z.object({
  isFeatured: z.boolean().optional(),
});

export const jobFilterSchema = z.object({
  keyword: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  workMode: workModeSchema.optional(),
  jobType: jobTypeSchema.optional(),
  experienceLevel: experienceLevelSchema.optional(),
  educationLevel: educationLevelSchema.optional(),
  minSalary: z.number().int().min(0).optional(),
  maxSalary: z.number().int().min(0).optional(),
  skills: z.array(skillSchema).max(10).optional(),
  industry: companyIndustrySchema.optional(),
  companySize: companySizeSchema.optional(),
  status: jobStatusSchema.optional(),
  isUrgent: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'salary', 'viewCount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================================================
// Application Schemas
// ============================================================================

export const createJobApplicationSchema = z.object({
  jobId: z.string().uuid(),
  coverLetter: z.string().max(2000).optional(),
  resumeUrl: z.string().url().optional(),
  answers: z.record(z.string(), z.string()).optional(),
});

export const updateApplicationStatusSchema = z.object({
  status: applicationStatusSchema,
  notes: z.string().max(1000).optional(),
});

export const applicationFilterSchema = z.object({
  status: applicationStatusSchema.optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// ============================================================================
// Response Schemas
// ============================================================================

export const jobPostingResponseSchema = z.object({
  id: z.string().uuid(),
  employerId: z.string().uuid(),
  employerProfileId: z.string().uuid(),
  agentId: z.string().uuid(),
  title: jobTitleSchema,
  department: jobDepartmentSchema,
  type: jobTypeSchema,
  positions: z.number().int(),
  description: jobDescriptionStructuredSchema,
  requirements: jobRequirementSchema,
  salary: salaryRangeSchema,
  benefits: jobBenefitsSchema,
  location: jobLocationSchema,
  status: jobStatusSchema,
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime(),
  stats: jobStatsSchema,
  extractedSkills: z.array(z.string()).optional(),
  skillMatchScore: z.number().min(0).max(100).optional(),
  competitivenessScore: z.number().min(0).max(100).optional(),
  isUrgent: z.boolean(),
  isFeatured: z.boolean(),
  viewCount: z.number().int(),
  applicationCount: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  publishedAt: z.string().datetime().optional(),
  refreshedAt: z.string().datetime().optional(),
});

export const jobApplicationResponseSchema = z.object({
  id: z.string().uuid(),
  jobId: z.string().uuid(),
  applicantId: z.string().uuid(),
  applicantAgentId: z.string().uuid(),
  status: applicationStatusSchema,
  coverLetter: z.string().optional(),
  resumeUrl: z.string().url().optional(),
  answers: z.record(z.string(), z.string()).optional(),
  notes: z.string().optional(),
  viewedAt: z.string().datetime().optional(),
  respondedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const jobListResponseSchema = z.object({
  jobs: z.array(jobPostingResponseSchema),
  pagination: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
});

export const jobExtractionResultSchema = z.object({
  structuredData: jobDescriptionStructuredSchema,
  extractedSkills: z.array(z.string()),
  skillMatchScore: z.number().min(0).max(100),
  competitivenessScore: z.number().min(0).max(100),
  suggestions: z.array(z.string()),
  qualityScore: z.number().min(0).max(100),
});
