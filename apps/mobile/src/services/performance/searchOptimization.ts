import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { localSearchIndex, IndexedImage } from '../indexing/localIndexer';
import { localImageAnalysis, AnalysisProgress } from '../ai/localImageAnalysis';

const { BackgroundTaskManager } = NativeModules;

export interface ThumbnailCacheConfig {
  maxSize: number; // in MB
  maxEntries: number;
  compressionQuality: number;
  expirationDays: number;
}

export interface SearchPerformanceMetrics {
  averageQueryTime: number;
  cacheHitRate: number;
  indexSize: number;
  lastOptimization: Date;
}

interface CacheEntry {
  uri: string;
  thumbnailUri: string;
  size: number;
  accessedAt: Date;
}

export class ImageCacheManager {
  private static instance: ImageCacheManager;
  private cache: Map<string, CacheEntry> = new Map();
  private currentSize = 0;
  private config: ThumbnailCacheConfig = {
    maxSize: 200, // 200MB
    maxEntries: 5000,
    compressionQuality: 0.8,
    expirationDays: 30,
  };

  static getInstance(): ImageCacheManager {
    if (!ImageCacheManager.instance) {
      ImageCacheManager.instance = new ImageCacheManager();
    }
    return ImageCacheManager.instance;
  }

  async initialize(): Promise<void> {
    await this.loadCacheIndex();
    await this.cleanupExpiredEntries();
  }

  private async loadCacheIndex(): Promise<void> {
    try {
      const indexData = await AsyncStorage.getItem('thumbnail_cache_index');
      if (indexData) {
        const entries: Array<[string, CacheEntry]> = JSON.parse(indexData);
        entries.forEach(([key, entry]) => {
          this.cache.set(key, {
            ...entry,
            accessedAt: new Date(entry.accessedAt),
          });
        });
        this.calculateCurrentSize();
      }
    } catch (error) {
      console.error('Failed to load cache index:', error);
    }
  }

  private async saveCacheIndex(): Promise<void> {
    try {
      const entries = Array.from(this.cache.entries());
      await AsyncStorage.setItem('thumbnail_cache_index', JSON.stringify(entries));
    } catch (error) {
      console.error('Failed to save cache index:', error);
    }
  }

  private calculateCurrentSize(): void {
    this.currentSize = this.cache.values()
      .reduce((total, entry) => total + entry.size, 0);
  }

  async getThumbnail(imageUri: string): Promise<string | null> {
    const entry = this.cache.get(imageUri);

    if (entry) {
      entry.accessedAt = new Date();
      this.scheduleCacheSave();
      return entry.thumbnailUri;
    }

    return null;
  }

  async setThumbnail(
    imageUri: string,
    thumbnailUri: string,
    size: number,
  ): Promise<void> {
    if (this.currentSize + size > this.config.maxSize * 1024 * 1024) {
      await this.evictOldestEntries(Math.ceil(this.cache.size * 0.2));
    }

    if (this.cache.size >= this.config.maxEntries) {
      await this.evictOldestEntries(1);
    }

    this.cache.set(imageUri, {
      uri: imageUri,
      thumbnailUri,
      size,
      accessedAt: new Date(),
    });

    this.currentSize += size;
    this.scheduleCacheSave();
  }

  private evictionTimeout: NodeJS.Timeout | null = null;

  private scheduleCacheSave(): void {
    if (this.evictionTimeout) {
      clearTimeout(this.evictionTimeout);
    }

    this.evictionTimeout = setTimeout(() => {
      this.saveCacheIndex();
    }, 5000);
  }

  private async evictOldestEntries(count: number): Promise<void> {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) =>
      a[1].accessedAt.getTime() - b[1].accessedAt.getTime(),
    );

    const toEvict = entries.slice(0, count);
    for (const [key, entry] of toEvict) {
      this.cache.delete(key);
      this.currentSize -= entry.size;
    }
  }

  private async cleanupExpiredEntries(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.expirationDays);

    const toDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessedAt < cutoffDate) {
        toDelete.push(key);
        this.currentSize -= entry.size;
      }
    }

    toDelete.forEach(key => this.cache.delete(key));

    if (toDelete.length > 0) {
      await this.saveCacheIndex();
    }
  }

  getCacheStats(): { size: number; entries: number; maxSize: number } {
    return {
      size: this.currentSize,
      entries: this.cache.size,
      maxSize: this.config.maxSize * 1024 * 1024,
    };
  }

  async clearCache(): Promise<void> {
    this.cache.clear();
    this.currentSize = 0;
    await AsyncStorage.removeItem('thumbnail_cache_index');
  }
}

export const imageCache = ImageCacheManager.getInstance();

export class SearchOptimizationService {
  private static instance: SearchOptimizationService;
  private queryCache: Map<string, { results: any[]; timestamp: Date }> = new Map();
  private queryCacheTimeout = 5 * 60 * 1000; // 5 minutes
  private isBackgroundIndexing = false;
  private memoryUsage: number = 0;
  private batteryOptimizationEnabled = true;

  static getInstance(): SearchOptimizationService {
    if (!SearchOptimizationService.instance) {
      SearchOptimizationService.instance = new SearchOptimizationService();
    }
    return SearchOptimizationService.instance;
  }

  async initialize(): Promise<void> {
    await this.setupBackgroundIndexing();
    this.startMemoryMonitoring();
  }

  private async setupBackgroundIndexing(): Promise<void> {
    if (!BackgroundTaskManager) return;

    try {
      await BackgroundTaskManager.defineTask('backgroundIndexing', () => {
        return this.performBackgroundIndexing();
      });
    } catch (error) {
      console.error('Failed to setup background indexing:', error);
    }
  }

  private async performBackgroundIndexing(): Promise<void> {
    if (this.isBackgroundIndexing) return;

    this.isBackgroundIndexing = true;

    try {
      if (this.batteryOptimizationEnabled && await this.isLowBattery()) {
        console.log('Skipping background indexing due to low battery');
        return;
      }

      console.log('Starting background indexing...');
      // Perform incremental indexing of new photos
      // This would integrate with the photo library observer

    } catch (error) {
      console.error('Background indexing failed:', error);
    } finally {
      this.isBackgroundIndexing = false;
    }
  }

  private async isLowBattery(): Promise<boolean> {
    // Check battery level
    return false;
  }

  async startBackgroundIndexing(): Promise<void> {
    if (!BackgroundTaskManager) return;

    await BackgroundTaskManager.scheduleTask({
      taskName: 'backgroundIndexing',
      interval: 15 * 60, // 15 minutes
      allowsExecutionInForeground: false,
    });
  }

  async stopBackgroundIndexing(): Promise<void> {
    if (!BackgroundTaskManager) return;

    await BackgroundTaskManager.cancelTask('backgroundIndexing');
  }

  getCachedQuery(query: string): any[] | null {
    const cached = this.queryCache.get(query);

    if (cached) {
      const age = Date.now() - cached.timestamp.getTime();
      if (age < this.queryCacheTimeout) {
        return cached.results;
      }
      this.queryCache.delete(query);
    }

    return null;
  }

  cacheQuery(query: string, results: any[]): void {
    this.queryCache.set(query, {
      results,
      timestamp: new Date(),
    });

    // Limit cache size
    if (this.queryCache.size > 100) {
      const oldestKey = this.queryCache.keys().next().value;
      this.queryCache.delete(oldestKey);
    }
  }

  clearQueryCache(): void {
    this.queryCache.clear();
  }

  private startMemoryMonitoring(): void {
    setInterval(() => {
      this.checkMemoryUsage();
    }, 30000); // Check every 30 seconds
  }

  private checkMemoryUsage(): void {
    if (Platform.OS === 'ios') {
      // iOS memory pressure handling
      const usedMemory = this.estimateMemoryUsage();

      if (usedMemory > 150) { // 150MB threshold
        this.optimizeMemory();
      }
    }
  }

  private estimateMemoryUsage(): number {
    let usage = 0;

    // Estimate query cache size
    for (const [query, data] of this.queryCache.entries()) {
      usage += query.length * 2;
      usage += JSON.stringify(data.results).length * 2;
    }

    return usage / (1024 * 1024); // Convert to MB
  }

  private optimizeMemory(): void {
    console.log('Optimizing memory usage...');

    // Clear old query cache entries
    const now = Date.now();
    for (const [query, data] of this.queryCache.entries()) {
      if (now - data.timestamp.getTime() > this.queryCacheTimeout / 2) {
        this.queryCache.delete(query);
      }
    }

    // Reduce cache size
    if (this.queryCache.size > 50) {
      const entries = Array.from(this.queryCache.entries());
      entries.sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime());

      const toKeep = entries.slice(-50);
      this.queryCache.clear();
      toKeep.forEach(([k, v]) => this.queryCache.set(k, v));
    }
  }

  optimizeSearchResponse<T>(results: T[]): T[] {
    // Limit result set for UI responsiveness
    return results.slice(0, 100);
  }

  async optimizeBatteryUsage(): Promise<void> {
    this.batteryOptimizationEnabled = true;

    // Reduce background task frequency when battery is low
    // Reduce AI model batch sizes
    // Lower thumbnail quality temporarily
  }

  disableBatteryOptimization(): void {
    this.batteryOptimizationEnabled = false;
  }

  getPerformanceMetrics(): SearchPerformanceMetrics {
    return {
      averageQueryTime: 0,
      cacheHitRate: 0,
      indexSize: 0,
      lastOptimization: new Date(),
    };
  }

  async optimizeIndex(): Promise<void> {
    // VACUUM and REINDEX SQLite database
    console.log('Optimizing search index...');
  }

  shouldPauseProcessing(): boolean {
    return this.memoryUsage > 200 || // 200MB
      (this.batteryOptimizationEnabled && this.isBackgroundIndexing);
  }
}

export const searchOptimization = SearchOptimizationService.getInstance();
