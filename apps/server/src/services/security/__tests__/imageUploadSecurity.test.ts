import sharp from 'sharp';

import { ImageUploadSecurityService } from '../imageUploadSecurity';

// Helper: create a minimal valid JPEG buffer
async function createTestImage(
  width = 200,
  height = 200,
  format: 'jpeg' | 'png' | 'webp' | 'gif' = 'jpeg'
): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 128, g: 128, b: 128 },
    },
  })
    [format]()
    .toBuffer();
}

// Helper: create a JPEG with fake EXIF (IPTC/XMP padding)
async function createImageWithExif(): Promise<Buffer> {
  // sharp embeds EXIF when withMetadata is called
  return sharp({
    create: {
      width: 100,
      height: 100,
      channels: 3,
      background: { r: 100, g: 100, b: 100 },
    },
  })
    .jpeg()
    .withMetadata({
      exif: {
        IFD0: {
          Copyright: 'Test Copyright',
          ImageDescription: 'Test image with EXIF',
        },
      },
    })
    .toBuffer();
}

describe('ImageUploadSecurityService', () => {
  let service: ImageUploadSecurityService;

  beforeAll(() => {
    service = ImageUploadSecurityService.getInstance();
  });

  describe('secureImage', () => {
    it('should accept a valid JPEG image', async () => {
      const buffer = await createTestImage(200, 200, 'jpeg');
      const result = await service.secureImage(buffer, 'image/jpeg', 'test.jpg');

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.sanitizedBuffer).toBeDefined();
      expect(result.metadata.format).toBe('jpeg');
      expect(result.metadata.width).toBe(200);
      expect(result.metadata.height).toBe(200);
      expect(result.metadata.sha256).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should accept a valid PNG image', async () => {
      const buffer = await createTestImage(300, 200, 'png');
      const result = await service.secureImage(buffer, 'image/png', 'test.png');

      expect(result.passed).toBe(true);
      expect(result.metadata.format).toBe('png');
    });

    it('should accept a valid WebP image', async () => {
      const buffer = await createTestImage(100, 100, 'webp');
      const result = await service.secureImage(buffer, 'image/webp', 'test.webp');

      expect(result.passed).toBe(true);
      expect(result.metadata.format).toBe('webp');
    });

    it('should reject empty file', async () => {
      const result = await service.secureImage(Buffer.alloc(0), 'image/jpeg', 'empty.jpg');

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('Empty file');
    });

    it('should reject file exceeding size limit', async () => {
      const buffer = await createTestImage();
      const result = await service.secureImage(buffer, 'image/jpeg', 'big.jpg', {
        maxFileSize: 10,
      });

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.includes('exceeds limit'))).toBe(true);
    });

    it('should reject non-image data (random bytes)', async () => {
      const buffer = Buffer.alloc(100, 0x42);
      const result = await service.secureImage(buffer, 'image/jpeg', 'fake.jpg');

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.includes('image format'))).toBe(true);
    });

    it('should detect MIME type mismatch', async () => {
      const buffer = await createTestImage(200, 200, 'jpeg');
      const result = await service.secureImage(buffer, 'image/png', 'test.jpg');

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.includes('MIME type mismatch'))).toBe(true);
    });

    it('should reject disallowed format', async () => {
      const buffer = await createTestImage(200, 200, 'jpeg');
      const result = await service.secureImage(buffer, 'image/jpeg', 'test.jpg', {
        allowedFormats: ['png'],
      });

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.includes('not allowed'))).toBe(true);
    });

    it('should reject image too small', async () => {
      const buffer = await createTestImage(50, 50, 'jpeg');
      const result = await service.secureImage(buffer, 'image/jpeg', 'tiny.jpg');

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.includes('too small'))).toBe(true);
    });

    it('should detect filename path traversal', async () => {
      const buffer = await createTestImage();
      const result = await service.secureImage(buffer, 'image/jpeg', '../etc/passwd.jpg');

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.includes('path traversal'))).toBe(true);
    });

    it('should detect null bytes in filename', async () => {
      const buffer = await createTestImage();
      const result = await service.secureImage(buffer, 'image/jpeg', 'test\0.jpg');

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.includes('null bytes'))).toBe(true);
    });

    it('should detect dangerous double extension', async () => {
      const buffer = await createTestImage();
      const result = await service.secureImage(buffer, 'image/jpeg', 'image.php.jpg');

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.includes('double extension'))).toBe(true);
    });

    it('should strip EXIF metadata when configured', async () => {
      const buffer = await createImageWithExif();
      const result = await service.secureImage(buffer, 'image/jpeg', 'exif.jpg', {
        stripMetadata: true,
      });

      expect(result.passed).toBe(true);
      expect(result.metadata.hadExif).toBe(true);
      expect(result.warnings.some(w => w.includes('stripped'))).toBe(true);

      // Verify sanitized image has no EXIF
      if (result.sanitizedBuffer) {
        const meta = await sharp(result.sanitizedBuffer).metadata();
        expect(meta.exif).toBeUndefined();
      }
    });

    it('should NOT strip EXIF when stripMetadata is false', async () => {
      const buffer = await createTestImage();
      const result = await service.secureImage(buffer, 'image/jpeg', 'test.jpg', {
        stripMetadata: false,
      });

      expect(result.passed).toBe(true);
    });

    it('should detect SVG with script injection', async () => {
      const svgBuffer = Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg"><script>alert("xss")</script></svg>'
      );
      const result = await service.secureImage(svgBuffer, 'image/svg+xml', 'evil.svg', {
        allowedFormats: ['jpeg', 'png', 'webp', 'gif', 'svg'],
      });

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.includes('dangerous content'))).toBe(true);
    });

    it('should produce a valid SHA-256 hash', async () => {
      const buffer = await createTestImage();
      const result = await service.secureImage(buffer, 'image/jpeg', 'test.jpg');

      expect(result.metadata.sha256).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('scanForViruses', () => {
    it('should return clean for a normal image', async () => {
      const buffer = await createTestImage();
      const result = await service.scanForViruses(buffer);

      expect(result.clean).toBe(true);
      expect(result.threats).toHaveLength(0);
    });

    it('should detect embedded PE executable', async () => {
      // MZ header
      const buffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, ...Array(100).fill(0)]);
      const result = await service.scanForViruses(buffer);

      expect(result.clean).toBe(false);
      expect(result.threats).toContain('PE executable embedded');
    });

    it('should detect embedded PDF', async () => {
      const buffer = Buffer.from('%PDF-1.4 test content');
      const result = await service.scanForViruses(buffer);

      expect(result.clean).toBe(false);
      expect(result.threats).toContain('PDF content embedded');
    });

    it('should detect embedded ZIP/archive', async () => {
      const buffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, ...Array(100).fill(0)]);
      const result = await service.scanForViruses(buffer);

      expect(result.clean).toBe(false);
      expect(result.threats).toContain('Archive content embedded');
    });
  });
});
