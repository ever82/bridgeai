// Export all shared types
export * from './agent';
export {
  // Explicitly re-export from agentProfile, excluding Location (see ./location)
  AgeRange,
  Gender,
  EducationLevel,
  L1Profile,
  L1_FIELD_WEIGHTS,
  L1_FIELD_LABELS,
  AGE_RANGE_LABELS,
  GENDER_LABELS,
  EDUCATION_LABELS,
  L2Profile,
  L3Profile,
  AgentProfileData,
  ProfileCompletionResult,
  ProfileValidationError,
  ProfileValidationResult,
  UpdateL1ProfileRequest,
  UpdateL2ProfileRequest,
  UpdateL3ProfileRequest,
} from './agentProfile';
export * from './capability';
export * from './credit';
export * from './employer';
export * from './filter';
export * from './jobPosting';
export * from './location';
export * from './points';
export * from './scene';
export * from './agentAdConsumer';
export * from './disclosure';
export * from './visionShare';
// Explicitly re-export from jobSeeker, excluding types that conflict with jobPosting/employer
export {
  // Unique types
  type WorkExperience,
  type Education,
  type SkillTag,
  type SalaryExpectation,
  type JobPreferences,
  type ContactInfo,
  type JobSeekerProfile,
  type CreateJobSeekerProfileRequest,
  type UpdateJobSeekerProfileRequest,
  type JobSeekerProfileListResponse,
  type MaskingRule,
  type ResumeQualityReport,
  type WorkTimeline,
  type WorkTimelineItem,
  // Unique enums and consts
  SkillLevel,
  ResumeVisibility,
  MaskingType,
  DEFAULT_MASKING_RULES,
  SKILL_LEVEL_LABELS,
  RESUME_VISIBILITY_LABELS,
} from './jobSeeker';
// Explicitly re-export from resume to avoid export * resolution issues
export {
  type ResumeDelivery,
  DeliveryStatus,
  type DeliveryHistoryEntry,
  DeliveryAction,
  type DisclosureRecord,
  type BatchDeliveryRequest,
  type BatchDeliveryResult,
  type BatchDeliveryResponse,
  type DeliveryStats,
  type CreateDeliveryRequest,
  type UpdateDeliveryStatusRequest,
  type WithdrawDeliveryRequest,
  type DeliveryFilterOptions,
  type DeliveryListResponse,
  type DisclosureChangeNotification,
  type DisclosureFieldChange,
  DELIVERY_STATUS_LABELS,
  DELIVERY_STATUS_COLORS,
  DELIVERY_ACTION_LABELS,
} from './resume';
export * from './handoff';
export * from '../schemas/l2';
export * from '../schemas/sceneFields';
export * from './photo.types';
