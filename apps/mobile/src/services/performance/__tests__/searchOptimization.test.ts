import {
  SearchOptimizer,
  ThumbnailCacheConfig,
  SearchPerformanceMetrics,
  BackgroundTaskManager,
} from '../searchOptimization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock react-native
jest.mock('react-native', () => ({
  NativeModules: {
    BackgroundTaskManager: {
      scheduleTask: jest.fn().mockResolvedValue(undefined),
      cancelTask: jest.fn().mockResolvedValue(undefined),
    },
  },
  Platform: {
    OS: 'ios',
  },
}));

describe('SearchOptimizer', () => {
  let optimizer: SearchOptimizer;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (SearchOptimizer as unknown as { instance: SearchOptimizer | null }).instance = null;
    optimizer = SearchOptimizer.getInstance();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Singleton Pattern', () => {
    it('returns the same instance', () => {
      const instance1 = SearchOptimizer.getInstance();
      const instance2 = SearchOptimizer.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Initialization', () => {
    it('initializes with default config', async () => {
      await optimizer.initialize();

      const config = optimizer.getConfig();
      expect(config.maxCacheSize).toBeDefined();
      expect(config.thumbnailQuality).toBeDefined();
    });

    it('initializes with custom config', async () => {
      const customConfig: Partial<ThumbnailCacheConfig> = {
        maxCacheSize: 500,
        thumbnailQuality: 0.9,
      };

      await optimizer.initialize(customConfig);

      const config = optimizer.getConfig();
      expect(config.maxCacheSize).toBe(500);
      expect(config.thumbnailQuality).toBe(0.9);
    });

    it('loads cache index from storage', async () => {
      const mockCacheIndex = JSON.stringify([
        ['uri1', { uri: 'uri1', size: 1000, accessedAt: new Date() }],
      ]);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(mockCacheIndex);

      await optimizer.initialize();

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('thumbnail_cache_index');
    });
  });

  describe('Thumbnail Cache Management', () => {
    beforeEach(async () => {
      await optimizer.initialize();
    });

    it('caches thumbnail metadata', async () => {
      const uri = 'file:///image.jpg';
      const thumbnailUri = 'file:///cache/thumb.jpg';

      await optimizer.cacheThumbnail(uri, thumbnailUri, 1024);

      expect(optimizer.isCached(uri)).toBe(true);
    });

    it('retrieves cached thumbnail', async () => {
      const uri = 'file:///image.jpg';
      const thumbnailUri = 'file:///cache/thumb.jpg';

      await optimizer.cacheThumbnail(uri, thumbnailUri, 1024);
      const cached = optimizer.getCachedThumbnail(uri);

      expect(cached).toBe(thumbnailUri);
    });

    it('updates access time on cache hit', async () => {
      const uri = 'file:///image.jpg';
      const thumbnailUri = 'file:///cache/thumb.jpg';

      await optimizer.cacheThumbnail(uri, thumbnailUri, 1024);
      const beforeAccess = optimizer.getCacheEntry(uri)?.accessedAt;

      // Wait a bit
      jest.advanceTimersByTime(100);

      optimizer.getCachedThumbnail(uri);
      const afterAccess = optimizer.getCacheEntry(uri)?.accessedAt;

      expect(afterAccess).not.toEqual(beforeAccess);
    });

    it('enforces maximum cache size', async () => {
      // Add many cache entries to exceed limit
      for (let i = 0; i < 100; i++) {
        await optimizer.cacheThumbnail(
          `file:///image${i}.jpg`,
          `file:///cache/thumb${i}.jpg`,
          10 * 1024 * 1024 // 10MB each
        );
      }

      // Should trigger cleanup
      const cacheSize = optimizer.getCacheSize();
      expect(cacheSize).toBeLessThanOrEqual(optimizer.getConfig().maxCacheSize * 1024 * 1024);
    });

    it('removes least recently used items when cache is full', async () => {
      // Add items
      for (let i = 0; i < 10; i++) {
        await optimizer.cacheThumbnail(
          `file:///image${i}.jpg`,
          `file:///cache/thumb${i}.jpg`,
          1024
        );
        jest.advanceTimersByTime(100);
      }

      // Access some items to update their recency
      optimizer.getCachedThumbnail('file:///image5.jpg');
      optimizer.getCachedThumbnail('file:///image6.jpg');

      // Add more items to trigger cleanup
      for (let i = 10; i < 20; i++) {
        await optimizer.cacheThumbnail(
          `file:///image${i}.jpg`,
          `file:///cache/thumb${i}.jpg`,
          1024
        );
      }

      // Recently accessed items should still be cached
      expect(optimizer.isCached('file:///image5.jpg')).toBe(true);
      expect(optimizer.isCached('file:///image6.jpg')).toBe(true);
    });
  });

  describe('Background Index Updates', () => {
    it('schedules background index update task', async () => {
      const { BackgroundTaskManager } = require('react-native').NativeModules;

      await optimizer.scheduleBackgroundIndexUpdate();

      expect(BackgroundTaskManager.scheduleTask).toHaveBeenCalledWith(
        'indexUpdate',
        expect.any(Object)
      );
    });

    it('cancels background tasks', async () => {
      const { BackgroundTaskManager } = require('react-native').NativeModules;

      await optimizer.cancelBackgroundTasks();

      expect(BackgroundTaskManager.cancelTask).toHaveBeenCalled();
    });

    it('performs incremental index update', async () => {
      const progress = await optimizer.performIncrementalIndexUpdate();

      expect(progress).toMatchObject({
        processed: expect.any(Number),
        added: expect.any(Number),
        updated: expect.any(Number),
        removed: expect.any(Number),
      });
    });
  });

  describe('Search Response Optimization', () => {
    beforeEach(async () => {
      await optimizer.initialize();
    });

    it('measures query execution time', async () => {
      const queryFn = jest.fn().mockResolvedValue([{ id: '1' }, { id: '2' }]);

      const result = await optimizer.measureQuery('test query', queryFn);

      expect(result.results).toHaveLength(2);
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('caches search results', async () => {
      const query = 'beach sunset';
      const results = [{ id: '1' }, { id: '2' }];

      await optimizer.cacheSearchResults(query, results);
      const cached = await optimizer.getCachedResults(query);

      expect(cached).toEqual(results);
    });

    it('invalidates search cache', async () => {
      const query = 'test';
      await optimizer.cacheSearchResults(query, [{ id: '1' }]);

      await optimizer.invalidateSearchCache(query);
      const cached = await optimizer.getCachedResults(query);

      expect(cached).toBeNull();
    });

    it('clears all search cache', async () => {
      await optimizer.cacheSearchResults('query1', [{ id: '1' }]);
      await optimizer.cacheSearchResults('query2', [{ id: '2' }]);

      await optimizer.clearSearchCache();

      expect(await optimizer.getCachedResults('query1')).toBeNull();
      expect(await optimizer.getCachedResults('query2')).toBeNull();
    });
  });

  describe('Memory Usage Optimization', () => {
    beforeEach(async () => {
      await optimizer.initialize();
    });

    it('monitors memory usage', () => {
      const memoryInfo = optimizer.getMemoryUsage();

      expect(memoryInfo).toMatchObject({
        used: expect.any(Number),
        total: expect.any(Number),
        percentage: expect.any(Number),
      });
    });

    it('triggers memory warning when usage is high', async () => {
      // Simulate high memory usage
      jest.spyOn(optimizer, 'getMemoryUsage').mockReturnValue({
        used: 800,
        total: 1024,
        percentage: 78,
      });

      const warningSpy = jest.fn();
      optimizer.onMemoryWarning(warningSpy);

      await optimizer.checkMemoryPressure();

      expect(warningSpy).toHaveBeenCalled();
    });

    it('releases memory when pressure is high', async () => {
      // Add items to cache
      await optimizer.cacheThumbnail('uri1', 'thumb1', 1024);
      await optimizer.cacheThumbnail('uri2', 'thumb2', 1024);

      // Release memory
      await optimizer.releaseMemory();

      // Cache should be reduced
      expect(optimizer.getCacheSize()).toBeLessThanOrEqual(1024);
    });
  });

  describe('Battery Optimization', () => {
    beforeEach(async () => {
      await optimizer.initialize();
    });

    it('monitors battery level', () => {
      const batteryLevel = optimizer.getBatteryLevel();
      expect(typeof batteryLevel).toBe('number');
    });

    it('pauses background tasks when battery is low', async () => {
      jest.spyOn(optimizer, 'getBatteryLevel').mockReturnValue(0.15);

      const shouldPause = optimizer.shouldPauseBackgroundTasks();

      expect(shouldPause).toBe(true);
    });

    it('resumes background tasks when battery is sufficient', async () => {
      jest.spyOn(optimizer, 'getBatteryLevel').mockReturnValue(0.5);

      const shouldPause = optimizer.shouldPauseBackgroundTasks();

      expect(shouldPause).toBe(false);
    });

    it('adjusts processing batch size based on battery', () => {
      jest.spyOn(optimizer, 'getBatteryLevel').mockReturnValue(0.2);

      const batchSize = optimizer.getOptimalBatchSize();

      // Should reduce batch size when battery is low
      expect(batchSize).toBeLessThanOrEqual(50);
    });
  });

  describe('Performance Metrics', () => {
    beforeEach(async () => {
      await optimizer.initialize();
    });

    it('collects performance metrics', () => {
      const metrics = optimizer.getPerformanceMetrics();

      expect(metrics).toMatchObject({
        averageQueryTime: expect.any(Number),
        cacheHitRate: expect.any(Number),
        totalQueries: expect.any(Number),
      });
    });

    it('resets performance metrics', () => {
      optimizer.recordQueryTime(100);
      optimizer.recordQueryTime(200);

      optimizer.resetMetrics();
      const metrics = optimizer.getPerformanceMetrics();

      expect(metrics.totalQueries).toBe(0);
    });

    it('calculates cache hit rate correctly', async () => {
      // Record some cache hits and misses
      optimizer.recordCacheHit();
      optimizer.recordCacheHit();
      optimizer.recordCacheMiss();

      const metrics = optimizer.getPerformanceMetrics();

      expect(metrics.cacheHitRate).toBeCloseTo(0.67, 1);
    });
  });

  describe('Cache Persistence', () => {
    beforeEach(async () => {
      await optimizer.initialize();
    });

    it('saves cache index on change', async () => {
      await optimizer.cacheThumbnail('uri', 'thumb', 1024);

      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('loads cache index on initialization', async () => {
      const mockIndex = JSON.stringify([
        ['uri1', { uri: 'uri1', size: 1000, accessedAt: new Date().toISOString() }],
      ]);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(mockIndex);

      (SearchOptimizer as unknown as { instance: SearchOptimizer | null }).instance = null;
      optimizer = SearchOptimizer.getInstance();
      await optimizer.initialize();

      expect(optimizer.isCached('uri1')).toBe(true);
    });
  });
});
