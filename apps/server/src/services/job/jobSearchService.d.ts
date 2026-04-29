/**
 * Job Search Service
 *
 * Multi-condition job/candidate search, result sorting,
 * and search history tracking.
 */
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
/**
 * Search published jobs with multi-condition filtering and sorting.
 */
export declare function searchJobs(params: JobSearchParams): Promise<SearchResult<any>>;
/**
 * Search candidates for a specific job posting.
 * Queries Agent (AGENTJOB type) + AgentProfile from the database.
 */
export declare function searchCandidates(params: CandidateSearchParams): Promise<SearchResult<any>>;
/**
 * Get match results with filtering and sorting.
 * Queries the Match table via Prisma, scoped to matches where the user's
 * agents are involved (either on the demand or supply side).
 */
export declare function getMatchResults(params: MatchResultQueryParams): Promise<SearchResult<any>>;
/**
 * Get search history for a user.
 */
export declare function getSearchHistory(userId: string, page?: number, limit?: number): Promise<SearchResult<SearchHistoryEntry>>;
/**
 * Clear search history for a user.
 */
export declare function clearSearchHistory(userId: string): Promise<number>;
//# sourceMappingURL=jobSearchService.d.ts.map