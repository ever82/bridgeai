/**
 * Sensitive Content Detection Service Tests
 */

import sharp from 'sharp';

import {
  calculatePrivacyRisk,
  detectSensitiveContent,
  getRiskLevel,
  stripExifFromImage,
} from '../sensitiveContentDetection';

// --- Mocks for detectSensitiveContent tests ---

// Mock GPT4VisionAdapter so getDetectionAdapter() returns a controllable instance
const mockInitialize = jest.fn().mockResolvedValue(undefined);
const mockAnalyzeImage = jest.fn();

jest.mock('../adapters/vision/gpt4Vision', () => ({
  GPT4VisionAdapter: jest.fn().mockImplementation(() => ({
    initialize: mockInitialize,
    analyzeImage: mockAnalyzeImage,
  })),
}));

jest.mock('../adapters/vision/claudeVision', () => ({
  ClaudeVisionAdapter: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    analyzeImage: jest.fn().mockResolvedValue('[]'),
  })),
}));

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

  describe('detectSensitiveContent', () => {
    let originalOpenaiKey: string | undefined;

    beforeAll(() => {
      originalOpenaiKey = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'test-openai-key';
    });

    afterAll(() => {
      if (originalOpenaiKey !== undefined) {
        process.env.OPENAI_API_KEY = originalOpenaiKey;
      } else {
        delete process.env.OPENAI_API_KEY;
      }
    });

    beforeEach(() => {
      jest.clearAllMocks();
      // Reset the mock to a safe default
      mockInitialize.mockResolvedValue(undefined);
      mockAnalyzeImage.mockResolvedValue('[]');
    });

    it('should detect sensitive content using AI adapter', async () => {
      const aiResponse = JSON.stringify([
        {
          type: 'face',
          confidence: 0.95,
          boundingBox: { x_percent: 10, y_percent: 20, w_percent: 30, h_percent: 40 },
        },
        {
          type: 'license_plate',
          confidence: 0.85,
          boundingBox: { x: 50, y: 60, width: 70, height: 20 },
        },
      ]);
      mockAnalyzeImage.mockResolvedValue(aiResponse);

      const buffer = await createTestImage();
      const result = await detectSensitiveContent(buffer, {
        types: ['face', 'license_plate'],
        minConfidence: 0.7,
      });

      expect(result.detections).toHaveLength(2);
      expect(result.detections[0].type).toBe('face');
      expect(result.detections[0].confidence).toBe(0.95);
      expect(result.detections[1].type).toBe('license_plate');
      expect(result.imageWidth).toBe(100);
      expect(result.imageHeight).toBe(100);
      expect(result.exifStripped).toBe(true);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
      expect(mockInitialize).toHaveBeenCalledTimes(1);
      expect(mockAnalyzeImage).toHaveBeenCalledTimes(1);
    });

    it('should retry on first failure and succeed on second attempt', async () => {
      const aiResponse = JSON.stringify([
        {
          type: 'face',
          confidence: 0.9,
          boundingBox: { x_percent: 10, y_percent: 10, w_percent: 50, h_percent: 50 },
        },
      ]);
      // First call fails, second succeeds
      mockAnalyzeImage
        .mockRejectedValueOnce(new Error('Transient API error'))
        .mockResolvedValueOnce(aiResponse);

      const buffer = await createTestImage();
      const result = await detectSensitiveContent(buffer, {
        types: ['face'],
        minConfidence: 0.7,
      });

      expect(result.detections).toHaveLength(1);
      expect(result.detections[0].type).toBe('face');
      expect(mockAnalyzeImage).toHaveBeenCalledTimes(2);
    });

    it('should return empty detections when all retries fail', async () => {
      mockAnalyzeImage.mockRejectedValue(new Error('API unavailable'));

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const buffer = await createTestImage();
      const result = await detectSensitiveContent(buffer, {
        types: ['face'],
        minConfidence: 0.7,
      });

      expect(result.detections).toHaveLength(0);
      expect(result.imageWidth).toBe(100);
      expect(result.imageHeight).toBe(100);
      // Should have logged warnings about failures
      expect(warnSpy).toHaveBeenCalled();
      // MAX_RETRIES=1 means 2 attempts total
      expect(mockAnalyzeImage).toHaveBeenCalledTimes(2);

      warnSpy.mockRestore();
    });

    it('should filter detections below minConfidence', async () => {
      const aiResponse = JSON.stringify([
        {
          type: 'face',
          confidence: 0.95,
          boundingBox: { x: 0, y: 0, width: 50, height: 50 },
        },
        {
          type: 'face',
          confidence: 0.3,
          boundingBox: { x: 50, y: 50, width: 50, height: 50 },
        },
        {
          type: 'license_plate',
          confidence: 0.6,
          boundingBox: { x: 0, y: 80, width: 100, height: 20 },
        },
      ]);
      mockAnalyzeImage.mockResolvedValue(aiResponse);

      const buffer = await createTestImage();
      const result = await detectSensitiveContent(buffer, {
        types: ['face', 'license_plate'],
        minConfidence: 0.7,
      });

      // Only the face with 0.95 confidence passes the 0.7 threshold
      expect(result.detections).toHaveLength(1);
      expect(result.detections[0].confidence).toBe(0.95);
    });

    it('should limit results to maxResults', async () => {
      // Create 5 detections, all with different confidences
      const detections = Array.from({ length: 5 }, (_, i) => ({
        type: 'face',
        confidence: 0.9 - i * 0.05,
        boundingBox: { x: i * 20, y: 0, width: 20, height: 20 },
      }));
      const aiResponse = JSON.stringify(detections);
      mockAnalyzeImage.mockResolvedValue(aiResponse);

      const buffer = await createTestImage();
      const result = await detectSensitiveContent(buffer, {
        types: ['face'],
        minConfidence: 0.5,
        maxResults: 3,
      });

      expect(result.detections).toHaveLength(3);
      // Results should be sorted by confidence descending
      expect(result.detections[0].confidence).toBe(0.9);
      expect(result.detections[1].confidence).toBe(0.85);
      expect(result.detections[2].confidence).toBe(0.8);
    });

    it('should strip EXIF before detection', async () => {
      mockAnalyzeImage.mockResolvedValue('[]');

      const buffer = await createTestImage();
      const result = await detectSensitiveContent(buffer, {
        types: ['face'],
        minConfidence: 0.7,
      });

      // The function always strips EXIF and reports it
      expect(result.exifStripped).toBe(true);
      // Test image has no GPS data
      expect(result.hadGpsData).toBe(false);
      // Adapter was still called with the cleaned image data
      expect(mockAnalyzeImage).toHaveBeenCalledTimes(1);
    });
  });
});
