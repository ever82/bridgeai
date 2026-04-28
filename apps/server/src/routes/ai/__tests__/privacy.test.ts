/**
 * Privacy API Routes Integration Tests
 *
 * Tests the full request-response cycle for all 5 privacy API endpoints:
 * - POST /api/v1/ai/privacy/analyze
 * - POST /api/v1/ai/privacy/desensitize
 * - POST /api/v1/ai/privacy/multi-desensitize
 * - POST /api/v1/ai/privacy/preview
 * - POST /api/v1/ai/privacy/strip-exif
 * - GET  /api/v1/ai/privacy/recommendations/:contentType
 */

import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';

// Mock auth middleware
jest.mock('../../../middleware/auth', () => ({
  authenticate: (req: Request, _res: Response, next: NextFunction) => {
    req.user = { id: 'test-user-id', email: 'test@example.com' };
    next();
  },
}));

// Mock image processing services
jest.mock('../../../services/ai/sensitiveContentDetection', () => ({
  detectSensitiveContent: jest.fn(),
  stripExifFromImage: jest.fn(),
  calculatePrivacyRisk: jest.fn(),
  getRiskLevel: jest.fn(),
}));

jest.mock('../../../services/image/desensitization', () => ({
  desensitizeImage: jest.fn(),
  applyMultiStageDesensitization: jest.fn(),
  previewDesensitization: jest.fn(),
  getRecommendedMethod: jest.fn(),
  calculateDefaultIntensity: jest.fn(),
}));

import {
  detectSensitiveContent,
  stripExifFromImage,
  calculatePrivacyRisk,
  getRiskLevel,
} from '../../../services/ai/sensitiveContentDetection';
import {
  desensitizeImage,
  applyMultiStageDesensitization,
  previewDesensitization,
  getRecommendedMethod,
  calculateDefaultIntensity,
} from '../../../services/image/desensitization';
import privacyRoutes from '../privacy';

const mockedDetectSensitiveContent = detectSensitiveContent as jest.MockedFunction<
  typeof detectSensitiveContent
>;
const mockedStripExifFromImage = stripExifFromImage as jest.MockedFunction<
  typeof stripExifFromImage
>;
const mockedCalculatePrivacyRisk = calculatePrivacyRisk as jest.MockedFunction<
  typeof calculatePrivacyRisk
>;
const mockedGetRiskLevel = getRiskLevel as jest.MockedFunction<typeof getRiskLevel>;
const mockedDesensitizeImage = desensitizeImage as jest.MockedFunction<typeof desensitizeImage>;
const mockedApplyMultiStageDesensitization = applyMultiStageDesensitization as jest.MockedFunction<
  typeof applyMultiStageDesensitization
>;
const mockedPreviewDesensitization = previewDesensitization as jest.MockedFunction<
  typeof previewDesensitization
>;
const mockedGetRecommendedMethod = getRecommendedMethod as jest.MockedFunction<
  typeof getRecommendedMethod
>;
const mockedCalculateDefaultIntensity = calculateDefaultIntensity as jest.MockedFunction<
  typeof calculateDefaultIntensity
>;

// Minimal 1x1 PNG base64 (valid image buffer)
const MINIMAL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

describe('Privacy API Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    app.use('/api/v1/ai/privacy', privacyRoutes);

    jest.clearAllMocks();

    // Default mock implementations
    mockedStripExifFromImage.mockResolvedValue({
      cleanedBuffer: MINIMAL_PNG,
      hadGpsData: false,
      exifData: {},
    });
    mockedDetectSensitiveContent.mockResolvedValue({
      detections: [
        {
          type: 'face',
          boundingBox: { x: 10, y: 10, width: 50, height: 50 },
          confidence: 0.95,
          metadata: {},
        },
      ],
      imageWidth: 100,
      imageHeight: 100,
      processingTime: 150,
    });
    mockedCalculatePrivacyRisk.mockReturnValue(0.65);
    mockedGetRiskLevel.mockReturnValue('medium');
    mockedDesensitizeImage.mockResolvedValue({
      processedImageBuffer: MINIMAL_PNG,
      appliedRegions: 1,
      processingTime: 200,
    });
    mockedApplyMultiStageDesensitization.mockResolvedValue({
      processedImageBuffer: MINIMAL_PNG,
      appliedRegions: 2,
      processingTime: 300,
      steps: ['blur', 'pixelate'],
      originalSize: 5000,
      processedSize: 4800,
    });
    mockedPreviewDesensitization.mockResolvedValue(MINIMAL_PNG);
    mockedGetRecommendedMethod.mockReturnValue('blur');
    mockedCalculateDefaultIntensity.mockReturnValue(70);
  });

  describe('POST /api/v1/ai/privacy/analyze', () => {
    it('should analyze image and return detections', async () => {
      const response = await request(app)
        .post('/api/v1/ai/privacy/analyze')
        .attach('image', MINIMAL_PNG, { filename: 'test.png', contentType: 'image/png' })
        .field('types', 'face,text')
        .field('minConfidence', '0.7')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.detections).toBeInstanceOf(Array);
      expect(response.body.data.detections.length).toBeGreaterThan(0);
      expect(response.body.data.riskScore).toBeDefined();
      expect(response.body.data.riskLevel).toBeDefined();
      expect(response.body.data.exifStripped).toBe(true);
    });

    it('should return 400 when no image is provided', async () => {
      const response = await request(app).post('/api/v1/ai/privacy/analyze').expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No image provided');
    });

    it('should use default types when not specified', async () => {
      const response = await request(app)
        .post('/api/v1/ai/privacy/analyze')
        .attach('image', MINIMAL_PNG, { filename: 'test.png', contentType: 'image/png' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockedDetectSensitiveContent).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.objectContaining({
          types: expect.any(Array),
          minConfidence: 0.7,
        })
      );
    });

    it('should detect GPS data from EXIF', async () => {
      mockedStripExifFromImage.mockResolvedValueOnce({
        cleanedBuffer: MINIMAL_PNG,
        hadGpsData: true,
        exifData: { GPSLatitude: 39.9042 },
      });

      const response = await request(app)
        .post('/api/v1/ai/privacy/analyze')
        .attach('image', MINIMAL_PNG, { filename: 'test.png', contentType: 'image/png' })
        .expect(200);

      expect(response.body.data.hadGpsData).toBe(true);
    });
  });

  describe('POST /api/v1/ai/privacy/desensitize', () => {
    it('should desensitize image with detections', async () => {
      const detections = JSON.stringify([
        {
          type: 'face',
          boundingBox: { x: 10, y: 10, width: 50, height: 50 },
          confidence: 0.95,
        },
      ]);

      const response = await request(app)
        .post('/api/v1/ai/privacy/desensitize')
        .attach('image', MINIMAL_PNG, { filename: 'test.png', contentType: 'image/png' })
        .field('detections', detections)
        .field('method', 'blur')
        .field('intensity', '70')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.processedImage).toMatch(/^data:image\/jpeg;base64,/);
      expect(response.body.data.appliedRegions).toBeDefined();
      expect(response.body.data.processingTimeMs).toBeDefined();
    });

    it('should return 400 when no image is provided', async () => {
      const response = await request(app).post('/api/v1/ai/privacy/desensitize').expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No image provided');
    });

    it('should return 400 for invalid detections JSON', async () => {
      const response = await request(app)
        .post('/api/v1/ai/privacy/desensitize')
        .attach('image', MINIMAL_PNG, { filename: 'test.png', contentType: 'image/png' })
        .field('detections', 'not valid json')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid JSON');
    });

    it('should return 400 for invalid detection schema', async () => {
      const invalidDetections = JSON.stringify([
        {
          type: 'invalid_type',
          boundingBox: { x: 10, y: 10, width: 50, height: 50 },
          confidence: 0.95,
        },
      ]);

      const response = await request(app)
        .post('/api/v1/ai/privacy/desensitize')
        .attach('image', MINIMAL_PNG, { filename: 'test.png', contentType: 'image/png' })
        .field('detections', invalidDetections)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid detections');
    });

    it('should use default method and intensity when not specified', async () => {
      const detections = JSON.stringify([
        {
          type: 'face',
          boundingBox: { x: 10, y: 10, width: 50, height: 50 },
          confidence: 0.95,
        },
      ]);

      const response = await request(app)
        .post('/api/v1/ai/privacy/desensitize')
        .attach('image', MINIMAL_PNG, { filename: 'test.png', contentType: 'image/png' })
        .field('detections', detections)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/v1/ai/privacy/multi-desensitize', () => {
    it('should apply multi-stage desensitization', async () => {
      const regions = JSON.stringify([
        {
          boundingBox: { x: 10, y: 10, width: 50, height: 50 },
          method: 'blur',
          intensity: 70,
        },
        {
          boundingBox: { x: 80, y: 80, width: 30, height: 30 },
          method: 'pixelate',
          intensity: 80,
        },
      ]);

      const response = await request(app)
        .post('/api/v1/ai/privacy/multi-desensitize')
        .attach('image', MINIMAL_PNG, { filename: 'test.png', contentType: 'image/png' })
        .field('regions', regions)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.processedImage).toMatch(/^data:image\/jpeg;base64,/);
      expect(response.body.data.steps).toBeDefined();
      expect(response.body.data.originalSize).toBeDefined();
      expect(response.body.data.processedSize).toBeDefined();
    });

    it('should return 400 when no image is provided', async () => {
      const response = await request(app).post('/api/v1/ai/privacy/multi-desensitize').expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No image provided');
    });

    it('should return 400 for invalid regions JSON', async () => {
      const response = await request(app)
        .post('/api/v1/ai/privacy/multi-desensitize')
        .attach('image', MINIMAL_PNG, { filename: 'test.png', contentType: 'image/png' })
        .field('regions', 'invalid json')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid JSON');
    });

    it('should return 400 for invalid region schema', async () => {
      const invalidRegions = JSON.stringify([
        {
          boundingBox: { x: 10, y: 10, width: 50, height: 50 },
          method: 'invalid_method',
          intensity: 70,
        },
      ]);

      const response = await request(app)
        .post('/api/v1/ai/privacy/multi-desensitize')
        .attach('image', MINIMAL_PNG, { filename: 'test.png', contentType: 'image/png' })
        .field('regions', invalidRegions)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid regions');
    });

    it('should return 400 for invalid bounding box in region', async () => {
      const invalidRegions = JSON.stringify([
        {
          boundingBox: { x: -1, y: 10, width: 50, height: 50 },
          method: 'blur',
          intensity: 70,
        },
      ]);

      const response = await request(app)
        .post('/api/v1/ai/privacy/multi-desensitize')
        .attach('image', MINIMAL_PNG, { filename: 'test.png', contentType: 'image/png' })
        .field('regions', invalidRegions)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/ai/privacy/preview', () => {
    it('should return preview image for bounding box', async () => {
      const boundingBox = JSON.stringify({ x: 10, y: 10, width: 50, height: 50 });

      const response = await request(app)
        .post('/api/v1/ai/privacy/preview')
        .attach('image', MINIMAL_PNG, { filename: 'test.png', contentType: 'image/png' })
        .field('boundingBox', boundingBox)
        .field('method', 'blur')
        .field('intensity', '50')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.previewImage).toMatch(/^data:image\/jpeg;base64,/);
    });

    it('should return 400 when no image is provided', async () => {
      const response = await request(app).post('/api/v1/ai/privacy/preview').expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No image provided');
    });

    it('should return 400 for invalid bounding box JSON', async () => {
      const response = await request(app)
        .post('/api/v1/ai/privacy/preview')
        .attach('image', MINIMAL_PNG, { filename: 'test.png', contentType: 'image/png' })
        .field('boundingBox', 'not json')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid JSON');
    });

    it('should return 400 for invalid bounding box schema', async () => {
      const invalidBbox = JSON.stringify({ x: -1, y: 10, width: 50, height: 50 });

      const response = await request(app)
        .post('/api/v1/ai/privacy/preview')
        .attach('image', MINIMAL_PNG, { filename: 'test.png', contentType: 'image/png' })
        .field('boundingBox', invalidBbox)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid boundingBox');
    });

    it('should use default method and intensity when not specified', async () => {
      const boundingBox = JSON.stringify({ x: 10, y: 10, width: 50, height: 50 });

      const response = await request(app)
        .post('/api/v1/ai/privacy/preview')
        .attach('image', MINIMAL_PNG, { filename: 'test.png', contentType: 'image/png' })
        .field('boundingBox', boundingBox)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/v1/ai/privacy/strip-exif', () => {
    it('should strip EXIF data and return cleaned image', async () => {
      mockedStripExifFromImage.mockResolvedValueOnce({
        cleanedBuffer: MINIMAL_PNG,
        hadGpsData: true,
        exifData: {
          GPSLatitude: 39.9042,
          GPSLongitude: 116.4074,
          Make: 'Canon',
          Model: 'EOS 5D',
        },
      });

      const response = await request(app)
        .post('/api/v1/ai/privacy/strip-exif')
        .attach('image', MINIMAL_PNG, { filename: 'test.png', contentType: 'image/png' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.cleanedImage).toMatch(/^data:image\/jpeg;base64,/);
      expect(response.body.data.hadGpsData).toBe(true);
      expect(response.body.data.exifData).toBeDefined();
    });

    it('should return 400 when no image is provided', async () => {
      const response = await request(app).post('/api/v1/ai/privacy/strip-exif').expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No image provided');
    });

    it('should handle images without GPS data', async () => {
      mockedStripExifFromImage.mockResolvedValueOnce({
        cleanedBuffer: MINIMAL_PNG,
        hadGpsData: false,
        exifData: { Make: 'Canon' },
      });

      const response = await request(app)
        .post('/api/v1/ai/privacy/strip-exif')
        .attach('image', MINIMAL_PNG, { filename: 'test.png', contentType: 'image/png' })
        .expect(200);

      expect(response.body.data.hadGpsData).toBe(false);
    });
  });

  describe('GET /api/v1/ai/privacy/recommendations/:contentType', () => {
    it('should return recommended method and intensity for face', async () => {
      mockedGetRecommendedMethod.mockReturnValue('blur');
      mockedCalculateDefaultIntensity.mockReturnValue(75);

      const response = await request(app)
        .get('/api/v1/ai/privacy/recommendations/face')
        .query({ confidence: '0.8' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.recommendedMethod).toBe('blur');
      expect(response.body.data.recommendedIntensity).toBe(75);
    });

    it('should return recommended method for license_plate', async () => {
      mockedGetRecommendedMethod.mockReturnValue('blackout');
      mockedCalculateDefaultIntensity.mockReturnValue(100);

      const response = await request(app)
        .get('/api/v1/ai/privacy/recommendations/license_plate')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.recommendedMethod).toBe('blackout');
    });

    it('should use default confidence when not specified', async () => {
      mockedGetRecommendedMethod.mockReturnValue('blur');
      mockedCalculateDefaultIntensity.mockReturnValue(70);

      const response = await request(app)
        .get('/api/v1/ai/privacy/recommendations/face')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockedCalculateDefaultIntensity).toHaveBeenCalledWith('face', 0.8);
    });
  });
});
