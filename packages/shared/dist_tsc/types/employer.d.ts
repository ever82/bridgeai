/**
 * Employer types shared between client and server
 */
export declare enum CompanySize {
    STARTUP = "STARTUP",// 1-50
    SMALL = "SMALL",// 51-200
    MEDIUM = "MEDIUM",// 201-1000
    LARGE = "LARGE",// 1001-10000
    ENTERPRISE = "ENTERPRISE"
}
export declare enum CompanyIndustry {
    TECH = "TECH",
    FINANCE = "FINANCE",
    HEALTHCARE = "HEALTHCARE",
    EDUCATION = "EDUCATION",
    MANUFACTURING = "MANUFACTURING",
    RETAIL = "RETAIL",
    CONSULTING = "CONSULTING",
    MEDIA = "MEDIA",
    REAL_ESTATE = "REAL_ESTATE",
    OTHER = "OTHER"
}
export declare enum VerificationStatus {
    UNVERIFIED = "UNVERIFIED",
    PENDING = "PENDING",
    EMAIL_VERIFIED = "EMAIL_VERIFIED",
    BUSINESS_VERIFIED = "BUSINESS_VERIFIED",
    REJECTED = "REJECTED"
}
export declare enum WorkMode {
    REMOTE = "REMOTE",
    ONSITE = "ONSITE",
    HYBRID = "HYBRID"
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
    averageResponseTime: number;
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
export declare const COMPANY_SIZE_LABELS: Record<CompanySize, string>;
export declare const COMPANY_INDUSTRY_LABELS: Record<CompanyIndustry, string>;
export declare const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string>;
export declare const WORK_MODE_LABELS: Record<WorkMode, string>;
export declare const VERIFICATION_STATUS_COLORS: Record<VerificationStatus, string>;
//# sourceMappingURL=employer.d.ts.map