/**
 * Supply AI Routes Tests
 */

import request from 'supertest';
import express, { Express } from 'express';

const mockExtract = jest.fn();
const mockExtractBulk = jest.fn();
const mockInitialize = jest.fn().mockResolvedValue(undefined);

jest.mock('../../../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { id: 'test-user-id', email: 'test@test.com' };
    next();
  },
}));
jest.mock('../../../services/ai/supplyExtractionService', () => ({
  SupplyExtractionService: jest.fn().mockImplementation(() => ({
    initialize: mockInitialize,
    extract: mockExtract,
    extractBulk: mockExtractBulk,
  })),
}));
jest.mock('../../../db/client', () => ({
  prisma: {
    agentProfile: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    scene: {
      findUnique: jest.fn(),
    },
  },
}));

import supplyRoutes from '../supply';
import { prisma } from '../../../db/client';

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

function createMockExtractionResult(overrides = {}) {
  return {
    success: true,
    supply: {
      title: '专业摄影服务',
      description: '高端人像摄影',
      serviceType: 'photography',
      capabilities: ['portrait', 'wedding'],
      pricing: { minPrice: 1000, maxPrice: 5000, currency: 'CNY' },
      skills: ['lightroom', 'photoshop'],
      availability: { weekdays: true, weekends: true },
      location: { city: '北京', remote: false, onsite: true },
      experience: { years: 5, projects: 100 },
      quality: {
        overallScore: 85,
        confidence: 0.9,
        completenessScore: 80,
        clarityScore: 90,
        relevanceScore: 85,
      },
    },
    fieldsExtracted: ['title', 'description', 'serviceType', 'capabilities', 'pricing'],
    fieldsFailed: [],
    provider: 'openai',
    model: 'gpt-4',
    latencyMs: 150,
    ...overrides,
  };
}

describe('Supply AI Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/ai', supplyRoutes);

    mockExtract.mockReset();
    mockExtractBulk.mockReset();
    mockInitialize.mockReset().mockResolvedValue(undefined);
  });

  describe('POST /api/v1/ai/extract-supply', () => {
    it('should extract supply successfully', async () => {
      mockExtract.mockResolvedValue(createMockExtractionResult());

      const response = await request(app)
        .post('/api/v1/ai/extract-supply')
        .send({
          text: '我是一名专业摄影师，提供人像摄影和婚礼摄影服务',
          scene: 'visionShare',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.supply.title).toBe('专业摄影服务');
      expect(response.body.data.supply.service_type).toBe('photography');
      expect(response.body.data.quality_report).toBeDefined();
      expect(response.body.data.quality_report.overall_quality).toBe(85);
      expect(response.body.data.metadata.provider).toBe('openai');
    });

    it('should handle extraction errors gracefully', async () => {
      mockExtract.mockRejectedValue(new Error('LLM service unavailable'));

      const response = await request(app)
        .post('/api/v1/ai/extract-supply')
        .send({
          text: '我是一名专业摄影师，提供人像摄影和婚礼摄影服务',
          scene: 'visionShare',
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('LLM service unavailable');
    });

    it('should return 503 when circuit breaker is open', async () => {
      mockExtract.mockRejectedValue(new Error('Circuit breaker is open'));

      const response = await request(app)
        .post('/api/v1/ai/extract-supply')
        .send({
          text: '我是一名专业摄影师，提供人像摄影和婚礼摄影服务',
          scene: 'visionShare',
        })
        .expect(503);

      expect(response.body.success).toBe(false);
    });

    it('should store result when agent_id is provided', async () => {
      mockExtract.mockResolvedValue(createMockExtractionResult());
      (mockedPrisma.scene.findUnique as jest.Mock).mockResolvedValue({ id: 'scene-1' });
      (mockedPrisma.agentProfile.upsert as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .post('/api/v1/ai/extract-supply')
        .send({
          text: '我是一名专业摄影师，提供人像摄影和婚礼摄影服务',
          scene: 'visionShare',
          agent_id: '550e8400-e29b-41d4-a716-446655440000',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockedPrisma.agentProfile.upsert).toHaveBeenCalled();
    });

    it('should handle store failure gracefully', async () => {
      mockExtract.mockResolvedValue(createMockExtractionResult());
      (mockedPrisma.scene.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/api/v1/ai/extract-supply')
        .send({
          text: '我是一名专业摄影师，提供人像摄影和婚礼摄影服务',
          scene: 'visionShare',
          agent_id: '550e8400-e29b-41d4-a716-446655440000',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should pass extraction options correctly', async () => {
      mockExtract.mockResolvedValue(createMockExtractionResult());

      await request(app)
        .post('/api/v1/ai/extract-supply')
        .send({
          text: '我是一名专业摄影师，提供人像摄影和婚礼摄影服务',
          scene: 'visionShare',
          options: {
            include_capabilities: true,
            include_pricing: true,
            include_availability: false,
            include_location: true,
            include_experience: false,
            min_confidence: 60,
          },
        })
        .expect(200);

      expect(mockExtract).toHaveBeenCalledWith(
        expect.objectContaining({
          options: {
            includeCapabilities: true,
            includePricing: true,
            includeAvailability: false,
            includeLocation: true,
            includeExperience: false,
            minConfidence: 60,
          },
        })
      );
    });
  });

  describe('POST /api/v1/ai/extract-supply/bulk', () => {
    it('should process bulk extraction successfully', async () => {
      mockExtractBulk.mockResolvedValue({
        success: true,
        results: [createMockExtractionResult()],
        total: 1,
        failed: 0,
        qualityReport: { averageScore: 85 },
      });

      const response = await request(app)
        .post('/api/v1/ai/extract-supply/bulk')
        .send({
          items: [
            {
              text: '我是一名专业摄影师，提供人像摄影和婚礼摄影服务',
              scene: 'visionShare',
            },
          ],
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.results).toHaveLength(1);
      expect(response.body.data.summary.total).toBe(1);
      expect(response.body.data.summary.successful).toBe(1);
      expect(response.body.data.summary.failed).toBe(0);
    });

    it('should handle bulk extraction errors', async () => {
      mockExtractBulk.mockRejectedValue(new Error('Bulk extraction failed'));

      const response = await request(app)
        .post('/api/v1/ai/extract-supply/bulk')
        .send({
          items: [
            {
              text: '我是一名专业摄影师，提供人像摄影和婚礼摄影服务',
              scene: 'visionShare',
            },
          ],
        })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should handle circuit breaker in bulk mode', async () => {
      mockExtractBulk.mockRejectedValue(new Error('Circuit breaker is open'));

      const response = await request(app)
        .post('/api/v1/ai/extract-supply/bulk')
        .send({
          items: [
            {
              text: '我是一名专业摄影师，提供人像摄影和婚礼摄影服务',
              scene: 'visionShare',
            },
          ],
        })
        .expect(503);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/ai/extract-supply/quality/:agentId', () => {
    it('should return quality report for agent', async () => {
      (mockedPrisma.agentProfile.findMany as jest.Mock).mockResolvedValue([
        {
          sceneId: 'scene-1',
          l2Data: { title: '摄影服务' },
          l3Description: '高端人像摄影',
        },
      ]);

      const response = await request(app)
        .get('/api/v1/ai/extract-supply/quality/test-agent-id')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.agent_id).toBe('test-agent-id');
      expect(response.body.data.scenes).toBe(1);
      expect(response.body.data.reports).toHaveLength(1);
    });

    it('should return 404 when no data found for agent', async () => {
      (mockedPrisma.agentProfile.findMany as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .get('/api/v1/ai/extract-supply/quality/unknown-agent')
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should handle database errors', async () => {
      (mockedPrisma.agentProfile.findMany as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .get('/api/v1/ai/extract-supply/quality/test-agent-id')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/ai/extract-supply/sync', () => {
    it('should sync supply data successfully', async () => {
      const response = await request(app)
        .post('/api/v1/ai/extract-supply/sync')
        .send({
          supply_id: '550e8400-e29b-41d4-a716-446655440000',
          data: { title: 'Updated Title', description: 'Updated Description' },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.supply_id).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(response.body.data.synced_at).toBeDefined();
      expect(response.body.data.fields_updated).toEqual(['title', 'description']);
    });
  });
});
