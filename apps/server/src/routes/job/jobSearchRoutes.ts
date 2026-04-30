/**
 * Job Search Routes
 *
 * REST endpoints for job/candidate search, match results, and search history.
 */

import { Router, Request, Response, NextFunction } from 'express';

import {
  searchJobs,
  searchCandidates,
  getMatchResults,
  getSearchHistory,
  clearSearchHistory,
} from '../../services/job/jobSearchService';
import { AppError } from '../../errors';

const router: Router = Router();

// ---------------------------------------------------------------------------
// Job search
// ---------------------------------------------------------------------------

router.get('/jobs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
    }

    const result = await searchJobs({
      userId: req.user.id,
      keyword: req.query.keyword as string,
      city: req.query.city as string,
      workMode: req.query.workMode as string,
      jobType: req.query.jobType as string,
      experienceLevel: req.query.experienceLevel as string,
      educationLevel: req.query.educationLevel as string,
      minSalary: req.query.minSalary ? parseInt(req.query.minSalary as string) : undefined,
      maxSalary: req.query.maxSalary ? parseInt(req.query.maxSalary as string) : undefined,
      skills: req.query.skills ? (req.query.skills as string).split(',') : undefined,
      sortBy: req.query.sortBy as any,
      sortOrder: req.query.sortOrder as any,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
    });

    res.json({ success: true, data: result.items, pagination: result });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// Candidate search (recruiter)
// ---------------------------------------------------------------------------

router.get('/candidates/:jobId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
    }

    const result = await searchCandidates({
      userId: req.user.id,
      jobId: req.params.jobId,
      minMatchScore: req.query.minMatchScore
        ? parseFloat(req.query.minMatchScore as string)
        : undefined,
      skills: req.query.skills ? (req.query.skills as string).split(',') : undefined,
      experienceLevel: req.query.experienceLevel as string,
      salaryMin: req.query.salaryMin ? parseInt(req.query.salaryMin as string) : undefined,
      salaryMax: req.query.salaryMax ? parseInt(req.query.salaryMax as string) : undefined,
      sortBy: req.query.sortBy as any,
      sortOrder: req.query.sortOrder as any,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
    });

    res.json({ success: true, data: result.items, pagination: result });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// Match results
// ---------------------------------------------------------------------------

router.get('/matches', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
    }

    const result = await getMatchResults({
      userId: req.user.id,
      matchStatus: req.query.status as string,
      minScore: req.query.minScore ? parseFloat(req.query.minScore as string) : undefined,
      maxScore: req.query.maxScore ? parseFloat(req.query.maxScore as string) : undefined,
      sortBy: req.query.sortBy as any,
      sortOrder: req.query.sortOrder as any,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
    });

    res.json({ success: true, data: result.items, pagination: result });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// Search history
// ---------------------------------------------------------------------------

router.get('/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
    }

    const result = await getSearchHistory(
      req.user.id,
      req.query.page ? parseInt(req.query.page as string) : 1,
      req.query.limit ? parseInt(req.query.limit as string) : 20
    );

    res.json({ success: true, data: result.items, pagination: result });
  } catch (error) {
    next(error);
  }
});

router.delete('/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
    }

    const count = await clearSearchHistory(req.user.id);

    res.json({ success: true, data: { deleted: count } });
  } catch (error) {
    next(error);
  }
});

export default router;
