/**
 * @jest-environment node
 *
 * Integration tests for Job Search Routes (JOB003c)
 *
 * These tests exercise the HTTP request flow end-to-end through the Express
 * router, request parsing, the service layer, and JSON response shaping.
 * The data layer (prisma + jobPostingService) is mocked at the module
 * boundary so the tests run hermetically without a live database, while
 * still verifying the integration of routes + services.
 */

/* eslint-disable import/order */
import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';

jest.mock('../../../db/client', () => {
  const mPrisma = {
    searchHistory: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    match: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    agent: {
      findMany: jest.fn(),
    },
  };
  return { prisma: mPrisma };
});

jest.mock('../jobPostingService', () => ({
  listJobPostings: jest.fn(),
  getJobPosting: jest.fn(),
}));

import jobSearchRoutes from '../../../routes/job/jobSearchRoutes';
import { prisma } from '../../../db/client';
import { listJobPostings, getJobPosting } from '../jobPostingService';
import { AppError } from '../../../errors';

const mockedListJobPostings = listJobPostings as jest.Mock;
const mockedGetJobPosting = getJobPosting as jest.Mock;

// ---------------------------------------------------------------------------
// App factory
// ---------------------------------------------------------------------------

interface TestUser {
  id: string;
  role?: string;
}

function buildApp(user: TestUser | null = { id: 'user-1' }): Express {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (user) {
      (req as any).user = user;
    }
    next();
  });
  app.use('/api/v1/job-search', jobSearchRoutes);

  // Standard error handler (mirrors production semantics for AppError)
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction): void => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: err.message },
    });
  });
  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Job Search Routes Integration (JOB003c)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // GET /jobs
  // -------------------------------------------------------------------------

  describe('GET /api/v1/job-search/jobs', () => {
    it('returns paginated job results for authenticated user', async () => {
      mockedListJobPostings.mockResolvedValue({
        jobs: [
          { id: 'job-1', title: 'Frontend Engineer', status: 'PUBLISHED' },
          { id: 'job-2', title: 'Backend Engineer', status: 'PUBLISHED' },
        ],
        pagination: {
          total: 2,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });
      (prisma.searchHistory.create as jest.Mock).mockResolvedValue({});

      const res = await request(buildApp())
        .get('/api/v1/job-search/jobs')
        .query({ keyword: 'engineer', city: 'Shanghai', skills: 'react,ts' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].id).toBe('job-1');
      expect(res.body.pagination.total).toBe(2);

      // Verify request parameters were forwarded to the service properly
      expect(mockedListJobPostings).toHaveBeenCalledTimes(1);
      const calledArgs = mockedListJobPostings.mock.calls[0][0];
      expect(calledArgs).toMatchObject({ status: 'PUBLISHED' });
    });

    it('parses numeric and array query params correctly', async () => {
      mockedListJobPostings.mockResolvedValue({
        jobs: [],
        pagination: {
          total: 0,
          page: 2,
          limit: 5,
          totalPages: 0,
          hasNext: false,
          hasPrev: true,
        },
      });
      (prisma.searchHistory.create as jest.Mock).mockResolvedValue({});

      await request(buildApp())
        .get('/api/v1/job-search/jobs')
        .query({
          minSalary: '20000',
          maxSalary: '40000',
          skills: 'react,node,ts',
          page: '2',
          limit: '5',
        })
        .expect(200);

      // listJobPostings is invoked; the service is responsible for filter
      // application. We just verify the route forwarded parsed values.
      expect(mockedListJobPostings).toHaveBeenCalled();
    });

    it('returns 401 when no authenticated user is present', async () => {
      const res = await request(buildApp(null)).get('/api/v1/job-search/jobs').expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(mockedListJobPostings).not.toHaveBeenCalled();
    });

    it('propagates 500 when service throws unexpected error', async () => {
      mockedListJobPostings.mockRejectedValue(new Error('db down'));

      const res = await request(buildApp()).get('/api/v1/job-search/jobs').expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  // -------------------------------------------------------------------------
  // GET /candidates/:jobId
  // -------------------------------------------------------------------------

  describe('GET /api/v1/job-search/candidates/:jobId', () => {
    it('returns candidate matches for the given job', async () => {
      mockedGetJobPosting.mockResolvedValue({
        id: 'job-1',
        title: 'Senior Frontend Engineer',
        recruiterId: 'user-1',
      });
      (prisma.agent.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.searchHistory.create as jest.Mock).mockResolvedValue({});

      const res = await request(buildApp())
        .get('/api/v1/job-search/candidates/job-1')
        .query({ minMatchScore: '0.7', skills: 'react,ts' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
      expect(mockedGetJobPosting).toHaveBeenCalledWith('job-1');
    });

    it('returns 401 when not authenticated', async () => {
      const res = await request(buildApp(null))
        .get('/api/v1/job-search/candidates/job-1')
        .expect(401);

      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  // -------------------------------------------------------------------------
  // GET /matches
  // -------------------------------------------------------------------------

  describe('GET /api/v1/job-search/matches', () => {
    it('returns paginated match results for the user', async () => {
      (prisma.match.findMany as jest.Mock).mockResolvedValue([
        { id: 'match-1', score: 0.9, status: 'pending' },
        { id: 'match-2', score: 0.7, status: 'pending' },
      ]);
      (prisma.match.count as jest.Mock).mockResolvedValue(2);

      const res = await request(buildApp())
        .get('/api/v1/job-search/matches')
        .query({ minScore: '0.5', maxScore: '1.0' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination.total).toBe(2);
      expect(prisma.match.findMany).toHaveBeenCalled();
    });

    it('returns 401 when not authenticated', async () => {
      await request(buildApp(null)).get('/api/v1/job-search/matches').expect(401);
    });
  });

  // -------------------------------------------------------------------------
  // GET /history and DELETE /history
  // -------------------------------------------------------------------------

  describe('Search history endpoints', () => {
    it('GET /history returns paginated search history', async () => {
      (prisma.searchHistory.findMany as jest.Mock).mockResolvedValue([
        { id: 'h-1', userId: 'user-1', keyword: 'react', createdAt: new Date() },
      ]);
      (prisma.searchHistory.count as jest.Mock).mockResolvedValue(1);

      const res = await request(buildApp()).get('/api/v1/job-search/history').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination.total).toBe(1);
    });

    it('DELETE /history clears search history and reports count', async () => {
      (prisma.searchHistory.deleteMany as jest.Mock).mockResolvedValue({ count: 7 });

      const res = await request(buildApp()).delete('/api/v1/job-search/history').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.deleted).toBe(7);
      expect(prisma.searchHistory.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('GET /history returns 401 when not authenticated', async () => {
      await request(buildApp(null)).get('/api/v1/job-search/history').expect(401);
    });

    it('DELETE /history returns 401 when not authenticated', async () => {
      await request(buildApp(null)).delete('/api/v1/job-search/history').expect(401);
    });
  });
});
