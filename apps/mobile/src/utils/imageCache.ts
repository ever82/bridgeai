import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';

import { ImageCacheManager } from '../services/performance/searchOptimization';

const { ImageResizer } = NativeModules;

export interface CacheEntry {
  uri: string;
  cachedUri: string;
  size: number;
  width: number;
  height: number;
  createdAt: Date;
  accessedAt: Date;
  accessCount: number;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
}

export interface CacheConfig {
  maxSize: number; // in MB
  maxEntries: number;
  thumbnailWidth: number;
  thumbnailHeight: number;
  compressionQuality: number;
  expirationDays: number;
}

const DEFAULT_CONFIG: CacheConfig = {
  maxSize: 200, // 200MB
  maxEntries: 5000,
  thumbnailWidth: 300,
  thumbnailHeight: 300,
  compressionQuality: 0.8,
  expirationDays: 30,
};

const CACHE_INDEX_KEY = 'image_cache_index_v2';
const CACHE_DIR = `${RNFS.CachesDirectoryPath}/image_thumbnails`;

class ImageCache {
  private static instance: ImageCache;
  private cache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig = DEFAULT_CONFIG;
  private initialized = false;
  private hits = 0;
  private misses = 0;

  static getInstance(): ImageCache {
    if (!ImageCache.instance) {
      ImageCache.instance = new ImageCache();
    }
    return ImageCache.instance;
  }

  async initialize(config?: Partial<CacheConfig>): Promise<void> {
    if (this.initialized) return;

    if (config) {
      this.config = { ...DEFAULT_CONFIG, ...config };
    }

    // Ensure cache directory exists
    const dirExists = await RNFS.exists(CACHE_DIR);
    if (!dirExists) {
      await RNFS.mkdir(CACHE_DIR, { NSURLIsExcludedFromBackupKey: true });
    }

    // Load cache index
    await this.loadCacheIndex();

    // Cleanup expired entries
    await this.cleanupExpiredEntries();

    this.initialized = true;
  }

  private async loadCacheIndex(): Promise<void> {
    try {
      const indexData = await AsyncStorage.getItem(CACHE_INDEX_KEY);
      if (indexData) {
        const entries: Array<[string, CacheEntry]> = JSON.parse(indexData);
        entries.forEach(([key, entry]) => {
          this.cache.set(key, {
            ...entry,
            createdAt: new Date(entry.createdAt),
            accessedAt: new Date(entry.accessedAt),
          });
        });
      }
    } catch (error) {
      console.error('Failed to load cache index:', error);
    }
  }

  private async saveCacheIndex(): Promise<void> {
    try {
      const entries = Array.from(this.cache.entries());
      await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(entries));
    } catch (error) {
      console.error('Failed to save cache index:', error);
    }
  }

  async getThumbnail(uri: string): Promise<string | null> {
    const entry = this.cache.get(uri);

    if (entry) {
      // Check if file still exists
      const exists = await RNFS.exists(entry.cachedUri);
      if (exists) {
        // Update access stats
        entry.accessedAt = new Date();
        entry.accessCount++;
        this.hits++;
        await this.saveCacheIndex();
        return entry.cachedUri;
      } else {
        // File was deleted, remove from cache
        this.cache.delete(uri);
        this.misses++;
      }
    } else {
      this.misses++;
    }

    return null;
  }

  async generateThumbnail(uri: string): Promise<string> {
    const existingThumbnail = await this.getThumbnail(uri);
    if (existingThumbnail) {
      return existingThumbnail;
    }

    // Generate new thumbnail
    const filename = `thumb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
    const cachedUri = `${CACHE_DIR}/${filename}`;

    try {
      // Use ImageResizer to create thumbnail
      const resized = await ImageResizer?.createResizedImage?.(
        uri,
        this.config.thumbnailWidth,
        this.config.thumbnailHeight,
        'JPEG',
        this.config.compressionQuality * 100,
        0,
        undefined,
        false,
        { mode: 'cover' }
      );

      if (resized) {
        await RNFS.moveFile(resized.uri, cachedUri);

        // Get file size
        const stat = await RNFS.stat(cachedUri);

        const entry: CacheEntry = {
          uri,
          cachedUri,
          size: stat.size,
          width: this.config.thumbnailWidth,
          height: this.config.thumbnailHeight,
          createdAt: new Date(),
          accessedAt: new Date(),
          accessCount: 1,
        };

        this.cache.set(uri, entry);
        await this.saveCacheIndex();
        await this.enforceCacheLimits();

        return cachedUri;
      }
    } catch (error) {
      console.error('Failed to generate thumbnail:', error);
    }

    // Return original URI if thumbnail generation fails
    return uri;
  }

  private async enforceCacheLimits(): Promise<void> {
    // Check entry count limit
    if (this.cache.size > this.config.maxEntries) {
      const sortedEntries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].accessedAt.getTime() - b[1].accessedAt.getTime());

      const entriesToRemove = sortedEntries.slice(0, sortedEntries.length - this.config.maxEntries);

      for (const [key, entry] of entriesToRemove) {
        await this.removeEntry(key, entry);
      }
    }

    // Check size limit
    const totalSize = await this.getTotalSize();
    const maxSizeBytes = this.config.maxSize * 1024 * 1024;

    if (totalSize > maxSizeBytes) {
      const sortedEntries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].accessedAt.getTime() - b[1].accessedAt.getTime());

      let currentSize = totalSize;
      for (const [key, entry] of sortedEntries) {
        if (currentSize <= maxSizeBytes * 0.9) break;
        await this.removeEntry(key, entry);
        currentSize -= entry.size;
      }
    }
  }

  private async removeEntry(key: string, entry: CacheEntry): Promise<void> {
    try {
      await RNFS.unlink(entry.cachedUri);
    } catch (error) {
      // File might not exist
    }
    this.cache.delete(key);
  }

  async cleanupExpiredEntries(): Promise<void> {
    const expirationTime = Date.now() - this.config.expirationDays * 24 * 60 * 60 * 1000;
    const entriesToRemove: Array<[string, CacheEntry]> = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.createdAt.getTime() < expirationTime) {
        entriesToRemove.push([key, entry]);
      }
    }

    for (const [key, entry] of entriesToRemove) {
      await this.removeEntry(key, entry);
    }

    await this.saveCacheIndex();
  }

  async clearCache(): Promise<void> {
    for (const [key, entry] of this.cache.entries()) {
      await this.removeEntry(key, entry);
    }
    this.cache.clear();
    await this.saveCacheIndex();
  }

  async getTotalSize(): Promise<number> {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.size;
    }
    return totalSize;
  }

  getStats(): CacheStats {
    const totalAccess = this.hits + this.misses;
    return {
      totalEntries: this.cache.size,
      totalSize: Array.from(this.cache.values()).reduce((sum, e) => sum + e.size, 0),
      hitRate: totalAccess > 0 ? this.hits / totalAccess : 0,
      missRate: totalAccess > 0 ? this.misses / totalAccess : 0,
    };
  }

  async getCacheEntry(uri: string): Promise<CacheEntry | undefined> {
    return this.cache.get(uri);
  }

  async isCached(uri: string): Promise<boolean> {
    const entry = this.cache.get(uri);
    if (!entry) return false;
    return await RNFS.exists(entry.cachedUri);
  }

  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
  }
}

export const imageCache = ImageCache.getInstance();
export default ImageCache;
