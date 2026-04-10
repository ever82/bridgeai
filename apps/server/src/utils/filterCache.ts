/**
 * Filter Cache
 * 过滤结果缓存
 */

import { FilterDSL, FilterResult } from '@visionshare/shared';
import { logger } from './logger';

interface CacheEntry<T> {
  key: string;
  result: FilterResult<T>;
  timestamp: number;
  ttl: number;
}

class FilterCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private readonly defaultTTL: number = 5 * 60 * 1000; // 5 minutes
  private readonly maxSize: number = 1000;

  constructor(defaultTTL?: number, maxSize?: number) {
    if (defaultTTL) this.defaultTTL = defaultTTL;
    if (maxSize) this.maxSize = maxSize;

    // Start cleanup interval
    setInterval(() => this.cleanup(), 60 * 1000); // Every minute
  }

  /**
   * Generate cache key from filter DSL
   */
  generateKey(dsl: FilterDSL, userId?: string): string {
    const dslHash = this.hashObject(dsl);
    return userId ? `${userId}:${dslHash}` : dslHash;
  }

  /**
   * Get cached result
   */
  get(key: string): FilterResult<T> | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

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
  set(key: string, result: FilterResult<T>, ttl?: number): void {
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
  invalidate(pattern?: string): void {
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
  getStats(): { size: number; hitRate: number; missRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // Would need to track hits/misses
      missRate: 0,
    };
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
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
  private evictLRU(): void {
    let oldestKey: string | null = null;
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
   * Simple hash function for objects
   */
  private hashObject(obj: any): string {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    return hash.toString(16);
  }
}

// Global cache instance
let globalCache: FilterCache<any> | null = null;

/**
 * Get or create global filter cache
 */
export function getFilterCache<T>(): FilterCache<T> {
  if (!globalCache) {
    globalCache = new FilterCache<T>();
  }
  return globalCache as FilterCache<T>;
}

/**
 * Clear global filter cache
 */
export function clearFilterCache(pattern?: string): void {
  if (globalCache) {
    globalCache.invalidate(pattern);
  }
}

/**
 * Wrap a filter function with caching
 */
export function withFilterCache<T>(
  fn: (dsl: FilterDSL, userId?: string) => Promise<FilterResult<T>>,
  ttl?: number
): (dsl: FilterDSL, userId?: string) => Promise<FilterResult<T>> {
  const cache = getFilterCache<T>();

  return async (dsl: FilterDSL, userId?: string) => {
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
