/**
 * Job Seeker Types
 *
 * Defines the types for job seeker profile and resume management.
 */

import { EducationLevel } from './agentProfile';

// ============================================================================
// Work Experience
// ============================================================================

export interface WorkExperience {
  id: string;
  company: string;
  title: string;
  startDate: string; // YYYY-MM
  endDate?: string; // YYYY-MM, undefined means current
  isCurrent: boolean;
  description?: string;
  achievements?: string[];
  skills?: string[];
  location?: string;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string; // YYYY
  endDate?: string; // YYYY
  isCurrent: boolean;
  gpa?: string;
  description?: string;
}

// ============================================================================
// Skills & Tags
// ============================================================================

export interface SkillTag {
  id: string;
  name: string;
  category?: string; // e.g., 'frontend', 'backend', 'design'
  level?: SkillLevel;
  yearsOfExperience?: number;
  verified?: boolean;
}

export enum SkillLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT',
}

// ============================================================================
// Salary Expectations
// ============================================================================

export enum SalaryPeriod {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export interface SalaryExpectation {
  min: number;
  max: number;
  period: SalaryPeriod;
  currency: string;
  isNegotiable: boolean;
}

// ============================================================================
// Job Preferences
// ============================================================================

export enum WorkMode {
  REMOTE = 'REMOTE',
  ONSITE = 'ONSITE',
  HYBRID = 'HYBRID',
}

export enum JobType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT = 'CONTRACT',
  INTERNSHIP = 'INTERNSHIP',
  FREELANCE = 'FREELANCE',
}

export enum ExperienceLevel {
  ENTRY = 'ENTRY',
  JUNIOR = 'JUNIOR',
  MID = 'MID',
  SENIOR = 'SENIOR',
  EXPERT = 'EXPERT',
}

export interface JobPreferences {
  preferredJobTypes: JobType[];
  preferredWorkModes: WorkMode[];
  preferredLocations: string[];
  preferredIndustries?: string[];
  preferredCompanies?: string[];
  preferredSalary?: SalaryExpectation;
  noticePeriodDays?: number; // 提前通知天数
  willingToRelocate: boolean;
  remoteOnly: boolean;
}

// ============================================================================
// Job Seeker Profile
// ============================================================================

export enum ResumeVisibility {
  PUBLIC = 'PUBLIC',       // 公开 - 所有雇主可见
  APPLICATION_ONLY = 'APPLICATION_ONLY', // 仅投递 - 仅投递后可见
  HIDDEN = 'HIDDEN',       // 隐藏 - 完全隐藏
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  wechat?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
}

export interface JobSeekerProfile {
  id: string;
  userId: string;
  agentId: string;

  // Basic info
  name: string;
  age?: string;
  gender?: string;
  location?: string;
  currentTitle?: string;
  summary?: string; // 自我介绍/简介

  // Professional info
  skills: SkillTag[];
  workExperiences: WorkExperience[];
  educations: Education[];
  certifications?: string[];
  languages?: string[];

  // Preferences
  preferences: JobPreferences;

  // Contact & privacy
  contactInfo: ContactInfo;
  visibility: ResumeVisibility;
  maskedFields: string[]; // 脱敏字段列表

  // Resume metadata
  resumeUrl?: string;
  resumeFileName?: string;
  resumeVersion: number;
  isPrimary: boolean; // 是否是主简历

  // AI extracted data
  aiExtracted: boolean;
  aiExtractedAt?: string;
  aiConfidence?: number;
  qualityScore?: number; // 0-100

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Request/Response Types
// ============================================================================

export interface CreateJobSeekerProfileRequest {
  name: string;
  age?: string;
  gender?: string;
  location?: string;
  currentTitle?: string;
  summary?: string;
  skills?: SkillTag[];
  workExperiences?: WorkExperience[];
  educations?: Education[];
  certifications?: string[];
  languages?: string[];
  preferences?: Partial<JobPreferences>;
  contactInfo?: Partial<ContactInfo>;
  visibility?: ResumeVisibility;
  resumeUrl?: string;
  resumeFileName?: string;
  isPrimary?: boolean;
}

export interface UpdateJobSeekerProfileRequest {
  name?: string;
  age?: string;
  gender?: string;
  location?: string;
  currentTitle?: string;
  summary?: string;
  skills?: SkillTag[];
  workExperiences?: WorkExperience[];
  educations?: Education[];
  certifications?: string[];
  languages?: string[];
  preferences?: Partial<JobPreferences>;
  contactInfo?: Partial<ContactInfo>;
  visibility?: ResumeVisibility;
  resumeUrl?: string;
  resumeFileName?: string;
  isPrimary?: boolean;
}

export interface JobSeekerProfileListResponse {
  profiles: JobSeekerProfile[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ============================================================================
// Privacy & Masking
// ============================================================================

export enum MaskingType {
  PHONE = 'PHONE',         // 手机号脱敏 138****1234
  EMAIL = 'EMAIL',         // 邮箱脱敏 j***@example.com
  NAME = 'NAME',           // 姓名脱敏 张*
}

export interface MaskingRule {
  field: string;
  type: MaskingType;
  visibleTo: ResumeVisibility[]; // 哪些可见级别可见原始数据
}

export const DEFAULT_MASKING_RULES: MaskingRule[] = [
  { field: 'contactInfo.phone', type: MaskingType.PHONE, visibleTo: [ResumeVisibility.PUBLIC] },
  { field: 'contactInfo.email', type: MaskingType.EMAIL, visibleTo: [ResumeVisibility.PUBLIC] },
];

// ============================================================================
// Resume Quality Scoring
// ============================================================================

export interface ResumeQualityReport {
  overallScore: number; // 0-100
  completenessScore: number;
  clarityScore: number;
  keywordScore: number;
  achievementScore: number;
  missingFields: string[];
  suggestions: string[];
  skillMatchScore?: number; // 与偏好的匹配度
  competitivenessScore?: number; // 竞争力评分
}

// ============================================================================
// Work Timeline
// ============================================================================

export interface WorkTimeline {
  items: WorkTimelineItem[];
  totalYears: number;
}

export interface WorkTimelineItem {
  type: 'work' | 'education' | 'certification';
  title: string;
  organization: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  description?: string;
}

// ============================================================================
// Display Labels
// ============================================================================

export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  [SkillLevel.BEGINNER]: '初级',
  [SkillLevel.INTERMEDIATE]: '中级',
  [SkillLevel.ADVANCED]: '高级',
  [SkillLevel.EXPERT]: '专家',
};

export const VISIBILITY_LABELS: Record<ResumeVisibility, string> = {
  [ResumeVisibility.PUBLIC]: '公开',
  [ResumeVisibility.APPLICATION_ONLY]: '仅投递可见',
  [ResumeVisibility.HIDDEN]: '隐藏',
};

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  [WorkMode.REMOTE]: '远程',
  [WorkMode.ONSITE]: '现场',
  [WorkMode.HYBRID]: '混合',
};

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  [JobType.FULL_TIME]: '全职',
  [JobType.PART_TIME]: '兼职',
  [JobType.CONTRACT]: '合同',
  [JobType.INTERNSHIP]: '实习',
  [JobType.FREELANCE]: '自由职业',
};

export const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  [ExperienceLevel.ENTRY]: '应届生/1年以下',
  [ExperienceLevel.JUNIOR]: '1-3年',
  [ExperienceLevel.MID]: '3-5年',
  [ExperienceLevel.SENIOR]: '5-10年',
  [ExperienceLevel.EXPERT]: '10年以上',
};
