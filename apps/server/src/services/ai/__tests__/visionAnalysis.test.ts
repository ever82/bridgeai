/**
 * Vision Analysis Service Tests
 */

import { getBatchStatistics, ComprehensiveVisionResult } from '../visionAnalysis';
import { VisionAnalysisResult } from '../sensitiveContentDetection';

function makeVisionResult(
  detections: Array<{ type: string; confidence: number }>
): ComprehensiveVisionResult {
  const visionResult: VisionAnalysisResult = {
    detections: detections.map((d, i) => ({
      type: d.type as any,
      boundingBox: { x: i * 10, y: i * 10, width: 50, height: 50 },
      confidence: d.confidence,
    })),
    imageWidth: 1920,
    imageHeight: 1080,
    processingTime: 150 + Math.random() * 50,
    exifStripped: true,
    hadGpsData: false,
  };

  return {
    sensitiveContent: visionResult,
    sceneAnalysis: null,
    objects: [],
    text: [],
    recommendations: [],
  };
}

describe('Vision Analysis Service', () => {
  describe('getBatchStatistics', () => {
    it('should return zero statistics for empty array', () => {
      const stats = getBatchStatistics([]);

      expect(stats.totalImages).toBe(0);
      expect(stats.imagesWithSensitiveContent).toBe(0);
      expect(stats.totalDetections).toBe(0);
      expect(Number.isNaN(stats.avgProcessingTime) || stats.avgProcessingTime === 0).toBe(true);
      expect(
        Number.isNaN(stats.sensitiveContentPercentage) || stats.sensitiveContentPercentage === 0
      ).toBe(true);
    });

    it('should count total images correctly', () => {
      const results = [makeVisionResult([]), makeVisionResult([]), makeVisionResult([])];

      const stats = getBatchStatistics(results);
      expect(stats.totalImages).toBe(3);
    });

    it('should count images with sensitive content', () => {
      const results = [
        makeVisionResult([]),
        makeVisionResult([{ type: 'face', confidence: 0.9 }]),
        makeVisionResult([]),
        makeVisionResult([{ type: 'license_plate', confidence: 0.85 }]),
      ];

      const stats = getBatchStatistics(results);
      expect(stats.imagesWithSensitiveContent).toBe(2);
    });

    it('should sum all detections across images', () => {
      const results = [
        makeVisionResult([
          { type: 'face', confidence: 0.9 },
          { type: 'face', confidence: 0.85 },
        ]),
        makeVisionResult([{ type: 'license_plate', confidence: 0.9 }]),
        makeVisionResult([]),
      ];

      const stats = getBatchStatistics(results);
      expect(stats.totalDetections).toBe(3);
    });

    it('should calculate average processing time', () => {
      const results = [makeVisionResult([]), makeVisionResult([])];

      const stats = getBatchStatistics(results);
      expect(stats.avgProcessingTime).toBeGreaterThan(0);
    });

    it('should calculate sensitive content percentage', () => {
      const results = [
        makeVisionResult([]),
        makeVisionResult([]),
        makeVisionResult([{ type: 'face', confidence: 0.9 }]),
        makeVisionResult([]),
      ];

      const stats = getBatchStatistics(results);
      expect(stats.sensitiveContentPercentage).toBe(25);
    });

    it('should count detection types', () => {
      const results = [
        makeVisionResult([
          { type: 'face', confidence: 0.9 },
          { type: 'face', confidence: 0.85 },
          { type: 'license_plate', confidence: 0.9 },
        ]),
      ];

      const stats = getBatchStatistics(results);
      expect(stats.detectionTypeCounts['face']).toBe(2);
      expect(stats.detectionTypeCounts['license_plate']).toBe(1);
    });

    it('should handle 100% sensitive content', () => {
      const results = [
        makeVisionResult([{ type: 'face', confidence: 0.9 }]),
        makeVisionResult([{ type: 'license_plate', confidence: 0.9 }]),
      ];

      const stats = getBatchStatistics(results);
      expect(stats.sensitiveContentPercentage).toBe(100);
    });

    it('should handle all images without sensitive content', () => {
      const results = [makeVisionResult([]), makeVisionResult([]), makeVisionResult([])];

      const stats = getBatchStatistics(results);
      expect(stats.sensitiveContentPercentage).toBe(0);
      expect(stats.imagesWithSensitiveContent).toBe(0);
      expect(stats.totalDetections).toBe(0);
    });
  });
});
