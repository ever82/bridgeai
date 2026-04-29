/**
 * Job Search Service
 *
 * Multi-condition job/candidate search, result sorting,
 * and search history tracking.
 */
import { prisma } from '../../db/client';
import { listJobPostings, getJobPosting } from './jobPostingService';
// ---------------------------------------------------------------------------
// Data is persisted via Prisma (SearchHistory, Agent/AgentProfile, Match)
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Search helpers
// ---------------------------------------------------------------------------
function paginate(items, page, limit) {
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
export async function searchJobs(params) {
    const result = await listJobPostings({
        keyword: params.keyword,
        city: params.city,
        workMode: params.workMode,
        jobType: params.jobType,
        experienceLevel: params.experienceLevel,
        educationLevel: params.educationLevel,
        minSalary: params.minSalary,
        maxSalary: params.maxSalary,
        skills: params.skills,
        status: 'PUBLISHED',
        sortBy: params.sortBy || 'createdAt',
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
export async function searchCandidates(params) {
    // Verify the job exists
    await getJobPosting(params.jobId);
    // Build where clause for agents with AGENTJOB type
    const where = {
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
        const l1Data = profile?.l1Data ?? {};
        const l2Data = profile?.l2Data ?? {};
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
        candidates = candidates.filter(c => (c.matchScore ?? 0) >= params.minMatchScore);
    }
    if (params.skills && params.skills.length > 0) {
        candidates = candidates.filter(c => params.skills.some(s => c.skills?.includes(s)));
    }
    if (params.experienceLevel) {
        candidates = candidates.filter(c => c.experienceLevel === params.experienceLevel);
    }
    if (params.salaryMin !== undefined) {
        candidates = candidates.filter(c => (c.salary ?? 0) >= params.salaryMin);
    }
    if (params.salaryMax !== undefined) {
        candidates = candidates.filter(c => (c.salary ?? 0) <= params.salaryMax);
    }
    // Sort
    const sortBy = params.sortBy || 'matchScore';
    const sortOrder = params.sortOrder || 'desc';
    candidates.sort((a, b) => {
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
export async function getMatchResults(params) {
    // Build filter conditions
    const scoreFilter = {};
    if (params.minScore !== undefined) {
        scoreFilter.gte = params.minScore;
    }
    if (params.maxScore !== undefined) {
        scoreFilter.lte = params.maxScore;
    }
    const where = {
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
    const orderBy = { [sortBy]: sortOrder };
    const [matches, total] = await Promise.all([
        prisma.match.findMany({
            where,
            orderBy,
            include: {
                demand: { include: { agent: { select: { userId: true } } } },
                supply: { include: { agent: { select: { userId: true } } } },
            },
        }),
        prisma.match.count({ where }),
    ]);
    const page = params.page || 1;
    const limit = params.limit || 20;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    return {
        items: matches.slice(start, start + limit),
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
export async function getSearchHistory(userId, page = 1, limit = 20) {
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
    const mapped = entries.map(e => ({
        id: e.id,
        userId: e.userId,
        query: e.query,
        filters: e.filters ?? {},
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
export async function clearSearchHistory(userId) {
    const result = await prisma.searchHistory.deleteMany({
        where: { userId },
    });
    return result.count;
}
//# sourceMappingURL=jobSearchService.js.map