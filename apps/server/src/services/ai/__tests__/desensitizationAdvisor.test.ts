/**
 * Desensitization Advisor Service Tests
 */

import {
  generateRecommendations,
  generateOneClickRecommendation,
  getHighlightedRegions,
  generateBatchSuggestion,
} from '../desensitizationAdvisor';
import { DetectionResult } from '../sensitiveContentDetection';

function makeDetection(
  type: DetectionResult['type'] = 'face',
  confidence = 0.9,
  bbox = { x: 10, y: 10, width: 50, height: 50 }
): DetectionResult {
  return { type, boundingBox: bbox, confidence };
}

describe('Desensitization Advisor Service', () => {
  describe('generateRecommendations', () => {
    it('should return recommendations even for no detections', () => {
      const result = generateRecommendations([]);
      // Privacy level recommendation is returned for empty detections too
      expect(Array.isArray(result)).toBe(true);
    });

    it('should include scene-based recommendation when scene is provided', () => {
      const detections = [makeDetection('face')];
      const result = generateRecommendations(detections, 'street');

      const sceneRec = result.find(r => r.type === 'scene');
      expect(sceneRec).toBeDefined();
      expect(sceneRec?.title).toContain('street');
    });

    it('should recommend blur for faces', () => {
      const detections = [makeDetection('face', 0.95)];
      const result = generateRecommendations(detections);

      const faceRec = result.find(r => r.title.includes('face'));
      expect(faceRec).toBeDefined();
      expect(faceRec?.action.payload.method).toBe('blur');
    });

    it('should recommend mosaic for license plates', () => {
      const detections = [makeDetection('license_plate', 0.9)];
      const result = generateRecommendations(detections);

      const plateRec = result.find(r => r.title.includes('license plate'));
      expect(plateRec).toBeDefined();
      expect(plateRec?.action.payload.method).toBe('mosaic');
      expect(plateRec?.action.payload.intensity).toBe(90);
    });

    it('should recommend pixelate for addresses', () => {
      const detections = [makeDetection('address', 0.9)];
      const result = generateRecommendations(detections);

      const addrRec = result.find(r => r.type === 'content');
      expect(addrRec).toBeDefined();
      expect(addrRec?.action.payload.method).toBe('pixelate');
    });

    it('should recommend mosaic for qr_code and barcode', () => {
      const detections = [makeDetection('qr_code', 0.85), makeDetection('barcode', 0.85)];
      const result = generateRecommendations(detections);

      const codeRec = result.find(r => r.title.includes('code'));
      expect(codeRec).toBeDefined();
      expect(codeRec?.action.payload.method).toBe('mosaic');
    });

    it('should return manual review for high-confidence sensitive detections', () => {
      const detections = [makeDetection('sensitive_object', 0.95), makeDetection('face', 0.98)];
      const result = generateRecommendations(detections);

      const manualRec = result.find(r => r.type === 'manual_review');
      expect(manualRec).toBeDefined();
      expect(manualRec?.priority).toBe('critical');
    });

    it('should sort recommendations by priority', () => {
      const detections = [makeDetection('face', 0.5), makeDetection('license_plate', 0.9)];
      const result = generateRecommendations(detections);

      const priorities = result.map(r => r.priority);
      const priorityOrder = ['critical', 'high', 'medium', 'low'];
      const indices = priorities.map(p => priorityOrder.indexOf(p));
      for (let i = 1; i < indices.length; i++) {
        expect(indices[i - 1]).toBeLessThanOrEqual(indices[i]);
      }
    });

    it('should handle privacy level recommendation', () => {
      const detections = [makeDetection('face', 0.9), makeDetection('license_plate', 0.9)];
      const result = generateRecommendations(detections);

      const levelRec = result.find(r => r.type === 'privacy_level');
      expect(levelRec).toBeDefined();
      expect(levelRec?.action.payload).toHaveProperty('privacyLevel');
      expect(levelRec?.action.payload).toHaveProperty('riskScore');
    });

    it('should assign higher intensity for multiple faces', () => {
      const single = [makeDetection('face', 0.9)];
      const multiple = [
        makeDetection('face', 0.9),
        makeDetection('face', 0.9),
        makeDetection('face', 0.9),
        makeDetection('face', 0.9),
      ];

      const singleRec = generateRecommendations(single).find(r => r.title.includes('face'));
      const multiRec = generateRecommendations(multiple).find(r => r.title.includes('face'));

      expect(singleRec?.action.payload.intensity).toBe(75);
      expect(multiRec?.action.payload.intensity).toBe(85);
    });

    it('should handle different scenes with appropriate priority', () => {
      const detections = [makeDetection('face', 0.8)];

      const hospitalRec = generateRecommendations(detections, 'hospital').find(
        r => r.type === 'scene'
      );
      const homeRec = generateRecommendations(detections, 'home').find(r => r.type === 'scene');

      expect(hospitalRec?.priority).toBe('critical');
      expect(homeRec?.priority).toBe('medium');
    });
  });

  describe('generateOneClickRecommendation', () => {
    it('should return recommendation with empty adjustments for empty detections', () => {
      const result = generateOneClickRecommendation([]);
      // Returns a recommendation with empty adjustments when no detections
      expect(result).toBeDefined();
    });

    it('should generate one-click recommendation', () => {
      const detections = [makeDetection('face', 0.9)];
      const result = generateOneClickRecommendation(detections, 'street');

      expect(result).toBeDefined();
      expect(result?.type).toBe('content');
      expect(result?.action.type).toBe('one_click');
      expect(result?.action.payload).toHaveProperty('adjustments');
    });
  });

  describe('getHighlightedRegions', () => {
    it('should return highlighted regions for detections', () => {
      const detections = [
        makeDetection('face', 0.95),
        makeDetection('license_plate', 0.9),
        makeDetection('address', 0.85),
      ];
      const result = getHighlightedRegions(detections);

      expect(result).toHaveLength(3);
      result.forEach(region => {
        expect(region.detection).toBeDefined();
        expect(region.highlightReason).toBeDefined();
        expect(['desensitize', 'review', 'ignore']).toContain(region.suggestedAction);
        expect(region.highlightColor).toBeDefined();
      });
    });

    it('should assign desensitize to high-confidence faces', () => {
      const detections = [makeDetection('face', 0.95)];
      const result = getHighlightedRegions(detections);

      expect(result[0].suggestedAction).toBe('desensitize');
      expect(result[0].highlightColor).toBe('#ff4444');
    });

    it('should assign review to low-confidence faces', () => {
      const detections = [makeDetection('face', 0.6)];
      const result = getHighlightedRegions(detections);

      expect(result[0].suggestedAction).toBe('review');
      expect(result[0].highlightColor).toBe('#ffaa00');
    });

    it('should always desensitize license plates', () => {
      const detections = [makeDetection('license_plate', 0.7)];
      const result = getHighlightedRegions(detections);

      expect(result[0].suggestedAction).toBe('desensitize');
      expect(result[0].highlightColor).toBe('#ff0000');
    });
  });

  describe('generateBatchSuggestion', () => {
    it('should generate batch suggestion for multiple images', () => {
      const allDetections = [
        [makeDetection('face', 0.9), makeDetection('face', 0.85)],
        [makeDetection('license_plate', 0.9)],
      ];
      const result = generateBatchSuggestion(2, allDetections);

      expect(result.imagesCount).toBe(2);
      expect(result.estimatedProcessingTime).toBe(1000);
      expect(result.recommendedTemplateId).toBe('template-strict');
    });

    it('should calculate common detections frequency', () => {
      const allDetections = [
        [makeDetection('face', 0.9), makeDetection('face', 0.9)],
        [makeDetection('face', 0.9), makeDetection('face', 0.9)],
        [makeDetection('license_plate', 0.9)],
      ];
      const result = generateBatchSuggestion(3, allDetections);

      const faceFreq = result.commonDetections.find(d => d.type === 'face');
      // frequency = total face detections / number of images = 4 / 3
      expect(faceFreq?.frequency).toBeCloseTo(1.33, 1);
    });

    it('should recommend relaxed template when no detections', () => {
      const result = generateBatchSuggestion(5, [[], [], [], [], []]);
      expect(result.recommendedTemplateId).toBe('template-relaxed');
    });

    it('should set canAutoProcess based on detection confidence', () => {
      const highConfidence = [[makeDetection('face', 0.8)]];
      const hasHighSensitive = [[makeDetection('sensitive_object', 0.96)]];

      const highConfResult = generateBatchSuggestion(1, highConfidence);
      const sensitiveResult = generateBatchSuggestion(1, hasHighSensitive);

      expect(highConfResult.canAutoProcess).toBe(true);
      expect(sensitiveResult.canAutoProcess).toBe(false);
    });
  });
});
