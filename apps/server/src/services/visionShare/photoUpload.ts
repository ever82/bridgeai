import { v4 as uuidv4 } from 'uuid';

import { ImageSecurityService } from '../security/imageSecurity';

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

export class PhotoUploadService {
  private static instance: PhotoUploadService;
  private uploads: Map<string, UploadSession> = new Map();
  private securityService: ImageSecurityService;

  private constructor() {
    this.securityService = ImageSecurityService.getInstance();
  }

  static getInstance(): PhotoUploadService {
    if (!PhotoUploadService.instance) {
      PhotoUploadService.instance = new PhotoUploadService();
    }
    return PhotoUploadService.instance;
  }

  /**
   * Upload a single photo
   */
  async uploadPhoto(
    fileBuffer: Buffer,
    options: UploadOptions
  ): Promise<UploadResult> {
    const { taskId, userId, compress = true, generateThumbnail = true } = options;

    // Security check
    const securityResult = await this.securityService.checkImage(fileBuffer);
    if (!securityResult.passed) {
      throw new Error(`Security check failed: ${securityResult.violations.join(', ')}`);
    }

    // Compress if needed
    let processedBuffer = fileBuffer;
    if (compress) {
      processedBuffer = await this.securityService.compressImage(fileBuffer);
    }

    // Generate thumbnail
    let thumbnailBuffer: Buffer | undefined;
    if (generateThumbnail) {
      thumbnailBuffer = await this.securityService.createThumbnail(fileBuffer, {
        width: 200,
        height: 200,
      });
    }

    // Upload to storage
    const uploadId = uuidv4();
    const result = await this.saveToStorage(processedBuffer, thumbnailBuffer, {
      uploadId,
      userId,
      taskId,
      metadata: securityResult.metadata,
    });

    return {
      id: uploadId,
      originalName: 'photo.jpg',
      url: result.url,
      thumbnailUrl: result.thumbnailUrl,
      size: processedBuffer.length,
      width: securityResult.metadata.width,
      height: securityResult.metadata.height,
      format: securityResult.metadata.format,
      uploadedAt: new Date(),
      taskId,
      securityCheck: {
        passed: true,
        warnings: securityResult.warnings,
      },
    };
  }

  /**
   * Upload multiple photos in batch
   */
  async uploadBatch(
    files: { buffer: Buffer; name: string }[],
    options: UploadOptions
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    const total = files.length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Report progress
      if (options.onProgress) {
        options.onProgress({
          total,
          uploaded: i,
          currentFile: file.name,
          percentage: Math.round((i / total) * 100),
        });
      }

      try {
        const result = await this.uploadPhoto(file.buffer, {
          ...options,
          onProgress: undefined, // Don't report individual file progress
        });
        results.push(result);
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        // Continue with other files
      }
    }

    // Final progress update
    if (options.onProgress) {
      options.onProgress({
        total,
        uploaded: total,
        currentFile: '',
        percentage: 100,
      });
    }

    return results;
  }

  /**
   * Initialize chunked upload
   */
  initChunkedUpload(originalName: string, fileSize: number, totalChunks: number): string {
    const uploadId = uuidv4();
    const session: UploadSession = {
      id: uploadId,
      originalName,
      fileSize,
      totalChunks,
      receivedChunks: new Set(),
      chunks: [],
      createdAt: new Date(),
    };
    this.uploads.set(uploadId, session);
    return uploadId;
  }

  /**
   * Upload a chunk
   */
  async uploadChunk(
    uploadId: string,
    chunkIndex: number,
    chunkBuffer: Buffer
  ): Promise<{ complete: boolean; received: number; total: number }> {
    const session = this.uploads.get(uploadId);
    if (!session) {
      throw new Error('Upload session not found');
    }

    session.chunks[chunkIndex] = chunkBuffer;
    session.receivedChunks.add(chunkIndex);

    const isComplete = session.receivedChunks.size === session.totalChunks;

    if (isComplete) {
      // Combine chunks
      const combined = Buffer.concat(session.chunks);

      // Validate combined file size
      if (combined.length !== session.fileSize) {
        throw new Error('File size mismatch after combining chunks');
      }

      // Clean up session
      this.uploads.delete(uploadId);
    }

    return {
      complete: isComplete,
      received: session.receivedChunks.size,
      total: session.totalChunks,
    };
  }

  /**
   * Get upload progress
   */
  getUploadProgress(uploadId: string): { received: number; total: number; percentage: number } {
    const session = this.uploads.get(uploadId);
    if (!session) {
      throw new Error('Upload session not found');
    }

    return {
      received: session.receivedChunks.size,
      total: session.totalChunks,
      percentage: Math.round((session.receivedChunks.size / session.totalChunks) * 100),
    };
  }

  /**
   * Cancel upload
   */
  cancelUpload(uploadId: string): boolean {
    return this.uploads.delete(uploadId);
  }

  /**
   * Get upload queue status
   */
  getQueueStatus(): { active: number; pending: number } {
    return {
      active: this.uploads.size,
      pending: 0, // Would track actual queue if implemented
    };
  }

  /**
   * Save to storage (placeholder - would integrate with S3/OSS)
   */
  private async saveToStorage(
    fileBuffer: Buffer,
    thumbnailBuffer: Buffer | undefined,
    metadata: {
      uploadId: string;
      userId: string;
      taskId?: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      metadata: any;
    }
  ): Promise<{ url: string; thumbnailUrl: string }> {
    // This is a placeholder implementation
    // In production, this would upload to S3/OSS/MinIO

    // Simulate upload delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Generate mock URLs
    const baseUrl = process.env.STORAGE_BASE_URL || 'https://storage.example.com';
    const url = `${baseUrl}/photos/${metadata.userId}/${metadata.uploadId}/original.jpg`;
    const thumbnailUrl = thumbnailBuffer
      ? `${baseUrl}/photos/${metadata.userId}/${metadata.uploadId}/thumbnail.jpg`
      : url;

    // TODO: Implement actual S3/OSS upload
    // const s3Client = new S3Client({...});
    // await s3Client.send(new PutObjectCommand({...}));

    return { url, thumbnailUrl };
  }
}

interface UploadSession {
  id: string;
  originalName: string;
  fileSize: number;
  totalChunks: number;
  receivedChunks: Set<number>;
  chunks: Buffer[];
  createdAt: Date;
}

export default PhotoUploadService.getInstance();
