/**
 * Cache Service
 * Redis-based caching for performance optimization
 */

import { logger } from '../utils/logger';

import { redis, isRedisConnected } from './redis';

// Cache TTLs in seconds
export const CacheTTL = {
  // Hot data - 5 minutes
  CREDIT_SCORE: 300,
  USER_PROFILE: 300,
  AGENT_PROFILE: 300,
  SCENE_CONFIG: 300,

  // Warm data - 15 minutes
  MATCH_RESULTS: 900,
  CONVERSATION_LIST: 900,
  LOCATION_SEARCH: 900,

  // Stable data - 1 hour
  ROLE_PERMISSIONS: 3600,
  SYSTEM_CONFIG: 3600,

  // Short-lived - 1 minute
  RATE_LIMIT_COUNTER: 60,
  SESSION_VALIDATION: 60,

  // Very short - 10 seconds
  TEMPORARY_LOCK: 10,
} as const;

// Cache key prefixes
export const CacheKeys = {
  CREDIT_SCORE: 'cache:credit:score:',
  USER_PROFILE: 'cache:user:profile:',
  AGENT_PROFILE: 'cache:agent:profile:',
  MATCH_RESULTS: 'cache:match:results:',
  CONVERSATION: 'cache:conversation:',
  LOCATION_SEARCH: 'cache:location:',
  RATE_LIMIT: 'ratelimit:',
  SESSION: 'session:',
  LOCK: 'lock:',
} as const;

export type CacheKeyPrefix = typeof CacheKeys[keyof typeof CacheKeys];

/**
 * Get value from cache
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!isRedisConnected()) {
    logger.warn('Redis not connected, skipping cache get');
    return null;
  }

  try {
    const value = await redis.get(key);
    if (value) {
      return JSON.parse(value) as T;
    }
    return null;
  } catch (error) {
    logger.error('Cache get error:', error);
    return null;
  }
}

/**
 * Set value in cache with TTL
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  if (!isRedisConnected()) {
    logger.warn('Redis not connected, skipping cache set');
    return;
  }

  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    logger.error('Cache set error:', error);
  }
}

/**
 * Delete value from cache
 */
export async function cacheDel(key: string): Promise<void> {
  if (!isRedisConnected()) {
    return;
  }

  try {
    await redis.del(key);
  } catch (error) {
    logger.error('Cache del error:', error);
  }
}

/**
 * Delete keys by pattern
 */
export async function cacheDelPattern(pattern: string): Promise<void> {
  if (!isRedisConnected()) {
    return;
  }

  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    logger.error('Cache del pattern error:', error);
  }
}

/**
 * Increment counter with TTL (for rate limiting)
 */
export async function cacheIncr(
  key: string,
  ttlSeconds: number
): Promise<number> {
  if (!isRedisConnected()) {
    return 0;
  }

  try {
    const value = await redis.incr(key);
    if (value === 1) {
      // First increment, set TTL
      await redis.expire(key, ttlSeconds);
    }
    return value;
  } catch (error) {
    logger.error('Cache incr error:', error);
    return 0;
  }
}

/**
 * Get or set cache with factory function
 */
export async function cacheGetOrSet<T>(
  key: string,
  factory: () => Promise<T>,
  ttlSeconds: number
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }

  const value = await factory();
  await cacheSet(key, value, ttlSeconds);
  return value;
}

// Specialized cache functions

/**
 * Cache credit score with user ID
 */
export async function cacheCreditScore(
  userId: string,
  score: number,
  level: string
): Promise<void> {
  const key = `${CacheKeys.CREDIT_SCORE}${userId}`;
  await cacheSet(key, { score, level }, CacheTTL.CREDIT_SCORE);
}

/**
 * Get cached credit score
 */
export async function getCachedCreditScore(
  userId: string
): Promise<{ score: number; level: string } | null> {
  const key = `${CacheKeys.CREDIT_SCORE}${userId}`;
  return cacheGet(key);
}

/**
 * Cache agent profile
 */
export async function cacheAgentProfile(
  agentId: string,
  profile: any
): Promise<void> {
  const key = `${CacheKeys.AGENT_PROFILE}${agentId}`;
  await cacheSet(key, profile, CacheTTL.AGENT_PROFILE);
}

/**
 * Get cached agent profile
 */
export async function getCachedAgentProfile(
  agentId: string
): Promise<any | null> {
  const key = `${CacheKeys.AGENT_PROFILE}${agentId}`;
  return cacheGet(key);
}

/**
 * Invalidate agent profile cache
 */
export async function invalidateAgentProfile(agentId: string): Promise<void> {
  const key = `${CacheKeys.AGENT_PROFILE}${agentId}`;
  await cacheDel(key);
}

/**
 * Cache match results
 */
export async function cacheMatchResults(
  userId: string,
  results: any[]
): Promise<void> {
  const key = `${CacheKeys.MATCH_RESULTS}${userId}`;
  await cacheSet(key, results, CacheTTL.MATCH_RESULTS);
}

/**
 * Get cached match results
 */
export async function getCachedMatchResults(
  userId: string
): Promise<any[] | null> {
  const key = `${CacheKeys.MATCH_RESULTS}${userId}`;
  return cacheGet(key);
}

/**
 * Invalidate match results cache
 */
export async function invalidateMatchResults(userId: string): Promise<void> {
  const key = `${CacheKeys.MATCH_RESULTS}${userId}`;
  await cacheDel(key);
}

/**
 * Rate limiting check using Redis
 */
export async function checkRateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const key = `${CacheKeys.RATE_LIMIT}${identifier}`;
  const current = await cacheIncr(key, windowSeconds);
  const resetAt = Math.floor(Date.now() / 1000) + windowSeconds;

  return {
    allowed: current <= limit,
    remaining: Math.max(0, limit - current),
    resetAt,
  };
}

/**
 * Distributed lock using Redis
 */
export async function acquireLock(
  resource: string,
  ttlSeconds: number = 10
): Promise<boolean> {
  const key = `${CacheKeys.LOCK}${resource}`;
  if (!isRedisConnected()) {
    return false;
  }

  try {
    const result = await redis.set(key, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  } catch (error) {
    logger.error('Acquire lock error:', error);
    return false;
  }
}

/**
 * Release distributed lock
 */
export async function releaseLock(resource: string): Promise<void> {
  const key = `${CacheKeys.LOCK}${resource}`;
  await cacheDel(key);
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  connected: boolean;
  keys: number;
  memory: string;
}> {
  if (!isRedisConnected()) {
    return { connected: false, keys: 0, memory: 'N/A' };
  }

  try {
    const info = await redis.info('memory');
    const keys = await redis.dbsize();
    const memoryMatch = info.match(/used_memory_human:(\S+)/);

    return {
      connected: true,
      keys,
      memory: memoryMatch ? memoryMatch[1] : 'unknown',
    };
  } catch (error) {
    logger.error('Get cache stats error:', error);
    return { connected: false, keys: 0, memory: 'N/A' };
  }
}
