/**
 * Shared Zod Schemas
 *
 * Validation schemas used across client and server
 */

export * from './employerSchema';
export * from './jobPostingSchema';
// Explicitly re-export from jobSeekerSchema, excluding schemas that conflict with employerSchema/jobPostingSchema
export {
  skillLevelSchema,
  resumeVisibilitySchema,
  maskingTypeSchema,
  nameSchema,
  phoneSchema,
  emailSchema,
  workExperienceSchema,
  educationSchema,
  skillTagSchema,
  salaryExpectationSchema,
  jobPreferencesSchema,
  contactInfoSchema,
  createJobSeekerProfileSchema,
  updateJobSeekerProfileSchema,
  updateVisibilitySchema,
  profileFilterSchema,
  resumeExportFormatSchema,
  exportResumeSchema,
  resumeQualityReportSchema,
  workTimelineItemSchema,
  workTimelineSchema,
  disclosureRuleSchema,
  revokeDisclosureSchema,
} from './jobSeekerSchema';
