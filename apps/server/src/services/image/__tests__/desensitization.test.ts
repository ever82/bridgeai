/**
 * Image Desensitization Service Tests
 */

import sharp from 'sharp';

import {
  desensitizeImage,
  applyMultiStageDesensitization,
  previewDesensitization,
  getRecommendedMethod,
  calculateDefaultIntensity,
} from '../desensitization';
import { DetectionResult } from '../../ai/sensitiveContentDetection';

// Helper to create a test image buffer
async function createTestImage(width = 200, height = 200): Promise<Buffer> {
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

function createDetection(
  type: string,
  bbox = { x: 50, y: 50, width: 80, height: 80 }
): DetectionResult {
  return {
    type: type as DetectionResult['type'],
    boundingBox: bbox,
    confidence: 0.9,
    metadata: {},
  };
}

describe('Image Desensitization Service', () => {
  describe('desensitizeImage', () => {
    it('should apply blur desensitization to detected regions', async () => {
      const buffer = await createTestImage();
      const detections = [createDetection('face')];

      const result = await desensitizeImage(buffer, detections, {
        method: 'blur',
        intensity: 70,
      });

      expect(result.processedImageBuffer).toBeInstanceOf(Buffer);
      expect(result.processedImageBuffer.length).toBeGreaterThan(0);
      expect(result.appliedRegions).toHaveLength(1);
      expect(result.appliedRegions[0].method).toBe('blur');
      expect(result.appliedRegions[0].intensity).toBe(70);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should apply mosaic desensitization', async () => {
      const buffer = await createTestImage();
      const detections = [createDetection('license_plate')];

      const result = await desensitizeImage(buffer, detections, {
        method: 'mosaic',
        intensity: 80,
      });

      expect(result.processedImageBuffer).toBeInstanceOf(Buffer);
      expect(result.appliedRegions[0].method).toBe('mosaic');
    });

    it('should apply pixelate desensitization', async () => {
      const buffer = await createTestImage();
      const detections = [createDetection('text')];

      const result = await desensitizeImage(buffer, detections, {
        method: 'pixelate',
        intensity: 60,
      });

      expect(result.processedImageBuffer).toBeInstanceOf(Buffer);
      expect(result.appliedRegions[0].method).toBe('pixelate');
    });

    it('should apply replace_background desensitization', async () => {
      const buffer = await createTestImage();
      const detections = [createDetection('sensitive_object')];

      const result = await desensitizeImage(buffer, detections, {
        method: 'replace_background',
        intensity: 90,
      });

      expect(result.processedImageBuffer).toBeInstanceOf(Buffer);
    });

    it('should apply feather desensitization', async () => {
      const buffer = await createTestImage();
      const detections = [createDetection('face')];

      const result = await desensitizeImage(buffer, detections, {
        method: 'feather',
        intensity: 50,
      });

      expect(result.processedImageBuffer).toBeInstanceOf(Buffer);
    });

    it('should handle multiple detections', async () => {
      const buffer = await createTestImage(400, 400);
      const detections = [
        createDetection('face', { x: 20, y: 20, width: 60, height: 60 }),
        createDetection('license_plate', { x: 200, y: 200, width: 80, height: 40 }),
      ];

      const result = await desensitizeImage(buffer, detections, {
        method: 'blur',
        intensity: 70,
      });

      expect(result.appliedRegions).toHaveLength(2);
    });

    it('should return valid image even with zero detections', async () => {
      const buffer = await createTestImage();
      const result = await desensitizeImage(buffer, [], { method: 'blur', intensity: 70 });

      expect(result.processedImageBuffer).toBeInstanceOf(Buffer);
      expect(result.appliedRegions).toHaveLength(0);
    });

    it('should handle bounding boxes at image edges', async () => {
      const buffer = await createTestImage(100, 100);
      const detections = [createDetection('face', { x: 90, y: 90, width: 30, height: 30 })];

      // Should not throw despite bbox exceeding image bounds
      const result = await desensitizeImage(buffer, detections, { method: 'blur', intensity: 50 });
      expect(result.processedImageBuffer).toBeInstanceOf(Buffer);
    });
  });

  describe('applyMultiStageDesensitization', () => {
    it('should apply different methods to different regions', async () => {
      const buffer = await createTestImage(300, 300);
      const regions = [
        {
          detection: createDetection('face', { x: 20, y: 20, width: 80, height: 80 }),
          method: 'blur' as const,
          intensity: 80,
        },
        {
          detection: createDetection('license_plate', { x: 150, y: 150, width: 60, height: 30 }),
          method: 'mosaic' as const,
          intensity: 90,
        },
      ];

      const result = await applyMultiStageDesensitization(buffer, regions);

      expect(result.processedImageBuffer).toBeInstanceOf(Buffer);
      expect(result.appliedRegions).toHaveLength(2);
      expect(result.steps.length).toBeGreaterThanOrEqual(3); // pre + 2 regions + post
      expect(result.originalSize).toBeGreaterThan(0);
      expect(result.processedSize).toBeGreaterThan(0);
    });
  });

  describe('previewDesensitization', () => {
    it('should generate a preview with reduced intensity', async () => {
      const buffer = await createTestImage();
      const preview = await previewDesensitization(
        buffer,
        { x: 50, y: 50, width: 80, height: 80 },
        'blur',
        70
      );

      expect(preview).toBeInstanceOf(Buffer);
      expect(preview.length).toBeGreaterThan(0);
    });
  });

  describe('getRecommendedMethod', () => {
    it('should recommend blur for faces', () => {
      expect(getRecommendedMethod('face')).toBe('blur');
    });

    it('should recommend mosaic for license plates', () => {
      expect(getRecommendedMethod('license_plate')).toBe('mosaic');
    });

    it('should recommend pixelate for text', () => {
      expect(getRecommendedMethod('text')).toBe('pixelate');
    });

    it('should recommend pixelate for addresses', () => {
      expect(getRecommendedMethod('address')).toBe('pixelate');
    });

    it('should recommend replace_background for sensitive objects', () => {
      expect(getRecommendedMethod('sensitive_object')).toBe('replace_background');
    });

    it('should default to blur for unknown types', () => {
      expect(getRecommendedMethod('unknown')).toBe('blur');
    });
  });

  describe('calculateDefaultIntensity', () => {
    it('should return appropriate intensity for faces', () => {
      // base=80, adjustment=(0.9-0.5)*20=8 => 88
      expect(calculateDefaultIntensity('face', 0.9)).toBe(88);
    });

    it('should return higher intensity for sensitive objects', () => {
      // base=95, adjustment=8 => 103, clamped to 100
      expect(calculateDefaultIntensity('sensitive_object', 0.9)).toBe(100);
    });

    it('should adjust intensity based on confidence', () => {
      const lowConf = calculateDefaultIntensity('face', 0.5);
      const highConf = calculateDefaultIntensity('face', 0.95);
      expect(highConf).toBeGreaterThan(lowConf);
    });

    it('should clamp to 0-100 range', () => {
      const result = calculateDefaultIntensity('face', 0.1);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });
  });
});
