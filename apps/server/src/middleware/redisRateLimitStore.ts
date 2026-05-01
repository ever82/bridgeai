/**
 * Redis-backed Rate Limit Store
 *
 * Replaces the in-memory Map store with a Redis-backed store
 * for distributed rate limiting across multiple server instances.
 */

import { redis, isRedisConnected } from '../services/redis';

interface StoreRecord {
  count: number;
  resetTime: number;
}

/**
 * Redis-backed rate limit store
 * Falls back to in-memory when Redis is unavailable
 */
export class RedisRateLimitStore {
  private fallbackStore = new Map<string, StoreRecord>();

  private getKey(identifier: string): string {
    return `bridgeai:ratelimit:${identifier}`;
  }

  /**
   * Increment request count and return current state
   */
  async increment(
    identifier: string,
    windowMs: number
  ): Promise<{ count: number; remaining: number; resetTime: number }> {
    if (isRedisConnected()) {
      return this.redisIncrement(identifier, windowMs);
    }
    return this.memoryIncrement(identifier, windowMs);
  }

  private async redisIncrement(
    identifier: string,
    windowMs: number
  ): Promise<{ count: number; remaining: number; resetTime: number }> {
    const key = this.getKey(identifier);
    const windowSeconds = Math.ceil(windowMs / 1000);

    try {
      const multi = redis.multi();
      multi.incr(key);
      multi.expire(key, windowSeconds);
      const results = await multi.exec();

      const count = (results?.[0]?.[1] as number) ?? 1;
      const ttl = await redis.ttl(key);
      const resetTime = Date.now() + (ttl > 0 ? ttl * 1000 : windowMs);

      return { count, remaining: 0, resetTime };
    } catch {
      // Fallback to memory on Redis error
      return this.memoryIncrement(identifier, windowMs);
    }
  }

  private memoryIncrement(
    identifier: string,
    windowMs: number
  ): { count: number; remaining: number; resetTime: number } {
    const now = Date.now();
    let record = this.fallbackStore.get(identifier);

    if (!record || record.resetTime <= now) {
      record = { count: 1, resetTime: now + windowMs };
      this.fallbackStore.set(identifier, record);
    } else {
      record.count++;
    }

    return {
      count: record.count,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  /**
   * Get current count for an identifier
   */
  async getCount(identifier: string): Promise<number> {
    if (isRedisConnected()) {
      try {
        const key = this.getKey(identifier);
        const count = await redis.get(key);
        return count ? parseInt(count, 10) : 0;
      } catch {
        const record = this.fallbackStore.get(identifier);
        return record?.count ?? 0;
      }
    }
    const record = this.fallbackStore.get(identifier);
    return record?.count ?? 0;
  }

  /**
   * Reset count for an identifier
   */
  async reset(identifier: string): Promise<void> {
    if (isRedisConnected()) {
      try {
        const key = this.getKey(identifier);
        await redis.del(key);
      } catch {
        this.fallbackStore.delete(identifier);
      }
      return;
    }
    this.fallbackStore.delete(identifier);
  }
}

// Singleton store instance
export const redisRateLimitStore = new RedisRateLimitStore();
