/**
 * Cache Service
 * Redis-based caching for performance optimization
 */
export declare const CacheTTL: {
    readonly CREDIT_SCORE: 300;
    readonly USER_PROFILE: 300;
    readonly AGENT_PROFILE: 300;
    readonly SCENE_CONFIG: 300;
    readonly MATCH_RESULTS: 900;
    readonly CONVERSATION_LIST: 900;
    readonly LOCATION_SEARCH: 900;
    readonly ROLE_PERMISSIONS: 3600;
    readonly SYSTEM_CONFIG: 3600;
    readonly RATE_LIMIT_COUNTER: 60;
    readonly SESSION_VALIDATION: 60;
    readonly TEMPORARY_LOCK: 10;
};
export declare const CacheKeys: {
    readonly CREDIT_SCORE: "cache:credit:score:";
    readonly USER_PROFILE: "cache:user:profile:";
    readonly AGENT_PROFILE: "cache:agent:profile:";
    readonly MATCH_RESULTS: "cache:match:results:";
    readonly CONVERSATION: "cache:conversation:";
    readonly LOCATION_SEARCH: "cache:location:";
    readonly RATE_LIMIT: "ratelimit:";
    readonly SESSION: "session:";
    readonly LOCK: "lock:";
};
export type CacheKeyPrefix = typeof CacheKeys[keyof typeof CacheKeys];
/**
 * Get value from cache
 */
export declare function cacheGet<T>(key: string): Promise<T | null>;
/**
 * Set value in cache with TTL
 */
export declare function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
/**
 * Delete value from cache
 */
export declare function cacheDel(key: string): Promise<void>;
/**
 * Delete keys by pattern
 */
export declare function cacheDelPattern(pattern: string): Promise<void>;
/**
 * Increment counter with TTL (for rate limiting)
 */
export declare function cacheIncr(key: string, ttlSeconds: number): Promise<number>;
/**
 * Get or set cache with factory function
 */
export declare function cacheGetOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds: number): Promise<T>;
/**
 * Cache credit score with user ID
 */
export declare function cacheCreditScore(userId: string, score: number, level: string): Promise<void>;
/**
 * Get cached credit score
 */
export declare function getCachedCreditScore(userId: string): Promise<{
    score: number;
    level: string;
} | null>;
/**
 * Cache agent profile
 */
export declare function cacheAgentProfile(agentId: string, profile: any): Promise<void>;
/**
 * Get cached agent profile
 */
export declare function getCachedAgentProfile(agentId: string): Promise<any | null>;
/**
 * Invalidate agent profile cache
 */
export declare function invalidateAgentProfile(agentId: string): Promise<void>;
/**
 * Cache match results
 */
export declare function cacheMatchResults(userId: string, results: any[]): Promise<void>;
/**
 * Get cached match results
 */
export declare function getCachedMatchResults(userId: string): Promise<any[] | null>;
/**
 * Invalidate match results cache
 */
export declare function invalidateMatchResults(userId: string): Promise<void>;
/**
 * Rate limiting check using Redis
 */
export declare function checkRateLimit(identifier: string, limit: number, windowSeconds: number): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: number;
}>;
/**
 * Distributed lock using Redis
 */
export declare function acquireLock(resource: string, ttlSeconds?: number): Promise<boolean>;
/**
 * Release distributed lock
 */
export declare function releaseLock(resource: string): Promise<void>;
/**
 * Get cache statistics
 */
export declare function getCacheStats(): Promise<{
    connected: boolean;
    keys: number;
    memory: string;
}>;
//# sourceMappingURL=cache.d.ts.map