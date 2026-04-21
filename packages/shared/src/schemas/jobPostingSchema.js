"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobExtractionResultSchema = exports.jobListResponseSchema = exports.jobApplicationResponseSchema = exports.jobPostingResponseSchema = exports.applicationFilterSchema = exports.updateApplicationStatusSchema = exports.createJobApplicationSchema = exports.jobFilterSchema = exports.refreshJobSchema = exports.updateJobStatusSchema = exports.updateJobPostingSchema = exports.createJobPostingSchema = exports.jobStatsSchema = exports.jobDescriptionStructuredSchema = exports.jobLocationSchema = exports.jobBenefitsSchema = exports.jobRequirementSchema = exports.salaryRangeSchema = exports.skillSchema = exports.jobDescriptionSchema = exports.jobDepartmentSchema = exports.jobTitleSchema = exports.applicationStatusSchema = exports.salaryPeriodSchema = exports.educationLevelSchema = exports.experienceLevelSchema = exports.jobTypeSchema = exports.jobStatusSchema = void 0;
/**
 * Job Posting Schemas
 *
 * Zod schemas for job posting validation
 */
const zod_1 = require("zod");
const employerSchema_1 = require("./employerSchema");
// ============================================================================
// Enums
// ============================================================================
exports.jobStatusSchema = zod_1.z.enum([
    'DRAFT',
    'PUBLISHED',
    'PAUSED',
    'CLOSED',
    'EXPIRED',
]);
exports.jobTypeSchema = zod_1.z.enum([
    'FULL_TIME',
    'PART_TIME',
    'CONTRACT',
    'INTERNSHIP',
    'FREELANCE',
]);
exports.experienceLevelSchema = zod_1.z.enum([
    'ENTRY',
    'JUNIOR',
    'MID',
    'SENIOR',
    'EXPERT',
]);
exports.educationLevelSchema = zod_1.z.enum([
    'HIGH_SCHOOL',
    'ASSOCIATE',
    'BACHELOR',
    'MASTER',
    'DOCTORATE',
    'NO_REQUIREMENT',
]);
exports.salaryPeriodSchema = zod_1.z.enum([
    'MONTHLY',
    'YEARLY',
    'HOURLY',
    'DAILY',
]);
exports.applicationStatusSchema = zod_1.z.enum([
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
exports.jobTitleSchema = zod_1.z
    .string()
    .min(1, 'Job title is required')
    .max(100, 'Job title must be less than 100 characters')
    .trim();
exports.jobDepartmentSchema = zod_1.z
    .string()
    .min(1, 'Department is required')
    .max(100, 'Department must be less than 100 characters')
    .trim();
exports.jobDescriptionSchema = zod_1.z
    .string()
    .min(50, 'Job description must be at least 50 characters')
    .max(10000, 'Job description must be less than 10000 characters')
    .trim();
exports.skillSchema = zod_1.z
    .string()
    .min(1, 'Skill cannot be empty')
    .max(50, 'Skill must be less than 50 characters')
    .trim();
// ============================================================================
// Complex Schemas
// ============================================================================
exports.salaryRangeSchema = zod_1.z.object({
    min: zod_1.z.number().int().min(0),
    max: zod_1.z.number().int().min(0),
    period: exports.salaryPeriodSchema,
    currency: zod_1.z.string().length(3).default('CNY'),
    isNegotiable: zod_1.z.boolean().default(false),
}).refine(data => data.max >= data.min, {
    message: 'Maximum salary must be greater than or equal to minimum salary',
    path: ['max'],
});
exports.jobRequirementSchema = zod_1.z.object({
    skills: zod_1.z.array(exports.skillSchema).min(1, 'At least one skill is required').max(20),
    experienceLevel: exports.experienceLevelSchema,
    educationLevel: exports.educationLevelSchema,
    minExperienceYears: zod_1.z.number().int().min(0).optional(),
    maxExperienceYears: zod_1.z.number().int().min(0).optional(),
    languages: zod_1.z.array(zod_1.z.string()).max(5).optional(),
    certifications: zod_1.z.array(zod_1.z.string()).max(10).optional(),
});
exports.jobBenefitsSchema = zod_1.z.object({
    healthInsurance: zod_1.z.boolean().default(false),
    dentalInsurance: zod_1.z.boolean().default(false),
    visionInsurance: zod_1.z.boolean().default(false),
    lifeInsurance: zod_1.z.boolean().default(false),
    retirementPlan: zod_1.z.boolean().default(false),
    paidTimeOff: zod_1.z.number().int().min(0).default(0),
    flexibleSchedule: zod_1.z.boolean().default(false),
    remoteWork: zod_1.z.boolean().default(false),
    professionalDevelopment: zod_1.z.boolean().default(false),
    gymMembership: zod_1.z.boolean().default(false),
    freeMeals: zod_1.z.boolean().default(false),
    transportation: zod_1.z.boolean().default(false),
    stockOptions: zod_1.z.boolean().default(false),
    bonus: zod_1.z.boolean().default(false),
    other: zod_1.z.array(zod_1.z.string()).max(10).optional(),
});
exports.jobLocationSchema = zod_1.z.object({
    address: zod_1.z.string().min(1).max(500),
    city: zod_1.z.string().min(1).max(100),
    district: zod_1.z.string().max(100).optional(),
    country: zod_1.z.string().min(1).max(100).default('China'),
    latitude: zod_1.z.number().min(-90).max(90).optional(),
    longitude: zod_1.z.number().min(-180).max(180).optional(),
    isRemote: zod_1.z.boolean().default(false),
    workMode: employerSchema_1.workModeSchema,
});
exports.jobDescriptionStructuredSchema = zod_1.z.object({
    summary: zod_1.z.string().min(10).max(1000),
    responsibilities: zod_1.z.array(zod_1.z.string().min(1).max(500)).min(1).max(20),
    requirements: zod_1.z.array(zod_1.z.string().min(1).max(500)).min(1).max(20),
    preferredQualifications: zod_1.z.array(zod_1.z.string().min(1).max(500)).max(10).optional(),
    benefits: zod_1.z.array(zod_1.z.string().min(1).max(500)).max(10).optional(),
    companyDescription: zod_1.z.string().max(2000).optional(),
    teamDescription: zod_1.z.string().max(2000).optional(),
});
exports.jobStatsSchema = zod_1.z.object({
    views: zod_1.z.number().int().min(0).default(0),
    uniqueViews: zod_1.z.number().int().min(0).default(0),
    applications: zod_1.z.number().int().min(0).default(0),
    interested: zod_1.z.number().int().min(0).default(0),
    saved: zod_1.z.number().int().min(0).default(0),
    shared: zod_1.z.number().int().min(0).default(0),
    clickThroughRate: zod_1.z.number().min(0).max(1).default(0),
    conversionRate: zod_1.z.number().min(0).max(1).default(0),
});
// ============================================================================
// Request Schemas
// ============================================================================
exports.createJobPostingSchema = zod_1.z.object({
    title: exports.jobTitleSchema,
    department: exports.jobDepartmentSchema,
    type: exports.jobTypeSchema,
    positions: zod_1.z.number().int().min(1).max(100).default(1),
    description: zod_1.z.union([exports.jobDescriptionSchema, exports.jobDescriptionStructuredSchema]),
    requirements: exports.jobRequirementSchema,
    salary: exports.salaryRangeSchema,
    benefits: exports.jobBenefitsSchema.optional(),
    location: exports.jobLocationSchema,
    validUntil: zod_1.z.string().datetime(),
    isUrgent: zod_1.z.boolean().default(false),
});
exports.updateJobPostingSchema = zod_1.z.object({
    title: exports.jobTitleSchema.optional(),
    department: exports.jobDepartmentSchema.optional(),
    type: exports.jobTypeSchema.optional(),
    positions: zod_1.z.number().int().min(1).max(100).optional(),
    description: zod_1.z.union([exports.jobDescriptionSchema, exports.jobDescriptionStructuredSchema]).optional(),
    requirements: exports.jobRequirementSchema.optional(),
    salary: exports.salaryRangeSchema.optional(),
    benefits: exports.jobBenefitsSchema.optional(),
    location: exports.jobLocationSchema.optional(),
    validUntil: zod_1.z.string().datetime().optional(),
    isUrgent: zod_1.z.boolean().optional(),
});
exports.updateJobStatusSchema = zod_1.z.object({
    status: exports.jobStatusSchema,
    reason: zod_1.z.string().max(500).optional(),
});
exports.refreshJobSchema = zod_1.z.object({
    isFeatured: zod_1.z.boolean().optional(),
});
exports.jobFilterSchema = zod_1.z.object({
    keyword: zod_1.z.string().max(100).optional(),
    city: zod_1.z.string().max(100).optional(),
    workMode: employerSchema_1.workModeSchema.optional(),
    jobType: exports.jobTypeSchema.optional(),
    experienceLevel: exports.experienceLevelSchema.optional(),
    educationLevel: exports.educationLevelSchema.optional(),
    minSalary: zod_1.z.number().int().min(0).optional(),
    maxSalary: zod_1.z.number().int().min(0).optional(),
    skills: zod_1.z.array(exports.skillSchema).max(10).optional(),
    industry: employerSchema_1.companyIndustrySchema.optional(),
    companySize: employerSchema_1.companySizeSchema.optional(),
    status: exports.jobStatusSchema.optional(),
    isUrgent: zod_1.z.boolean().optional(),
    page: zod_1.z.number().int().min(1).default(1),
    limit: zod_1.z.number().int().min(1).max(100).default(20),
    sortBy: zod_1.z.enum(['createdAt', 'updatedAt', 'salary', 'viewCount']).default('createdAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
// ============================================================================
// Application Schemas
// ============================================================================
exports.createJobApplicationSchema = zod_1.z.object({
    jobId: zod_1.z.string().uuid(),
    coverLetter: zod_1.z.string().max(2000).optional(),
    resumeUrl: zod_1.z.string().url().optional(),
    answers: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
});
exports.updateApplicationStatusSchema = zod_1.z.object({
    status: exports.applicationStatusSchema,
    notes: zod_1.z.string().max(1000).optional(),
});
exports.applicationFilterSchema = zod_1.z.object({
    status: exports.applicationStatusSchema.optional(),
    page: zod_1.z.number().int().min(1).default(1),
    limit: zod_1.z.number().int().min(1).max(100).default(20),
});
// ============================================================================
// Response Schemas
// ============================================================================
exports.jobPostingResponseSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    employerId: zod_1.z.string().uuid(),
    employerProfileId: zod_1.z.string().uuid(),
    agentId: zod_1.z.string().uuid(),
    title: exports.jobTitleSchema,
    department: exports.jobDepartmentSchema,
    type: exports.jobTypeSchema,
    positions: zod_1.z.number().int(),
    description: exports.jobDescriptionStructuredSchema,
    requirements: exports.jobRequirementSchema,
    salary: exports.salaryRangeSchema,
    benefits: exports.jobBenefitsSchema,
    location: exports.jobLocationSchema,
    status: exports.jobStatusSchema,
    validFrom: zod_1.z.string().datetime(),
    validUntil: zod_1.z.string().datetime(),
    stats: exports.jobStatsSchema,
    extractedSkills: zod_1.z.array(zod_1.z.string()).optional(),
    skillMatchScore: zod_1.z.number().min(0).max(100).optional(),
    competitivenessScore: zod_1.z.number().min(0).max(100).optional(),
    isUrgent: zod_1.z.boolean(),
    isFeatured: zod_1.z.boolean(),
    viewCount: zod_1.z.number().int(),
    applicationCount: zod_1.z.number().int(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    publishedAt: zod_1.z.string().datetime().optional(),
    refreshedAt: zod_1.z.string().datetime().optional(),
});
exports.jobApplicationResponseSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    jobId: zod_1.z.string().uuid(),
    applicantId: zod_1.z.string().uuid(),
    applicantAgentId: zod_1.z.string().uuid(),
    status: exports.applicationStatusSchema,
    coverLetter: zod_1.z.string().optional(),
    resumeUrl: zod_1.z.string().url().optional(),
    answers: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
    notes: zod_1.z.string().optional(),
    viewedAt: zod_1.z.string().datetime().optional(),
    respondedAt: zod_1.z.string().datetime().optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
exports.jobListResponseSchema = zod_1.z.object({
    jobs: zod_1.z.array(exports.jobPostingResponseSchema),
    pagination: zod_1.z.object({
        page: zod_1.z.number().int(),
        limit: zod_1.z.number().int(),
        total: zod_1.z.number().int(),
        totalPages: zod_1.z.number().int(),
        hasNext: zod_1.z.boolean(),
        hasPrev: zod_1.z.boolean(),
    }),
});
exports.jobExtractionResultSchema = zod_1.z.object({
    structuredData: exports.jobDescriptionStructuredSchema,
    extractedSkills: zod_1.z.array(zod_1.z.string()),
    skillMatchScore: zod_1.z.number().min(0).max(100),
    competitivenessScore: zod_1.z.number().min(0).max(100),
    suggestions: zod_1.z.array(zod_1.z.string()),
    qualityScore: zod_1.z.number().min(0).max(100),
});
//# sourceMappingURL=jobPostingSchema.js.map