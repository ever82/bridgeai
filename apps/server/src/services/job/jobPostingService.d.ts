/**
 * Job Posting Service
 *
 * Handles CRUD operations for job postings, status management,
 * and job statistics tracking.
 */
import { JobPosting, JobStatus, CreateJobPostingRequest, UpdateJobPostingRequest, UpdateJobStatusRequest, RefreshJobRequest, JobListResponse, JobFilterOptions, JobStats, ApplicationStatus, JobApplication, JobApplicationFilter } from '@bridgeai/shared';
export interface CreateJobOptions {
    employerId: string;
    employerProfileId: string;
    agentId: string;
    data: CreateJobPostingRequest;
    autoExtract?: boolean;
}
/**
 * Create a new job posting
 */
export declare function createJobPosting(options: CreateJobOptions): Promise<JobPosting>;
/**
 * Get a job posting by ID
 */
export declare function getJobPosting(jobId: string, options?: {
    incrementView?: boolean;
}): Promise<JobPosting>;
/**
 * Update a job posting
 */
export declare function updateJobPosting(jobId: string, employerId: string, data: UpdateJobPostingRequest): Promise<JobPosting>;
/**
 * Update job status
 */
export declare function updateJobStatus(jobId: string, employerId: string, data: UpdateJobStatusRequest): Promise<JobPosting>;
/**
 * Refresh job posting (bump to top)
 */
export declare function refreshJobPosting(jobId: string, employerId: string, data?: RefreshJobRequest): Promise<JobPosting>;
/**
 * Delete a job posting (soft delete by closing)
 */
export declare function deleteJobPosting(jobId: string, employerId: string): Promise<void>;
/**
 * List job postings with filtering
 */
export declare function listJobPostings(filter?: JobFilterOptions): Promise<JobListResponse>;
/**
 * Get jobs by employer
 */
export declare function getEmployerJobs(employerId: string, filter?: Omit<JobFilterOptions, 'status'> & {
    status?: JobStatus | JobStatus[];
}): Promise<JobListResponse>;
/**
 * Get job statistics
 */
export declare function getJobStats(jobId: string, employerId: string): Promise<JobStats>;
/**
 * Create a job application
 */
export declare function createJobApplication(jobId: string, applicantId: string, applicantAgentId: string, coverLetter?: string, resumeUrl?: string, answers?: Record<string, string>): Promise<JobApplication>;
/**
 * Get applications for a job
 */
export declare function getJobApplications(jobId: string, employerId: string, filter?: JobApplicationFilter): Promise<{
    applications: JobApplication[];
    total: number;
    page: number;
    limit: number;
}>;
/**
 * Update application status
 */
export declare function updateApplicationStatus(applicationId: string, employerId: string, status: ApplicationStatus, notes?: string): Promise<JobApplication>;
/**
 * Get employer statistics
 */
export declare function getEmployerJobStats(employerId: string): Promise<{
    activeJobs: number;
    totalJobs: number;
    totalViews: number;
    totalApplications: number;
    conversionRate: number;
}>;
/**
 * Evaluate job quality
 */
export declare function evaluateJob(jobId: string, employerId: string): Promise<{
    score: number;
    strengths: string[];
    improvements: string[];
    missingFields: string[];
}>;
//# sourceMappingURL=jobPostingService.d.ts.map