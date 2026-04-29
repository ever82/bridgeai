/**
 * Vision Result Cache
 * LRU cache with TTL for vision API results
 */
import crypto from 'crypto';
export class VisionResultCache {
    cache = new Map();
    defaultTTL;
    maxSize;
    constructor(defaultTTLSeconds = 300, maxSize = 100) {
        this.defaultTTL = defaultTTLSeconds * 1000;
        this.maxSize = maxSize;
    }
    /**
     * Generate a cache key from image data
     */
    generateKey(imageData, operation) {
        const hash = crypto.createHash('sha256').update(imageData).digest('hex').slice(0, 16);
        return `${operation}:${hash}`;
    }
    /**
     * Get cached result
     */
    get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            return null;
        }
        // Move to end (most recently used)
        this.cache.delete(key);
        this.cache.set(key, entry);
        return entry.result;
    }
    /**
     * Set cached result
     */
    set(key, result, ttlSeconds) {
        if (this.cache.size >= this.maxSize) {
            this.evictLRU();
        }
        this.cache.set(key, {
            key,
            result,
            timestamp: Date.now(),
            ttl: ttlSeconds ? ttlSeconds * 1000 : this.defaultTTL,
        });
    }
    /**
     * Invalidate cache entries matching pattern
     */
    invalidate(pattern) {
        if (!pattern) {
            this.cache.clear();
            return;
        }
        const regex = new RegExp(pattern);
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
            }
        }
    }
    /**
     * Get cache stats
     */
    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            ttlSeconds: this.defaultTTL / 1000,
        };
    }
    /**
     * Clear all entries
     */
    clear() {
        this.cache.clear();
    }
    evictLRU() {
        // Delete the first (least recently used) entry
        const firstKey = this.cache.keys().next().value;
        if (firstKey) {
            this.cache.delete(firstKey);
        }
    }
}
// Global cache instance
let globalCache = null;
/**
 * Get or create global vision result cache
 */
export function getVisionCache() {
    if (!globalCache) {
        globalCache = new VisionResultCache(300, 100);
    }
    return globalCache;
}
/**
 * Clear global vision result cache
 */
export function clearVisionCache() {
    if (globalCache) {
        globalCache.clear();
    }
}
//# sourceMappingURL=visionResultCache.js.map