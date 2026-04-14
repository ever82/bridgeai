/**
 * Job posting types shared between client and server
 */

import { WorkMode, CompanySize, CompanyIndustry } from './employer';
import { EducationLevel } from './agentProfile';

export enum JobStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  PAUSED = 'PAUSED',
  CLOSED = 'CLOSED',
  EXPIRED = 'EXPIRED',
}

export enum JobType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT = 'CONTRACT',
  INTERNSHIP = 'INTERNSHIP',
  FREELANCE = 'FREELANCE',
}

export enum ExperienceLevel {
  ENTRY = 'ENTRY',           // 应届生/1年以下
  JUNIOR = 'JUNIOR',         // 1-3年
  MID = 'MID',               // 3-5年
  SENIOR = 'SENIOR',         // 5-10年
  EXPERT = 'EXPERT',         // 10年以上
}

export enum SalaryPeriod {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
}

export interface SalaryRange {
  min: number;
  max: number;
  period: SalaryPeriod;
  currency: string;
  isNegotiable: boolean;
}

export interface JobRequirement {
  skills: string[];
  experienceLevel: ExperienceLevel;
  educationLevel: EducationLevel;
  minExperienceYears?: number;
  maxExperienceYears?: number;
  languages?: string[];
  certifications?: string[];
}

export interface JobBenefits {
  healthInsurance: boolean;
  dentalInsurance: boolean;
  visionInsurance: boolean;
  lifeInsurance: boolean;
  retirementPlan: boolean;
  paidTimeOff: number; // days
  flexibleSchedule: boolean;
  remoteWork: boolean;
  professionalDevelopment: boolean;
  gymMembership: boolean;
  freeMeals: boolean;
  transportation: boolean;
  stockOptions: boolean;
  bonus: boolean;
  other?: string[];
}

export interface JobLocation {
  address: string;
  city: string;
  district?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  isRemote: boolean;
  workMode: WorkMode;
}

export interface JobDescription {
  summary: string;
  responsibilities: string[];
  requirements: string[];
  preferredQualifications?: string[];
  benefits?: string[];
  companyDescription?: string;
  teamDescription?: string;
}

export interface JobPosting {
  id: string;
  employerId: string;
  employerProfileId: string;
  agentId: string;

  // Basic info
  title: string;
  department: string;
  type: JobType;
  positions: number;

  // Description
  description: JobDescription;

  // Requirements
  requirements: JobRequirement;

  // Compensation
  salary: SalaryRange;
  benefits: JobBenefits;

  // Location
  location: JobLocation;

  // Status & validity
  status: JobStatus;
  validFrom: string;
  validUntil: string;

  // Statistics
  stats: JobStats;

  // AI extracted data
  extractedSkills?: string[];
  skillMatchScore?: number;
  competitivenessScore?: number;

  // Meta
  isUrgent: boolean;
  isFeatured: boolean;
  viewCount: number;
  applicationCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  refreshedAt?: string;
}

export interface JobStats {
  views: number;
  uniqueViews: number;
  applications: number;
  interested: number;
  saved: number;
  shared: number;
  clickThroughRate: number;
  conversionRate: number;
}

export interface CreateJobPostingRequest {
  title: string;
  department: string;
  type: JobType;
  positions: number;
  description: string | JobDescription; // Can be natural language or structured
  requirements?: JobRequirement;
  salary?: SalaryRange;
  benefits?: JobBenefits;
  location: JobLocation;
  validUntil: string;
  isUrgent?: boolean;
}

export interface UpdateJobPostingRequest {
  title?: string;
  department?: string;
  type?: JobType;
  positions?: number;
  description?: JobDescription;
  requirements?: JobRequirement;
  salary?: SalaryRange;
  benefits?: JobBenefits;
  location?: JobLocation;
  validUntil?: string;
  isUrgent?: boolean;
}

export interface UpdateJobStatusRequest {
  status: JobStatus;
  reason?: string;
}

export interface RefreshJobRequest {
  isFeatured?: boolean;
}

export interface JobFilterOptions {
  keyword?: string;
  city?: string;
  workMode?: WorkMode;
  jobType?: JobType;
  experienceLevel?: ExperienceLevel;
  educationLevel?: EducationLevel;
  minSalary?: number;
  maxSalary?: number;
  skills?: string[];
  industry?: CompanyIndustry;
  companySize?: CompanySize;
  status?: JobStatus;
  isUrgent?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'salary' | 'viewCount';
  sortOrder?: 'asc' | 'desc';
}

export interface JobListResponse {
  jobs: JobPosting[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface JobApplication {
  id: string;
  jobId: string;
  applicantId: string;
  applicantAgentId: string;
  status: ApplicationStatus;
  coverLetter?: string;
  resumeUrl?: string;
  answers?: Record<string, string>;
  notes?: string;
  viewedAt?: string;
  respondedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export enum ApplicationStatus {
  PENDING = 'PENDING',
  VIEWED = 'VIEWED',
  SHORTLISTED = 'SHORTLISTED',
  REJECTED = 'REJECTED',
  INTERVIEWING = 'INTERVIEWING',
  OFFERED = 'OFFERED',
  HIRED = 'HIRED',
  WITHDRAWN = 'WITHDRAWN',
}

export interface JobApplicationFilter {
  status?: ApplicationStatus;
  page?: number;
  limit?: number;
}

// Status labels
export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  [JobStatus.DRAFT]: '草稿',
  [JobStatus.PUBLISHED]: '已发布',
  [JobStatus.PAUSED]: '已暂停',
  [JobStatus.CLOSED]: '已关闭',
  [JobStatus.EXPIRED]: '已过期',
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

export const EDUCATION_LEVEL_LABELS: Record<EducationLevel, string> = {
  [EducationLevel.HIGH_SCHOOL]: '高中',
  [EducationLevel.ASSOCIATE]: '大专',
  [EducationLevel.BACHELOR]: '本科',
  [EducationLevel.MASTER]: '硕士',
  [EducationLevel.DOCTORATE]: '博士',
  [EducationLevel.OTHER]: '其他',
  [EducationLevel.NO_REQUIREMENT]: '不限',
};

export const SALARY_PERIOD_LABELS: Record<SalaryPeriod, string> = {
  [SalaryPeriod.MONTHLY]: '月',
  [SalaryPeriod.YEARLY]: '年',
  [SalaryPeriod.HOURLY]: '小时',
  [SalaryPeriod.DAILY]: '天',
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  [ApplicationStatus.PENDING]: '待处理',
  [ApplicationStatus.VIEWED]: '已查看',
  [ApplicationStatus.SHORTLISTED]: ' shortlisted',
  [ApplicationStatus.REJECTED]: '已拒绝',
  [ApplicationStatus.INTERVIEWING]: '面试中',
  [ApplicationStatus.OFFERED]: '已发offer',
  [ApplicationStatus.HIRED]: '已录用',
  [ApplicationStatus.WITHDRAWN]: '已撤回',
};

// Status colors
export const JOB_STATUS_COLORS: Record<JobStatus, string> = {
  [JobStatus.DRAFT]: '#9E9E9E',
  [JobStatus.PUBLISHED]: '#4CAF50',
  [JobStatus.PAUSED]: '#FFC107',
  [JobStatus.CLOSED]: '#F44336',
  [JobStatus.EXPIRED]: '#757575',
};

export const APPLICATION_STATUS_COLORS: Record<ApplicationStatus, string> = {
  [ApplicationStatus.PENDING]: '#9E9E9E',
  [ApplicationStatus.VIEWED]: '#2196F3',
  [ApplicationStatus.SHORTLISTED]: '#FF9800',
  [ApplicationStatus.REJECTED]: '#F44336',
  [ApplicationStatus.INTERVIEWING]: '#9C27B0',
  [ApplicationStatus.OFFERED]: '#4CAF50',
  [ApplicationStatus.HIRED]: '#4CAF50',
  [ApplicationStatus.WITHDRAWN]: '#757575',
};

// Valid status transitions
export const VALID_JOB_STATUS_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  [JobStatus.DRAFT]: [JobStatus.PUBLISHED, JobStatus.CLOSED],
  [JobStatus.PUBLISHED]: [JobStatus.PAUSED, JobStatus.CLOSED, JobStatus.EXPIRED],
  [JobStatus.PAUSED]: [JobStatus.PUBLISHED, JobStatus.CLOSED],
  [JobStatus.CLOSED]: [JobStatus.DRAFT],
  [JobStatus.EXPIRED]: [JobStatus.DRAFT, JobStatus.PUBLISHED],
};
