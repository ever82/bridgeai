/**
 * Tests for Cache strategies (cacheAside, writeThrough, readThrough)
 * and core cache operations (get, set, del, version management, batch ops)
 * File: apps/server/src/services/cache.ts
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock logger before importing the module under test
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Redis mock state
const mockRedisInstance = {
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  dbsize: jest.fn(),
  info: jest.fn(),
  mget: jest.fn(),
  pipeline: jest.fn(),
  quit: jest.fn(),
  status: 'ready',
};

jest.mock('../../services/redis', () => ({
  redis: mockRedisInstance,
  isRedisConnected: jest.fn().mockReturnValue(true),
}));

// Import after mocks
import {
  cacheGet,
  cacheSet,
  cacheDel,
  cacheDelPattern,
  cacheIncr,
  cacheGetOrSet,
  cacheAside,
  writeThrough,
  readThrough,
  getCacheStrategyStats,
  resetCacheStrategyStats,
  invalidateByVersion,
  getCacheVersion,
  setCacheVersion,
  versionedKey,
  batchCacheGet,
  batchCacheSet,
  checkRateLimit,
  acquireLock,
  releaseLock,
  CacheTTL,
  CacheKeys,
} from '../../services/cache';
import { isRedisConnected } from '../../services/redis';

describe('Cache Strategy Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isRedisConnected as jest.Mock).mockReturnValue(true);
    mockRedisInstance.status = 'ready';
    resetCacheStrategyStats();
  });

  // ==========================================================================
  // Cache-Aside (Lazy Loading) Strategy
  // ==========================================================================
  describe('cacheAside strategy', () => {
    it('should return cached value on cache hit', async () => {
      const cachedData = { name: 'test' };
      mockRedisInstance.get.mockResolvedValue(JSON.stringify(cachedData));

      const factory = jest.fn().mockResolvedValue({ name: 'fresh' });
      const result = await cacheAside('test:key', factory, 300);

      expect(result).toEqual(cachedData);
      expect(factory).not.toHaveBeenCalled();
    });

    it('should call factory on cache miss and populate cache', async () => {
      mockRedisInstance.get.mockResolvedValue(null);
      const freshData = { name: 'fresh' };
      const factory = jest.fn().mockResolvedValue(freshData);
      mockRedisInstance.setex.mockResolvedValue('OK');

      const result = await cacheAside('test:key', factory, 300);

      expect(result).toEqual(freshData);
      expect(factory).toHaveBeenCalled();
      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'test:key',
        300,
        JSON.stringify(freshData)
      );
    });

    it('should record hit on cache hit', async () => {
      mockRedisInstance.get.mockResolvedValue(JSON.stringify('value'));

      await cacheAside('key1', jest.fn(), 300);

      const stats = getCacheStrategyStats();
      expect(stats.cacheAside.hits).toBe(1);
      expect(stats.cacheAside.misses).toBe(0);
    });

    it('should record miss and fill on cache miss', async () => {
      mockRedisInstance.get.mockResolvedValue(null);
      mockRedisInstance.setex.mockResolvedValue('OK');

      await cacheAside('key1', jest.fn().mockResolvedValue('value'), 300);

      const stats = getCacheStrategyStats();
      expect(stats.cacheAside.hits).toBe(0);
      expect(stats.cacheAside.misses).toBe(1);
      expect(stats.cacheAside.fills).toBe(1);
    });

    it('should handle factory returning falsy values', async () => {
      mockRedisInstance.get.mockResolvedValue(null);
      mockRedisInstance.setex.mockResolvedValue('OK');

      const result = await cacheAside('key1', jest.fn().mockResolvedValue(0), 300);
      expect(result).toBe(0);
    });
  });

  // ==========================================================================
  // Write-Through Strategy
  // ==========================================================================
  describe('writeThrough strategy', () => {
    it('should write to source then cache', async () => {
      const writeFn = jest.fn().mockResolvedValue(undefined);
      mockRedisInstance.setex.mockResolvedValue('OK');

      await writeThrough('test:key', { data: 'value' }, 300, writeFn);

      expect(writeFn).toHaveBeenCalled();
      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'test:key',
        300,
        JSON.stringify({ data: 'value' })
      );
      // writeFn should be called before cacheSet
      const writeFnCallOrder = writeFn.mock.invocationCallOrder[0];
      const setexCallOrder = (mockRedisInstance.setex as jest.Mock).mock.invocationCallOrder[0];
      expect(writeFnCallOrder).toBeLessThan(setexCallOrder);
    });

    it('should record fill on successful write', async () => {
      mockRedisInstance.setex.mockResolvedValue('OK');

      await writeThrough('key1', 'value', 300, jest.fn().mockResolvedValue(undefined));

      const stats = getCacheStrategyStats();
      expect(stats.writeThrough.fills).toBe(1);
    });

    it('should propagate write function errors', async () => {
      const writeFn = jest.fn().mockRejectedValue(new Error('DB write failed'));

      await expect(writeThrough('key1', 'value', 300, writeFn)).rejects.toThrow('DB write failed');
    });
  });

  // ==========================================================================
  // Read-Through Strategy
  // ==========================================================================
  describe('readThrough strategy', () => {
    it('should return cached value on cache hit', async () => {
      mockRedisInstance.get.mockResolvedValue(JSON.stringify({ cached: true }));
      const factory = jest.fn();

      const result = await readThrough('test:key', factory, 300);

      expect(result).toEqual({ cached: true });
      expect(factory).not.toHaveBeenCalled();
    });

    it('should read from source and populate cache on miss', async () => {
      mockRedisInstance.get.mockResolvedValue(null);
      const freshData = { fresh: true };
      const factory = jest.fn().mockResolvedValue(freshData);
      mockRedisInstance.setex.mockResolvedValue('OK');

      const result = await readThrough('test:key', factory, 300);

      expect(result).toEqual(freshData);
      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'test:key',
        300,
        JSON.stringify(freshData)
      );
    });

    it('should record hit on cache hit', async () => {
      mockRedisInstance.get.mockResolvedValue(JSON.stringify('value'));

      await readThrough('key1', jest.fn(), 300);

      const stats = getCacheStrategyStats();
      expect(stats.readThrough.hits).toBe(1);
    });

    it('should record miss and fill on cache miss', async () => {
      mockRedisInstance.get.mockResolvedValue(null);
      mockRedisInstance.setex.mockResolvedValue('OK');

      await readThrough('key1', jest.fn().mockResolvedValue('value'), 300);

      const stats = getCacheStrategyStats();
      expect(stats.readThrough.misses).toBe(1);
      expect(stats.readThrough.fills).toBe(1);
    });
  });

  // ==========================================================================
  // Core Cache Operations
  // ==========================================================================
  describe('cacheGet', () => {
    it('should return parsed value when key exists', async () => {
      mockRedisInstance.get.mockResolvedValue(JSON.stringify({ foo: 'bar' }));

      const result = await cacheGet('test:key');

      expect(result).toEqual({ foo: 'bar' });
    });

    it('should return null when key does not exist', async () => {
      mockRedisInstance.get.mockResolvedValue(null);

      const result = await cacheGet('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null when Redis is not connected', async () => {
      (isRedisConnected as jest.Mock).mockReturnValue(false);

      const result = await cacheGet('test:key');

      expect(result).toBeNull();
      expect(mockRedisInstance.get).not.toHaveBeenCalled();
    });

    it('should return null on Redis error', async () => {
      mockRedisInstance.get.mockRejectedValue(new Error('Redis error'));

      const result = await cacheGet('test:key');

      expect(result).toBeNull();
    });
  });

  describe('cacheSet', () => {
    it('should set value with TTL', async () => {
      mockRedisInstance.setex.mockResolvedValue('OK');

      await cacheSet('test:key', { data: 123 }, 60);

      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'test:key',
        60,
        JSON.stringify({ data: 123 })
      );
    });

    it('should skip when Redis is not connected', async () => {
      (isRedisConnected as jest.Mock).mockReturnValue(false);

      await cacheSet('test:key', 'value', 60);

      expect(mockRedisInstance.setex).not.toHaveBeenCalled();
    });
  });

  describe('cacheDel', () => {
    it('should delete key', async () => {
      mockRedisInstance.del.mockResolvedValue(1);

      await cacheDel('test:key');

      expect(mockRedisInstance.del).toHaveBeenCalledWith('test:key');
    });

    it('should skip when Redis is not connected', async () => {
      (isRedisConnected as jest.Mock).mockReturnValue(false);

      await cacheDel('test:key');

      expect(mockRedisInstance.del).not.toHaveBeenCalled();
    });
  });

  describe('cacheDelPattern', () => {
    it('should delete all matching keys', async () => {
      mockRedisInstance.keys.mockResolvedValue(['key1', 'key2', 'key3']);
      mockRedisInstance.del.mockResolvedValue(3);

      await cacheDelPattern('cache:user:*');

      expect(mockRedisInstance.keys).toHaveBeenCalledWith('cache:user:*');
      expect(mockRedisInstance.del).toHaveBeenCalledWith('key1', 'key2', 'key3');
    });

    it('should not call del when no keys match', async () => {
      mockRedisInstance.keys.mockResolvedValue([]);

      await cacheDelPattern('cache:nonexistent:*');

      expect(mockRedisInstance.del).not.toHaveBeenCalled();
    });
  });

  describe('cacheIncr', () => {
    it('should increment and set TTL on first increment', async () => {
      mockRedisInstance.incr.mockResolvedValue(1);
      mockRedisInstance.expire.mockResolvedValue(1);

      const result = await cacheIncr('ratelimit:user1', 60);

      expect(result).toBe(1);
      expect(mockRedisInstance.expire).toHaveBeenCalledWith('ratelimit:user1', 60);
    });

    it('should not set TTL on subsequent increments', async () => {
      mockRedisInstance.incr.mockResolvedValue(5);

      const result = await cacheIncr('ratelimit:user1', 60);

      expect(result).toBe(5);
      expect(mockRedisInstance.expire).not.toHaveBeenCalled();
    });

    it('should return 0 when Redis is not connected', async () => {
      (isRedisConnected as jest.Mock).mockReturnValue(false);

      const result = await cacheIncr('ratelimit:user1', 60);

      expect(result).toBe(0);
    });
  });

  describe('cacheGetOrSet', () => {
    it('should return cached value when available', async () => {
      mockRedisInstance.get.mockResolvedValue(JSON.stringify('cached'));
      const factory = jest.fn();

      const result = await cacheGetOrSet('key', factory, 300);

      expect(result).toBe('cached');
      expect(factory).not.toHaveBeenCalled();
    });

    it('should call factory and cache when value not available', async () => {
      mockRedisInstance.get.mockResolvedValue(null);
      mockRedisInstance.setex.mockResolvedValue('OK');
      const factory = jest.fn().mockResolvedValue('fresh');

      const result = await cacheGetOrSet('key', factory, 300);

      expect(result).toBe('fresh');
      expect(factory).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Version Management
  // ==========================================================================
  describe('version management', () => {
    describe('versionedKey', () => {
      it('should construct versioned cache key', () => {
        expect(versionedKey('user', 'v2', '123')).toBe('cache:user:v2:123');
      });
    });

    describe('getCacheVersion', () => {
      it('should return current version', async () => {
        mockRedisInstance.get.mockResolvedValue('v3');

        const version = await getCacheVersion('user');

        expect(version).toBe('v3');
        expect(mockRedisInstance.get).toHaveBeenCalledWith('cache:version:user');
      });

      it('should return null when no version is set', async () => {
        mockRedisInstance.get.mockResolvedValue(null);

        const version = await getCacheVersion('user');

        expect(version).toBeNull();
      });

      it('should return null when Redis is not connected', async () => {
        (isRedisConnected as jest.Mock).mockReturnValue(false);

        const version = await getCacheVersion('user');

        expect(version).toBeNull();
      });
    });

    describe('setCacheVersion', () => {
      it('should set version in Redis', async () => {
        mockRedisInstance.set.mockResolvedValue('OK');

        await setCacheVersion('user', 'v2');

        expect(mockRedisInstance.set).toHaveBeenCalledWith('cache:version:user', 'v2');
      });
    });

    describe('invalidateByVersion', () => {
      it('should delete all keys matching version pattern', async () => {
        mockRedisInstance.keys.mockResolvedValue(['cache:user:v1:a', 'cache:user:v1:b']);
        mockRedisInstance.del.mockResolvedValue(2);

        const count = await invalidateByVersion('user', 'v1');

        expect(count).toBe(2);
        expect(mockRedisInstance.del).toHaveBeenCalledWith('cache:user:v1:a', 'cache:user:v1:b');
      });

      it('should return 0 when no keys match', async () => {
        mockRedisInstance.keys.mockResolvedValue([]);

        const count = await invalidateByVersion('user', 'v99');

        expect(count).toBe(0);
      });
    });
  });

  // ==========================================================================
  // Batch Operations
  // ==========================================================================
  describe('batch operations', () => {
    describe('batchCacheGet', () => {
      it('should get multiple values in one call', async () => {
        mockRedisInstance.mget.mockResolvedValue([
          JSON.stringify({ a: 1 }),
          null,
          JSON.stringify({ c: 3 }),
        ]);

        const results = await batchCacheGet(['key1', 'key2', 'key3']);

        expect(results).toEqual([{ a: 1 }, null, { c: 3 }]);
      });

      it('should return nulls for all keys when Redis is not connected', async () => {
        (isRedisConnected as jest.Mock).mockReturnValue(false);

        const results = await batchCacheGet(['key1', 'key2']);

        expect(results).toEqual([null, null]);
      });

      it('should return nulls for empty keys array', async () => {
        const results = await batchCacheGet([]);

        expect(results).toEqual([]);
      });
    });

    describe('batchCacheSet', () => {
      it('should set multiple values using pipeline', async () => {
        const mockPipeline = {
          setex: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([]),
        };
        mockRedisInstance.pipeline.mockReturnValue(mockPipeline);

        await batchCacheSet([
          { key: 'k1', value: 'v1', ttl: 60 },
          { key: 'k2', value: 'v2' }, // uses default TTL
        ]);

        expect(mockPipeline.setex).toHaveBeenCalledTimes(2);
        expect(mockPipeline.setex).toHaveBeenCalledWith('k1', 60, JSON.stringify('v1'));
        expect(mockPipeline.setex).toHaveBeenCalledWith('k2', 300, JSON.stringify('v2'));
      });

      it('should skip when entries array is empty', async () => {
        await batchCacheSet([]);
        expect(mockRedisInstance.pipeline).not.toHaveBeenCalled();
      });
    });
  });

  // ==========================================================================
  // Rate Limiting
  // ==========================================================================
  describe('checkRateLimit', () => {
    it('should allow within limit', async () => {
      mockRedisInstance.incr.mockResolvedValue(3);
      mockRedisInstance.expire.mockResolvedValue(1);

      const result = await checkRateLimit('user:action', 10, 60);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(7);
    });

    it('should block when over limit', async () => {
      mockRedisInstance.incr.mockResolvedValue(11);

      const result = await checkRateLimit('user:action', 10, 60);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should set resetAt timestamp', async () => {
      mockRedisInstance.incr.mockResolvedValue(1);

      const result = await checkRateLimit('user:action', 10, 60);

      expect(result.resetAt).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Distributed Lock
  // ==========================================================================
  describe('acquireLock / releaseLock', () => {
    it('should acquire lock successfully', async () => {
      mockRedisInstance.set.mockResolvedValue('OK');

      const acquired = await acquireLock('resource1', 10);

      expect(acquired).toBe(true);
      expect(mockRedisInstance.set).toHaveBeenCalledWith('lock:resource1', '1', 'EX', 10, 'NX');
    });

    it('should fail to acquire lock when already held', async () => {
      mockRedisInstance.set.mockResolvedValue(null);

      const acquired = await acquireLock('resource1', 10);

      expect(acquired).toBe(false);
    });

    it('should return false when Redis is not connected', async () => {
      (isRedisConnected as jest.Mock).mockReturnValue(false);

      const acquired = await acquireLock('resource1');

      expect(acquired).toBe(false);
    });

    it('should release lock by deleting key', async () => {
      mockRedisInstance.del.mockResolvedValue(1);

      await releaseLock('resource1');

      expect(mockRedisInstance.del).toHaveBeenCalledWith('lock:resource1');
    });
  });

  // ==========================================================================
  // Strategy Statistics
  // ==========================================================================
  describe('getCacheStrategyStats', () => {
    it('should calculate hit rate correctly', async () => {
      // 2 hits, 1 miss on cacheAside
      mockRedisInstance.get
        .mockResolvedValueOnce(JSON.stringify('hit1'))
        .mockResolvedValueOnce(JSON.stringify('hit2'))
        .mockResolvedValueOnce(null);
      mockRedisInstance.setex.mockResolvedValue('OK');

      await cacheAside('k1', jest.fn(), 300);
      await cacheAside('k2', jest.fn(), 300);
      await cacheAside('k3', jest.fn().mockResolvedValue('fresh'), 300);

      const stats = getCacheStrategyStats();
      expect(stats.cacheAside.hitRate).toBeCloseTo(66.67, 1);
      expect(stats.cacheAside.fillRate).toBe(100);
    });

    it('should return zero rates when no operations', () => {
      const stats = getCacheStrategyStats();

      expect(stats.cacheAside.hitRate).toBe(0);
      expect(stats.writeThrough.hitRate).toBe(0);
      expect(stats.readThrough.hitRate).toBe(0);
    });

    it('should reset stats', async () => {
      mockRedisInstance.get.mockResolvedValue(JSON.stringify('value'));
      await cacheAside('k1', jest.fn(), 300);

      resetCacheStrategyStats();

      const stats = getCacheStrategyStats();
      expect(stats.cacheAside.hits).toBe(0);
      expect(stats.cacheAside.misses).toBe(0);
      expect(stats.cacheAside.fills).toBe(0);
    });
  });

  // ==========================================================================
  // CacheTTL and CacheKeys constants
  // ==========================================================================
  describe('CacheTTL constants', () => {
    it('should define TTL values for all cache categories', () => {
      expect(CacheTTL.CREDIT_SCORE).toBe(300);
      expect(CacheTTL.USER_PROFILE).toBe(300);
      expect(CacheTTL.MATCH_RESULTS).toBe(900);
      expect(CacheTTL.ROLE_PERMISSIONS).toBe(3600);
      expect(CacheTTL.RATE_LIMIT_COUNTER).toBe(60);
      expect(CacheTTL.TEMPORARY_LOCK).toBe(10);
    });
  });

  describe('CacheKeys constants', () => {
    it('should define key prefixes for all cache types', () => {
      expect(CacheKeys.CREDIT_SCORE).toBe('cache:credit:score:');
      expect(CacheKeys.USER_PROFILE).toBe('cache:user:profile:');
      expect(CacheKeys.MATCH_RESULTS).toBe('cache:match:results:');
      expect(CacheKeys.RATE_LIMIT).toBe('ratelimit:');
      expect(CacheKeys.LOCK).toBe('lock:');
    });
  });
});
