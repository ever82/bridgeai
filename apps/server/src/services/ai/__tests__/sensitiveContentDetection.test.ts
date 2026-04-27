/**
 * Sensitive Content Detection Service Tests
 */

import sharp from 'sharp';

import {
  calculatePrivacyRisk,
  getRiskLevel,
  stripExifFromImage,
} from '../sensitiveContentDetection';

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

describe('Sensitive Content Detection Service', () => {
  describe('calculatePrivacyRisk', () => {
    it('should return 0 for empty detections', () => {
      expect(calculatePrivacyRisk([])).toBe(0);
    });

    it('should calculate risk for face detections', () => {
      const detections = [
        {
          type: 'face' as const,
          boundingBox: { x: 0, y: 0, width: 100, height: 100 },
          confidence: 0.9,
        },
      ];
      const risk = calculatePrivacyRisk(detections);
      expect(risk).toBeGreaterThan(0);
      expect(risk).toBeLessThanOrEqual(100);
    });

    it('should weight faces higher than barcodes', () => {
      const faceDetections = [
        {
          type: 'face' as const,
          boundingBox: { x: 0, y: 0, width: 100, height: 100 },
          confidence: 0.9,
        },
      ];
      const barcodeDetections = [
        {
          type: 'barcode' as const,
          boundingBox: { x: 0, y: 0, width: 100, height: 100 },
          confidence: 0.9,
        },
      ];

      const faceRisk = calculatePrivacyRisk(faceDetections);
      const barcodeRisk = calculatePrivacyRisk(barcodeDetections);
      expect(faceRisk).toBeGreaterThan(barcodeRisk);
    });

    it('should increase risk with more detections', () => {
      const single = [
        {
          type: 'face' as const,
          boundingBox: { x: 0, y: 0, width: 50, height: 50 },
          confidence: 0.8,
        },
      ];
      const multiple = [
        {
          type: 'face' as const,
          boundingBox: { x: 0, y: 0, width: 50, height: 50 },
          confidence: 0.8,
        },
        {
          type: 'license_plate' as const,
          boundingBox: { x: 100, y: 100, width: 50, height: 50 },
          confidence: 0.8,
        },
        {
          type: 'address' as const,
          boundingBox: { x: 200, y: 200, width: 50, height: 50 },
          confidence: 0.8,
        },
      ];

      const singleRisk = calculatePrivacyRisk(single);
      const multiRisk = calculatePrivacyRisk(multiple);
      expect(multiRisk).toBeGreaterThan(singleRisk);
    });

    it('should not exceed 100', () => {
      const manyDetections = Array(20)
        .fill(null)
        .map(() => ({
          type: 'face' as const,
          boundingBox: { x: 0, y: 0, width: 10, height: 10 },
          confidence: 1.0,
        }));
      expect(calculatePrivacyRisk(manyDetections)).toBeLessThanOrEqual(100);
    });
  });

  describe('getRiskLevel', () => {
    it('should return low for score < 30', () => {
      expect(getRiskLevel(0)).toBe('low');
      expect(getRiskLevel(15)).toBe('low');
      expect(getRiskLevel(29)).toBe('low');
    });

    it('should return medium for score 30-59', () => {
      expect(getRiskLevel(30)).toBe('medium');
      expect(getRiskLevel(45)).toBe('medium');
      expect(getRiskLevel(59)).toBe('medium');
    });

    it('should return high for score 60-84', () => {
      expect(getRiskLevel(60)).toBe('high');
      expect(getRiskLevel(75)).toBe('high');
      expect(getRiskLevel(84)).toBe('high');
    });

    it('should return critical for score >= 85', () => {
      expect(getRiskLevel(85)).toBe('critical');
      expect(getRiskLevel(100)).toBe('critical');
    });
  });

  describe('stripExifFromImage', () => {
    it('should return cleaned buffer without EXIF', async () => {
      const buffer = await createTestImage();
      const result = await stripExifFromImage(buffer);

      expect(result.cleanedBuffer).toBeInstanceOf(Buffer);
      expect(result.cleanedBuffer.length).toBeGreaterThan(0);
    });

    it('should report no GPS data for clean images', async () => {
      const buffer = await createTestImage();
      const result = await stripExifFromImage(buffer);

      // Our simple test image doesn't have GPS data
      expect(result.hadGpsData).toBe(false);
    });
  });
});
