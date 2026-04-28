import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

import { prisma } from '../../db/client';

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

/**
 * Photo storage service for managing photo uploads, metadata, and lifecycle.
 *
 * Metadata is persisted to the database via Prisma. An in-memory cache is
 * maintained as a read-through/write-through layer for performance.
 *
 * Presigned URLs are generated via the AWS S3 SDK (@aws-sdk/client-s3 +
 * @aws-sdk/s3-request-presigner). When S3 credentials are not configured the
 * service falls back to mock URLs so that development can proceed without a
 * running MinIO instance.
 */
export class PhotoStorageService {
  private static instance: PhotoStorageService;
  private config: StorageConfig;
  /** Lazily-initialised S3 client (null when credentials are absent) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private s3Client: any | null | undefined;
  /** In-memory read-through cache backed by the database */
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
   * Load storage configuration from environment using S3_* variables.
   */
  private loadConfig(): StorageConfig {
    const provider = 'minio';

    const endpoint = this.buildS3Endpoint();

    return {
      provider,
      region: process.env.S3_REGION || 'us-east-1',
      bucket: process.env.S3_BUCKET_NAME || 'bridgeai',
      accessKeyId: process.env.S3_ACCESS_KEY || '',
      accessKeySecret: process.env.S3_SECRET_KEY || '',
      endpoint,
      cdnDomain: process.env.S3_PUBLIC_URL,
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
   * Build the S3 endpoint URL from S3_ENDPOINT, S3_PORT, and S3_USE_SSL.
   */
  private buildS3Endpoint(): string | undefined {
    const host = process.env.S3_ENDPOINT;
    if (!host) return undefined;
    const port = process.env.S3_PORT;
    const useSsl = process.env.S3_USE_SSL === 'true';
    const protocol = useSsl ? 'https' : 'http';
    return port ? `${protocol}://${host}:${port}` : `${protocol}://${host}`;
  }

  /**
   * Lazily create (and cache) an S3Client instance.
   * Returns null when access credentials are not configured, signalling
   * callers to fall back to mock URLs.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async getS3Client(): Promise<any | null> {
    if (this.s3Client !== undefined) return this.s3Client;

    const accessKeyId = process.env.S3_ACCESS_KEY;
    const secretAccessKey = process.env.S3_SECRET_KEY;

    if (!accessKeyId || !secretAccessKey) {
      console.warn(
        '[PhotoStorageService] S3 credentials not configured (S3_ACCESS_KEY / S3_SECRET_KEY). ' +
          'Falling back to mock presigned URLs.'
      );
      this.s3Client = null;
      return null;
    }

    try {
      const { S3Client } = await import('@aws-sdk/client-s3');
      const endpoint = this.buildS3Endpoint();

      this.s3Client = new S3Client({
        region: process.env.S3_REGION || 'us-east-1',
        endpoint,
        credentials: { accessKeyId, secretAccessKey },
        forcePathStyle: true, // required for MinIO
      });

      return this.s3Client;
    } catch {
      this.s3Client = null;
      return null;
    }
  }

  /**
   * Store photo metadata.
   *
   * Persists metadata to the database and keeps the in-memory cache as a
   * write-through layer. If the DB write fails, the in-memory cache is still
   * updated so the service remains functional.
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

    // Save to in-memory cache
    this.metadataCache.set(metadata.id, metadata);

    // Persist to database
    try {
      await prisma.photo.upsert({
        where: { id: metadata.id },
        create: {
          id: metadata.id,
          originalName: metadata.originalName,
          url: metadata.url,
          thumbnailUrl: metadata.thumbnailUrl,
          size: metadata.size,
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          mimeType: metadata.mimeType,
          hash: metadata.hash,
          userId: metadata.userId,
          taskId: metadata.taskId ?? null,
          tags: metadata.tags ?? [],
          description: metadata.description ?? null,
          latitude: metadata.location?.latitude ?? null,
          longitude: metadata.location?.longitude ?? null,
          device: metadata.deviceInfo ?? undefined,
          exif: metadata.exif ?? undefined,
          storageTier: metadata.lifecycle.currentTier,
          accessCount: metadata.lifecycle.accessCount,
          lastAccessed: metadata.lifecycle.lastAccessed,
          expiresAt: metadata.expiresAt ?? null,
        },
        update: {
          originalName: metadata.originalName,
          url: metadata.url,
          thumbnailUrl: metadata.thumbnailUrl,
          size: metadata.size,
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          mimeType: metadata.mimeType,
          hash: metadata.hash,
          taskId: metadata.taskId ?? null,
          tags: metadata.tags ?? [],
          description: metadata.description ?? null,
          latitude: metadata.location?.latitude ?? null,
          longitude: metadata.location?.longitude ?? null,
          device: metadata.deviceInfo ?? undefined,
          exif: metadata.exif ?? undefined,
          storageTier: metadata.lifecycle.currentTier,
          accessCount: metadata.lifecycle.accessCount,
          lastAccessed: metadata.lifecycle.lastAccessed,
          expiresAt: metadata.expiresAt ?? null,
        },
      });
    } catch (error) {
      console.error('Failed to persist photo metadata to database:', error);
    }

    // Update search index
    await this.indexPhoto(metadata);
  }

  /**
   * Get photo metadata.
   *
   * Checks the in-memory cache first; on miss, reads from the database and
   * populates the cache (read-through pattern).
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

    // Cache miss – read from database
    try {
      const row = await prisma.photo.findUnique({ where: { id: photoId } });
      if (!row) return null;

      const metadata = this.rowToMetadata(row);

      // Populate in-memory cache for future reads
      this.metadataCache.set(photoId, metadata);
      return metadata;
    } catch (error) {
      console.error('Failed to read photo metadata from database:', error);
      return null;
    }
  }

  /**
   * Get photos by task.
   *
   * Queries the database as the primary source; falls back to in-memory
   * cache on DB error.
   */
  async getPhotosByTask(taskId: string): Promise<PhotoMetadata[]> {
    try {
      const rows = await prisma.photo.findMany({ where: { taskId } });
      return rows.map(row => this.rowToMetadata(row));
    } catch (error) {
      console.error('Failed to query photos by task from database:', error);
      return Array.from(this.metadataCache.values()).filter(p => p.taskId === taskId);
    }
  }

  /**
   * Get photos by user.
   *
   * Queries the database with sorting and pagination; falls back to
   * in-memory cache on DB error.
   */
  async getPhotosByUser(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      orderBy?: 'uploadedAt' | 'size' | 'accessCount';
      order?: 'asc' | 'desc';
    }
  ): Promise<PhotoMetadata[]> {
    const orderBy = options?.orderBy || 'uploadedAt';
    const order = options?.order || 'desc';

    try {
      // Map application-level sort keys to Prisma field names
      const orderByField =
        orderBy === 'uploadedAt' ? 'createdAt' : orderBy === 'accessCount' ? 'accessCount' : 'size';

      const rows = await prisma.photo.findMany({
        where: { userId },
        orderBy: { [orderByField]: order },
        skip: options?.offset || 0,
        take: options?.limit || 20,
      });
      return rows.map(row => this.rowToMetadata(row));
    } catch (error) {
      console.error('Failed to query photos by user from database:', error);

      // Fall back to in-memory cache
      const photos = Array.from(this.metadataCache.values()).filter(p => p.userId === userId);

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

      const offset = options?.offset || 0;
      const limit = options?.limit || 20;
      return photos.slice(offset, offset + limit);
    }
  }

  /**
   * Generate storage URL
   */
  getStorageUrl(photoId: string, type: 'original' | 'thumbnail' = 'original'): string {
    const baseUrl =
      this.config.cdnDomain ||
      (this.config.endpoint ? `${this.config.endpoint}/${this.config.bucket}` : '');

    return `${baseUrl}/photos/${photoId}/${type}.jpg`;
  }

  /**
   * Generate a presigned URL for uploading a photo.
   *
   * Uses the AWS S3 SDK to create a real presigned PUT URL when S3
   * credentials are available. Falls back to a mock URL otherwise.
   */
  async generatePresignedUploadUrl(
    userId: string,
    options?: { expiresIn?: number; contentType?: string }
  ): Promise<{ uploadUrl: string; photoId: string }> {
    const photoId = uuidv4();
    const expiresIn = options?.expiresIn || 3600; // 1 hour default
    const key = `photos/${userId}/${photoId}/original.jpg`;

    const client = await this.getS3Client();

    if (client) {
      try {
        const { PutObjectCommand } = await import('@aws-sdk/client-s3');
        const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
        const command = new PutObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
          ContentType: options?.contentType,
        });
        const uploadUrl = await getSignedUrl(client, command, { expiresIn });
        return { uploadUrl, photoId };
      } catch (error) {
        console.error('[PhotoStorageService] Failed to generate presigned upload URL:', error);
        // Fall through to mock URL
      }
    }

    // Fallback: mock URL when S3 is not configured or signing failed
    const uploadUrl = `${this.config.endpoint}/${this.config.bucket}/${key}?presigned=true&expires=${Date.now() + expiresIn * 1000}`;
    return { uploadUrl, photoId };
  }

  /**
   * Generate a presigned URL for downloading a photo.
   *
   * Uses the AWS S3 SDK to create a real presigned GET URL when S3
   * credentials are available. Falls back to a mock URL otherwise.
   */
  async generatePresignedDownloadUrl(
    photoId: string,
    options?: { expiresIn?: number }
  ): Promise<string> {
    const expiresIn = options?.expiresIn || 3600;
    const key = `photos/${photoId}/original.jpg`;

    const client = await this.getS3Client();

    if (client) {
      try {
        const { GetObjectCommand } = await import('@aws-sdk/client-s3');
        const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
        const command = new GetObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
        });
        return await getSignedUrl(client, command, { expiresIn });
      } catch (error) {
        console.error('[PhotoStorageService] Failed to generate presigned download URL:', error);
        // Fall through to mock URL
      }
    }

    // Fallback: mock URL when S3 is not configured or signing failed
    return `${this.config.endpoint}/${this.config.bucket}/${key}?presigned=true&expires=${Date.now() + expiresIn * 1000}`;
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
   * Delete photo.
   *
   * Removes metadata from both the database and the in-memory cache.
   * Actual cloud storage deletion is still a placeholder.
   */
  /**
   * @limitation Cloud storage (S3) deletion is not yet implemented.
   *              Only database and in-memory cache entries are removed.
   */
  async deletePhoto(photoId: string): Promise<boolean> {
    // Cloud storage deletion not yet implemented
    // await s3Client.send(new DeleteObjectCommand({...}));

    // Remove from cache
    this.metadataCache.delete(photoId);

    // Remove from database
    try {
      await prisma.photo.deleteMany({ where: { id: photoId } });
    } catch (error) {
      console.error('Failed to delete photo from database:', error);
    }

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
   * Create thumbnail.
   * If imageBuffer is provided, generates a real 200x200 JPEG thumbnail using sharp.
   * Otherwise returns the thumbnail storage URL (placeholder until cloud download is implemented).
   */
  /**
   * @limitation Thumbnail cloud upload is not yet implemented.
   *              The thumbnail buffer is generated but not persisted to cloud storage.
   */
  async createThumbnail(photoId: string, imageBuffer?: Buffer): Promise<string> {
    if (imageBuffer) {
      const thumbnailBuffer = await sharp(imageBuffer)
        .resize(200, 200, { fit: 'cover', position: 'center' })
        .jpeg({ quality: 80 })
        .toBuffer();

      // Thumbnail cloud upload not yet implemented
      // await this.uploadThumbnail(photoId, thumbnailBuffer);
      void thumbnailBuffer;
    }

    return this.getStorageUrl(photoId, 'thumbnail');
  }

  /**
   * Index photo for search
   */
  /**
   * @limitation Elasticsearch/OpenSearch indexing is not yet implemented.
   *              Photo metadata is not indexed for search.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async indexPhoto(_metadata: PhotoMetadata): Promise<void> {
    // Elasticsearch/OpenSearch indexing not yet implemented
    // await searchClient.index({
    //   index: 'photos',
    //   id: metadata.id,
    //   body: {...}
    // });
  }

  /**
   * Convert a Prisma Photo row to a PhotoMetadata object.
   */
  private rowToMetadata(row: {
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
    userId: string;
    taskId: string | null;
    tags: string[];
    description: string | null;
    latitude: number | null;
    longitude: number | null;
    device: any;
    exif: any;
    storageTier: string;
    accessCount: number;
    lastAccessed: Date;
    expiresAt: Date | null;
    createdAt: Date;
  }): PhotoMetadata {
    return {
      id: row.id,
      originalName: row.originalName,
      url: row.url,
      thumbnailUrl: row.thumbnailUrl,
      size: row.size,
      width: row.width,
      height: row.height,
      format: row.format,
      mimeType: row.mimeType,
      hash: row.hash,
      uploadedAt: row.createdAt,
      expiresAt: row.expiresAt ?? undefined,
      userId: row.userId,
      taskId: row.taskId ?? undefined,
      tags: row.tags,
      description: row.description ?? undefined,
      location:
        row.latitude != null && row.longitude != null
          ? { latitude: row.latitude, longitude: row.longitude }
          : undefined,
      deviceInfo: row.device ?? undefined,
      exif: row.exif ?? undefined,
      lifecycle: {
        currentTier: (row.storageTier as 'hot' | 'warm' | 'cold') || 'hot',
        lastAccessed: row.lastAccessed,
        accessCount: row.accessCount,
      },
    };
  }

  /**
   * Transition photo to different storage tier
   */
  /**
   * @limitation Storage tier transitions are not yet implemented.
   *              Lifecycle tier transitions (hot/warm/cold) require S3 lifecycle policies.
   */
  private async transitionStorageTier(
    photoId: string,
    tier: 'hot' | 'warm' | 'cold'
  ): Promise<void> {
    // Tier transition not yet implemented
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
