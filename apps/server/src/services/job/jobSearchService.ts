/**
 * Job Search Service
 *
 * Multi-condition job/candidate search, result sorting,
 * and search history tracking.
 */

import { prisma } from '../../db/client';

import { listJobPostings, getJobPosting } from './jobPostingService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface JobSearchParams {
  userId: string;
  keyword?: string;
  city?: string;
  workMode?: string;
  jobType?: string;
  experienceLevel?: string;
  educationLevel?: string;
  minSalary?: number;
  maxSalary?: number;
  skills?: string[];
  sortBy?: 'createdAt' | 'salary' | 'matchScore' | 'viewCount';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CandidateSearchParams {
  userId: string;
  jobId: string;
  minMatchScore?: number;
  skills?: string[];
  experienceLevel?: string;
  salaryMin?: number;
  salaryMax?: number;
  sortBy?: 'matchScore' | 'salary' | 'experience';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface MatchResultQueryParams {
  userId: string;
  matchStatus?: string;
  minScore?: number;
  maxScore?: number;
  sortBy?: 'score' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface SearchHistoryEntry {
  id: string;
  userId: string;
  query: string;
  filters: Record<string, unknown>;
  resultCount: number;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Data is persisted via Prisma (SearchHistory, Agent/AgentProfile, Match)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Search helpers
// ---------------------------------------------------------------------------

function paginate<T>(items: T[], page: number, limit: number): SearchResult<T> {
  const total = items.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

// ---------------------------------------------------------------------------
// Job Search
// ---------------------------------------------------------------------------

/**
 * Search published jobs with multi-condition filtering and sorting.
 */
export async function searchJobs(params: JobSearchParams): Promise<SearchResult<any>> {
  // matchScore is not supported by listJobPostings; fall back to createdAt
  const effectiveSortBy =
    params.sortBy && params.sortBy !== 'matchScore' ? params.sortBy : 'createdAt';

  const result = await listJobPostings({
    keyword: params.keyword,
    city: params.city,
    workMode: params.workMode as any,
    jobType: params.jobType as any,
    experienceLevel: params.experienceLevel as any,
    educationLevel: params.educationLevel as any,
    minSalary: params.minSalary,
    maxSalary: params.maxSalary,
    skills: params.skills,
    status: 'PUBLISHED' as any,
    sortBy: effectiveSortBy,
    sortOrder: params.sortOrder || 'desc',
    page: params.page || 1,
    limit: params.limit || 20,
  });

  // Record search history (fire-and-forget, don't block the response)
  prisma.searchHistory
    .create({
      data: {
        userId: params.userId,
        query: params.keyword || '',
        filters: {
          city: params.city,
          workMode: params.workMode,
          jobType: params.jobType,
          minSalary: params.minSalary,
          maxSalary: params.maxSalary,
          skills: params.skills,
        },
        resultCount: result.pagination.total,
      },
    })
    .catch(() => {
      // Silently ignore history write failures
    });

  return {
    items: result.jobs,
    total: result.pagination.total,
    page: result.pagination.page,
    limit: result.pagination.limit,
    totalPages: result.pagination.totalPages,
    hasNext: result.pagination.hasNext,
    hasPrev: result.pagination.hasPrev,
  };
}

// ---------------------------------------------------------------------------
// Candidate Search (recruiter perspective)
// ---------------------------------------------------------------------------

/**
 * Search candidates for a specific job posting.
 * Queries Agent (AGENTJOB type) + AgentProfile from the database.
 */
export async function searchCandidates(params: CandidateSearchParams): Promise<SearchResult<any>> {
  // Verify the job exists
  await getJobPosting(params.jobId);

  // Build where clause for agents with AGENTJOB type
  const where: any = {
    type: 'AGENTJOB',
    isActive: true,
  };

  // Fetch candidate agents with their profiles
  const agents = await prisma.agent.findMany({
    where,
    include: {
      profiles: {
        where: { isActive: true },
        take: 1,
      },
      user: {
        select: { id: true, name: true, displayName: true, location: true },
      },
    },
  });

  // Map to candidate-like objects
  let candidates = agents.map(agent => {
    const profile = agent.profiles[0];
    const l1Data = (profile?.l1Data as Record<string, any>) ?? {};
    const l2Data = (profile?.l2Data as Record<string, any>) ?? {};
    return {
      id: agent.id,
      userId: agent.userId,
      name: agent.user?.displayName || agent.user?.name || '',
      skills: Array.isArray(l2Data.skills) ? l2Data.skills : [],
      experienceLevel: l1Data.experienceLevel ?? l2Data.experienceLevel ?? '',
      salary: l1Data.salary ?? l2Data.salary ?? 0,
      matchScore: l1Data.matchScore ?? l2Data.matchScore ?? 0,
      location: agent.user?.location ?? '',
    };
  });

  // Apply filters
  if (params.minMatchScore !== undefined) {
    candidates = candidates.filter(c => (c.matchScore ?? 0) >= params.minMatchScore!);
  }
  if (params.skills && params.skills.length > 0) {
    candidates = candidates.filter(c => params.skills!.some(s => c.skills?.includes(s)));
  }
  if (params.experienceLevel) {
    candidates = candidates.filter(c => c.experienceLevel === params.experienceLevel);
  }
  if (params.salaryMin !== undefined) {
    candidates = candidates.filter(c => (c.salary ?? 0) >= params.salaryMin!);
  }
  if (params.salaryMax !== undefined) {
    candidates = candidates.filter(c => (c.salary ?? 0) <= params.salaryMax!);
  }

  // Sort
  const sortBy = params.sortBy || 'matchScore';
  const sortOrder = params.sortOrder || 'desc';
  candidates.sort((a: any, b: any) => {
    const valA = a[sortBy] ?? 0;
    const valB = b[sortBy] ?? 0;
    const cmp = typeof valA === 'number' && typeof valB === 'number' ? valA - valB : 0;
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  return paginate(candidates, params.page || 1, params.limit || 20);
}

// ---------------------------------------------------------------------------
// Match Results
// ---------------------------------------------------------------------------

/**
 * Get match results with filtering and sorting.
 * Queries the Match table via Prisma, scoped to matches where the user's
 * agents are involved (either on the demand or supply side).
 */
export async function getMatchResults(params: MatchResultQueryParams): Promise<SearchResult<any>> {
  // Build filter conditions
  const scoreFilter: any = {};
  if (params.minScore !== undefined) {
    scoreFilter.gte = params.minScore;
  }
  if (params.maxScore !== undefined) {
    scoreFilter.lte = params.maxScore;
  }

  const where: any = {
    OR: [
      { demand: { agent: { userId: params.userId } } },
      { supply: { agent: { userId: params.userId } } },
    ],
  };

  if (params.matchStatus) {
    where.status = params.matchStatus;
  }
  if (Object.keys(scoreFilter).length > 0) {
    where.score = scoreFilter;
  }

  // Determine sort order
  const sortBy = params.sortBy || 'score';
  const sortOrder = params.sortOrder || 'desc';
  const orderBy: any = { [sortBy]: sortOrder };

  const page = params.page || 1;
  const limit = params.limit || 20;

  const [matches, total] = await Promise.all([
    prisma.match.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        demand: { include: { agent: { select: { userId: true } } } },
        supply: { include: { agent: { select: { userId: true } } } },
      },
    }),
    prisma.match.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    items: matches,
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

// ---------------------------------------------------------------------------
// Search History
// ---------------------------------------------------------------------------

/**
 * Get search history for a user.
 */
export async function getSearchHistory(
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<SearchResult<SearchHistoryEntry>> {
  const where = { userId };

  const [entries, total] = await Promise.all([
    prisma.searchHistory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.searchHistory.count({ where }),
  ]);

  // Map DB records to SearchHistoryEntry interface
  const mapped: SearchHistoryEntry[] = entries.map(e => ({
    id: e.id,
    userId: e.userId,
    query: e.query,
    filters: (e.filters as Record<string, unknown>) ?? {},
    resultCount: e.resultCount,
    createdAt: e.createdAt.toISOString(),
  }));

  const totalPages = Math.ceil(total / limit);

  return {
    items: mapped,
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Clear search history for a user.
 */
export async function clearSearchHistory(userId: string): Promise<number> {
  const result = await prisma.searchHistory.deleteMany({
    where: { userId },
  });
  return result.count;
}
