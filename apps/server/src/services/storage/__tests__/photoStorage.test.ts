import { PhotoStorageService, PhotoMetadata } from '../photoStorage';

jest.mock('../../../db/client', () => ({
  prisma: {
    photo: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockPrismaPhoto = require('../../../db/client').prisma.photo;

describe('PhotoStorageService', () => {
  let service: PhotoStorageService;

  beforeEach(() => {
    service = PhotoStorageService.getInstance();
    // Reset the singleton state
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).metadataCache.clear();
  });

  describe('saveMetadata', () => {
    it('should save photo metadata', async () => {
      const metadata: PhotoMetadata = {
        id: 'test-photo-1',
        originalName: 'test.jpg',
        url: 'https://example.com/test.jpg',
        thumbnailUrl: 'https://example.com/test-thumb.jpg',
        size: 1024,
        width: 1920,
        height: 1080,
        format: 'jpeg',
        mimeType: 'image/jpeg',
        hash: 'abc123',
        uploadedAt: new Date(),
        userId: 'user-1',
      };

      await service.saveMetadata(metadata);
      const retrieved = await service.getMetadata('test-photo-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('test-photo-1');
      expect(retrieved?.lifecycle).toBeDefined();
      expect(retrieved?.lifecycle?.currentTier).toBe('hot');
    });

    it('should initialize lifecycle if not set', async () => {
      const metadata: PhotoMetadata = {
        id: 'test-photo-2',
        originalName: 'test.jpg',
        url: 'https://example.com/test.jpg',
        thumbnailUrl: 'https://example.com/test-thumb.jpg',
        size: 1024,
        width: 1920,
        height: 1080,
        format: 'jpeg',
        mimeType: 'image/jpeg',
        hash: 'abc123',
        uploadedAt: new Date(),
        userId: 'user-1',
      };

      await service.saveMetadata(metadata);
      const retrieved = await service.getMetadata('test-photo-2');

      expect(retrieved?.lifecycle).toBeDefined();
      expect(retrieved?.lifecycle?.accessCount).toBe(1); // incremented by getMetadata call
    });
  });

  describe('getPhotosByTask', () => {
    it('should return photos for a task', async () => {
      const metadata1: PhotoMetadata = {
        id: 'photo-1',
        originalName: 'test1.jpg',
        url: 'https://example.com/test1.jpg',
        thumbnailUrl: 'https://example.com/test1-thumb.jpg',
        size: 1024,
        width: 1920,
        height: 1080,
        format: 'jpeg',
        mimeType: 'image/jpeg',
        hash: 'hash1',
        uploadedAt: new Date(),
        userId: 'user-1',
        taskId: 'task-1',
      };

      const metadata2: PhotoMetadata = {
        id: 'photo-2',
        originalName: 'test2.jpg',
        url: 'https://example.com/test2.jpg',
        thumbnailUrl: 'https://example.com/test2-thumb.jpg',
        size: 2048,
        width: 1920,
        height: 1080,
        format: 'jpeg',
        mimeType: 'image/jpeg',
        hash: 'hash2',
        uploadedAt: new Date(),
        userId: 'user-1',
        taskId: 'task-1',
      };

      await service.saveMetadata(metadata1);
      await service.saveMetadata(metadata2);

      const photos = await service.getPhotosByTask('task-1');

      expect(photos).toHaveLength(2);
      expect(photos.map(p => p.id)).toContain('photo-1');
      expect(photos.map(p => p.id)).toContain('photo-2');
    });

    it('should return empty array for non-existent task', async () => {
      const photos = await service.getPhotosByTask('non-existent-task');
      expect(photos).toHaveLength(0);
    });
  });

  describe('getPhotosByUser', () => {
    it('should return photos for a user', async () => {
      const metadata: PhotoMetadata = {
        id: 'photo-1',
        originalName: 'test.jpg',
        url: 'https://example.com/test.jpg',
        thumbnailUrl: 'https://example.com/test-thumb.jpg',
        size: 1024,
        width: 1920,
        height: 1080,
        format: 'jpeg',
        mimeType: 'image/jpeg',
        hash: 'hash',
        uploadedAt: new Date(),
        userId: 'user-1',
      };

      await service.saveMetadata(metadata);
      const photos = await service.getPhotosByUser('user-1');

      expect(photos).toHaveLength(1);
      expect(photos[0].userId).toBe('user-1');
    });

    it('should apply pagination', async () => {
      for (let i = 0; i < 5; i++) {
        await service.saveMetadata({
          id: `photo-${i}`,
          originalName: `test${i}.jpg`,
          url: `https://example.com/test${i}.jpg`,
          thumbnailUrl: `https://example.com/test${i}-thumb.jpg`,
          size: 1024,
          width: 1920,
          height: 1080,
          format: 'jpeg',
          mimeType: 'image/jpeg',
          hash: `hash-${i}`,
          uploadedAt: new Date(),
          userId: 'user-1',
        });
      }

      const photos = await service.getPhotosByUser('user-1', { limit: 2, offset: 0 });
      expect(photos).toHaveLength(2);
    });
  });

  describe('getStats', () => {
    it('should calculate storage statistics', async () => {
      await service.saveMetadata({
        id: 'photo-1',
        originalName: 'test.jpg',
        url: 'https://example.com/test.jpg',
        thumbnailUrl: 'https://example.com/test-thumb.jpg',
        size: 1000,
        width: 1920,
        height: 1080,
        format: 'jpeg',
        mimeType: 'image/jpeg',
        hash: 'hash',
        uploadedAt: new Date(),
        userId: 'user-1',
      });

      const stats = service.getStats();

      expect(stats.totalPhotos).toBe(1);
      expect(stats.totalSize).toBe(1000);
      expect(stats.hotStorage.count).toBe(1);
    });
  });

  describe('getStorageUrl', () => {
    it('should generate storage URL', () => {
      const url = service.getStorageUrl('photo-1', 'original');
      expect(url).toContain('photo-1');
      expect(url).toContain('original.jpg');
    });

    it('should generate thumbnail URL', () => {
      const url = service.getStorageUrl('photo-1', 'thumbnail');
      expect(url).toContain('thumbnail.jpg');
    });
  });

  describe('DB persistence (mocked)', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should call prisma.photo.upsert when saving metadata', async () => {
      const metadata: PhotoMetadata = {
        id: 'db-test-1',
        originalName: 'test.jpg',
        url: 'https://example.com/test.jpg',
        thumbnailUrl: 'https://example.com/test-thumb.jpg',
        size: 1024,
        width: 1920,
        height: 1080,
        format: 'jpeg',
        mimeType: 'image/jpeg',
        hash: 'abc123',
        uploadedAt: new Date(),
        userId: 'user-1',
      };

      mockPrismaPhoto.upsert.mockResolvedValue(undefined);

      await service.saveMetadata(metadata);

      expect(mockPrismaPhoto.upsert).toHaveBeenCalledTimes(1);
      expect(mockPrismaPhoto.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'db-test-1' },
          create: expect.objectContaining({
            id: 'db-test-1',
            originalName: 'test.jpg',
            userId: 'user-1',
            storageTier: 'hot',
          }),
          update: expect.objectContaining({
            originalName: 'test.jpg',
            storageTier: 'hot',
          }),
        })
      );
    });

    it('should call prisma.photo.upsert with correct tier when lifecycle is set', async () => {
      const metadata: PhotoMetadata = {
        id: 'db-test-2',
        originalName: 'test.jpg',
        url: 'https://example.com/test.jpg',
        thumbnailUrl: 'https://example.com/test-thumb.jpg',
        size: 1024,
        width: 1920,
        height: 1080,
        format: 'jpeg',
        mimeType: 'image/jpeg',
        hash: 'abc123',
        uploadedAt: new Date(),
        userId: 'user-1',
        lifecycle: {
          currentTier: 'warm',
          lastAccessed: new Date(),
          accessCount: 5,
        },
      };

      mockPrismaPhoto.upsert.mockResolvedValue(undefined);

      await service.saveMetadata(metadata);

      const upsertCall = mockPrismaPhoto.upsert.mock.calls[0][0];
      expect(upsertCall.create.storageTier).toBe('warm');
      expect(upsertCall.update.storageTier).toBe('warm');
    });

    it('should call prisma.photo.findUnique when cache miss on getMetadata', async () => {
      mockPrismaPhoto.findUnique.mockResolvedValue({
        id: 'db-photo-1',
        originalName: 'test.jpg',
        url: 'https://example.com/test.jpg',
        thumbnailUrl: 'https://example.com/test-thumb.jpg',
        size: 1024,
        width: 1920,
        height: 1080,
        format: 'jpeg',
        mimeType: 'image/jpeg',
        hash: 'abc123',
        userId: 'user-1',
        taskId: null,
        tags: [],
        description: null,
        latitude: null,
        longitude: null,
        device: null,
        exif: null,
        storageTier: 'hot',
        accessCount: 0,
        lastAccessed: new Date(),
        expiresAt: null,
        createdAt: new Date(),
      });

      const result = await service.getMetadata('db-photo-1');

      expect(mockPrismaPhoto.findUnique).toHaveBeenCalledTimes(1);
      expect(mockPrismaPhoto.findUnique).toHaveBeenCalledWith({ where: { id: 'db-photo-1' } });
      expect(result).toBeDefined();
      expect(result?.id).toBe('db-photo-1');
    });
  });
});
