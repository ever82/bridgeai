/**
 * Redis Caching Layer
 * Provides high-performance caching for API responses and database queries
 *
 * Features:
 * - TTL-based caching
 * - Cache invalidation
 * - Cache warming
 * - Distributed cache support
 */
export declare const CacheNamespaces: {
    readonly USER: "user:";
    readonly AGENT: "agent:";
    readonly MATCH: "match:";
    readonly CREDIT: "credit:";
    readonly SEARCH: "search:";
    readonly RATE_LIMIT: "rate_limit:";
    readonly SESSION: "session:";
    readonly HEALTH: "health:";
};
interface CacheStats {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    errors: number;
}
/**
 * Get value from cache
 */
export declare function get<T>(namespace: string, key: string): Promise<T | null>;
/**
 * Set value in cache
 */
export declare function set<T>(namespace: string, key: string, value: T, ttl?: number): Promise<void>;
/**
 * Delete value from cache
 */
export declare function del(namespace: string, key: string): Promise<void>;
/**
 * Delete multiple values by pattern
 */
export declare function delPattern(pattern: string): Promise<void>;
/**
 * Check if key exists in cache
 */
export declare function exists(namespace: string, key: string): Promise<boolean>;
/**
 * Get or set value (cache-aside pattern)
 */
export declare function getOrSet<T>(namespace: string, key: string, factory: () => Promise<T>, ttl?: number): Promise<T>;
/**
 * Get multiple values from cache
 */
export declare function mget<T>(namespace: string, keys: string[]): Promise<(T | null)[]>;
/**
 * Set multiple values in cache
 */
export declare function mset<T>(namespace: string, entries: Array<{
    key: string;
    value: T;
    ttl?: number;
}>): Promise<void>;
/**
 * Increment value in cache
 */
export declare function incr(namespace: string, key: string, amount?: number): Promise<number>;
/**
 * Decrement value in cache
 */
export declare function decr(namespace: string, key: string, amount?: number): Promise<number>;
/**
 * Set expiration on key
 */
export declare function expire(namespace: string, key: string, ttl: number): Promise<void>;
/**
 * Get TTL of key
 */
export declare function ttl(namespace: string, key: string): Promise<number>;
/**
 * Clear all cache entries
 */
export declare function clear(): Promise<void>;
/**
 * Get cache statistics
 */
export declare function getStats(): CacheStats & {
    hitRate: number;
    totalRequests: number;
};
/**
 * Reset cache statistics
 */
export declare function resetStats(): void;
/**
 * Cache decorator for functions
 * Automatically caches function results
 *
 * Usage:
 *   class UserService {
 *     @cached('user', (id) => id, 300)
 *     async getUser(id: string): Promise<User> { ... }
 *   }
 */
export declare function cached(namespace: string, keyGenerator: (...args: unknown[]) => string, ttl?: number): (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
/**
 * Invalidate cache by namespace
 */
export declare function invalidateNamespace(namespace: string): Promise<void>;
/**
 * Cache warming - preload frequently accessed data
 */
export declare function warmCache<T>(namespace: string, keys: string[], fetcher: (key: string) => Promise<T>, ttl?: number): Promise<void>;
/**
 * Distributed lock using Redis
 * Useful for preventing cache stampede
 */
export declare function acquireLock(lockKey: string, ttl?: number): Promise<{
    release: () => Promise<void>;
} | null>;
declare const _default: {
    get: typeof get;
    set: typeof set;
    del: typeof del;
    delPattern: typeof delPattern;
    exists: typeof exists;
    getOrSet: typeof getOrSet;
    mget: typeof mget;
    mset: typeof mset;
    incr: typeof incr;
    decr: typeof decr;
    expire: typeof expire;
    ttl: typeof ttl;
    clear: typeof clear;
    getStats: typeof getStats;
    resetStats: typeof resetStats;
    invalidateNamespace: typeof invalidateNamespace;
    warmCache: typeof warmCache;
    acquireLock: typeof acquireLock;
    CacheNamespaces: {
        readonly USER: "user:";
        readonly AGENT: "agent:";
        readonly MATCH: "match:";
        readonly CREDIT: "credit:";
        readonly SEARCH: "search:";
        readonly RATE_LIMIT: "rate_limit:";
        readonly SESSION: "session:";
        readonly HEALTH: "health:";
    };
};
export default _default;
//# sourceMappingURL=redis.d.ts.map