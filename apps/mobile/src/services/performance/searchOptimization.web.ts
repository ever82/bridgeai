// Web stub for searchOptimization - native modules not available on web

export interface ThumbnailCacheConfig {
  maxSize: number;
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

export class ImageCacheManager {
  private static instance: ImageCacheManager;

  static getInstance(): ImageCacheManager {
    if (!ImageCacheManager.instance) {
      ImageCacheManager.instance = new ImageCacheManager();
    }
    return ImageCacheManager.instance;
  }

  async initialize(): Promise<void> {
    // No-op on web
  }

  async getThumbnail(_imageUri: string): Promise<string | null> {
    return null;
  }

  async setThumbnail(_imageUri: string, _thumbnailUri: string, _size: number): Promise<void> {
    // No-op on web
  }

  getCacheStats(): { size: number; entries: number; maxSize: number } {
    return { size: 0, entries: 0, maxSize: 0 };
  }

  async clearCache(): Promise<void> {
    // No-op on web
  }
}

export const imageCache = ImageCacheManager.getInstance();

export class SearchOptimizationService {
  private static instance: SearchOptimizationService;

  static getInstance(): SearchOptimizationService {
    if (!SearchOptimizationService.instance) {
      SearchOptimizationService.instance = new SearchOptimizationService();
    }
    return SearchOptimizationService.instance;
  }

  async initialize(): Promise<void> {
    // No-op on web
  }

  getCachedQuery(_query: string): unknown[] | null {
    return null;
  }

  cacheQuery(_query: string, _results: unknown[]): void {
    // No-op on web
  }

  clearQueryCache(): void {
    // No-op on web
  }

  optimizeSearchResponse<T>(results: T[]): T[] {
    return results;
  }

  async optimizeBatteryUsage(): Promise<void> {
    // No-op on web
  }

  disableBatteryOptimization(): void {
    // No-op on web
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
    // No-op on web
  }

  shouldPauseProcessing(): boolean {
    return false;
  }
}

export const searchOptimization = SearchOptimizationService.getInstance();
