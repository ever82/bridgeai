/**
 * Filter Cache Tests
 * 过滤缓存单元测试
 */

import {
  getFilterCache,
  clearFilterCache,
  withFilterCache,
} from '../filterCache';
import { FilterDSL, FilterResult } from '@visionshare/shared';

describe('FilterCache', () => {
  beforeEach(() => {
    clearFilterCache();
  });

  afterEach(() => {
    clearFilterCache();
  });

  describe('getFilterCache', () => {
    it('should create singleton cache instance', () => {
      const cache1 = getFilterCache();
      const cache2 = getFilterCache();

      expect(cache1).toBe(cache2);
    });
  });

  describe('cache operations', () => {
    it('should store and retrieve cached result', () => {
      const cache = getFilterCache<string>();
      const dsl: FilterDSL = {
        where: { field: 'name', operator: 'eq', value: 'Test' },
      };
      const result: FilterResult<string> = {
        items: ['item1', 'item2'],
        total: 2,
        page: 1,
        limit: 20,
        hasMore: false,
      };

      const key = cache.generateKey(dsl);
      cache.set(key, result);
      const cached = cache.get(key);

      expect(cached).toEqual(result);
    });

    it('should return null for non-existent key', () => {
      const cache = getFilterCache<string>();

      const result = cache.get('non-existent-key');

      expect(result).toBeNull();
    });

    it('should generate consistent keys for same DSL', () => {
      const cache = getFilterCache<string>();
      const dsl: FilterDSL = {
        where: { field: 'name', operator: 'eq', value: 'Test' },
      };

      const key1 = cache.generateKey(dsl);
      const key2 = cache.generateKey(dsl);

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different DSL', () => {
      const cache = getFilterCache<string>();
      const dsl1: FilterDSL = {
        where: { field: 'name', operator: 'eq', value: 'Test1' },
      };
      const dsl2: FilterDSL = {
        where: { field: 'name', operator: 'eq', value: 'Test2' },
      };

      const key1 = cache.generateKey(dsl1);
      const key2 = cache.generateKey(dsl2);

      expect(key1).not.toBe(key2);
    });

    it('should include userId in key when provided', () => {
      const cache = getFilterCache<string>();
      const dsl: FilterDSL = {
        where: { field: 'name', operator: 'eq', value: 'Test' },
      };

      const keyWithoutUser = cache.generateKey(dsl);
      const keyWithUser = cache.generateKey(dsl, 'user-123');

      expect(keyWithUser).toContain('user-123');
      expect(keyWithUser).not.toBe(keyWithoutUser);
    });
  });

  describe('cache expiration', () => {
    it('should expire entries after TTL', () => {
      jest.useFakeTimers();
      const cache = getFilterCache<string>();
      const dsl: FilterDSL = {
        where: { field: 'name', operator: 'eq', value: 'Test' },
      };
      const result: FilterResult<string> = {
        items: ['item1'],
        total: 1,
        page: 1,
        limit: 20,
        hasMore: false,
      };

      const key = cache.generateKey(dsl);
      cache.set(key, result, 100); // 100ms TTL

      // Immediately after setting, should be available
      expect(cache.get(key)).toEqual(result);

      // Advance time past TTL
      jest.advanceTimersByTime(200);

      // Should be expired
      expect(cache.get(key)).toBeNull();

      jest.useRealTimers();
    });
  });

  describe('cache invalidation', () => {
    it('should clear all entries when no pattern provided', () => {
      const cache = getFilterCache<string>();
      const dsl: FilterDSL = {
        where: { field: 'name', operator: 'eq', value: 'Test' },
      };
      const result: FilterResult<string> = {
        items: ['item1'],
        total: 1,
        page: 1,
        limit: 20,
        hasMore: false,
      };

      const key = cache.generateKey(dsl);
      cache.set(key, result);

      clearFilterCache();

      expect(cache.get(key)).toBeNull();
    });

    it('should invalidate entries matching pattern', () => {
      const cache = getFilterCache<string>();
      const dsl1: FilterDSL = {
        where: { field: 'name', operator: 'eq', value: 'Test1' },
      };
      const dsl2: FilterDSL = {
        where: { field: 'name', operator: 'eq', value: 'Test2' },
      };
      const result: FilterResult<string> = {
        items: ['item1'],
        total: 1,
        page: 1,
        limit: 20,
        hasMore: false,
      };

      const key1 = cache.generateKey(dsl1, 'user-123');
      const key2 = cache.generateKey(dsl2, 'user-456');

      cache.set(key1, result);
      cache.set(key2, result);

      cache.invalidate('user-123');

      expect(cache.get(key1)).toBeNull();
      expect(cache.get(key2)).toEqual(result);
    });
  });

  describe('cache stats', () => {
    it('should return cache stats', () => {
      const cache = getFilterCache<string>();
      const dsl: FilterDSL = {
        where: { field: 'name', operator: 'eq', value: 'Test' },
      };
      const result: FilterResult<string> = {
        items: ['item1'],
        total: 1,
        page: 1,
        limit: 20,
        hasMore: false,
      };

      const key = cache.generateKey(dsl);
      cache.set(key, result);

      const stats = cache.getStats();

      expect(stats.size).toBe(1);
    });
  });

  describe('withFilterCache', () => {
    it('should cache function results', async () => {
      const mockFn = jest.fn().mockResolvedValue({
        items: ['item1'],
        total: 1,
        page: 1,
        limit: 20,
        hasMore: false,
      });

      const cachedFn = withFilterCache(mockFn);
      const dsl: FilterDSL = {
        where: { field: 'name', operator: 'eq', value: 'Test' },
      };

      // First call should execute the function
      const result1 = await cachedFn(dsl);
      expect(mockFn).toHaveBeenCalledTimes(1);

      // Second call should return cached result
      const result2 = await cachedFn(dsl);
      expect(mockFn).toHaveBeenCalledTimes(1); // Not called again
      expect(result2).toEqual(result1);
    });

    it('should pass userId to cached function', async () => {
      const mockFn = jest.fn().mockResolvedValue({
        items: ['item1'],
        total: 1,
        page: 1,
        limit: 20,
        hasMore: false,
      });

      const cachedFn = withFilterCache(mockFn);
      const dsl: FilterDSL = {
        where: { field: 'name', operator: 'eq', value: 'Test' },
      };

      await cachedFn(dsl, 'user-123');

      expect(mockFn).toHaveBeenCalledWith(dsl, 'user-123');
    });
  });
});
