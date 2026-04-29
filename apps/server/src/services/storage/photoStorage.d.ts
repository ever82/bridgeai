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
    hotStorage: {
        count: number;
        size: number;
    };
    warmStorage: {
        count: number;
        size: number;
    };
    coldStorage: {
        count: number;
        size: number;
    };
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
export declare class PhotoStorageService {
    private static instance;
    private config;
    /** Lazily-initialised S3 client (null when credentials are absent) */
    private s3Client;
    /** In-memory read-through cache backed by the database */
    private metadataCache;
    private constructor();
    static getInstance(): PhotoStorageService;
    /**
     * Load storage configuration from environment using S3_* variables.
     */
    private loadConfig;
    /**
     * Build the S3 endpoint URL from S3_ENDPOINT, S3_PORT, and S3_USE_SSL.
     */
    private buildS3Endpoint;
    /**
     * Lazily create (and cache) an S3Client instance.
     * Returns null when access credentials are not configured, signalling
     * callers to fall back to mock URLs.
     */
    private getS3Client;
    /**
     * Store photo metadata.
     *
     * Persists metadata to the database and keeps the in-memory cache as a
     * write-through layer. If the DB write fails, the in-memory cache is still
     * updated so the service remains functional.
     */
    saveMetadata(metadata: PhotoMetadata): Promise<void>;
    /**
     * Get photo metadata.
     *
     * Checks the in-memory cache first; on miss, reads from the database and
     * populates the cache (read-through pattern).
     */
    getMetadata(photoId: string): Promise<PhotoMetadata | null>;
    /**
     * Get photos by task.
     *
     * Queries the database as the primary source; falls back to in-memory
     * cache on DB error.
     */
    getPhotosByTask(taskId: string): Promise<PhotoMetadata[]>;
    /**
     * Get photos by user.
     *
     * Queries the database with sorting and pagination; falls back to
     * in-memory cache on DB error.
     */
    getPhotosByUser(userId: string, options?: {
        limit?: number;
        offset?: number;
        orderBy?: 'uploadedAt' | 'size' | 'accessCount';
        order?: 'asc' | 'desc';
    }): Promise<PhotoMetadata[]>;
    /**
     * Generate storage URL
     */
    getStorageUrl(photoId: string, type?: 'original' | 'thumbnail'): string;
    /**
     * Generate a presigned URL for uploading a photo.
     *
     * Uses the AWS S3 SDK to create a real presigned PUT URL when S3
     * credentials are available. Falls back to a mock URL otherwise.
     */
    generatePresignedUploadUrl(userId: string, options?: {
        expiresIn?: number;
        contentType?: string;
    }): Promise<{
        uploadUrl: string;
        photoId: string;
    }>;
    /**
     * Generate a presigned URL for downloading a photo.
     *
     * Uses the AWS S3 SDK to create a real presigned GET URL when S3
     * credentials are available. Falls back to a mock URL otherwise.
     */
    generatePresignedDownloadUrl(photoId: string, options?: {
        expiresIn?: number;
    }): Promise<string>;
    /**
     * Apply lifecycle management
     */
    applyLifecycle(): Promise<void>;
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
    deletePhoto(photoId: string): Promise<boolean>;
    /**
     * Get storage statistics
     */
    getStats(): StorageStats;
    /**
     * Create thumbnail.
     * If imageBuffer is provided, generates a real 200x200 JPEG thumbnail using sharp.
     * Otherwise returns the thumbnail storage URL (placeholder until cloud download is implemented).
     */
    /**
     * @limitation Thumbnail cloud upload is not yet implemented.
     *              The thumbnail buffer is generated but not persisted to cloud storage.
     */
    createThumbnail(photoId: string, imageBuffer?: Buffer): Promise<string>;
    /**
     * Index photo for search
     */
    /**
     * @limitation Elasticsearch/OpenSearch indexing is not yet implemented.
     *              Photo metadata is not indexed for search.
     */
    private indexPhoto;
    /**
     * Convert a Prisma Photo row to a PhotoMetadata object.
     */
    private rowToMetadata;
    /**
     * Transition photo to different storage tier
     */
    /**
     * @limitation Storage tier transitions are not yet implemented.
     *              Lifecycle tier transitions (hot/warm/cold) require S3 lifecycle policies.
     */
    private transitionStorageTier;
    /**
     * Get storage configuration
     */
    getConfig(): StorageConfig;
}
declare const _default: PhotoStorageService;
export default _default;
//# sourceMappingURL=photoStorage.d.ts.map