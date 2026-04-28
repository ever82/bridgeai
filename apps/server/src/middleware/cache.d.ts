/**
 * Cache Middleware
 * Provides caching for API responses
 */
import { Request, Response, NextFunction } from 'express';
/**
 * Cache middleware factory
 * @param ttlSeconds Time to live in seconds
 */
export declare function cacheMiddleware(ttlSeconds?: number): (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
/**
 * Clear cache for a specific pattern
 */
export declare function clearCache(pattern?: string): void;
/**
 * Get cache stats
 */
export declare function getCacheStats(): {
    size: number;
    entries: string[];
};
//# sourceMappingURL=cache.d.ts.map