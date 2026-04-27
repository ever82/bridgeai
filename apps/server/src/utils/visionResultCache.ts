/**
 * Vision Result Cache
 * LRU cache with TTL for vision API results
 */

import crypto from 'crypto';

interface CacheEntry<T> {
  key: string;
  result: T;
  timestamp: number;
  ttl: number;
}

export class VisionResultCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private readonly defaultTTL: number;
  private readonly maxSize: number;

  constructor(defaultTTLSeconds = 300, maxSize = 100) {
    this.defaultTTL = defaultTTLSeconds * 1000;
    this.maxSize = maxSize;
  }

  /**
   * Generate a cache key from image data
   */
  generateKey(imageData: string, operation: string): string {
    const hash = crypto.createHash('sha256').update(imageData).digest('hex').slice(0, 16);
    return `${operation}:${hash}`;
  }

  /**
   * Get cached result
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

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
  set(key: string, result: T, ttlSeconds?: number): void {
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
  invalidate(pattern?: string): void {
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
  getStats(): { size: number; maxSize: number; ttlSeconds: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttlSeconds: this.defaultTTL / 1000,
    };
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
  }

  private evictLRU(): void {
    // Delete the first (least recently used) entry
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.cache.delete(firstKey);
    }
  }
}

// Global cache instance
let globalCache: VisionResultCache<unknown> | null = null;

/**
 * Get or create global vision result cache
 */
export function getVisionCache<T>(): VisionResultCache<T> {
  if (!globalCache) {
    globalCache = new VisionResultCache<T>(300, 100);
  }
  return globalCache as VisionResultCache<T>;
}

/**
 * Clear global vision result cache
 */
export function clearVisionCache(): void {
  if (globalCache) {
    globalCache.clear();
  }
}
