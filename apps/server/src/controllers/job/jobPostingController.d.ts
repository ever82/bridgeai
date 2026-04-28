/**
 * Job Posting Controller
 *
 * Handles HTTP requests for job posting management
 */
import { Request, Response, NextFunction } from 'express';
type AuthenticatedRequest = Request & {
    user?: any;
    token?: string;
};
/**
 * Create a new job posting
 */
export declare function createJob(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Get a job posting by ID
 */
export declare function getJob(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Update a job posting
 */
export declare function updateJob(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Update job status
 */
export declare function updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Refresh job posting
 */
export declare function refreshJob(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Delete (close) a job posting
 */
export declare function deleteJob(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * List job postings with filters
 */
export declare function listJobs(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Get employer's jobs
 */
export declare function getMyJobs(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Get job statistics
 */
export declare function getJobStatistics(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Get employer statistics
 */
export declare function getMyStatistics(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Get job applications
 */
export declare function getApplications(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Update application status
 */
export declare function updateApplication(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Evaluate job quality
 */
export declare function evaluateJobQuality(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Extract job from natural language
 */
export declare function extractJob(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
export {};
//# sourceMappingURL=jobPostingController.d.ts.map