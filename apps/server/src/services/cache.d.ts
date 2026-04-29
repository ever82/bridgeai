/**
 * Cache Service
 * Redis-based caching for performance optimization
 */
import { AgentProfileData } from '@bridgeai/shared';
type CacheStrategyName = 'cacheAside' | 'writeThrough' | 'readThrough';
interface StrategyStats {
    hits: number;
    misses: number;
    fills: number;
}
interface SlowQueryEntry {
    operation: string;
    key: string;
    durationMs: number;
    timestamp: string;
}
interface CapacityAlert {
    type: 'keys' | 'memory';
    current: number;
    threshold: number;
    message: string;
    timestamp: string;
}
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
export type CacheKeyPrefix = (typeof CacheKeys)[keyof typeof CacheKeys];
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
 * Cache-Aside (Lazy Loading) Strategy
 * Read: Check cache first, if miss then read from source and write to cache
 * Write: Write to source and invalidate/delete cache entry
 */
export declare function cacheAside<T>(key: string, factory: () => Promise<T>, ttlSeconds: number, _writeFn?: () => Promise<void>): Promise<T>;
/**
 * Write data using Write-Through strategy
 * Write: Write to both source and cache simultaneously
 */
export declare function writeThrough<T>(key: string, value: T, ttlSeconds: number, writeFn: () => Promise<void>): Promise<void>;
/**
 * Read data using Read-Through strategy
 * Read: If cache miss, read from source and automatically populate cache
 */
export declare function readThrough<T>(key: string, factory: () => Promise<T>, ttlSeconds: number): Promise<T>;
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
export declare function cacheAgentProfile(agentId: string, profile: AgentProfileData): Promise<void>;
/**
 * Get cached agent profile
 */
export declare function getCachedAgentProfile(agentId: string): Promise<AgentProfileData | null>;
/**
 * Invalidate agent profile cache
 */
export declare function invalidateAgentProfile(agentId: string): Promise<void>;
/**
 * Cache match results
 */
export declare function cacheMatchResults(userId: string, results: Record<string, unknown>[]): Promise<void>;
/**
 * Get cached match results
 */
export declare function getCachedMatchResults(userId: string): Promise<Record<string, unknown>[] | null>;
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
 * Get cache statistics (includes capacity check)
 */
export declare function getCacheStats(): Promise<{
    connected: boolean;
    keys: number;
    memory: string;
}>;
/**
 * Get per-strategy cache statistics (hit/miss/fill rates)
 */
export declare function getCacheStrategyStats(): Record<CacheStrategyName, StrategyStats & {
    hitRate: number;
    fillRate: number;
}>;
/**
 * Get slow query log entries
 */
export declare function getSlowQueryLog(): SlowQueryEntry[];
/**
 * Get capacity alert history
 */
export declare function getCapacityAlerts(): CapacityAlert[];
/**
 * Reset all strategy statistics (useful for testing)
 */
export declare function resetCacheStrategyStats(): void;
/**
 * Invalidate all cache entries for a namespace with specific version
 */
export declare function invalidateByVersion(namespace: string, version: string): Promise<number>;
/**
 * Get current cache version
 */
export declare function getCacheVersion(namespace: string): Promise<string | null>;
/**
 * Set cache version
 */
export declare function setCacheVersion(namespace: string, version: string): Promise<void>;
/**
 * Create versioned cache key
 */
export declare function versionedKey(namespace: string, version: string, key: string): string;
/**
 * Batch get values from cache
 */
export declare function batchCacheGet<T>(keys: string[]): Promise<(T | null)[]>;
/**
 * Batch set values in cache
 */
export declare function batchCacheSet<T>(entries: Array<{
    key: string;
    value: T;
    ttl?: number;
}>): Promise<void>;
/**
 * Cache decorator for class methods
 * Automatically caches function results
 *
 * Usage:
 *   class UserService {
 *     @cached('user', (id) => id)
 *     async getUser(id: string): Promise<User> { ... }
 *   }
 */
export declare function cached(namespace: string, keyGenerator: (...args: unknown[]) => string, ttl?: number): (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
/**
 * Cache invalidation decorator
 * Clears cache after method execution
 *
 * Usage:
 *   class UserService {
 *     @invalidateCache('user')
 *     async updateUser(id: string, data: UserData): Promise<User> { ... }
 *   }
 */
export declare function invalidateCache(namespace: string): (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
/**
 * Cache busting decorator
 * Busts entire namespace cache after method execution
 *
 * Usage:
 *   class UserService {
 *     @bustNamespaceCache('user')
 *     async bulkUpdateUsers(): Promise<void> { ... }
 *   }
 */
export declare function bustNamespaceCache(namespace: string, version?: string): (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
declare const _default: {
    CacheTTL: {
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
    CacheKeys: {
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
    cacheGet: typeof cacheGet;
    cacheSet: typeof cacheSet;
    cacheDel: typeof cacheDel;
    cacheDelPattern: typeof cacheDelPattern;
    cacheIncr: typeof cacheIncr;
    cacheGetOrSet: typeof cacheGetOrSet;
    cacheAside: typeof cacheAside;
    writeThrough: typeof writeThrough;
    readThrough: typeof readThrough;
    cacheCreditScore: typeof cacheCreditScore;
    getCachedCreditScore: typeof getCachedCreditScore;
    cacheAgentProfile: typeof cacheAgentProfile;
    getCachedAgentProfile: typeof getCachedAgentProfile;
    invalidateAgentProfile: typeof invalidateAgentProfile;
    cacheMatchResults: typeof cacheMatchResults;
    getCachedMatchResults: typeof getCachedMatchResults;
    invalidateMatchResults: typeof invalidateMatchResults;
    checkRateLimit: typeof checkRateLimit;
    acquireLock: typeof acquireLock;
    releaseLock: typeof releaseLock;
    getCacheStats: typeof getCacheStats;
    getCacheStrategyStats: typeof getCacheStrategyStats;
    getSlowQueryLog: typeof getSlowQueryLog;
    getCapacityAlerts: typeof getCapacityAlerts;
    resetCacheStrategyStats: typeof resetCacheStrategyStats;
    invalidateByVersion: typeof invalidateByVersion;
    getCacheVersion: typeof getCacheVersion;
    setCacheVersion: typeof setCacheVersion;
    versionedKey: typeof versionedKey;
    batchCacheGet: typeof batchCacheGet;
    batchCacheSet: typeof batchCacheSet;
    cached: typeof cached;
    invalidateCache: typeof invalidateCache;
    bustNamespaceCache: typeof bustNamespaceCache;
};
export default _default;
//# sourceMappingURL=cache.d.ts.map