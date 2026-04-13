/**
 * Employer types shared between client and server
 */

export enum CompanySize {
  STARTUP = 'STARTUP',        // 1-50
  SMALL = 'SMALL',            // 51-200
  MEDIUM = 'MEDIUM',          // 201-1000
  LARGE = 'LARGE',            // 1001-10000
  ENTERPRISE = 'ENTERPRISE',  // 10000+
}

export enum CompanyIndustry {
  TECH = 'TECH',
  FINANCE = 'FINANCE',
  HEALTHCARE = 'HEALTHCARE',
  EDUCATION = 'EDUCATION',
  MANUFACTURING = 'MANUFACTURING',
  RETAIL = 'RETAIL',
  CONSULTING = 'CONSULTING',
  MEDIA = 'MEDIA',
  REAL_ESTATE = 'REAL_ESTATE',
  OTHER = 'OTHER',
}

export enum VerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  PENDING = 'PENDING',
  EMAIL_VERIFIED = 'EMAIL_VERIFIED',
  BUSINESS_VERIFIED = 'BUSINESS_VERIFIED',
  REJECTED = 'REJECTED',
}

export enum WorkMode {
  REMOTE = 'REMOTE',
  ONSITE = 'ONSITE',
  HYBRID = 'HYBRID',
}

export interface CompanyInfo {
  name: string;
  size: CompanySize;
  industry: CompanyIndustry;
  website?: string;
  address: string;
  city: string;
  description?: string;
  logoUrl?: string;
  coverImageUrl?: string;
}

export interface RecruiterInfo {
  name: string;
  title: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
}

export interface CompanyBranding {
  primaryColor?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  companyPhotos?: string[];
  videoUrl?: string;
}

export interface EmployerVerification {
  status: VerificationStatus;
  emailVerifiedAt?: string;
  businessLicenseUrl?: string;
  businessLicenseVerifiedAt?: string;
  rejectedReason?: string;
  submittedAt?: string;
  reviewedAt?: string;
}

export interface EmployerStats {
  activeJobsCount: number;
  totalJobsCount: number;
  totalViews: number;
  totalApplications: number;
  responseRate: number;
  averageResponseTime: number; // in hours
}

export interface EmployerProfile {
  id: string;
  userId: string;
  agentId: string;
  companyInfo: CompanyInfo;
  recruiterInfo: RecruiterInfo;
  verification: EmployerVerification;
  branding: CompanyBranding;
  stats: EmployerStats;
  activeJobIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployerProfileRequest {
  companyInfo: Omit<CompanyInfo, 'logoUrl' | 'coverImageUrl'>;
  recruiterInfo: Omit<RecruiterInfo, 'avatarUrl'>;
}

export interface UpdateEmployerProfileRequest {
  companyInfo?: Partial<CompanyInfo>;
  recruiterInfo?: Partial<RecruiterInfo>;
  branding?: Partial<CompanyBranding>;
}

export interface UpdateEmployerBrandingRequest {
  primaryColor?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  companyPhotos?: string[];
  videoUrl?: string;
}

export interface CompanyVerificationRequest {
  businessLicenseUrl: string;
  businessRegistrationNumber: string;
}

export interface EmployerVerificationResponse {
  status: VerificationStatus;
  message: string;
  nextSteps?: string[];
}

// Company size labels
export const COMPANY_SIZE_LABELS: Record<CompanySize, string> = {
  [CompanySize.STARTUP]: '1-50人',
  [CompanySize.SMALL]: '51-200人',
  [CompanySize.MEDIUM]: '201-1000人',
  [CompanySize.LARGE]: '1001-10000人',
  [CompanySize.ENTERPRISE]: '10000人以上',
};

// Company industry labels
export const COMPANY_INDUSTRY_LABELS: Record<CompanyIndustry, string> = {
  [CompanyIndustry.TECH]: '互联网/科技',
  [CompanyIndustry.FINANCE]: '金融',
  [CompanyIndustry.HEALTHCARE]: '医疗健康',
  [CompanyIndustry.EDUCATION]: '教育',
  [CompanyIndustry.MANUFACTURING]: '制造业',
  [CompanyIndustry.RETAIL]: '零售/电商',
  [CompanyIndustry.CONSULTING]: '咨询',
  [CompanyIndustry.MEDIA]: '媒体/广告',
  [CompanyIndustry.REAL_ESTATE]: '房地产',
  [CompanyIndustry.OTHER]: '其他',
};

// Verification status labels
export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  [VerificationStatus.UNVERIFIED]: '未认证',
  [VerificationStatus.PENDING]: '审核中',
  [VerificationStatus.EMAIL_VERIFIED]: '邮箱已认证',
  [VerificationStatus.BUSINESS_VERIFIED]: '企业已认证',
  [VerificationStatus.REJECTED]: '认证被拒绝',
};

// Work mode labels
export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  [WorkMode.REMOTE]: '远程办公',
  [WorkMode.ONSITE]: '现场办公',
  [WorkMode.HYBRID]: '混合办公',
};

// Verification status colors
export const VERIFICATION_STATUS_COLORS: Record<VerificationStatus, string> = {
  [VerificationStatus.UNVERIFIED]: '#9E9E9E',
  [VerificationStatus.PENDING]: '#FFC107',
  [VerificationStatus.EMAIL_VERIFIED]: '#2196F3',
  [VerificationStatus.BUSINESS_VERIFIED]: '#4CAF50',
  [VerificationStatus.REJECTED]: '#F44336',
};
