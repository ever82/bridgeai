/**
 * Cache Service
 * Redis-based caching for performance optimization
 */

import { AgentProfileData } from '@bridgeai/shared';

import { logger } from '../utils/logger';

import { redis, isRedisConnected } from './redis';

// ============================================================================
// Strategy-Level Statistics
// ============================================================================

type CacheStrategyName = 'cacheAside' | 'writeThrough' | 'readThrough';

interface StrategyStats {
  hits: number;
  misses: number;
  fills: number;
}

const strategyStats: Record<CacheStrategyName, StrategyStats> = {
  cacheAside: { hits: 0, misses: 0, fills: 0 },
  writeThrough: { hits: 0, misses: 0, fills: 0 },
  readThrough: { hits: 0, misses: 0, fills: 0 },
};

function recordHit(strategy: CacheStrategyName): void {
  strategyStats[strategy].hits++;
}

function recordMiss(strategy: CacheStrategyName): void {
  strategyStats[strategy].misses++;
}

function recordFill(strategy: CacheStrategyName): void {
  strategyStats[strategy].fills++;
}

// ============================================================================
// Slow Query Log
// ============================================================================

interface SlowQueryEntry {
  operation: string;
  key: string;
  durationMs: number;
  timestamp: string;
}

const SLOW_QUERY_THRESHOLD_MS = 100; // Log operations slower than 100ms
const MAX_SLOW_QUERY_ENTRIES = 200;

const slowQueryLog: SlowQueryEntry[] = [];

function recordSlowQuery(operation: string, key: string, durationMs: number): void {
  slowQueryLog.push({
    operation,
    key,
    durationMs: Math.round(durationMs * 100) / 100,
    timestamp: new Date().toISOString(),
  });
  if (slowQueryLog.length > MAX_SLOW_QUERY_ENTRIES) {
    slowQueryLog.shift();
  }
  logger.warn(`Slow cache operation: ${operation} on ${key} took ${durationMs.toFixed(1)}ms`);
}

async function measureCacheOp<T>(operation: string, key: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    if (duration >= SLOW_QUERY_THRESHOLD_MS) {
      recordSlowQuery(operation, key, duration);
    }
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    if (duration >= SLOW_QUERY_THRESHOLD_MS) {
      recordSlowQuery(operation, key, duration);
    }
    throw error;
  }
}

// ============================================================================
// Capacity Alerting
// ============================================================================

interface CapacityAlert {
  type: 'keys' | 'memory';
  current: number;
  threshold: number;
  message: string;
  timestamp: string;
}

const CAPACITY_KEY_THRESHOLD = parseInt(process.env.CACHE_KEY_THRESHOLD || '100000', 10);
const CAPACITY_MEMORY_THRESHOLD_MB = parseInt(process.env.CACHE_MEMORY_THRESHOLD_MB || '512', 10);
const CAPACITY_CHECK_INTERVAL_MS = 60_000; // Check every 60s

let lastCapacityCheck = 0;
const recentAlerts: CapacityAlert[] = [];
const MAX_ALERT_ENTRIES = 50;

async function checkCapacity(): Promise<void> {
  if (!isRedisConnected()) return;

  const now = Date.now();
  if (now - lastCapacityCheck < CAPACITY_CHECK_INTERVAL_MS) return;
  lastCapacityCheck = now;

  try {
    const [keys, info] = await Promise.all([redis.dbsize(), redis.info('memory')]);

    if (keys >= CAPACITY_KEY_THRESHOLD) {
      const alert: CapacityAlert = {
        type: 'keys',
        current: keys,
        threshold: CAPACITY_KEY_THRESHOLD,
        message: `Cache key count ${keys} exceeds threshold ${CAPACITY_KEY_THRESHOLD}`,
        timestamp: new Date().toISOString(),
      };
      recentAlerts.push(alert);
      logger.warn(alert.message);
    }

    const memoryMatch = info.match(/used_memory:(\d+)/);
    if (memoryMatch) {
      const usedBytes = parseInt(memoryMatch[1], 10);
      const usedMB = usedBytes / (1024 * 1024);
      if (usedMB >= CAPACITY_MEMORY_THRESHOLD_MB) {
        const alert: CapacityAlert = {
          type: 'memory',
          current: Math.round(usedMB),
          threshold: CAPACITY_MEMORY_THRESHOLD_MB,
          message: `Cache memory usage ${Math.round(usedMB)}MB exceeds threshold ${CAPACITY_MEMORY_THRESHOLD_MB}MB`,
          timestamp: new Date().toISOString(),
        };
        recentAlerts.push(alert);
        logger.warn(alert.message);
      }
    }

    // Trim alerts
    while (recentAlerts.length > MAX_ALERT_ENTRIES) {
      recentAlerts.shift();
    }
  } catch (error) {
    logger.error('Capacity check error:', error);
  }
}

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

const CACHE_VERSION_PREFIX = 'cache:version:';
const DEFAULT_TTL = 300;

export type CacheKeyPrefix = (typeof CacheKeys)[keyof typeof CacheKeys];

/**
 * Get value from cache
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!isRedisConnected()) {
    logger.warn('Redis not connected, skipping cache get');
    return null;
  }

  try {
    return await measureCacheOp('get', key, async () => {
      const value = await redis.get(key);
      if (value) {
        return JSON.parse(value) as T;
      }
      return null;
    });
  } catch (error) {
    logger.error('Cache get error:', error);
    return null;
  }
}

/**
 * Set value in cache with TTL
 */
export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  if (!isRedisConnected()) {
    logger.warn('Redis not connected, skipping cache set');
    return;
  }

  try {
    await measureCacheOp('set', key, async () => {
      await redis.setex(key, ttlSeconds, JSON.stringify(value));
    });
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
export async function cacheIncr(key: string, ttlSeconds: number): Promise<number> {
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

/**
 * Cache-Aside (Lazy Loading) Strategy
 * Read: Check cache first, if miss then read from source and write to cache
 * Write: Write to source and invalidate/delete cache entry
 */
export async function cacheAside<T>(
  key: string,
  factory: () => Promise<T>,
  ttlSeconds: number,
  _writeFn?: () => Promise<void>
): Promise<T> {
  // Try cache first
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    recordHit('cacheAside');
    return cached;
  }

  recordMiss('cacheAside');
  // Cache miss - read from source
  const value = await factory();
  await cacheSet(key, value, ttlSeconds);
  recordFill('cacheAside');
  return value;
}

/**
 * Write data using Write-Through strategy
 * Write: Write to both source and cache simultaneously
 */
export async function writeThrough<T>(
  key: string,
  value: T,
  ttlSeconds: number,
  writeFn: () => Promise<void>
): Promise<void> {
  // Write to source first
  await writeFn();
  // Then write to cache
  await cacheSet(key, value, ttlSeconds);
  recordFill('writeThrough');
}

/**
 * Read data using Read-Through strategy
 * Read: If cache miss, read from source and automatically populate cache
 */
export async function readThrough<T>(
  key: string,
  factory: () => Promise<T>,
  ttlSeconds: number
): Promise<T> {
  // Try cache first
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    recordHit('readThrough');
    return cached;
  }

  recordMiss('readThrough');
  // Cache miss - read from source and populate cache automatically
  const value = await factory();
  await cacheSet(key, value, ttlSeconds);
  recordFill('readThrough');
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
export async function cacheAgentProfile(agentId: string, profile: AgentProfileData): Promise<void> {
  const key = `${CacheKeys.AGENT_PROFILE}${agentId}`;
  await cacheSet(key, profile, CacheTTL.AGENT_PROFILE);
}

/**
 * Get cached agent profile
 */
export async function getCachedAgentProfile(agentId: string): Promise<AgentProfileData | null> {
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
  results: Record<string, unknown>[]
): Promise<void> {
  const key = `${CacheKeys.MATCH_RESULTS}${userId}`;
  await cacheSet(key, results, CacheTTL.MATCH_RESULTS);
}

/**
 * Get cached match results
 */
export async function getCachedMatchResults(
  userId: string
): Promise<Record<string, unknown>[] | null> {
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
export async function acquireLock(resource: string, ttlSeconds: number = 10): Promise<boolean> {
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
 * Get cache statistics (includes capacity check)
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
    // Run capacity check as side effect
    await checkCapacity();

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

/**
 * Get per-strategy cache statistics (hit/miss/fill rates)
 */
export function getCacheStrategyStats(): Record<
  CacheStrategyName,
  StrategyStats & { hitRate: number; fillRate: number }
> {
  const result = {} as Record<
    CacheStrategyName,
    StrategyStats & { hitRate: number; fillRate: number }
  >;

  for (const [name, s] of Object.entries(strategyStats) as [CacheStrategyName, StrategyStats][]) {
    const total = s.hits + s.misses;
    result[name] = {
      ...s,
      hitRate: total > 0 ? Math.round((s.hits / total) * 10000) / 100 : 0,
      fillRate: s.misses > 0 ? Math.round((s.fills / s.misses) * 10000) / 100 : 0,
    };
  }

  return result;
}

/**
 * Get slow query log entries
 */
export function getSlowQueryLog(): SlowQueryEntry[] {
  return [...slowQueryLog];
}

/**
 * Get capacity alert history
 */
export function getCapacityAlerts(): CapacityAlert[] {
  return [...recentAlerts];
}

/**
 * Reset all strategy statistics (useful for testing)
 */
export function resetCacheStrategyStats(): void {
  for (const s of Object.values(strategyStats)) {
    s.hits = 0;
    s.misses = 0;
    s.fills = 0;
  }
}

// ============================================================================
// Version Management
// ============================================================================

/**
 * Invalidate all cache entries for a namespace with specific version
 */
export async function invalidateByVersion(namespace: string, version: string): Promise<number> {
  if (!isRedisConnected()) {
    return 0;
  }

  try {
    const pattern = `cache:${namespace}:${version}:*`;
    const keys = await redis.keys(pattern);

    if (keys.length > 0) {
      await redis.del(...keys);
    }

    return keys.length;
  } catch (error) {
    logger.error('Invalidate by version error:', error);
    return 0;
  }
}

/**
 * Get current cache version
 */
export async function getCacheVersion(namespace: string): Promise<string | null> {
  if (!isRedisConnected()) {
    return null;
  }

  try {
    const versionKey = `${CACHE_VERSION_PREFIX}${namespace}`;
    return await redis.get(versionKey);
  } catch (error) {
    logger.error('Get cache version error:', error);
    return null;
  }
}

/**
 * Set cache version
 */
export async function setCacheVersion(namespace: string, version: string): Promise<void> {
  if (!isRedisConnected()) {
    return;
  }

  try {
    const versionKey = `${CACHE_VERSION_PREFIX}${namespace}`;
    await redis.set(versionKey, version);
  } catch (error) {
    logger.error('Set cache version error:', error);
  }
}

/**
 * Create versioned cache key
 */
export function versionedKey(namespace: string, version: string, key: string): string {
  return `cache:${namespace}:${version}:${key}`;
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Batch get values from cache
 */
export async function batchCacheGet<T>(keys: string[]): Promise<(T | null)[]> {
  if (!isRedisConnected() || keys.length === 0) {
    return keys.map(() => null);
  }

  try {
    const values = await redis.mget(...keys);
    return values.map((value: string | null) => {
      if (value) {
        return JSON.parse(value) as T;
      }
      return null;
    });
  } catch (error) {
    logger.error('Batch cache get error:', error);
    return keys.map(() => null);
  }
}

/**
 * Batch set values in cache
 */
export async function batchCacheSet<T>(
  entries: Array<{ key: string; value: T; ttl?: number }>
): Promise<void> {
  if (!isRedisConnected() || entries.length === 0) {
    return;
  }

  try {
    const pipeline = redis.pipeline();

    for (const entry of entries) {
      const ttl = entry.ttl ?? DEFAULT_TTL;
      pipeline.setex(entry.key, ttl, JSON.stringify(entry.value));
    }

    await pipeline.exec();
  } catch (error) {
    logger.error('Batch cache set error:', error);
  }
}

// ============================================================================
// Cache Decorators
// ============================================================================

/**
 * Cache decorator for class methods
 * Automatically caches function results
 *
 * Usage:
 *   class UserService {
 *     @cached('user', (id) => id)
 *     async getUser(id: string): Promise<User> { ... }
 *   }
 */
export function cached(
  namespace: string,
  keyGenerator: (...args: unknown[]) => string,
  ttl: number = DEFAULT_TTL
) {
  return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]): Promise<unknown> {
      const key = versionedKey(namespace, 'v1', keyGenerator(...args));

      const cached = await cacheGet(key);
      if (cached !== null) {
        return cached;
      }

      const result = await originalMethod.apply(this, args);
      if (result !== null && result !== undefined) {
        await cacheSet(key, result, ttl);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Cache invalidation decorator
 * Clears cache after method execution
 *
 * Usage:
 *   class UserService {
 *     @invalidateCache('user')
 *     async updateUser(id: string, data: UserData): Promise<User> { ... }
 *   }
 */
export function invalidateCache(namespace: string) {
  return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]): Promise<unknown> {
      const result = await originalMethod.apply(this, args);

      const key = args.length > 0 ? args[0]?.toString() : '';
      if (key) {
        const fullKey = versionedKey(namespace, 'v1', key);
        await cacheDel(fullKey);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Cache busting decorator
 * Busts entire namespace cache after method execution
 *
 * Usage:
 *   class UserService {
 *     @bustNamespaceCache('user')
 *     async bulkUpdateUsers(): Promise<void> { ... }
 *   }
 */
export function bustNamespaceCache(namespace: string, version: string = 'v1') {
  return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]): Promise<unknown> {
      const result = await originalMethod.apply(this, args);
      await invalidateByVersion(namespace, version);
      return result;
    };

    return descriptor;
  };
}

export default {
  CacheTTL,
  CacheKeys,
  cacheGet,
  cacheSet,
  cacheDel,
  cacheDelPattern,
  cacheIncr,
  cacheGetOrSet,
  cacheAside,
  writeThrough,
  readThrough,
  cacheCreditScore,
  getCachedCreditScore,
  cacheAgentProfile,
  getCachedAgentProfile,
  invalidateAgentProfile,
  cacheMatchResults,
  getCachedMatchResults,
  invalidateMatchResults,
  checkRateLimit,
  acquireLock,
  releaseLock,
  getCacheStats,
  getCacheStrategyStats,
  getSlowQueryLog,
  getCapacityAlerts,
  resetCacheStrategyStats,
  invalidateByVersion,
  getCacheVersion,
  setCacheVersion,
  versionedKey,
  batchCacheGet,
  batchCacheSet,
  cached,
  invalidateCache,
  bustNamespaceCache,
};
