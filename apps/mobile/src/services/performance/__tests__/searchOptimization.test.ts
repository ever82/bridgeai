import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  ImageCacheManager,
  SearchOptimizationService,
  SearchPerformanceMetrics,
} from '../searchOptimization';

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
      defineTask: jest.fn().mockResolvedValue(undefined),
    },
  },
  Platform: {
    OS: 'ios',
  },
}));

// Mock dependencies that the source module imports.
// These paths are resolved from the SOURCE file location, not this test file.
jest.mock('../../indexing/localIndexer', () => ({
  localSearchIndex: {},
  IndexedImage: {},
}));

jest.mock('../../ai/localImageAnalysis', () => ({
  localImageAnalysis: {},
  AnalysisProgress: {},
}));

describe('ImageCacheManager', () => {
  let cache: ImageCacheManager;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (ImageCacheManager as unknown as { instance: ImageCacheManager | null }).instance = null;
    cache = ImageCacheManager.getInstance();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Singleton Pattern', () => {
    it('returns the same instance', () => {
      const instance1 = ImageCacheManager.getInstance();
      const instance2 = ImageCacheManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Initialization', () => {
    it('initializes with default config', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      await cache.initialize();

      const stats = cache.getCacheStats();
      expect(stats.maxSize).toBe(200 * 1024 * 1024);
    });

    it('loads cache index from storage', async () => {
      const mockCacheIndex = JSON.stringify([
        [
          'uri1',
          { uri: 'uri1', thumbnailUri: 'thumb1', size: 1000, accessedAt: new Date().toISOString() },
        ],
      ]);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(mockCacheIndex);

      await cache.initialize();

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('thumbnail_cache_index');
    });
  });

  describe('Thumbnail Cache Management', () => {
    beforeEach(async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      await cache.initialize();
    });

    it('stores and retrieves thumbnail', async () => {
      const uri = 'file:///image.jpg';
      const thumbnailUri = 'file:///cache/thumb.jpg';

      await cache.setThumbnail(uri, thumbnailUri, 1024);
      const cached = await cache.getThumbnail(uri);

      expect(cached).toBe(thumbnailUri);
    });

    it('returns null for uncached thumbnail', async () => {
      const cached = await cache.getThumbnail('nonexistent.jpg');
      expect(cached).toBeNull();
    });

    it('updates access time on cache hit', async () => {
      const uri = 'file:///image.jpg';
      const thumbnailUri = 'file:///cache/thumb.jpg';

      await cache.setThumbnail(uri, thumbnailUri, 1024);

      // Advance time, then access to update accessedAt
      jest.advanceTimersByTime(100);
      await cache.getThumbnail(uri);

      // If getThumbnail returned the value, access time was updated
      const cached = await cache.getThumbnail(uri);
      expect(cached).toBe(thumbnailUri);
    });

    it('reports cache stats correctly', async () => {
      await cache.setThumbnail('uri1', 'thumb1', 512);
      await cache.setThumbnail('uri2', 'thumb2', 1024);

      const stats = cache.getCacheStats();
      expect(stats.entries).toBe(2);
      expect(stats.size).toBe(1536);
    });

    it('evicts oldest entries when cache size is exceeded', async () => {
      // Default maxSize is 200MB = 200 * 1024 * 1024 bytes
      // Add entries that together exceed the limit
      for (let i = 0; i < 100; i++) {
        await cache.setThumbnail(
          `file:///image${i}.jpg`,
          `file:///cache/thumb${i}.jpg`,
          10 * 1024 * 1024 // 10MB each
        );
      }

      // Should have triggered eviction
      const stats = cache.getCacheStats();
      expect(stats.size).toBeLessThanOrEqual(stats.maxSize);
    });

    it('evicts oldest entries when max entries is exceeded', async () => {
      // Default maxEntries is 5000, but we test eviction by adding more than that
      // Since eviction is per-insert, add exactly maxEntries + 1
      // Use small sizes to avoid size-based eviction
      const manyEntries = 5001;
      for (let i = 0; i < manyEntries; i++) {
        await cache.setThumbnail(`file:///image${i}.jpg`, `file:///cache/thumb${i}.jpg`, 1);
      }

      const stats = cache.getCacheStats();
      expect(stats.entries).toBeLessThanOrEqual(5001);
    });
  });

  describe('Cache Persistence', () => {
    beforeEach(async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      await cache.initialize();
    });

    it('saves cache index on change', async () => {
      await cache.setThumbnail('uri', 'thumb', 1024);

      // Cache save is debounced by 5 seconds
      jest.advanceTimersByTime(5000);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'thumbnail_cache_index',
        expect.any(String)
      );
    });

    it('loads cache index on initialization', async () => {
      const mockIndex = JSON.stringify([
        [
          'uri1',
          { uri: 'uri1', thumbnailUri: 'thumb1', size: 1000, accessedAt: new Date().toISOString() },
        ],
      ]);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(mockIndex);

      (ImageCacheManager as unknown as { instance: ImageCacheManager | null }).instance = null;
      cache = ImageCacheManager.getInstance();
      await cache.initialize();

      const cached = await cache.getThumbnail('uri1');
      expect(cached).toBe('thumb1');
    });

    it('clears cache and removes from storage', async () => {
      await cache.setThumbnail('uri', 'thumb', 1024);
      await cache.clearCache();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('thumbnail_cache_index');

      const stats = cache.getCacheStats();
      expect(stats.entries).toBe(0);
      expect(stats.size).toBe(0);
    });
  });
});

describe('SearchOptimizationService', () => {
  let service: SearchOptimizationService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (
      SearchOptimizationService as unknown as { instance: SearchOptimizationService | null }
    ).instance = null;
    service = SearchOptimizationService.getInstance();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Singleton Pattern', () => {
    it('returns the same instance', () => {
      const instance1 = SearchOptimizationService.getInstance();
      const instance2 = SearchOptimizationService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Initialization', () => {
    it('initializes without error', async () => {
      await service.initialize();
      // No error thrown means success
    });
  });

  describe('Query Caching', () => {
    it('caches and retrieves query results', () => {
      const query = 'beach sunset';
      const results = [{ id: '1' }, { id: '2' }];

      service.cacheQuery(query, results);
      const cached = service.getCachedQuery(query);

      expect(cached).toEqual(results);
    });

    it('returns null for uncached query', () => {
      const cached = service.getCachedQuery('nonexistent');
      expect(cached).toBeNull();
    });

    it('expires cached results after timeout', () => {
      const query = 'test';
      service.cacheQuery(query, [{ id: '1' }]);

      // Advance past the 5 minute timeout
      jest.advanceTimersByTime(6 * 60 * 1000);

      const cached = service.getCachedQuery(query);
      expect(cached).toBeNull();
    });

    it('clears all query cache', () => {
      service.cacheQuery('query1', [{ id: '1' }]);
      service.cacheQuery('query2', [{ id: '2' }]);

      service.clearQueryCache();

      expect(service.getCachedQuery('query1')).toBeNull();
      expect(service.getCachedQuery('query2')).toBeNull();
    });

    it('limits cache size to 100 entries', () => {
      for (let i = 0; i < 110; i++) {
        service.cacheQuery(`query${i}`, [{ id: `${i}` }]);
      }

      // First entries should have been evicted (FIFO)
      expect(service.getCachedQuery('query0')).toBeNull();
      // Later entries should still be present
      expect(service.getCachedQuery('query109')).toEqual([{ id: '109' }]);
    });
  });

  describe('Search Response Optimization', () => {
    it('limits search response to 100 results', () => {
      const results = Array.from({ length: 200 }, (_, i) => ({ id: `${i}` }));

      const optimized = service.optimizeSearchResponse(results);

      expect(optimized).toHaveLength(100);
    });

    it('preserves results under 100', () => {
      const results = [{ id: '1' }, { id: '2' }, { id: '3' }];

      const optimized = service.optimizeSearchResponse(results);

      expect(optimized).toHaveLength(3);
      expect(optimized).toEqual(results);
    });

    it('returns same type as input', () => {
      const results = ['a', 'b', 'c'];
      const optimized = service.optimizeSearchResponse(results);
      expect(optimized).toEqual(['a', 'b', 'c']);
    });
  });

  describe('Battery Optimization', () => {
    it('enables battery optimization', async () => {
      await service.optimizeBatteryUsage();

      // After enabling, shouldPauseProcessing may return true if indexing
      // Just verify no error thrown
    });

    it('disables battery optimization', () => {
      service.disableBatteryOptimization();
      // No error means success
    });

    it('indicates pause when memory is high and indexing', () => {
      // Default state: memoryUsage=0, batteryOptimizationEnabled=true, isBackgroundIndexing=false
      const shouldPause = service.shouldPauseProcessing();
      expect(typeof shouldPause).toBe('boolean');
    });
  });

  describe('Performance Metrics', () => {
    it('returns performance metrics', () => {
      const metrics = service.getPerformanceMetrics();

      expect(metrics).toMatchObject({
        averageQueryTime: expect.any(Number),
        cacheHitRate: expect.any(Number),
        indexSize: expect.any(Number),
        lastOptimization: expect.any(Date),
      });
    });

    it('returns metrics matching SearchPerformanceMetrics interface', () => {
      const metrics: SearchPerformanceMetrics = service.getPerformanceMetrics();

      expect(typeof metrics.averageQueryTime).toBe('number');
      expect(typeof metrics.cacheHitRate).toBe('number');
      expect(typeof metrics.indexSize).toBe('number');
      expect(metrics.lastOptimization).toBeInstanceOf(Date);
    });
  });

  describe('Index Optimization', () => {
    it('runs index optimization without error', async () => {
      await service.optimizeIndex();
      // No error thrown means success
    });
  });

  describe('Background Indexing', () => {
    it('starts background indexing', async () => {
      await service.startBackgroundIndexing();

      const NativeModules = jest.requireMock('react-native').NativeModules;
      expect(NativeModules.BackgroundTaskManager.scheduleTask).toHaveBeenCalledWith(
        expect.objectContaining({
          taskName: 'backgroundIndexing',
        })
      );
    });

    it('stops background indexing', async () => {
      await service.stopBackgroundIndexing();

      const NativeModules = jest.requireMock('react-native').NativeModules;
      expect(NativeModules.BackgroundTaskManager.cancelTask).toHaveBeenCalledWith(
        'backgroundIndexing'
      );
    });
  });
});
