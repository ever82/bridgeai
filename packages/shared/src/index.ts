// Shared types and utilities
export * from './types';
export * from './schemas';
export * from './utils';
export * from './utils/datingSimilarity';
export * from './env';
export * from './config/scenes';
// Explicitly re-export credit types to ensure tree-shaking doesn't drop them
export type { CreditLevel } from './types/credit';
export { CREDIT_LEVEL_THRESHOLDS, CreditLevelEnum } from './types/credit';
export type {
  CreditScoreResponse,
  CreditHistoryEntry,
  CreditHistoryResponse,
  CreditLevelInfo,
  PublicCreditInfo,
  CreditFactorType,
  CreditFactorDetail,
  SubFactorDetail,
  CreditFactorsResponse,
} from './types/credit';
// Re-export from agentMessage, but exclude AgentType to avoid conflict with types/agent.ts
export {
  PROTOCOL_VERSION,
  AgentMessageType,
  MessagePriority,
  AgentMessageMetadata,
  AgentIdentity,
  AgentCreditInfo,
  AgentMessage,
  AgentProtocolErrorCode,
  AgentProtocolError,
  validateAgentMessage,
  createAgentMessage,
  isVersionCompatible,
  serializeMessage,
  parseMessage,
} from './protocols/agentMessage';
// Explicitly re-export handoff types (use export not export type for enums so they work as values)
export {
  HandoffStatus,
  HandoffRequestStatus,
  HandoffErrorCode,
  HandoffConfig,
  HandoffAuditLog,
  DEFAULT_HANDOFF_CONFIG,
  SenderType,
  HandoffSocketEvents,
  HandoffRequest,
  SENDER_TYPE_COLORS,
  SENDER_TYPE_LABELS,
  HANDOFF_STATUS_LABELS,
  isHandoffPending,
} from './types/handoff';
// Explicitly re-export dating types (use export not export type for enums)
export {
  DatingProfile,
  ProfileQualityMetrics,
  ProfileQualityResult,
  CreateDatingProfileRequest,
  UpdateDatingProfileRequest,
  AgeRangePreference,
  HeightRange,
  EducationPreference,
  IncomeRange,
  InterestCategory,
  InterestPreferences,
  Interest,
  PersonalityTrait,
  Lifestyle,
  DatingPurpose,
  VisibilityLevel,
  FieldVisibility,
  PrivacySettings,
  BasicConditions,
  PersonalityPreferences,
  RelationshipExpectations,
  AIExtractedPreference,
  AIExtractionResult,
  ExtractFromDescriptionRequest,
  ExtractFromDescriptionResponse,
  // Additional dating enums
  MBTIType,
  SmokingHabit,
  DrinkingHabit,
  PetPreference,
  ExerciseFrequency,
  DietPreference,
  RelationshipPace,
  LivingArrangement,
  FamilyPlan,
  LocationPreference,
  SleepSchedule,
  // Dating labels
  DATING_AGE_RANGE_LABELS,
  HEIGHT_RANGE_LABELS,
  DATING_EDUCATION_LABELS,
  INCOME_LABELS,
  DATING_PURPOSE_LABELS,
  VISIBILITY_LABELS,
} from './types/dating';
// Explicitly re-export disclosure types (use export not export type for enums)
export {
  DisclosureLevel,
  FieldDisclosure,
  AgentDisclosureSettings,
  RelationshipStage,
  DisclosureCheckResult,
  DisclosureAuditEntry,
  DisclosureChangeRecord,
  DISCLOSURE_LEVEL_INFO,
  DEFAULT_FIELD_DISCLOSURES,
  DISCLOSABLE_FIELDS,
  getRequiredStage,
  canDiscloseAtStage,
  createDefaultDisclosureSettings,
} from './types/disclosure';
// Explicitly re-export agentAdConsumer types
export {
  ExtractedDemandData,
  AgentAdRole,
  DemandUrgency,
  ConsumerDemandStatus,
  ConsumerDemandProfile,
  DemandTimeline,
  DemandProfilePreview,
  BudgetRange,
  BrandPreference,
  ProductCategory,
  MerchantPreferenceConfig,
  UpdateConsumerConfigRequest,
} from './types/agentAdConsumer';
// Explicitly re-export job posting types
export {
  JobPosting,
  CreateJobPostingRequest,
  UpdateJobPostingRequest,
  UpdateJobStatusRequest,
  JobStats,
  JobListResponse,
  JobFilterOptions,
  JobDescription,
  JobApplication,
  JobApplicationFilter,
  ApplicationStatus,
  JobStatus,
  RefreshJobRequest,
} from './types/jobPosting';
// Explicitly re-export employer types
export {
  EmployerProfile,
  EmployerVerification,
  EmployerVerificationResponse,
  VerificationStatus,
  VERIFICATION_STATUS_LABELS,
  VERIFICATION_STATUS_COLORS,
} from './types/employer';
// Explicitly re-export attributeFilter types and functions
export {
  RangeFilter,
  EnumFilter,
  TagsOverlapFilter,
  VisionShareAttributeFilter,
  AgentDateAttributeFilter,
  AgentJobAttributeFilter,
  AgentAdAttributeFilter,
  SceneAttributeFilter,
  AttributeFilterRequest,
  AttributeFilterResult,
  SCENE_FILTER_SCHEMAS,
  getFilterSchemaForScene,
  getFilterableFieldsForScene,
} from './types/attributeFilter';
// Explicitly re-export job seeker types (enums need explicit export for tsup)
export {
  SkillLevel,
  ResumeVisibility,
  MaskingType,
  SKILL_LEVEL_LABELS,
  RESUME_VISIBILITY_LABELS,
  DEFAULT_MASKING_RULES,
} from './types/jobSeeker';
// Explicitly re-export resume delivery types
export {
  DeliveryStatus,
  DeliveryAction,
  DELIVERY_STATUS_LABELS,
  DELIVERY_STATUS_COLORS,
  DELIVERY_ACTION_LABELS,
} from './types/resume';
export type {
  ResumeDelivery,
  DeliveryHistoryEntry,
  DisclosureRecord,
  BatchDeliveryRequest,
  BatchDeliveryResult,
  BatchDeliveryResponse,
  DeliveryStats,
  CreateDeliveryRequest,
  UpdateDeliveryStatusRequest,
  WithdrawDeliveryRequest,
  DeliveryFilterOptions,
  DeliveryListResponse,
  DisclosureChangeNotification,
  DisclosureFieldChange,
} from './types/resume';
export type {
  WorkExperience,
  Education,
  SkillTag,
  SalaryExpectation,
  JobPreferences,
  ContactInfo,
  JobSeekerProfile,
  CreateJobSeekerProfileRequest,
  UpdateJobSeekerProfileRequest,
  JobSeekerProfileListResponse,
  MaskingRule,
  ResumeQualityReport,
  WorkTimeline,
  WorkTimelineItem,
} from './types/jobSeeker';

// Re-export geo fencing service functions
export {
  createGeoFence,
  getAllGeoFences,
  updateGeoFence,
  deleteGeoFence,
  checkGeoFence,
  checkMultipleGeoFences,
  findContainingGeoFences,
  createCircularGeoFence,
  createRectangularGeoFence,
  getGeoFencesWithinDistance,
  validateGeoFencePolygon,
} from './services/geoFencingService';
