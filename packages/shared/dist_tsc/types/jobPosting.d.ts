/**
 * Job posting types shared between client and server
 */
import { WorkMode, CompanySize, CompanyIndustry } from './employer';
import { EducationLevel } from './agentProfile';
export declare enum JobStatus {
    DRAFT = "DRAFT",
    PUBLISHED = "PUBLISHED",
    PAUSED = "PAUSED",
    CLOSED = "CLOSED",
    EXPIRED = "EXPIRED"
}
export declare enum JobType {
    FULL_TIME = "FULL_TIME",
    PART_TIME = "PART_TIME",
    CONTRACT = "CONTRACT",
    INTERNSHIP = "INTERNSHIP",
    FREELANCE = "FREELANCE"
}
export declare enum ExperienceLevel {
    ENTRY = "ENTRY",// 应届生/1年以下
    JUNIOR = "JUNIOR",// 1-3年
    MID = "MID",// 3-5年
    SENIOR = "SENIOR",// 5-10年
    EXPERT = "EXPERT"
}
export declare enum SalaryPeriod {
    MONTHLY = "MONTHLY",
    YEARLY = "YEARLY",
    HOURLY = "HOURLY",
    DAILY = "DAILY"
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
    paidTimeOff: number;
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
    title: string;
    department: string;
    type: JobType;
    positions: number;
    description: JobDescription;
    requirements: JobRequirement;
    salary: SalaryRange;
    benefits: JobBenefits;
    location: JobLocation;
    status: JobStatus;
    validFrom: string;
    validUntil: string;
    stats: JobStats;
    extractedSkills?: string[];
    skillMatchScore?: number;
    competitivenessScore?: number;
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
    description: string | JobDescription;
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
export declare enum ApplicationStatus {
    PENDING = "PENDING",
    VIEWED = "VIEWED",
    SHORTLISTED = "SHORTLISTED",
    REJECTED = "REJECTED",
    INTERVIEWING = "INTERVIEWING",
    OFFERED = "OFFERED",
    HIRED = "HIRED",
    WITHDRAWN = "WITHDRAWN"
}
export interface JobApplicationFilter {
    status?: ApplicationStatus;
    page?: number;
    limit?: number;
}
export declare const JOB_STATUS_LABELS: Record<JobStatus, string>;
export declare const JOB_TYPE_LABELS: Record<JobType, string>;
export declare const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string>;
export declare const EDUCATION_LEVEL_LABELS: Record<EducationLevel, string>;
export declare const SALARY_PERIOD_LABELS: Record<SalaryPeriod, string>;
export declare const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string>;
export declare const JOB_STATUS_COLORS: Record<JobStatus, string>;
export declare const APPLICATION_STATUS_COLORS: Record<ApplicationStatus, string>;
export declare const VALID_JOB_STATUS_TRANSITIONS: Record<JobStatus, JobStatus[]>;
//# sourceMappingURL=jobPosting.d.ts.map