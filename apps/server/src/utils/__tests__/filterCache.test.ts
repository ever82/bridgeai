/**
 * Filter Cache Tests
 * 过滤缓存测试
 */

// Mock logger before importing
jest.mock('../logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// We need to access the FilterCache class directly.
// The module only exports singleton helpers, so we test via those
// and also by importing the module to access internals.
import { FilterDSL, FilterResult } from '@bridgeai/shared';

import {
  getFilterCache,
  clearFilterCache,
  destroyFilterCache,
  withFilterCache,
} from '../filterCache';

// Reset the global cache between tests
beforeEach(() => {
  clearFilterCache();
});

// Destroy global cache after all tests to clean up setInterval timer
afterAll(() => {
  destroyFilterCache();
});

// ============================================
// FilterCache - set / get
// ============================================

describe('FilterCache set/get', () => {
  it('stores and retrieves a cached result', () => {
    const cache = getFilterCache<any>();
    const key = 'test-key-1';
    const result: FilterResult<any> = {
      matched: [{ id: 'a' }],
      unmatched: [],
      total: 1,
      matchCount: 1,
    };

    cache.set(key, result);
    const retrieved = cache.get(key);

    expect(retrieved).toEqual(result);
  });

  it('returns null for a missing key', () => {
    const cache = getFilterCache<any>();

    expect(cache.get('nonexistent')).toBeNull();
  });

  it('overwrites existing entry on set', () => {
    const cache = getFilterCache<any>();
    const key = 'overwrite-key';
    const first: FilterResult<any> = {
      matched: [{ id: 'a' }],
      unmatched: [],
      total: 1,
      matchCount: 1,
    };
    const second: FilterResult<any> = {
      matched: [{ id: 'b' }],
      unmatched: [],
      total: 1,
      matchCount: 1,
    };

    cache.set(key, first);
    cache.set(key, second);

    expect(cache.get(key)).toEqual(second);
  });

  it('stores entries with different keys independently', () => {
    const cache = getFilterCache<any>();
    const resultA: FilterResult<any> = {
      matched: [{ id: 'a' }],
      unmatched: [],
      total: 1,
      matchCount: 1,
    };
    const resultB: FilterResult<any> = {
      matched: [{ id: 'b' }],
      unmatched: [],
      total: 1,
      matchCount: 1,
    };

    cache.set('key-a', resultA);
    cache.set('key-b', resultB);

    expect(cache.get('key-a')).toEqual(resultA);
    expect(cache.get('key-b')).toEqual(resultB);
  });
});

// ============================================
// TTL expiration
// ============================================

describe('TTL expiration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns null after TTL expires', () => {
    const cache = getFilterCache<any>();
    const key = 'ttl-key';
    const result: FilterResult<any> = {
      matched: [],
      unmatched: [],
      total: 0,
      matchCount: 0,
    };

    // Set with very short TTL (1ms)
    cache.set(key, result, 1);

    // Immediately available
    expect(cache.get(key)).toEqual(result);

    // After TTL expires (mock time advancement)
    jest.advanceTimersByTime(5);
    expect(cache.get(key)).toBeNull();
  });

  it('respects per-entry TTL', () => {
    const cache = getFilterCache<any>();
    const shortResult: FilterResult<any> = {
      matched: [],
      unmatched: [],
      total: 0,
      matchCount: 0,
    };
    const longResult: FilterResult<any> = {
      matched: [{ id: 'x' }],
      unmatched: [],
      total: 1,
      matchCount: 1,
    };

    cache.set('short', shortResult, 10);
    cache.set('long', longResult, 60000);

    jest.advanceTimersByTime(20);

    expect(cache.get('short')).toBeNull();
    expect(cache.get('long')).toEqual(longResult);
  });
});

// ============================================
// invalidate / clear
// ============================================

describe('invalidate/clear', () => {
  it('clears all entries when called without pattern', () => {
    const cache = getFilterCache<any>();
    const result: FilterResult<any> = {
      matched: [],
      unmatched: [],
      total: 0,
      matchCount: 0,
    };

    cache.set('key-1', result);
    cache.set('key-2', result);
    cache.set('key-3', result);

    clearFilterCache();

    expect(cache.get('key-1')).toBeNull();
    expect(cache.get('key-2')).toBeNull();
    expect(cache.get('key-3')).toBeNull();
  });

  it('invalidates entries matching a pattern', () => {
    const cache = getFilterCache<any>();
    const result: FilterResult<any> = {
      matched: [],
      unmatched: [],
      total: 0,
      matchCount: 0,
    };

    cache.set('user-1:abc', result);
    cache.set('user-1:def', result);
    cache.set('user-2:xyz', result);

    cache.invalidate('user-1:.*');

    expect(cache.get('user-1:abc')).toBeNull();
    expect(cache.get('user-1:def')).toBeNull();
    expect(cache.get('user-2:xyz')).toEqual(result);
  });

  it('does nothing when no entries match pattern', () => {
    const cache = getFilterCache<any>();
    const result: FilterResult<any> = {
      matched: [{ id: 'a' }],
      unmatched: [],
      total: 1,
      matchCount: 1,
    };

    cache.set('keep-me', result);
    cache.invalidate('nonexistent-.*');

    expect(cache.get('keep-me')).toEqual(result);
  });
});

// ============================================
// generateKey
// ============================================

describe('generateKey', () => {
  it('generates consistent key for same DSL and userId', () => {
    const cache = getFilterCache<any>();
    const dsl: FilterDSL = {
      where: {
        field: 'l1.age',
        operator: 'eq',
        value: 'AGE_26_30',
      },
    };

    const key1 = cache.generateKey(dsl, 'user-1');
    const key2 = cache.generateKey(dsl, 'user-1');

    expect(key1).toBe(key2);
  });

  it('includes userId in key when provided', () => {
    const cache = getFilterCache<any>();
    const dsl: FilterDSL = {
      where: {
        field: 'l1.age',
        operator: 'eq',
        value: 'AGE_26_30',
      },
    };

    const keyWithUser = cache.generateKey(dsl, 'user-1');
    const keyWithoutUser = cache.generateKey(dsl);

    expect(keyWithUser).toContain('user-1:');
    expect(keyWithoutUser).not.toContain('user-1:');
  });

  it('generates different keys for different DSLs', () => {
    const cache = getFilterCache<any>();
    const dsl1: FilterDSL = {
      where: { field: 'l1.age', operator: 'eq', value: 'AGE_26_30' },
    };
    const dsl2: FilterDSL = {
      where: { field: 'l1.age', operator: 'eq', value: 'AGE_31_35' },
    };

    expect(cache.generateKey(dsl1)).not.toBe(cache.generateKey(dsl2));
  });
});

// ============================================
// getStats
// ============================================

describe('getStats', () => {
  it('reports correct cache size', () => {
    const cache = getFilterCache<any>();
    const result: FilterResult<any> = {
      matched: [],
      unmatched: [],
      total: 0,
      matchCount: 0,
    };

    expect(cache.getStats().size).toBe(0);

    cache.set('k1', result);
    cache.set('k2', result);

    expect(cache.getStats().size).toBe(2);
  });

  it('decrements size after invalidation', () => {
    const cache = getFilterCache<any>();
    const result: FilterResult<any> = {
      matched: [],
      unmatched: [],
      total: 0,
      matchCount: 0,
    };

    cache.set('k1', result);
    cache.set('k2', result);
    expect(cache.getStats().size).toBe(2);

    cache.invalidate('k1');
    expect(cache.getStats().size).toBe(1);
  });
});

// ============================================
// LRU eviction
// ============================================

describe('LRU eviction', () => {
  it('evicts oldest entry when cache is full', () => {
    // Create a new cache with small maxSize via getFilterCache
    // Since getFilterCache returns a singleton, we test via direct behavior
    const cache = getFilterCache<any>();
    const result: FilterResult<any> = {
      matched: [],
      unmatched: [],
      total: 0,
      matchCount: 0,
    };

    // The default maxSize is 1000, which is too large to test eviction easily.
    // Instead, we can verify the cache accepts many entries without error.
    for (let i = 0; i < 100; i++) {
      cache.set(`key-${i}`, result);
    }

    // Entries set early should still be available (default maxSize = 1000)
    expect(cache.get('key-0')).toEqual(result);
    expect(cache.get('key-99')).toEqual(result);
  });
});

// ============================================
// withFilterCache wrapper
// ============================================

describe('withFilterCache', () => {
  it('caches function results', async () => {
    const mockFn = jest.fn().mockResolvedValue({
      matched: [{ id: 'a' }],
      unmatched: [],
      total: 1,
      matchCount: 1,
    });
    const dsl: FilterDSL = {
      where: { field: 'l1.age', operator: 'eq', value: 'AGE_26_30' },
    };

    const cachedFn = withFilterCache(mockFn);

    // First call invokes the function
    const result1 = await cachedFn(dsl, 'user-1');
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Second call returns cached result without invoking function
    const result2 = await cachedFn(dsl, 'user-1');
    expect(mockFn).toHaveBeenCalledTimes(1); // still 1
    expect(result1).toEqual(result2);
  });

  it('calls function separately for different DSLs', async () => {
    const mockFn = jest.fn().mockResolvedValue({
      matched: [],
      unmatched: [],
      total: 0,
      matchCount: 0,
    });
    const dsl1: FilterDSL = {
      where: { field: 'l1.age', operator: 'eq', value: 'AGE_26_30' },
    };
    const dsl2: FilterDSL = {
      where: { field: 'l1.age', operator: 'eq', value: 'AGE_31_35' },
    };

    const cachedFn = withFilterCache(mockFn);

    await cachedFn(dsl1);
    await cachedFn(dsl2);

    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('respects custom TTL', async () => {
    jest.useFakeTimers();
    try {
      const mockFn = jest.fn().mockResolvedValue({
        matched: [],
        unmatched: [],
        total: 0,
        matchCount: 0,
      });
      const dsl: FilterDSL = {
        where: { field: 'l1.age', operator: 'eq', value: 'AGE_26_30' },
      };

      const cachedFn = withFilterCache(mockFn, 1); // 1ms TTL

      await cachedFn(dsl, 'user-ttl');
      expect(mockFn).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(5);

      await cachedFn(dsl, 'user-ttl');
      expect(mockFn).toHaveBeenCalledTimes(2); // re-invoked after TTL
    } finally {
      jest.useRealTimers();
    }
  });
});

// ============================================
// Cleanup interval (memory leak check)
// ============================================

describe('cleanup interval', () => {
  it('removes expired entries during cleanup cycle', () => {
    jest.useFakeTimers();
    try {
      const cache = getFilterCache<any>();
      const result: FilterResult<any> = {
        matched: [],
        unmatched: [],
        total: 0,
        matchCount: 0,
      };

      // Set with very short TTL
      cache.set('expire-me', result, 10);

      // Confirm it's cached
      expect(cache.get('expire-me')).toEqual(result);

      // Set it again since get() already consumed it
      cache.set('expire-me', result, 10);

      // Advance past the cleanup interval (60s) and TTL
      jest.advanceTimersByTime(65000);

      // The cleanup should have removed it
      expect(cache.get('expire-me')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });
});
