/**
 * AI Extraction E2E Tests
 * Tests the full HTTP request flow for AI extraction API endpoints
 */

/* eslint-disable import/order */
import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';
import { getL2Schema } from '@bridgeai/shared';
jest.mock('../../services/ai/clarificationService');
jest.mock('../../services/ai/index', () => ({
  clarificationService: {},
  demandExtractionService: {},
  demandToL2Mapper: {},
  extractionValidator: {},
}));
jest.mock('../../services/ai/demandExtractionService');
jest.mock('../../services/ai/mappers/demandToL2Mapper');
jest.mock('../../services/ai/validators/extractionValidator');
jest.mock('../../services/ai/extractionService');
jest.mock('../../services/ai/consumerDemandAI');
jest.mock('../../routes/ai/offerExtraction', () => ({
  default: (req: any, res: any, next: any) => next(),
  __esModule: true,
}));
jest.mock('@bridgeai/shared', () => ({
  getL2Schema: jest.fn(),
  L2FieldType: {
    TEXT: 'text',
    NUMBER: 'number',
    ENUM: 'enum',
    MULTI_SELECT: 'multi_select',
    RANGE: 'range',
    BOOLEAN: 'boolean',
    DATE: 'date',
    DATETIME: 'datetime',
    TIME: 'time',
    LONG_TEXT: 'long_text',
  },
}));
import aiExtractionRoutes from '../../routes/ai/extraction';
import { demandExtractionService } from '../../services/ai/demandExtractionService';
import { demandToL2Mapper } from '../../services/ai/mappers/demandToL2Mapper';
import { extractionValidator } from '../../services/ai/validators/extractionValidator';

const mockedDemandExtractionService = demandExtractionService as jest.Mocked<
  typeof demandExtractionService
>;
const mockedDemandToL2Mapper = demandToL2Mapper as jest.Mocked<typeof demandToL2Mapper>;
const mockedExtractionValidator = extractionValidator as jest.Mocked<typeof extractionValidator>;
const mockedGetL2Schema = getL2Schema as jest.MockedFunction<typeof getL2Schema>;

describe('AI Extraction E2E', () => {
  let app: Express;

  const mockSchema = {
    id: 'vision-share',
    version: '1.0.0',
    scene: 'visionShare',
    title: 'Vision Share',
    description: '摄影分享',
    fields: [
      { id: 'title', type: 'text', label: '标题', required: true },
      { id: 'location', type: 'text', label: '地点', required: false },
      { id: 'budgetMax', type: 'number', label: '预算', required: false },
    ],
  };

  const mockDemand = {
    rawText: '我想在北京拍摄，预算5000元',
    intent: { intent: 'create_demand', confidence: 0.95, alternatives: [] },
    entities: [
      { type: 'location', value: '北京', confidence: 0.92, startIndex: 3, endIndex: 5 },
      { type: 'budget', value: '5000元', confidence: 0.9, startIndex: 9, endIndex: 14 },
    ],
    structured: {
      title: '拍摄需求',
      description: '我想在北京拍摄，预算5000元',
      location: { city: '北京' },
      budget: { max: 5000, currency: 'CNY' },
    },
    confidence: 0.92,
    clarificationNeeded: false,
    clarificationQuestions: [],
    metadata: {
      processedAt: new Date(),
      provider: 'openai',
      model: 'gpt-4',
      latencyMs: 150,
      version: '1.0.0',
    },
  };

  const mockMappingResult = {
    success: true,
    data: {
      title: '拍摄需求',
      location: '北京',
      budgetMax: 5000,
    },
    mappedFields: ['title', 'location', 'budgetMax'],
    unmappedFields: [],
    inferredFields: [],
    conflicts: [],
    transformations: [],
  };

  const mockValidationReport = {
    valid: true,
    errors: [],
    warnings: [],
    infos: [],
    summary: {
      totalIssues: 0,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      completenessScore: 85,
    },
    suggestions: [],
    confirmationNeeded: false,
  };

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use((req: Request, res: Response, next: NextFunction) => {
      req.user = { id: 'test-user-id' };
      next();
    });
    app.use('/api/v1/ai', aiExtractionRoutes);
    jest.clearAllMocks();
  });

  describe('E2E: POST /api/v1/ai/extract-demand - Full Success Flow', () => {
    it('should return complete extraction result with all pipeline stages', async () => {
      mockedGetL2Schema.mockReturnValue(mockSchema as any);
      mockedDemandExtractionService.extract.mockResolvedValue(mockDemand as any);
      mockedDemandToL2Mapper.map.mockReturnValue(mockMappingResult as any);
      mockedExtractionValidator.validate.mockReturnValue(mockValidationReport as any);

      const response = await request(app)
        .post('/api/v1/ai/extract-demand')
        .send({
          text: '我想在北京拍摄，预算5000元',
          scene: 'visionShare',
        })
        .expect('Content-Type', /json/)
        .expect(200);

      // Verify response structure
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      // Stage 1: Demand extraction result
      expect(response.body.data.demand).toBeDefined();
      expect(response.body.data.demand.rawText).toBe('我想在北京拍摄，预算5000元');
      expect(response.body.data.demand.intent.intent).toBe('create_demand');
      expect(response.body.data.demand.entities).toHaveLength(2);
      expect(response.body.data.demand.confidence).toBe(0.92);

      // Stage 2: L2 mapping result
      expect(response.body.data.l2Data).toBeDefined();
      expect(response.body.data.l2Data.title).toBe('拍摄需求');
      expect(response.body.data.l2Data.location).toBe('北京');
      expect(response.body.data.mapping).toBeDefined();
      expect(response.body.data.mapping.mappedFields).toHaveLength(3);
      expect(response.body.data.mapping.unmappedFields).toHaveLength(0);

      // Stage 3: Validation result
      expect(response.body.data.validation).toBeDefined();
      expect(response.body.data.validation.valid).toBe(true);
      expect(response.body.data.validation.completenessScore).toBe(85);

      // Summary
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.summary.scene).toBe('visionShare');
      expect(response.body.data.summary.confidence).toBe(0.92);
      expect(response.body.data.summary.clarificationNeeded).toBe(false);
      expect(response.body.data.summary.mappedFieldCount).toBe(3);
      expect(response.body.data.summary.validationPassed).toBe(true);

      // Meta
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.version).toBe('1.0.0');
      expect(response.body.meta.latencyMs).toBeDefined();

      // Verify all pipeline stages were called
      expect(mockedDemandExtractionService.extract).toHaveBeenCalledTimes(1);
      expect(mockedDemandToL2Mapper.map).toHaveBeenCalledTimes(1);
      expect(mockedExtractionValidator.validate).toHaveBeenCalledTimes(1);
    });
  });

  describe('E2E: Error Response Flows', () => {
    it('should return 400 for missing text', async () => {
      const response = await request(app)
        .post('/api/v1/ai/extract-demand')
        .send({ scene: 'visionShare' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REQUEST');
    });

    it('should return 400 for missing scene', async () => {
      const response = await request(app)
        .post('/api/v1/ai/extract-demand')
        .send({ text: '测试文本' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REQUEST');
    });

    it('should return 400 for invalid scene', async () => {
      mockedGetL2Schema.mockReturnValue(null);

      const response = await request(app)
        .post('/api/v1/ai/extract-demand')
        .send({ text: '测试文本', scene: 'nonexistent' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_SCENE');
    });

    it('should return 500 when extraction service fails', async () => {
      mockedGetL2Schema.mockReturnValue(mockSchema as any);
      mockedDemandExtractionService.extract.mockRejectedValue(new Error('LLM timeout'));

      const response = await request(app)
        .post('/api/v1/ai/extract-demand')
        .send({ text: '测试', scene: 'visionShare' })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EXTRACTION_FAILED');
    });
  });

  describe('E2E: Batch Extraction Flow', () => {
    it('should process multiple demands in batch', async () => {
      mockedGetL2Schema.mockReturnValue(mockSchema as any);
      mockedDemandExtractionService.extract
        .mockResolvedValueOnce({
          rawText: '需求1',
          intent: { intent: 'create_demand', confidence: 0.9 },
          entities: [],
          confidence: 0.9,
        } as any)
        .mockResolvedValueOnce({
          rawText: '需求2',
          intent: { intent: 'search_demand', confidence: 0.85 },
          entities: [],
          confidence: 0.85,
        } as any);

      const response = await request(app)
        .post('/api/v1/ai/extract-demand/batch')
        .send({
          items: [
            { id: '1', text: '需求1' },
            { id: '2', text: '需求2' },
          ],
          scene: 'visionShare',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.results).toHaveLength(2);
      expect(response.body.data.summary.total).toBe(2);
      expect(response.body.data.summary.success).toBe(2);
      expect(response.body.data.summary.successRate).toBe(100);
    });

    it('should handle partial batch failures', async () => {
      mockedGetL2Schema.mockReturnValue(mockSchema as any);
      mockedDemandExtractionService.extract
        .mockResolvedValueOnce({
          rawText: '成功',
          intent: { intent: 'create_demand', confidence: 0.9 },
          entities: [],
          confidence: 0.9,
        } as any)
        .mockRejectedValueOnce(new Error('Failed'));

      const response = await request(app)
        .post('/api/v1/ai/extract-demand/batch')
        .send({
          items: [
            { id: '1', text: '成功' },
            { id: '2', text: '失败' },
          ],
          scene: 'visionShare',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.total).toBe(2);
      expect(response.body.data.summary.success).toBe(1);
      expect(response.body.data.summary.failed).toBe(1);
      expect(response.body.data.errors).toHaveLength(1);
    });
  });

  describe('E2E: Scene Configuration Flow', () => {
    it('should return scene config for valid scene', async () => {
      mockedGetL2Schema.mockReturnValue(mockSchema as any);

      const response = await request(app).get('/api/v1/ai/scenes/visionShare/config').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.scene).toBe('visionShare');
      expect(response.body.data.schema).toBeDefined();
      expect(response.body.data.schema.fields).toHaveLength(3);
    });

    it('should return 404 for unknown scene config', async () => {
      mockedGetL2Schema.mockReturnValue(null);

      const response = await request(app).get('/api/v1/ai/scenes/unknown/config').expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SCENE_NOT_FOUND');
    });
  });

  describe('E2E: Confirmation Flow', () => {
    it('should confirm extraction result', async () => {
      const response = await request(app)
        .post('/api/v1/ai/extract-demand/test-id/confirm')
        .send({ confirmed: true, corrections: { title: '修正标题' } })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.confirmed).toBe(true);
      expect(response.body.data.extractionId).toBe('test-id');
      expect(response.body.data.corrections).toEqual({ title: '修正标题' });
    });

    it('should reject unconfirmed extraction', async () => {
      const response = await request(app)
        .post('/api/v1/ai/extract-demand/test-id/confirm')
        .send({ confirmed: false })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_CONFIRMED');
    });
  });

  describe('E2E: Feedback Flow', () => {
    it('should accept extraction feedback', async () => {
      const response = await request(app)
        .post('/api/v1/ai/extract-demand/feedback')
        .send({
          extractionId: 'ext-123',
          rating: 5,
          feedback: '提取结果非常准确',
          corrections: { budget: 8000 },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.received).toBe(true);
      expect(response.body.data.feedbackId).toBeDefined();
    });
  });
});
