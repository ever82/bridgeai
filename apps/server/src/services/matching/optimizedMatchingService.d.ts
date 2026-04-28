/**
 * Optimized Matching Service
 * Includes performance improvements for complex queries
 */
export interface MatchQueryOptions {
    demandId?: string;
    supplyId?: string;
    minScore?: number;
    maxScore?: number;
    excludeLowCredit?: boolean;
    creditWeight?: number;
    limit?: number;
    offset?: number;
}
export interface MatchResult {
    matchId: string;
    demandId: string;
    supplyId: string;
    score: number;
    creditScore?: number;
    creditLevel?: string;
    status: string;
    createdAt: Date;
}
/**
 * Optimized Matching Service
 */
export declare class OptimizedMatchingService {
    /**
     * Query matches with optimized database queries and caching
     */
    findMatches(options: MatchQueryOptions): Promise<{
        matches: MatchResult[];
        total: number;
    }>;
    /**
     * Fetch matches from database with optimized queries
     */
    private fetchMatchesFromDb;
    /**
     * Get recommended matches with caching
     */
    getRecommendedMatches(userId: string, limit?: number): Promise<MatchResult[]>;
    /**
     * Fetch recommended matches from database
     */
    private fetchRecommendedFromDb;
    /**
     * Check credit requirement with caching
     */
    checkCreditRequirement(userId: string, minScore?: number): Promise<{
        eligible: boolean;
        score: number;
        level: string;
        message: string;
    }>;
    /**
     * Invalidate match cache
     */
    invalidateCache(userId: string): Promise<void>;
    /**
     * Get match statistics
     */
    getMatchStats(): Promise<{
        totalMatches: number;
        pendingMatches: number;
        acceptedMatches: number;
        avgScore: number;
    }>;
}
export declare const optimizedMatchingService: OptimizedMatchingService;
//# sourceMappingURL=optimizedMatchingService.d.ts.map