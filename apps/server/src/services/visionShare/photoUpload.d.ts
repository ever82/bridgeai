export interface UploadProgress {
    total: number;
    uploaded: number;
    currentFile: string;
    percentage: number;
}
export interface UploadResult {
    id: string;
    originalName: string;
    url: string;
    thumbnailUrl: string;
    size: number;
    width: number;
    height: number;
    format: string;
    uploadedAt: Date;
    taskId?: string;
    securityCheck: {
        passed: boolean;
        warnings: string[];
    };
}
export interface UploadOptions {
    taskId?: string;
    userId: string;
    compress?: boolean;
    generateThumbnail?: boolean;
    onProgress?: (progress: UploadProgress) => void;
}
export interface ChunkUploadOptions {
    uploadId: string;
    chunkIndex: number;
    totalChunks: number;
    originalName: string;
    fileSize: number;
}
export declare class PhotoUploadService {
    private static instance;
    private uploads;
    private securityService;
    private constructor();
    static getInstance(): PhotoUploadService;
    /**
     * Upload a single photo
     */
    uploadPhoto(fileBuffer: Buffer, options: UploadOptions): Promise<UploadResult>;
    /**
     * Upload multiple photos in batch
     */
    uploadBatch(files: {
        buffer: Buffer;
        name: string;
    }[], options: UploadOptions): Promise<UploadResult[]>;
    /**
     * Initialize chunked upload
     */
    initChunkedUpload(originalName: string, fileSize: number, totalChunks: number): string;
    /**
     * Upload a chunk
     */
    uploadChunk(uploadId: string, chunkIndex: number, chunkBuffer: Buffer): Promise<{
        complete: boolean;
        received: number;
        total: number;
    }>;
    /**
     * Get upload progress
     */
    getUploadProgress(uploadId: string): {
        received: number;
        total: number;
        percentage: number;
    };
    /**
     * Cancel upload
     */
    cancelUpload(uploadId: string): boolean;
    /**
     * Get upload queue status
     */
    getQueueStatus(): {
        active: number;
        pending: number;
    };
    /**
     * Save to storage using PhotoStorageService for real S3 uploads.
     * Falls back to mock URLs when S3 is not configured.
     */
    private saveToStorage;
}
declare const _default: PhotoUploadService;
export default _default;
//# sourceMappingURL=photoUpload.d.ts.map