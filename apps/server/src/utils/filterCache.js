/**
 * Filter Cache
 * 过滤结果缓存
 */
import { createHash } from 'crypto';
import { logger } from './logger';
class FilterCache {
    cache = new Map();
    defaultTTL = 5 * 60 * 1000; // 5 minutes
    maxSize = 1000;
    cleanupHandle = null;
    constructor(defaultTTL, maxSize) {
        if (defaultTTL)
            this.defaultTTL = defaultTTL;
        if (maxSize)
            this.maxSize = maxSize;
        // Start cleanup interval
        this.cleanupHandle = setInterval(() => this.cleanup(), 60 * 1000); // Every minute
    }
    /**
     * Stop cleanup interval and clear cache
     */
    destroy() {
        if (this.cleanupHandle !== null) {
            clearInterval(this.cleanupHandle);
            this.cleanupHandle = null;
        }
        this.cache.clear();
    }
    /**
     * Generate cache key from filter DSL
     */
    generateKey(dsl, userId) {
        const dslHash = this.hashObject(dsl);
        return userId ? `${userId}:${dslHash}` : dslHash;
    }
    /**
     * Get cached result
     */
    get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        // Check if expired
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            return null;
        }
        logger.debug('Filter cache hit', { key });
        return entry.result;
    }
    /**
     * Set cached result
     */
    set(key, result, ttl) {
        // Evict oldest entries if cache is full
        if (this.cache.size >= this.maxSize) {
            this.evictLRU();
        }
        this.cache.set(key, {
            key,
            result,
            timestamp: Date.now(),
            ttl: ttl || this.defaultTTL,
        });
        logger.debug('Filter cache set', { key, size: this.cache.size });
    }
    /**
     * Invalidate cache entries matching pattern
     */
    invalidate(pattern) {
        if (!pattern) {
            this.cache.clear();
            logger.info('Filter cache cleared');
            return;
        }
        const regex = new RegExp(pattern);
        let count = 0;
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
                count++;
            }
        }
        logger.info('Filter cache invalidated', { pattern, count });
    }
    /**
     * Get cache stats
     */
    getStats() {
        return {
            size: this.cache.size,
            hitRate: 0, // Would need to track hits/misses
            missRate: 0,
        };
    }
    /**
     * Cleanup expired entries
     */
    cleanup() {
        const now = Date.now();
        let expired = 0;
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                this.cache.delete(key);
                expired++;
            }
        }
        if (expired > 0) {
            logger.debug('Filter cache cleanup', { expired, remaining: this.cache.size });
        }
    }
    /**
     * Evict least recently used entry
     */
    evictLRU() {
        let oldestKey = null;
        let oldestTime = Infinity;
        for (const [key, entry] of this.cache.entries()) {
            if (entry.timestamp < oldestTime) {
                oldestTime = entry.timestamp;
                oldestKey = key;
            }
        }
        if (oldestKey) {
            this.cache.delete(oldestKey);
        }
    }
    /**
     * Hash function for objects using SHA-256
     */
    hashObject(obj) {
        const str = JSON.stringify(obj, (key, value) => {
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                return Object.keys(value)
                    .sort()
                    .reduce((acc, k) => {
                    acc[k] = value[k];
                    return acc;
                }, {});
            }
            return value;
        });
        return createHash('sha256').update(str).digest('hex');
    }
}
// Global cache instance
let globalCache = null;
/**
 * Get or create global filter cache
 */
export function getFilterCache() {
    if (!globalCache) {
        globalCache = new FilterCache();
    }
    return globalCache;
}
/**
 * Clear global filter cache
 */
export function clearFilterCache(pattern) {
    if (globalCache) {
        globalCache.invalidate(pattern);
    }
}
/**
 * Destroy global filter cache (clears interval timer and cache).
 * Should be called on app shutdown or in test teardown.
 */
export function destroyFilterCache() {
    if (globalCache) {
        globalCache.destroy();
        globalCache = null;
    }
}
/**
 * Wrap a filter function with caching
 */
export function withFilterCache(fn, ttl) {
    const cache = getFilterCache();
    return async (dsl, userId) => {
        const key = cache.generateKey(dsl, userId);
        const cached = cache.get(key);
        if (cached) {
            return cached;
        }
        const result = await fn(dsl, userId);
        cache.set(key, result, ttl);
        return result;
    };
}
//# sourceMappingURL=filterCache.js.map