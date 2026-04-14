import axios, { AxiosProgressEvent } from 'axios';
import * as FileSystem from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export interface UploadOptions {
  taskId?: string;
  compress?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  onProgress?: (progress: UploadProgress) => void;
  onChunkProgress?: (chunkProgress: ChunkProgress) => void;
}

export interface UploadProgress {
  total: number;
  uploaded: number;
  currentFile: string;
  percentage: number;
  bytesSent: number;
  bytesTotal: number;
}

export interface ChunkProgress {
  uploadId: string;
  chunkIndex: number;
  totalChunks: number;
  percentage: number;
}

export interface UploadResult {
  id: string;
  url: string;
  thumbnailUrl: string;
  size: number;
  width: number;
  height: number;
}

export interface SecurityCheckResult {
  passed: boolean;
  violations: string[];
  warnings: string[];
}

export interface UploadQueueItem {
  id: string;
  uri: string;
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'failed';
  progress: number;
  retryCount: number;
  options: UploadOptions;
}

class PhotoUploader {
  private queue: UploadQueueItem[] = [];
  private activeUploads: Map<string, AbortController> = new Map();
  private chunkSize = 1024 * 1024; // 1MB chunks
  private maxRetries = 3;
  private apiBaseUrl: string;

  constructor() {
    this.apiBaseUrl = process.env.API_BASE_URL || 'https://api.example.com';
  }

  /**
   * Check image security before upload
   */
  async checkSecurity(uri: string): Promise<SecurityCheckResult> {
    try {
      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        return {
          passed: false,
          violations: ['File not found'],
          warnings: [],
        };
      }

      const sizeInMB = fileInfo.size / (1024 * 1024);
      const violations: string[] = [];
      const warnings: string[] = [];

      // Check file size
      if (sizeInMB > 50) {
        violations.push('File size exceeds 50MB limit');
      } else if (sizeInMB > 20) {
        warnings.push('Large file may take longer to upload');
      }

      // Check file extension
      const extension = uri.split('.').pop()?.toLowerCase();
      const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
      if (!extension || !allowedExtensions.includes(extension)) {
        violations.push(`Unsupported file type: ${extension}`);
      }

      // TODO: Integrate with server-side security check
      // const result = await axios.post(`${this.apiBaseUrl}/photos/security-check`, { uri });

      return {
        passed: violations.length === 0,
        violations,
        warnings,
      };
    } catch (error) {
      console.error('Security check failed:', error);
      return {
        passed: false,
        violations: ['Security check failed'],
        warnings: [],
      };
    }
  }

  /**
   * Compress image before upload
   */
  async compressImage(
    uri: string,
    options: { maxWidth?: number; maxHeight?: number; quality?: number } = {}
  ): Promise<string> {
    const { maxWidth = 1920, maxHeight = 1920, quality = 0.85 } = options;

    try {
      // Get original image dimensions
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: maxWidth, height: maxHeight } }],
        { compress: quality, format: SaveFormat.JPEG }
      );

      return manipulated.uri;
    } catch (error) {
      console.error('Image compression failed:', error);
      return uri; // Return original if compression fails
    }
  }

  /**
   * Upload a single photo
   */
  async uploadPhoto(uri: string, options: UploadOptions = {}): Promise<UploadResult> {
    // Security check
    const securityResult = await this.checkSecurity(uri);
    if (!securityResult.passed) {
      throw new Error(`Security check failed: ${securityResult.violations.join(', ')}`);
    }

    // Compress if needed
    let uploadUri = uri;
    if (options.compress !== false) {
      uploadUri = await this.compressImage(uri, {
        maxWidth: options.maxWidth,
        maxHeight: options.maxHeight,
        quality: options.quality,
      });
    }

    // Get file info
    const fileInfo = await FileSystem.getInfoAsync(uploadUri);
    if (!fileInfo.exists) {
      throw new Error('File not found');
    }

    const fileSize = fileInfo.size;

    // Use chunked upload for large files
    if (fileSize > 5 * 1024 * 1024) {
      // 5MB
      return await this.uploadChunked(uploadUri, fileSize, options);
    }

    return await this.uploadSingle(uploadUri, options);
  }

  /**
   * Upload single file (non-chunked)
   */
  private async uploadSingle(uri: string, options: UploadOptions): Promise<UploadResult> {
    const abortController = new AbortController();
    const uploadId = `upload-${Date.now()}`;
    this.activeUploads.set(uploadId, abortController);

    try {
      // Create form data
      const formData = new FormData();
      formData.append('photo', {
        uri,
        name: 'photo.jpg',
        type: 'image/jpeg',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      if (options.taskId) {
        formData.append('taskId', options.taskId);
      }

      // Upload
      const response = await axios.post(`${this.apiBaseUrl}/photos/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        signal: abortController.signal,
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          if (options.onProgress && progressEvent.total) {
            options.onProgress({
              total: 1,
              uploaded: 0,
              currentFile: uri,
              percentage: Math.round((progressEvent.loaded / progressEvent.total) * 100),
              bytesSent: progressEvent.loaded,
              bytesTotal: progressEvent.total,
            });
          }
        },
      });

      return response.data;
    } finally {
      this.activeUploads.delete(uploadId);
    }
  }

  /**
   * Upload using chunked approach for large files
   */
  private async uploadChunked(
    uri: string,
    fileSize: number,
    options: UploadOptions
  ): Promise<UploadResult> {
    const uploadId = `chunked-${Date.now()}`;
    const totalChunks = Math.ceil(fileSize / this.chunkSize);

    // Initialize upload
    const initResponse = await axios.post(`${this.apiBaseUrl}/photos/upload/init`, {
      uploadId,
      originalName: 'photo.jpg',
      fileSize,
      totalChunks,
    });

    const serverUploadId = initResponse.data.uploadId;

    // Upload chunks
    for (let i = 0; i < totalChunks; i++) {
      const start = i * this.chunkSize;
      const end = Math.min(start + this.chunkSize, fileSize);

      // Read chunk
      const chunk = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
        position: start,
        length: end - start,
      });

      // Upload chunk with retry
      let retries = 0;
      while (retries < this.maxRetries) {
        try {
          await axios.post(`${this.apiBaseUrl}/photos/upload/chunk`, {
            uploadId: serverUploadId,
            chunkIndex: i,
            data: chunk,
          });

          if (options.onChunkProgress) {
            options.onChunkProgress({
              uploadId: serverUploadId,
              chunkIndex: i,
              totalChunks,
              percentage: Math.round(((i + 1) / totalChunks) * 100),
            });
          }

          break;
        } catch (error) {
          retries++;
          if (retries >= this.maxRetries) {
            throw new Error(`Failed to upload chunk ${i} after ${this.maxRetries} retries`);
          }
          await this.delay(1000 * retries); // Exponential backoff
        }
      }
    }

    // Complete upload
    const completeResponse = await axios.post(`${this.apiBaseUrl}/photos/upload/complete`, {
      uploadId: serverUploadId,
    });

    return completeResponse.data;
  }

  /**
   * Upload multiple photos in batch
   */
  async uploadBatch(uris: string[], options: UploadOptions = {}): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    const total = uris.length;

    for (let i = 0; i < uris.length; i++) {
      try {
        const result = await this.uploadPhoto(uris[i], {
          ...options,
          onProgress: (progress) => {
            if (options.onProgress) {
              options.onProgress({
                ...progress,
                total,
                uploaded: i,
              });
            }
          },
        });
        results.push(result);
      } catch (error) {
        console.error(`Failed to upload ${uris[i]}:`, error);
        // Continue with other uploads
      }
    }

    return results;
  }

  /**
   * Add photos to upload queue
   */
  queueUploads(uris: string[], options: UploadOptions = {}): string[] {
    const ids: string[] = [];

    for (const uri of uris) {
      const id = `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.queue.push({
        id,
        uri,
        status: 'pending',
        progress: 0,
        retryCount: 0,
        options,
      });
      ids.push(id);
    }

    return ids;
  }

  /**
   * Process upload queue
   */
  async processQueue(
    options?: {
      concurrent?: number;
      onItemComplete?: (id: string, result: UploadResult | null) => void;
      onItemError?: (id: string, error: Error) => void;
    }
  ): Promise<void> {
    const concurrent = options?.concurrent || 3;

    while (this.queue.some((item) => item.status === 'pending')) {
      const pendingItems = this.queue.filter((item) => item.status === 'pending');
      const batch = pendingItems.slice(0, concurrent);

      await Promise.all(
        batch.map(async (item) => {
          item.status = 'uploading';

          try {
            const result = await this.uploadPhoto(item.uri, item.options);
            item.status = 'completed';
            item.progress = 100;

            if (options?.onItemComplete) {
              options.onItemComplete(item.id, result);
            }
          } catch (error) {
            item.status = 'failed';
            item.retryCount++;

            if (options?.onItemError) {
              options.onItemError(item.id, error as Error);
            }

            // Retry if under max retries
            if (item.retryCount < this.maxRetries) {
              item.status = 'pending';
            }
          }
        })
      );
    }
  }

  /**
   * Pause upload
   */
  pauseUpload(uploadId: string): boolean {
    const controller = this.activeUploads.get(uploadId);
    if (controller) {
      controller.abort();
      this.activeUploads.delete(uploadId);
      return true;
    }
    return false;
  }

  /**
   * Cancel upload
   */
  cancelUpload(uploadId: string): boolean {
    const controller = this.activeUploads.get(uploadId);
    if (controller) {
      controller.abort();
      this.activeUploads.delete(uploadId);
    }

    // Remove from queue if pending
    const queueIndex = this.queue.findIndex((item) => item.id === uploadId);
    if (queueIndex >= 0) {
      this.queue.splice(queueIndex, 1);
      return true;
    }

    return false;
  }

  /**
   * Get upload queue status
   */
  getQueueStatus(): {
    pending: number;
    uploading: number;
    completed: number;
    failed: number;
    total: number;
  } {
    const status = {
      pending: 0,
      uploading: 0,
      completed: 0,
      failed: 0,
      total: this.queue.length,
    };

    for (const item of this.queue) {
      status[item.status]++;
    }

    return status;
  }

  /**
   * Get upload progress
   */
  getProgress(uploadId: string): UploadQueueItem | undefined {
    return this.queue.find((item) => item.id === uploadId);
  }

  /**
   * Clear completed uploads from queue
   */
  clearCompleted(): void {
    this.queue = this.queue.filter((item) => item.status !== 'completed');
  }

  /**
   * Retry failed uploads
   */
  retryFailed(): string[] {
    const failedItems = this.queue.filter((item) => item.status === 'failed');
    const ids: string[] = [];

    for (const item of failedItems) {
      if (item.retryCount < this.maxRetries) {
        item.status = 'pending';
        item.retryCount = 0;
        ids.push(item.id);
      }
    }

    return ids;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const photoUploader = new PhotoUploader();
export default photoUploader;
