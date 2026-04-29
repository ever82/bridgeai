/**
 * Job Search Routes
 *
 * REST endpoints for job/candidate search, match results, and search history.
 */
import { Router } from 'express';
import { searchJobs, searchCandidates, getMatchResults, getSearchHistory, clearSearchHistory, } from '../../services/job/jobSearchService';
import { AppError } from '../../errors';
const router = Router();
// ---------------------------------------------------------------------------
// Job search
// ---------------------------------------------------------------------------
router.get('/jobs', async (req, res, next) => {
    try {
        if (!req.user) {
            throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
        }
        const result = await searchJobs({
            userId: req.user.id,
            keyword: req.query.keyword,
            city: req.query.city,
            workMode: req.query.workMode,
            jobType: req.query.jobType,
            experienceLevel: req.query.experienceLevel,
            educationLevel: req.query.educationLevel,
            minSalary: req.query.minSalary ? parseInt(req.query.minSalary) : undefined,
            maxSalary: req.query.maxSalary ? parseInt(req.query.maxSalary) : undefined,
            skills: req.query.skills ? req.query.skills.split(',') : undefined,
            sortBy: req.query.sortBy,
            sortOrder: req.query.sortOrder,
            page: req.query.page ? parseInt(req.query.page) : 1,
            limit: req.query.limit ? parseInt(req.query.limit) : 20,
        });
        res.json({ success: true, data: result.items, pagination: result });
    }
    catch (error) {
        next(error);
    }
});
// ---------------------------------------------------------------------------
// Candidate search (recruiter)
// ---------------------------------------------------------------------------
router.get('/candidates/:jobId', async (req, res, next) => {
    try {
        if (!req.user) {
            throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
        }
        const result = await searchCandidates({
            userId: req.user.id,
            jobId: req.params.jobId,
            minMatchScore: req.query.minMatchScore
                ? parseFloat(req.query.minMatchScore)
                : undefined,
            skills: req.query.skills ? req.query.skills.split(',') : undefined,
            experienceLevel: req.query.experienceLevel,
            salaryMin: req.query.salaryMin ? parseInt(req.query.salaryMin) : undefined,
            salaryMax: req.query.salaryMax ? parseInt(req.query.salaryMax) : undefined,
            sortBy: req.query.sortBy,
            sortOrder: req.query.sortOrder,
            page: req.query.page ? parseInt(req.query.page) : 1,
            limit: req.query.limit ? parseInt(req.query.limit) : 20,
        });
        res.json({ success: true, data: result.items, pagination: result });
    }
    catch (error) {
        next(error);
    }
});
// ---------------------------------------------------------------------------
// Match results
// ---------------------------------------------------------------------------
router.get('/matches', async (req, res, next) => {
    try {
        if (!req.user) {
            throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
        }
        const result = await getMatchResults({
            userId: req.user.id,
            matchStatus: req.query.status,
            minScore: req.query.minScore ? parseFloat(req.query.minScore) : undefined,
            maxScore: req.query.maxScore ? parseFloat(req.query.maxScore) : undefined,
            sortBy: req.query.sortBy,
            sortOrder: req.query.sortOrder,
            page: req.query.page ? parseInt(req.query.page) : 1,
            limit: req.query.limit ? parseInt(req.query.limit) : 20,
        });
        res.json({ success: true, data: result.items, pagination: result });
    }
    catch (error) {
        next(error);
    }
});
// ---------------------------------------------------------------------------
// Search history
// ---------------------------------------------------------------------------
router.get('/history', async (req, res, next) => {
    try {
        if (!req.user) {
            throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
        }
        const result = await getSearchHistory(req.user.id, req.query.page ? parseInt(req.query.page) : 1, req.query.limit ? parseInt(req.query.limit) : 20);
        res.json({ success: true, data: result.items, pagination: result });
    }
    catch (error) {
        next(error);
    }
});
router.delete('/history', async (req, res, next) => {
    try {
        if (!req.user) {
            throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
        }
        const count = await clearSearchHistory(req.user.id);
        res.json({ success: true, data: { deleted: count } });
    }
    catch (error) {
        next(error);
    }
});
export default router;
//# sourceMappingURL=jobSearchRoutes.js.map