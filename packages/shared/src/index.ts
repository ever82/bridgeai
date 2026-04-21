// Shared types and utilities
export * from './types';
export * from './schemas';
export * from './utils';
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
  PersonalityTrait,
  Lifestyle,
  DatingPurpose,
  VisibilityLevel,
  FieldVisibility,
  PrivacySettings,
  BasicConditions,
  PersonalityPreferences,
  RelationshipExpectations,
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
