import { PhotoUploadService, UploadOptions } from '../photoUpload';
import { ImageSecurityService } from '../../security/imageSecurity';

jest.mock('../../security/imageSecurity', () => ({
  ImageSecurityService: {
    getInstance: jest.fn().mockReturnValue({
      checkImage: jest.fn(),
      compressImage: jest.fn(),
      createThumbnail: jest.fn(),
    }),
  },
}));

describe('PhotoUploadService', () => {
  let service: PhotoUploadService;
  let mockSecurityService: ReturnType<typeof ImageSecurityService.getInstance>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton to ensure clean state
    (PhotoUploadService as any).instance = undefined;

    mockSecurityService = (ImageSecurityService.getInstance as jest.Mock)();

    (mockSecurityService.checkImage as jest.Mock).mockResolvedValue({
      passed: true,
      violations: [],
      warnings: [],
      metadata: {
        width: 1920,
        height: 1080,
        format: 'jpeg',
        size: 1024,
        hasTransparency: false,
      },
      faces: { detected: false, count: 0, blurred: false },
      quality: { score: 90, blurDetected: false, overexposed: false, underexposed: false },
    });

    (mockSecurityService.compressImage as jest.Mock).mockResolvedValue(Buffer.from('compressed'));
    (mockSecurityService.createThumbnail as jest.Mock).mockResolvedValue(Buffer.from('thumbnail'));

    service = PhotoUploadService.getInstance();
  });

  describe('uploadPhoto', () => {
    it('should upload a photo successfully', async () => {
      const buffer = Buffer.from('test-image');
      const options: UploadOptions = {
        userId: 'user-1',
        taskId: 'task-1',
      };

      const result = await service.uploadPhoto(buffer, options);

      expect(result).toBeDefined();
      expect(result.originalName).toBe('photo.jpg');
      expect(result.size).toBeGreaterThan(0);
      expect(result.securityCheck.passed).toBe(true);
      expect(result.taskId).toBe('task-1');
    });

    it('should fail if security check fails', async () => {
      (mockSecurityService.checkImage as jest.Mock).mockResolvedValue({
        passed: false,
        violations: ['File too large'],
        warnings: [],
        metadata: { width: 0, height: 0, format: '', size: 0, hasTransparency: false },
        faces: { detected: false, count: 0, blurred: false },
        quality: { score: 0, blurDetected: true, overexposed: false, underexposed: false },
      });

      const buffer = Buffer.from('test-image');
      const options: UploadOptions = { userId: 'user-1' };

      await expect(service.uploadPhoto(buffer, options)).rejects.toThrow('Security check failed');
    });

    it('should compress image when requested', async () => {
      const buffer = Buffer.from('test-image');
      const options: UploadOptions = {
        userId: 'user-1',
        compress: true,
      };

      await service.uploadPhoto(buffer, options);

      expect(mockSecurityService.compressImage).toHaveBeenCalledWith(buffer);
    });

    it('should generate thumbnail when requested', async () => {
      const buffer = Buffer.from('test-image');
      const options: UploadOptions = {
        userId: 'user-1',
        generateThumbnail: true,
      };

      const result = await service.uploadPhoto(buffer, options);

      expect(mockSecurityService.createThumbnail).toHaveBeenCalled();
      expect(result.thumbnailUrl).toBeDefined();
    });
  });

  describe('uploadBatch', () => {
    it('should upload multiple photos', async () => {
      const files = [
        { buffer: Buffer.from('image1'), name: 'photo1.jpg' },
        { buffer: Buffer.from('image2'), name: 'photo2.jpg' },
      ];
      const options: UploadOptions = { userId: 'user-1' };

      const results = await service.uploadBatch(files, options);

      expect(results).toHaveLength(2);
    });

    it('should report progress', async () => {
      const files = [
        { buffer: Buffer.from('image1'), name: 'photo1.jpg' },
        { buffer: Buffer.from('image2'), name: 'photo2.jpg' },
      ];
      const onProgress = jest.fn();
      const options: UploadOptions = { userId: 'user-1', onProgress };

      await service.uploadBatch(files, options);

      expect(onProgress).toHaveBeenCalled();
    });
  });

  describe('chunked upload', () => {
    it('should initialize chunked upload', () => {
      const uploadId = service.initChunkedUpload('test.jpg', 10000, 10);

      expect(uploadId).toBeDefined();
      expect(typeof uploadId).toBe('string');
    });

    it('should upload chunks', async () => {
      const uploadId = service.initChunkedUpload('test.jpg', 12, 2);

      const result1 = await service.uploadChunk(uploadId, 0, Buffer.from('chunk1'));
      expect(result1.complete).toBe(false);
      expect(result1.received).toBe(1);

      const result2 = await service.uploadChunk(uploadId, 1, Buffer.from('chunk2'));
      expect(result2.complete).toBe(true);
      expect(result2.received).toBe(2);
    });

    it('should throw error for invalid upload session', async () => {
      await expect(service.uploadChunk('invalid-id', 0, Buffer.from('chunk'))).rejects.toThrow(
        'Upload session not found'
      );
    });

    it('should get upload progress', async () => {
      const uploadId = service.initChunkedUpload('test.jpg', 100, 4);
      await service.uploadChunk(uploadId, 0, Buffer.from('chunk'));

      const progress = service.getUploadProgress(uploadId);

      expect(progress.received).toBe(1);
      expect(progress.total).toBe(4);
      expect(progress.percentage).toBe(25);
    });

    it('should cancel upload', () => {
      const uploadId = service.initChunkedUpload('test.jpg', 12, 2);
      const cancelled = service.cancelUpload(uploadId);

      expect(cancelled).toBe(true);
    });
  });

  describe('getQueueStatus', () => {
    it('should return queue status', () => {
      const status = service.getQueueStatus();

      expect(status.active).toBe(0);
      expect(status.pending).toBe(0);
    });
  });
});
