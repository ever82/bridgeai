/**
 * Filter Cache
 * 过滤结果缓存
 */
import { FilterDSL, FilterResult } from '@bridgeai/shared';
declare class FilterCache<T> {
    private cache;
    private readonly defaultTTL;
    private readonly maxSize;
    private cleanupHandle;
    constructor(defaultTTL?: number, maxSize?: number);
    /**
     * Stop cleanup interval and clear cache
     */
    destroy(): void;
    /**
     * Generate cache key from filter DSL
     */
    generateKey(dsl: FilterDSL, userId?: string): string;
    /**
     * Get cached result
     */
    get(key: string): FilterResult<T> | null;
    /**
     * Set cached result
     */
    set(key: string, result: FilterResult<T>, ttl?: number): void;
    /**
     * Invalidate cache entries matching pattern
     */
    invalidate(pattern?: string): void;
    /**
     * Get cache stats
     */
    getStats(): {
        size: number;
        hitRate: number;
        missRate: number;
    };
    /**
     * Cleanup expired entries
     */
    private cleanup;
    /**
     * Evict least recently used entry
     */
    private evictLRU;
    /**
     * Hash function for objects using SHA-256
     */
    private hashObject;
}
/**
 * Get or create global filter cache
 */
export declare function getFilterCache<T>(): FilterCache<T>;
/**
 * Clear global filter cache
 */
export declare function clearFilterCache(pattern?: string): void;
/**
 * Destroy global filter cache (clears interval timer and cache).
 * Should be called on app shutdown or in test teardown.
 */
export declare function destroyFilterCache(): void;
/**
 * Wrap a filter function with caching
 */
export declare function withFilterCache<T>(fn: (dsl: FilterDSL, userId?: string) => Promise<FilterResult<T>>, ttl?: number): (dsl: FilterDSL, userId?: string) => Promise<FilterResult<T>>;
export {};
//# sourceMappingURL=filterCache.d.ts.map