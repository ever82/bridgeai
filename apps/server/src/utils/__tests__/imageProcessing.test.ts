/**
 * Image Processing Utilities Tests
 */

import sharp from 'sharp';

import {
  getImageMetadata,
  resizeImage,
  convertImageFormat,
  optimizeImage,
  cropImage,
  applyBlur,
  isValidImage,
  getImageFormat,
  stripExif,
  scaleBoundingBox,
  doBoundingBoxesOverlap,
  mergeBoundingBoxes,
  padBoundingBox,
} from '../../utils/imageProcessing';

// Helper to create a test image buffer
async function createTestImage(width = 100, height = 100): Promise<Buffer> {
  return await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 128, g: 128, b: 128 },
    },
  })
    .jpeg()
    .toBuffer();
}

// Helper to create a test image with EXIF
async function createTestImageWithExif(): Promise<Buffer> {
  return await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 3,
      background: { r: 128, g: 128, b: 128 },
    },
  })
    .jpeg()
    .toBuffer();
}

describe('Image Processing Utilities', () => {
  describe('getImageMetadata', () => {
    it('should extract metadata from a valid image buffer', async () => {
      const buffer = await createTestImage(200, 150);
      const metadata = await getImageMetadata(buffer);

      expect(metadata.width).toBe(200);
      expect(metadata.height).toBe(150);
      expect(metadata.format).toBe('jpeg');
      expect(metadata.size).toBe(buffer.length);
    });

    it('should detect alpha channel for PNG images', async () => {
      const buffer = await sharp({
        create: {
          width: 50,
          height: 50,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 128 },
        },
      })
        .png()
        .toBuffer();

      const metadata = await getImageMetadata(buffer);
      expect(metadata.format).toBe('png');
      expect(metadata.hasAlpha).toBe(true);
    });
  });

  describe('resizeImage', () => {
    it('should resize image to specified width', async () => {
      const buffer = await createTestImage(400, 300);
      const resized = await resizeImage(buffer, 200);

      const metadata = await sharp(resized).metadata();
      expect(metadata.width).toBe(200);
      expect(metadata.height).toBe(150); // Maintains aspect ratio
    });

    it('should resize to exact dimensions', async () => {
      const buffer = await createTestImage(400, 300);
      const resized = await resizeImage(buffer, 200, 100);

      const metadata = await sharp(resized).metadata();
      expect(metadata.width).toBeLessThanOrEqual(200);
      expect(metadata.height).toBeLessThanOrEqual(100);
    });
  });

  describe('convertImageFormat', () => {
    it('should convert JPEG to PNG', async () => {
      const buffer = await createTestImage();
      const converted = await convertImageFormat(buffer, 'png');

      const metadata = await sharp(converted).metadata();
      expect(metadata.format).toBe('png');
    });

    it('should convert to webp', async () => {
      const buffer = await createTestImage();
      const converted = await convertImageFormat(buffer, 'webp');

      const metadata = await sharp(converted).metadata();
      expect(metadata.format).toBe('webp');
    });
  });

  describe('optimizeImage', () => {
    it('should produce a valid optimized image', async () => {
      const buffer = await createTestImage(500, 500);
      const optimized = await optimizeImage(buffer, 60);

      expect(optimized).toBeInstanceOf(Buffer);
      expect(optimized.length).toBeGreaterThan(0);

      const metadata = await sharp(optimized).metadata();
      expect(metadata.format).toBe('jpeg');
    });
  });

  describe('cropImage', () => {
    it('should crop image to specified region', async () => {
      const buffer = await createTestImage(200, 200);
      const cropped = await cropImage(buffer, { x: 50, y: 50, width: 100, height: 100 });

      const metadata = await sharp(cropped).metadata();
      expect(metadata.width).toBe(100);
      expect(metadata.height).toBe(100);
    });
  });

  describe('applyBlur', () => {
    it('should apply blur to entire image', async () => {
      const buffer = await createTestImage(100, 100);
      const blurred = await applyBlur(buffer, 5);

      expect(blurred).toBeInstanceOf(Buffer);
      expect(blurred.length).toBeGreaterThan(0);
    });

    it('should apply blur to specific region', async () => {
      const buffer = await createTestImage(200, 200);
      const blurred = await applyBlur(buffer, 10, { x: 50, y: 50, width: 100, height: 100 });

      expect(blurred).toBeInstanceOf(Buffer);
      // Blurred region image should be different from original
      expect(blurred.length).toBeGreaterThan(0);
    });
  });

  describe('isValidImage', () => {
    it('should detect valid JPEG buffer', async () => {
      const buffer = await createTestImage();
      expect(isValidImage(buffer)).toBe(true);
    });

    it('should detect valid PNG buffer', async () => {
      const buffer = await sharp({
        create: { width: 10, height: 10, channels: 3, background: { r: 0, g: 0, b: 0 } },
      })
        .png()
        .toBuffer();
      expect(isValidImage(buffer)).toBe(true);
    });

    it('should reject invalid buffer', () => {
      expect(isValidImage(Buffer.from('not an image'))).toBe(false);
    });

    it('should reject empty buffer', () => {
      expect(isValidImage(Buffer.alloc(0))).toBe(false);
    });
  });

  describe('getImageFormat', () => {
    it('should identify JPEG format', async () => {
      const buffer = await createTestImage();
      expect(getImageFormat(buffer)).toBe('jpeg');
    });

    it('should identify PNG format', async () => {
      const buffer = await sharp({
        create: { width: 10, height: 10, channels: 3, background: { r: 0, g: 0, b: 0 } },
      })
        .png()
        .toBuffer();
      expect(getImageFormat(buffer)).toBe('png');
    });

    it('should return null for invalid data', () => {
      expect(getImageFormat(Buffer.from('abc'))).toBeNull();
    });
  });

  describe('stripExif', () => {
    it('should strip EXIF and return valid image', async () => {
      const buffer = await createTestImageWithExif();
      const stripped = await stripExif(buffer);

      expect(stripped).toBeInstanceOf(Buffer);
      expect(stripped.length).toBeGreaterThan(0);

      // Verify it's still a valid image
      const metadata = await sharp(stripped).metadata();
      expect(metadata.width).toBe(100);
      expect(metadata.height).toBe(100);
    });
  });

  describe('BoundingBox utilities', () => {
    describe('scaleBoundingBox', () => {
      it('should scale bounding box proportionally', () => {
        const box = { x: 10, y: 10, width: 20, height: 20 };
        const result = scaleBoundingBox(
          box,
          { width: 100, height: 100 },
          { width: 200, height: 200 }
        );

        expect(result).toEqual({ x: 20, y: 20, width: 40, height: 40 });
      });
    });

    describe('doBoundingBoxesOverlap', () => {
      it('should detect overlapping boxes', () => {
        const box1 = { x: 0, y: 0, width: 50, height: 50 };
        const box2 = { x: 25, y: 25, width: 50, height: 50 };
        expect(doBoundingBoxesOverlap(box1, box2)).toBe(true);
      });

      it('should detect non-overlapping boxes', () => {
        const box1 = { x: 0, y: 0, width: 50, height: 50 };
        const box2 = { x: 100, y: 100, width: 50, height: 50 };
        expect(doBoundingBoxesOverlap(box1, box2)).toBe(false);
      });
    });

    describe('mergeBoundingBoxes', () => {
      it('should merge overlapping boxes', () => {
        const boxes = [
          { x: 0, y: 0, width: 50, height: 50 },
          { x: 25, y: 25, width: 50, height: 50 },
        ];
        const merged = mergeBoundingBoxes(boxes);

        expect(merged.length).toBe(1);
        expect(merged[0].x).toBe(0);
        expect(merged[0].y).toBe(0);
        expect(merged[0].width).toBe(75);
        expect(merged[0].height).toBe(75);
      });

      it('should keep non-overlapping boxes separate', () => {
        const boxes = [
          { x: 0, y: 0, width: 50, height: 50 },
          { x: 100, y: 100, width: 50, height: 50 },
        ];
        const merged = mergeBoundingBoxes(boxes);
        expect(merged.length).toBe(2);
      });

      it('should return empty array for empty input', () => {
        expect(mergeBoundingBoxes([])).toEqual([]);
      });
    });

    describe('padBoundingBox', () => {
      it('should add padding to bounding box', () => {
        const box = { x: 20, y: 20, width: 50, height: 50 };
        const result = padBoundingBox(box, 10, { width: 200, height: 200 });

        expect(result.x).toBe(10);
        expect(result.y).toBe(10);
        expect(result.width).toBe(70);
        expect(result.height).toBe(70);
      });

      it('should not exceed image boundaries', () => {
        const box = { x: 5, y: 5, width: 50, height: 50 };
        const result = padBoundingBox(box, 10, { width: 100, height: 100 });

        expect(result.x).toBe(0);
        expect(result.y).toBe(0);
      });
    });
  });
});
