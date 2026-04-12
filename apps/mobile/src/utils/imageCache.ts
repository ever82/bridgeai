import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry {
  uri: string;
  thumbnailUri: string;
  size: number;
  accessedAt: number;
}

interface CacheStats {
  size: number;
  entries: number;
  maxSize: number;
}

export class ImageCache {
  private static instance: ImageCache;
  private cache: Map<string, CacheEntry> = new Map();
  private currentSize = 0;
  private maxSize = 100 * 1024 * 1024; // 100MB
  private maxEntries = 2000;

  static getInstance(): ImageCache {
    if (!ImageCache.instance) {
      ImageCache.instance = new ImageCache();
    }
    return ImageCache.instance;
  }

  async initialize(): Promise<void> {
    await this.loadCache();
  }

  private async loadCache(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem('image_cache_index');
      if (data) {
        const entries: Array<[string, CacheEntry]> = JSON.parse(data);
        entries.forEach(([key, entry]) => {
          this.cache.set(key, entry);
          this.currentSize += entry.size;
        });
      }
    } catch (error) {
      console.error('Failed to load image cache:', error);
    }
  }

  private async saveCache(): Promise<void> {
    try {
      const entries = Array.from(this.cache.entries());
      await AsyncStorage.setItem('image_cache_index', JSON.stringify(entries));
    } catch (error) {
      console.error('Failed to save image cache:', error);
    }
  }

  async getThumbnail(imageUri: string): Promise<string | null> {
    const entry = this.cache.get(imageUri);
    if (entry) {
      entry.accessedAt = Date.now();
      return entry.thumbnailUri;
    }
    return null;
  }

  async setThumbnail(
    imageUri: string,
    thumbnailUri: string,
    size: number,
  ): Promise<void> {
    // Evict if needed
    while (this.currentSize + size > this.maxSize && this.cache.size > 0) {
      this.evictLRU();
    }

    if (this.cache.size >= this.maxEntries) {
      this.evictLRU();
    }

    this.cache.set(imageUri, {
      uri: imageUri,
      thumbnailUri,
      size,
      accessedAt: Date.now(),
    });

    this.currentSize += size;
    await this.saveCache();
  }

  private evictLRU(): void {
    let oldest: { key: string; entry: CacheEntry } | null = null;

    for (const [key, entry] of this.cache.entries()) {
      if (!oldest || entry.accessedAt < oldest.entry.accessedAt) {
        oldest = { key, entry };
      }
    }

    if (oldest) {
      this.cache.delete(oldest.key);
      this.currentSize -= oldest.entry.size;
    }
  }

  getStats(): CacheStats {
    return {
      size: this.currentSize,
      entries: this.cache.size,
      maxSize: this.maxSize,
    };
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.currentSize = 0;
    await AsyncStorage.removeItem('image_cache_index');
  }
}

export const imageCache = ImageCache.getInstance();
