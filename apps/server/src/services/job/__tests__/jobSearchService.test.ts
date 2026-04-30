/**
 * @jest-environment node
 */

import {
  searchJobs,
  searchCandidates,
  getMatchResults,
  getSearchHistory,
  clearSearchHistory,
} from '../jobSearchService';
import { prisma } from '../../../db/client';
import { listJobPostings, getJobPosting } from '../jobPostingService';

// Mock dependencies
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

const mockedListJobPostings = listJobPostings as jest.Mock;
const mockedGetJobPosting = getJobPosting as jest.Mock;

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const makePagination = (
  overrides: Partial<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }> = {}
) => ({
  total: 2,
  page: 1,
  limit: 20,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
  ...overrides,
});

const sampleJobs = [
  { id: 'job-1', title: 'Frontend Engineer', status: 'PUBLISHED' },
  { id: 'job-2', title: 'Backend Engineer', status: 'PUBLISHED' },
];

const makeAgentResult = (overrides: Record<string, any> = {}) => ({
  id: 'agent-1',
  userId: 'user-1',
  type: 'AGENTJOB',
  isActive: true,
  user: { id: 'user-1', name: 'Alice', displayName: 'Alice Chen', location: 'Shanghai' },
  profiles: [
    {
      id: 'profile-1',
      isActive: true,
      l1Data: { experienceLevel: 'senior', salary: 30000, matchScore: 85 },
      l2Data: { skills: ['TypeScript', 'React'] },
    },
  ],
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('jobSearchService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // searchJobs
  // -------------------------------------------------------------------------

  describe('searchJobs', () => {
    it('should call listJobPostings and return paginated results', async () => {
      mockedListJobPostings.mockResolvedValue({
        jobs: sampleJobs,
        pagination: makePagination(),
      });
      (prisma.searchHistory.create as jest.Mock).mockResolvedValue({ id: 'hist-1' });

      const result = await searchJobs({ userId: 'user-1' });

      expect(listJobPostings).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'PUBLISHED',
          sortBy: 'createdAt',
          sortOrder: 'desc',
          page: 1,
          limit: 20,
        })
      );
      expect(result.items).toEqual(sampleJobs);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(false);
    });

    it('should create search history entry', async () => {
      mockedListJobPostings.mockResolvedValue({
        jobs: sampleJobs,
        pagination: makePagination(),
      });
      (prisma.searchHistory.create as jest.Mock).mockResolvedValue({ id: 'hist-1' });

      await searchJobs({
        userId: 'user-1',
        keyword: 'react',
        city: 'Shanghai',
      });

      expect(prisma.searchHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          query: 'react',
          filters: expect.objectContaining({ city: 'Shanghai' }),
          resultCount: 2,
        }),
      });
    });

    it('should return empty results when no jobs found', async () => {
      mockedListJobPostings.mockResolvedValue({
        jobs: [],
        pagination: makePagination({ total: 0, totalPages: 0 }),
      });
      (prisma.searchHistory.create as jest.Mock).mockResolvedValue({ id: 'hist-2' });

      const result = await searchJobs({ userId: 'user-1', keyword: 'nonexistent' });

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // searchCandidates
  // -------------------------------------------------------------------------

  describe('searchCandidates', () => {
    it('should throw error when job does not exist', async () => {
      mockedGetJobPosting.mockRejectedValue(new Error('Job not found'));

      await expect(searchCandidates({ userId: 'user-1', jobId: 'nonexistent' })).rejects.toThrow(
        'Job not found'
      );

      expect(getJobPosting).toHaveBeenCalledWith('nonexistent');
    });

    it('should return candidates array', async () => {
      mockedGetJobPosting.mockResolvedValue({ id: 'job-1' });
      (prisma.agent.findMany as jest.Mock).mockResolvedValue([makeAgentResult()]);

      const result = await searchCandidates({ userId: 'user-1', jobId: 'job-1' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('agent-1');
      expect(result.items[0].name).toBe('Alice Chen');
      expect(result.items[0].skills).toEqual(['TypeScript', 'React']);
      expect(result.total).toBe(1);
    });

    it('should filter by minMatchScore', async () => {
      mockedGetJobPosting.mockResolvedValue({ id: 'job-1' });
      (prisma.agent.findMany as jest.Mock).mockResolvedValue([
        makeAgentResult({
          id: 'a1',
          profiles: [
            {
              id: 'p1',
              isActive: true,
              l1Data: { matchScore: 90, salary: 0 },
              l2Data: { skills: [] },
            },
          ],
        }),
        makeAgentResult({
          id: 'a2',
          profiles: [
            {
              id: 'p2',
              isActive: true,
              l1Data: { matchScore: 50, salary: 0 },
              l2Data: { skills: [] },
            },
          ],
        }),
      ]);

      const result = await searchCandidates({
        userId: 'user-1',
        jobId: 'job-1',
        minMatchScore: 80,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('a1');
    });

    it('should filter by skills', async () => {
      mockedGetJobPosting.mockResolvedValue({ id: 'job-1' });
      (prisma.agent.findMany as jest.Mock).mockResolvedValue([
        makeAgentResult({
          id: 'a1',
          profiles: [
            {
              id: 'p1',
              isActive: true,
              l1Data: { salary: 0, matchScore: 0 },
              l2Data: { skills: ['TypeScript', 'React'] },
            },
          ],
        }),
        makeAgentResult({
          id: 'a2',
          profiles: [
            {
              id: 'p2',
              isActive: true,
              l1Data: { salary: 0, matchScore: 0 },
              l2Data: { skills: ['Python'] },
            },
          ],
        }),
      ]);

      const result = await searchCandidates({
        userId: 'user-1',
        jobId: 'job-1',
        skills: ['TypeScript'],
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('a1');
    });

    it('should filter by experienceLevel', async () => {
      mockedGetJobPosting.mockResolvedValue({ id: 'job-1' });
      (prisma.agent.findMany as jest.Mock).mockResolvedValue([
        makeAgentResult({
          id: 'a1',
          profiles: [
            {
              id: 'p1',
              isActive: true,
              l1Data: { experienceLevel: 'senior', salary: 0, matchScore: 0 },
              l2Data: { skills: [] },
            },
          ],
        }),
        makeAgentResult({
          id: 'a2',
          profiles: [
            {
              id: 'p2',
              isActive: true,
              l1Data: { experienceLevel: 'junior', salary: 0, matchScore: 0 },
              l2Data: { skills: [] },
            },
          ],
        }),
      ]);

      const result = await searchCandidates({
        userId: 'user-1',
        jobId: 'job-1',
        experienceLevel: 'senior',
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('a1');
    });

    it('should filter by salaryMin and salaryMax', async () => {
      mockedGetJobPosting.mockResolvedValue({ id: 'job-1' });
      (prisma.agent.findMany as jest.Mock).mockResolvedValue([
        makeAgentResult({
          id: 'a1',
          profiles: [
            {
              id: 'p1',
              isActive: true,
              l1Data: { salary: 30000, matchScore: 0 },
              l2Data: { skills: [] },
            },
          ],
        }),
        makeAgentResult({
          id: 'a2',
          profiles: [
            {
              id: 'p2',
              isActive: true,
              l1Data: { salary: 10000, matchScore: 0 },
              l2Data: { skills: [] },
            },
          ],
        }),
        makeAgentResult({
          id: 'a3',
          profiles: [
            {
              id: 'p3',
              isActive: true,
              l1Data: { salary: 50000, matchScore: 0 },
              l2Data: { skills: [] },
            },
          ],
        }),
      ]);

      const result = await searchCandidates({
        userId: 'user-1',
        jobId: 'job-1',
        salaryMin: 20000,
        salaryMax: 40000,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('a1');
    });

    it('should paginate results correctly', async () => {
      mockedGetJobPosting.mockResolvedValue({ id: 'job-1' });
      const agents = Array.from({ length: 25 }, (_, i) =>
        makeAgentResult({
          id: `agent-${i}`,
          profiles: [
            {
              id: `p-${i}`,
              isActive: true,
              l1Data: { salary: 0, matchScore: 100 - i },
              l2Data: { skills: [] },
            },
          ],
        })
      );
      (prisma.agent.findMany as jest.Mock).mockResolvedValue(agents);

      // Page 1, limit 10
      const page1 = await searchCandidates({
        userId: 'user-1',
        jobId: 'job-1',
        page: 1,
        limit: 10,
      });
      expect(page1.items).toHaveLength(10);
      expect(page1.total).toBe(25);
      expect(page1.page).toBe(1);
      expect(page1.totalPages).toBe(3);
      expect(page1.hasNext).toBe(true);
      expect(page1.hasPrev).toBe(false);

      // Page 3, limit 10
      const page3 = await searchCandidates({
        userId: 'user-1',
        jobId: 'job-1',
        page: 3,
        limit: 10,
      });
      expect(page3.items).toHaveLength(5);
      expect(page3.hasNext).toBe(false);
      expect(page3.hasPrev).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // getMatchResults
  // -------------------------------------------------------------------------

  describe('getMatchResults', () => {
    const sampleMatches = [
      { id: 'match-1', score: 95, status: 'ACCEPTED' },
      { id: 'match-2', score: 70, status: 'PENDING' },
    ];

    it('should return match results', async () => {
      (prisma.match.findMany as jest.Mock).mockResolvedValue(sampleMatches);
      (prisma.match.count as jest.Mock).mockResolvedValue(2);

      const result = await getMatchResults({ userId: 'user-1' });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);

      expect(prisma.match.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { demand: { agent: { userId: 'user-1' } } },
              { supply: { agent: { userId: 'user-1' } } },
            ]),
          }),
        })
      );
    });

    it('should filter by status', async () => {
      (prisma.match.findMany as jest.Mock).mockResolvedValue([sampleMatches[0]]);
      (prisma.match.count as jest.Mock).mockResolvedValue(1);

      await getMatchResults({ userId: 'user-1', matchStatus: 'ACCEPTED' });

      expect(prisma.match.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'ACCEPTED' }),
        })
      );
    });

    it('should filter by score range', async () => {
      (prisma.match.findMany as jest.Mock).mockResolvedValue(sampleMatches);
      (prisma.match.count as jest.Mock).mockResolvedValue(2);

      await getMatchResults({ userId: 'user-1', minScore: 60, maxScore: 100 });

      expect(prisma.match.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            score: { gte: 60, lte: 100 },
          }),
        })
      );
    });

    it('should paginate results', async () => {
      (prisma.match.findMany as jest.Mock).mockImplementation((args: any) => {
        // DB-level pagination returns only the requested page
        const skip = args.skip || 0;
        const take = args.take || 20;
        const allMatches = Array.from({ length: 25 }, (_, i) => ({ id: `m-${i}`, score: 90 - i }));
        return Promise.resolve(allMatches.slice(skip, skip + take));
      });
      (prisma.match.count as jest.Mock).mockResolvedValue(25);

      const result = await getMatchResults({ userId: 'user-1', page: 2, limit: 10 });

      expect(result.items).toHaveLength(10);
      expect(result.page).toBe(2);
      expect(result.totalPages).toBe(3);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrev).toBe(true);
      expect(prisma.match.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 })
      );
    });
  });

  // -------------------------------------------------------------------------
  // getSearchHistory
  // -------------------------------------------------------------------------

  describe('getSearchHistory', () => {
    const sampleEntries = [
      {
        id: 'h-1',
        userId: 'user-1',
        query: 'react',
        filters: { city: 'Shanghai' },
        resultCount: 5,
        createdAt: new Date('2024-01-01'),
      },
      {
        id: 'h-2',
        userId: 'user-1',
        query: 'node',
        filters: {},
        resultCount: 3,
        createdAt: new Date('2024-01-02'),
      },
    ];

    it('should return history entries', async () => {
      (prisma.searchHistory.findMany as jest.Mock).mockResolvedValue(sampleEntries);
      (prisma.searchHistory.count as jest.Mock).mockResolvedValue(2);

      const result = await getSearchHistory('user-1');

      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe('h-1');
      expect(result.items[0].query).toBe('react');
      expect(result.items[0].filters).toEqual({ city: 'Shanghai' });
      expect(result.items[0].resultCount).toBe(5);
      expect(result.items[0].createdAt).toBe('2024-01-01T00:00:00.000Z');
      expect(result.total).toBe(2);
    });

    it('should paginate correctly', async () => {
      (prisma.searchHistory.findMany as jest.Mock).mockResolvedValue(sampleEntries);
      (prisma.searchHistory.count as jest.Mock).mockResolvedValue(10);

      const result = await getSearchHistory('user-1', 2, 5);

      expect(prisma.searchHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
        })
      );
      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(result.totalPages).toBe(2);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(true);
    });

    it('should return empty results when no history exists', async () => {
      (prisma.searchHistory.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.searchHistory.count as jest.Mock).mockResolvedValue(0);

      const result = await getSearchHistory('user-1');

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // clearSearchHistory
  // -------------------------------------------------------------------------

  describe('clearSearchHistory', () => {
    it('should call deleteMany and return deleted count', async () => {
      (prisma.searchHistory.deleteMany as jest.Mock).mockResolvedValue({ count: 5 });

      const count = await clearSearchHistory('user-1');

      expect(prisma.searchHistory.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(count).toBe(5);
    });

    it('should return 0 when nothing to delete', async () => {
      (prisma.searchHistory.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });

      const count = await clearSearchHistory('user-no-history');

      expect(count).toBe(0);
    });
  });
});
