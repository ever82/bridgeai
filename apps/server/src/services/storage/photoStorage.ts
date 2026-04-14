import { v4 as uuidv4 } from 'uuid';

export interface PhotoMetadata {
  id: string;
  originalName: string;
  url: string;
  thumbnailUrl: string;
  size: number;
  width: number;
  height: number;
  format: string;
  mimeType: string;
  hash: string;
  uploadedAt: Date;
  expiresAt?: Date;
  userId: string;
  taskId?: string;
  tags?: string[];
  description?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  deviceInfo?: {
    device?: string;
    model?: string;
    os?: string;
  };
  exif?: Record<string, any>;
  lifecycle?: {
    currentTier: 'hot' | 'warm' | 'cold';
    lastAccessed: Date;
    accessCount: number;
  };
}

export interface StorageConfig {
  provider: 's3' | 'oss' | 'minio';
  region: string;
  bucket: string;
  accessKeyId: string;
  accessKeySecret: string;
  endpoint?: string;
  cdnDomain?: string;
  lifecycleRules?: LifecycleRule[];
}

export interface LifecycleRule {
  id: string;
  prefix: string;
  daysToWarm?: number;
  daysToCold?: number;
  daysToDelete?: number;
}

export interface StorageStats {
  totalPhotos: number;
  totalSize: number;
  hotStorage: { count: number; size: number };
  warmStorage: { count: number; size: number };
  coldStorage: { count: number; size: number };
}

export class PhotoStorageService {
  private static instance: PhotoStorageService;
  private config: StorageConfig;
  private metadataCache: Map<string, PhotoMetadata> = new Map();

  private constructor() {
    this.config = this.loadConfig();
  }

  static getInstance(): PhotoStorageService {
    if (!PhotoStorageService.instance) {
      PhotoStorageService.instance = new PhotoStorageService();
    }
    return PhotoStorageService.instance;
  }

  /**
   * Load storage configuration from environment
   */
  private loadConfig(): StorageConfig {
    const provider = (process.env.STORAGE_PROVIDER as 's3' | 'oss' | 'minio') || 'minio';

    return {
      provider,
      region: process.env.STORAGE_REGION || 'us-east-1',
      bucket: process.env.STORAGE_BUCKET || 'visionshare-photos',
      accessKeyId: process.env.STORAGE_ACCESS_KEY_ID || '',
      accessKeySecret: process.env.STORAGE_ACCESS_KEY_SECRET || '',
      endpoint: process.env.STORAGE_ENDPOINT,
      cdnDomain: process.env.STORAGE_CDN_DOMAIN,
      lifecycleRules: [
        {
          id: 'default-lifecycle',
          prefix: 'photos/',
          daysToWarm: 30,
          daysToCold: 90,
        },
      ],
    };
  }

  /**
   * Store photo metadata
   */
  async saveMetadata(metadata: PhotoMetadata): Promise<void> {
    // Initialize lifecycle if not set
    if (!metadata.lifecycle) {
      metadata.lifecycle = {
        currentTier: 'hot',
        lastAccessed: new Date(),
        accessCount: 0,
      };
    }

    // Save to database/cache
    this.metadataCache.set(metadata.id, metadata);

    // TODO: Persist to database
    // await db.photos.create({...});

    // Update search index
    await this.indexPhoto(metadata);
  }

  /**
   * Get photo metadata
   */
  async getMetadata(photoId: string): Promise<PhotoMetadata | null> {
    // Check cache first
    const cached = this.metadataCache.get(photoId);
    if (cached) {
      // Update access stats
      cached.lifecycle = {
        ...cached.lifecycle!,
        lastAccessed: new Date(),
        accessCount: (cached.lifecycle?.accessCount || 0) + 1,
      };
      return cached;
    }

    // TODO: Load from database
    // const metadata = await db.photos.findById(photoId);
    // if (metadata) {
    //   this.metadataCache.set(photoId, metadata);
    // }

    return null;
  }

  /**
   * Get photos by task
   */
  async getPhotosByTask(taskId: string): Promise<PhotoMetadata[]> {
    // TODO: Query database
    // const photos = await db.photos.find({ taskId });

    // Filter from cache for now
    return Array.from(this.metadataCache.values()).filter(
      (p) => p.taskId === taskId
    );
  }

  /**
   * Get photos by user
   */
  async getPhotosByUser(userId: string, options?: {
    limit?: number;
    offset?: number;
    orderBy?: 'uploadedAt' | 'size' | 'accessCount';
    order?: 'asc' | 'desc';
  }): Promise<PhotoMetadata[]> {
    const photos = Array.from(this.metadataCache.values()).filter(
      (p) => p.userId === userId
    );

    // Sort
    const orderBy = options?.orderBy || 'uploadedAt';
    const order = options?.order || 'desc';

    photos.sort((a, b) => {
      let comparison = 0;
      switch (orderBy) {
        case 'uploadedAt':
          comparison = a.uploadedAt.getTime() - b.uploadedAt.getTime();
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'accessCount':
          comparison = (a.lifecycle?.accessCount || 0) - (b.lifecycle?.accessCount || 0);
          break;
      }
      return order === 'asc' ? comparison : -comparison;
    });

    // Apply pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || 20;
    return photos.slice(offset, offset + limit);
  }

  /**
   * Generate storage URL
   */
  getStorageUrl(photoId: string, type: 'original' | 'thumbnail' = 'original'): string {
    const baseUrl = this.config.cdnDomain ||
      (this.config.endpoint ? `${this.config.endpoint}/${this.config.bucket}` : '');

    return `${baseUrl}/photos/${photoId}/${type}.jpg`;
  }

  /**
   * Generate presigned URL for upload
   */
  async generatePresignedUploadUrl(
    userId: string,
    options?: { expiresIn?: number; contentType?: string }
  ): Promise<{ uploadUrl: string; photoId: string }> {
    const photoId = uuidv4();
    const expiresIn = options?.expiresIn || 3600; // 1 hour default

    // TODO: Generate actual presigned URL using S3/OSS SDK
    // const command = new PutObjectCommand({...});
    // const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });

    const uploadUrl = `${this.config.endpoint}/${this.config.bucket}/photos/${userId}/${photoId}/original.jpg?presigned=true&expires=${Date.now() + expiresIn * 1000}`;

    return { uploadUrl, photoId };
  }

  /**
   * Generate presigned URL for download
   */
  async generatePresignedDownloadUrl(
    photoId: string,
    options?: { expiresIn?: number }
  ): Promise<string> {
    const expiresIn = options?.expiresIn || 3600;

    // TODO: Generate actual presigned URL using S3/OSS SDK
    return `${this.config.endpoint}/${this.config.bucket}/photos/${photoId}/original.jpg?presigned=true&expires=${Date.now() + expiresIn * 1000}`;
  }

  /**
   * Apply lifecycle management
   */
  async applyLifecycle(): Promise<void> {
    const now = new Date();

    for (const metadata of this.metadataCache.values()) {
      if (!metadata.lifecycle) continue;

      const daysSinceUpload = Math.floor(
        (now.getTime() - metadata.uploadedAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Check lifecycle rules
      const rule = this.config.lifecycleRules?.[0];
      if (!rule) continue;

      let newTier: 'hot' | 'warm' | 'cold' = metadata.lifecycle.currentTier;

      if (rule.daysToDelete && daysSinceUpload >= rule.daysToDelete) {
        // Mark for deletion
        await this.deletePhoto(metadata.id);
        continue;
      } else if (rule.daysToCold && daysSinceUpload >= rule.daysToCold) {
        newTier = 'cold';
      } else if (rule.daysToWarm && daysSinceUpload >= rule.daysToWarm) {
        newTier = 'warm';
      }

      if (newTier !== metadata.lifecycle.currentTier) {
        await this.transitionStorageTier(metadata.id, newTier);
        metadata.lifecycle.currentTier = newTier;
      }
    }
  }

  /**
   * Delete photo
   */
  async deletePhoto(photoId: string): Promise<boolean> {
    // TODO: Delete from storage
    // await s3Client.send(new DeleteObjectCommand({...}));

    // Remove from cache
    this.metadataCache.delete(photoId);

    // TODO: Remove from database
    // await db.photos.delete({ id: photoId });

    return true;
  }

  /**
   * Get storage statistics
   */
  getStats(): StorageStats {
    const photos = Array.from(this.metadataCache.values());

    const stats: StorageStats = {
      totalPhotos: photos.length,
      totalSize: photos.reduce((sum, p) => sum + p.size, 0),
      hotStorage: { count: 0, size: 0 },
      warmStorage: { count: 0, size: 0 },
      coldStorage: { count: 0, size: 0 },
    };

    for (const photo of photos) {
      const tier = photo.lifecycle?.currentTier || 'hot';
      stats[`${tier}Storage`].count++;
      stats[`${tier}Storage`].size += photo.size;
    }

    return stats;
  }

  /**
   * Create thumbnail
   */
  async createThumbnail(photoId: string): Promise<string> {
    // TODO: Generate thumbnail using sharp
    // const photo = await this.getMetadata(photoId);
    // if (!photo) throw new Error('Photo not found');
    // const buffer = await this.downloadPhoto(photoId);
    // const thumbnail = await sharp(buffer).resize(200, 200).toBuffer();
    // await this.uploadThumbnail(photoId, thumbnail);

    return `${this.getStorageUrl(photoId, 'thumbnail')}`;
  }

  /**
   * Index photo for search
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async indexPhoto(_metadata: PhotoMetadata): Promise<void> {
    // TODO: Index in Elasticsearch/OpenSearch
    // await searchClient.index({
    //   index: 'photos',
    //   id: metadata.id,
    //   body: {...}
    // });
  }

  /**
   * Transition photo to different storage tier
   */
  private async transitionStorageTier(
    photoId: string,
    tier: 'hot' | 'warm' | 'cold'
  ): Promise<void> {
    // TODO: Implement tier transition
    // hot: S3 Standard
    // warm: S3 Intelligent-Tiering or IA
    // cold: S3 Glacier

    console.log(`Transitioning photo ${photoId} to ${tier} tier`);
  }

  /**
   * Get storage configuration
   */
  getConfig(): StorageConfig {
    return this.config;
  }
}

export default PhotoStorageService.getInstance();
