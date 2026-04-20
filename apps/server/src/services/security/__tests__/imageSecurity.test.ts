import sharp from 'sharp';

import { ImageSecurityService } from '../imageSecurity';

// Mock sharp - returns a fresh mock instance each time so chained calls work independently
jest.mock('sharp', () => {
  const mockSharp = jest.fn(() => {
    const instance = {
      metadata: jest.fn().mockResolvedValue({
        width: 1920,
        height: 1080,
        format: 'jpeg',
        hasAlpha: false,
      }),
      stats: jest.fn().mockResolvedValue({
        channels: [
          { mean: 128, std: 50, min: 0, max: 255, entropy: 7 },
          { mean: 128, std: 50, min: 0, max: 255, entropy: 7 },
          { mean: 128, std: 50, min: 0, max: 255, entropy: 7 },
        ],
      }),
      resize: jest.fn().mockReturnThis(),
      jpeg: jest.fn().mockReturnThis(),
      toBuffer: jest.fn().mockResolvedValue(Buffer.from('test')),
    };
    return instance;
  });
  return mockSharp;
});

describe('ImageSecurityService', () => {
  let service: ImageSecurityService;

  beforeEach(() => {
    service = ImageSecurityService.getInstance();
  });

  describe('checkImage', () => {
    it('should pass valid images', async () => {
      const buffer = Buffer.from('test-image-data');
      const result = await service.checkImage(buffer);

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.metadata.width).toBe(1920);
      expect(result.metadata.height).toBe(1080);
      expect(result.metadata.format).toBe('jpeg');
    });

    it('should fail images exceeding size limit', async () => {
      const largeBuffer = Buffer.alloc(100 * 1024 * 1024); // 100MB
      const result = await service.checkImage(largeBuffer, {
        maxFileSize: 50 * 1024 * 1024,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('File size exceeds 50MB limit');
    });

    it('should fail unsupported formats', async () => {
      const buffer = Buffer.from('test');
      (sharp as jest.Mock).mockImplementationOnce(() => ({
        metadata: jest.fn().mockResolvedValue({ format: 'gif' }),
      }));

      const result = await service.checkImage(buffer, {
        allowedFormats: ['jpeg', 'png'],
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('Unsupported image format: gif');
    });

    it('should fail images that are too small', async () => {
      const buffer = Buffer.from('test');
      (sharp as jest.Mock).mockImplementationOnce(() => ({
        metadata: jest.fn().mockResolvedValue({
          width: 50,
          height: 50,
          format: 'jpeg',
          hasAlpha: false,
        }),
        stats: jest.fn().mockResolvedValue({
          channels: [{ mean: 128, std: 50, entropy: 7 }],
        }),
      }));

      const result = await service.checkImage(buffer);

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('Image dimensions too small (min 100x100)');
    });

    it('should check image quality', async () => {
      const buffer = Buffer.from('test');
      const result = await service.checkImage(buffer, { checkQuality: true });

      expect(result.quality).toBeDefined();
      expect(result.quality.score).toBeGreaterThan(0);
    });

    it('should detect sensitive content', async () => {
      const buffer = Buffer.from('test');
      // Override mock to return suspicious stats (low mean = mostly black image)
      (sharp as jest.Mock).mockImplementation(() => ({
        metadata: jest.fn().mockResolvedValue({
          width: 1920,
          height: 1080,
          format: 'jpeg',
          hasAlpha: false,
        }),
        stats: jest.fn().mockResolvedValue({
          channels: [
            { mean: 5, std: 2, min: 0, max: 20, entropy: 0.5 },
            { mean: 5, std: 2, min: 0, max: 20, entropy: 0.5 },
            { mean: 5, std: 2, min: 0, max: 20, entropy: 0.5 },
          ],
        }),
        resize: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(Buffer.from('test')),
      }));

      const result = await service.checkImage(buffer, { checkSensitiveContent: true });

      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations.some(v => v.includes('suspicious'))).toBe(true);
    });
  });

  describe('generateImageHash', () => {
    it('should generate consistent hash', () => {
      const buffer = Buffer.from('test-data');
      const hash1 = service.generateImageHash(buffer);
      const hash2 = service.generateImageHash(buffer);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA256 hex
    });

    it('should generate different hashes for different data', () => {
      const hash1 = service.generateImageHash(Buffer.from('data1'));
      const hash2 = service.generateImageHash(Buffer.from('data2'));

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('createThumbnail', () => {
    it('should create thumbnail with default size', async () => {
      const buffer = Buffer.from('test');
      const thumbnail = await service.createThumbnail(buffer);

      expect(thumbnail).toBeInstanceOf(Buffer);
    });

    it('should create thumbnail with custom size', async () => {
      const buffer = Buffer.from('test');
      const thumbnail = await service.createThumbnail(buffer, {
        width: 100,
        height: 100,
      });

      expect(thumbnail).toBeInstanceOf(Buffer);
    });
  });

  describe('compressImage', () => {
    it('should compress image', async () => {
      const buffer = Buffer.from('test');
      const compressed = await service.compressImage(buffer);

      expect(compressed).toBeInstanceOf(Buffer);
    });

    it('should respect max dimensions', async () => {
      const buffer = Buffer.from('test');
      const compressed = await service.compressImage(buffer, {
        maxWidth: 800,
        maxHeight: 600,
      });

      expect(compressed).toBeInstanceOf(Buffer);
    });
  });
});
