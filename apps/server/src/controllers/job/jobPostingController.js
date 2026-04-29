/**
 * Job Posting Controller
 *
 * Handles HTTP requests for job posting management
 */
import { createJobPosting, getJobPosting, updateJobPosting, updateJobStatus, refreshJobPosting, deleteJobPosting, listJobPostings, getEmployerJobs, getJobStats, getJobApplications, updateApplicationStatus, getEmployerJobStats, evaluateJob, } from '../../services/job';
import { AppError } from '../../errors';
/**
 * Create a new job posting
 */
export async function createJob(req, res, next) {
    try {
        if (!req.user) {
            throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
        }
        const employerId = req.user.id;
        const employerProfileId = req.user.employerProfileId || employerId;
        const agentId = req.user.agentId || employerId;
        const job = await createJobPosting({
            employerId,
            employerProfileId,
            agentId,
            data: req.body,
            autoExtract: req.body.autoExtract ?? false,
        });
        res.status(201).json({
            success: true,
            data: job,
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Get a job posting by ID
 */
export async function getJob(req, res, next) {
    try {
        const { id } = req.params;
        const incrementView = req.query.incrementView !== 'false';
        const job = await getJobPosting(id, { incrementView });
        res.json({
            success: true,
            data: job,
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Update a job posting
 */
export async function updateJob(req, res, next) {
    try {
        if (!req.user) {
            throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
        }
        const { id } = req.params;
        const employerId = req.user.id;
        const job = await updateJobPosting(id, employerId, req.body);
        res.json({
            success: true,
            data: job,
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Update job status
 */
export async function updateStatus(req, res, next) {
    try {
        if (!req.user) {
            throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
        }
        const { id } = req.params;
        const employerId = req.user.id;
        const job = await updateJobStatus(id, employerId, req.body);
        res.json({
            success: true,
            data: job,
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Refresh job posting
 */
export async function refreshJob(req, res, next) {
    try {
        if (!req.user) {
            throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
        }
        const { id } = req.params;
        const employerId = req.user.id;
        const job = await refreshJobPosting(id, employerId, req.body);
        res.json({
            success: true,
            data: job,
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Delete (close) a job posting
 */
export async function deleteJob(req, res, next) {
    try {
        if (!req.user) {
            throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
        }
        const { id } = req.params;
        const employerId = req.user.id;
        await deleteJobPosting(id, employerId);
        res.json({
            success: true,
            message: 'Job posting closed successfully',
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * List job postings with filters
 */
export async function listJobs(req, res, next) {
    try {
        const filter = {
            keyword: req.query.keyword,
            city: req.query.city,
            workMode: req.query.workMode,
            jobType: req.query.jobType,
            experienceLevel: req.query.experienceLevel,
            educationLevel: req.query.educationLevel,
            minSalary: req.query.minSalary ? parseInt(req.query.minSalary) : undefined,
            maxSalary: req.query.maxSalary ? parseInt(req.query.maxSalary) : undefined,
            skills: req.query.skills ? req.query.skills.split(',') : undefined,
            industry: req.query.industry,
            companySize: req.query.companySize,
            status: req.query.status,
            isUrgent: req.query.isUrgent === 'true',
            page: req.query.page ? parseInt(req.query.page) : 1,
            limit: req.query.limit ? parseInt(req.query.limit) : 20,
            sortBy: req.query.sortBy,
            sortOrder: req.query.sortOrder,
        };
        // Remove undefined values
        const cleanFilter = Object.fromEntries(Object.entries(filter).filter(([_, v]) => v !== undefined));
        const result = await listJobPostings(cleanFilter);
        res.json({
            success: true,
            data: result.jobs,
            pagination: result.pagination,
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Get employer's jobs
 */
export async function getMyJobs(req, res, next) {
    try {
        if (!req.user) {
            throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
        }
        const employerId = req.user.id;
        const status = req.query.status;
        const result = await getEmployerJobs(employerId, {
            status,
            page: req.query.page ? parseInt(req.query.page) : 1,
            limit: req.query.limit ? parseInt(req.query.limit) : 20,
        });
        res.json({
            success: true,
            data: result.jobs,
            pagination: result.pagination,
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Get job statistics
 */
export async function getJobStatistics(req, res, next) {
    try {
        if (!req.user) {
            throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
        }
        const { id } = req.params;
        const employerId = req.user.id;
        const stats = await getJobStats(id, employerId);
        res.json({
            success: true,
            data: stats,
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Get employer statistics
 */
export async function getMyStatistics(req, res, next) {
    try {
        if (!req.user) {
            throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
        }
        const employerId = req.user.id;
        const stats = await getEmployerJobStats(employerId);
        res.json({
            success: true,
            data: stats,
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Get job applications
 */
export async function getApplications(req, res, next) {
    try {
        if (!req.user) {
            throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
        }
        const { id } = req.params;
        const employerId = req.user.id;
        const result = await getJobApplications(id, employerId, {
            status: req.query.status,
            page: req.query.page ? parseInt(req.query.page) : 1,
            limit: req.query.limit ? parseInt(req.query.limit) : 20,
        });
        res.json({
            success: true,
            data: result.applications,
            total: result.total,
            page: result.page,
            limit: result.limit,
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Update application status
 */
export async function updateApplication(req, res, next) {
    try {
        if (!req.user) {
            throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
        }
        const { id, applicationId } = req.params;
        const employerId = req.user.id;
        const { status, notes } = req.body;
        const application = await updateApplicationStatus(applicationId, employerId, status, notes);
        res.json({
            success: true,
            data: application,
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Evaluate job quality
 */
export async function evaluateJobQuality(req, res, next) {
    try {
        if (!req.user) {
            throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
        }
        const { id } = req.params;
        const employerId = req.user.id;
        const evaluation = await evaluateJob(id, employerId);
        res.json({
            success: true,
            data: evaluation,
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Extract job from natural language
 */
export async function extractJob(req, res, next) {
    try {
        const { description } = req.body;
        if (!description) {
            throw new AppError('Description is required', 'MISSING_DESCRIPTION', 400);
        }
        // Import extraction function
        const { extractJobFromDescription } = await import('../../services/job');
        const result = await extractJobFromDescription(description);
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=jobPostingController.js.map