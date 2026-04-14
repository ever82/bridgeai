// Shared types
export * from './types/agent';
export {
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
} from './types/agentProfile';
export * from './types/employer';
export * from './types/jobPosting';
export * from './types/location';
export * from './types/filter';
export * from './types/scene';
export * from './types/points';
export * from './schemas/l2';
export * from './schemas/sceneFields';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
