/**
 * Vision Result Cache
 * LRU cache with TTL for vision API results
 */
export declare class VisionResultCache<T> {
    private cache;
    private readonly defaultTTL;
    private readonly maxSize;
    constructor(defaultTTLSeconds?: number, maxSize?: number);
    /**
     * Generate a cache key from image data
     */
    generateKey(imageData: string, operation: string): string;
    /**
     * Get cached result
     */
    get(key: string): T | null;
    /**
     * Set cached result
     */
    set(key: string, result: T, ttlSeconds?: number): void;
    /**
     * Invalidate cache entries matching pattern
     */
    invalidate(pattern?: string): void;
    /**
     * Get cache stats
     */
    getStats(): {
        size: number;
        maxSize: number;
        ttlSeconds: number;
    };
    /**
     * Clear all entries
     */
    clear(): void;
    private evictLRU;
}
/**
 * Get or create global vision result cache
 */
export declare function getVisionCache<T>(): VisionResultCache<T>;
/**
 * Clear global vision result cache
 */
export declare function clearVisionCache(): void;
//# sourceMappingURL=visionResultCache.d.ts.map