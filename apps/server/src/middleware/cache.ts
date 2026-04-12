/**
 * Cache Middleware
 * Provides caching for API responses
 */

import { Request, Response, NextFunction } from 'express';

interface CacheEntry {
  data: any;
  timestamp: number;
}

// In-memory cache store (in production, use Redis)
const cacheStore = new Map<string, CacheEntry>();

/**
 * Generate cache key from request
 */
function generateCacheKey(req: Request): string {
  const { path, query } = req;
  const queryString = Object.entries(query)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  return `${path}?${queryString}`;
}

/**
 * Cache middleware factory
 * @param ttlSeconds Time to live in seconds
 */
export function cacheMiddleware(ttlSeconds: number = 300) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = generateCacheKey(req);
    const cached = cacheStore.get(cacheKey);

    // Check if cache is valid
    if (cached && Date.now() - cached.timestamp < ttlSeconds * 1000) {
      return res.json(cached.data);
    }

    // Override res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheStore.set(cacheKey, {
          data: body,
          timestamp: Date.now(),
        });
      }
      return originalJson(body);
    };

    next();
  };
}

/**
 * Clear cache for a specific pattern
 */
export function clearCache(pattern?: string): void {
  if (!pattern) {
    cacheStore.clear();
    return;
  }

  for (const key of cacheStore.keys()) {
    if (key.includes(pattern)) {
      cacheStore.delete(key);
    }
  }
}

/**
 * Get cache stats
 */
export function getCacheStats(): { size: number; entries: string[] } {
  return {
    size: cacheStore.size,
    entries: Array.from(cacheStore.keys()),
  };
}
