/**
 * AI Extraction Routes Tests
 */

/* eslint-disable import/order */
import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';
jest.mock('../../../services/ai/clarificationService');
jest.mock('../../../services/ai/index', () => ({
  clarificationService: {},
  demandExtractionService: {},
  demandToL2Mapper: {},
  extractionValidator: {},
}));
import { getL2Schema } from '@bridgeai/shared';
import aiExtractionRoutes from '../extraction';
// Mock dependencies
jest.mock('../../../services/ai/demandExtractionService');
jest.mock('../../../services/ai/mappers/demandToL2Mapper');
jest.mock('../../../services/ai/validators/extractionValidator');
jest.mock('@bridgeai/shared', () => ({
  getL2Schema: jest.fn(),
  L2FieldType: {
    TEXT: 'text',
    NUMBER: 'number',
    ENUM: 'enum',
  },
}));

import { demandExtractionService } from '../../../services/ai/demandExtractionService';
import { demandToL2Mapper } from '../../../services/ai/mappers/demandToL2Mapper';
import { extractionValidator } from '../../../services/ai/validators/extractionValidator';

const mockedDemandExtractionService = demandExtractionService as jest.Mocked<
  typeof demandExtractionService
>;
const mockedDemandToL2Mapper = demandToL2Mapper as jest.Mocked<typeof demandToL2Mapper>;
const mockedExtractionValidator = extractionValidator as jest.Mocked<typeof extractionValidator>;
const mockedGetL2Schema = getL2Schema as jest.MockedFunction<typeof getL2Schema>;

describe('AI Extraction Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Mock authentication middleware
    app.use((req: Request, res: Response, next: NextFunction) => {
      req.user = { id: 'test-user-id' };
      next();
    });

    app.use('/api/v1/ai', aiExtractionRoutes);

    jest.clearAllMocks();
  });

  describe('POST /api/v1/ai/extract-demand', () => {
    const mockSchema = {
      id: 'vision-share',
      version: '1.0.0',
      scene: 'visionShare',
      title: 'Vision Share',
      fields: [
        { id: 'title', type: 'text', label: 'Title', required: true },
        { id: 'location', type: 'text', label: 'Location', required: false },
      ],
    };

    const mockDemand = {
      id: 'test-demand-id',
      rawText: '我想在北京拍摄',
      intent: {
        intent: 'create_demand',
        confidence: 0.95,
        alternatives: [],
      },
      entities: [{ type: 'location', value: '北京', confidence: 0.9, startIndex: 3, endIndex: 5 }],
      confidence: 0.9,
      clarificationNeeded: false,
      clarificationQuestions: [],
      structured: {
        title: '拍摄需求',
        location: { city: '北京' },
      },
      metadata: {
        processedAt: new Date(),
        provider: 'openai',
        model: 'gpt-4',
        latencyMs: 100,
        version: '1.0.0',
      },
    };

    const mockMappingResult = {
      success: true,
      data: {
        title: '拍摄需求',
        location: '北京',
      },
      mappedFields: ['title', 'location'],
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

    it('should extract demand successfully', async () => {
      mockedGetL2Schema.mockReturnValue(mockSchema as any);
      mockedDemandExtractionService.extract.mockResolvedValue(mockDemand as any);
      mockedDemandToL2Mapper.map.mockReturnValue(mockMappingResult as any);
      mockedExtractionValidator.validate.mockReturnValue(mockValidationReport as any);

      const response = await request(app)
        .post('/api/v1/ai/extract-demand')
        .send({
          text: '我想在北京拍摄',
          scene: 'visionShare',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.demand.rawText).toBe('我想在北京拍摄');
      expect(response.body.data.demand.intent.intent).toBe('create_demand');
      expect(response.body.data.l2Data).toBeDefined();
      expect(response.body.data.validation.valid).toBe(true);
      expect(response.body.meta).toBeDefined();
    });

    it('should return 400 for missing text', async () => {
      const response = await request(app)
        .post('/api/v1/ai/extract-demand')
        .send({
          scene: 'visionShare',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REQUEST');
    });

    it('should return 400 for missing scene', async () => {
      const response = await request(app)
        .post('/api/v1/ai/extract-demand')
        .send({
          text: '我想在北京拍摄',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REQUEST');
    });

    it('should return 400 for invalid scene', async () => {
      mockedGetL2Schema.mockReturnValue(null);

      const response = await request(app)
        .post('/api/v1/ai/extract-demand')
        .send({
          text: '我想在北京拍摄',
          scene: 'invalid-scene',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_SCENE');
    });

    it('should handle extraction errors', async () => {
      mockedGetL2Schema.mockReturnValue(mockSchema as any);
      mockedDemandExtractionService.extract.mockRejectedValue(new Error('Extraction failed'));

      const response = await request(app)
        .post('/api/v1/ai/extract-demand')
        .send({
          text: '我想在北京拍摄',
          scene: 'visionShare',
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EXTRACTION_FAILED');
    });

    it('should include clarification needed flag', async () => {
      const demandWithClarification = {
        ...mockDemand,
        clarificationNeeded: true,
        clarificationQuestions: ['请问您的预算是多少？'],
      };

      mockedGetL2Schema.mockReturnValue(mockSchema as any);
      mockedDemandExtractionService.extract.mockResolvedValue(demandWithClarification as any);
      mockedDemandToL2Mapper.map.mockReturnValue(mockMappingResult as any);
      mockedExtractionValidator.validate.mockReturnValue(mockValidationReport as any);

      const response = await request(app)
        .post('/api/v1/ai/extract-demand')
        .send({
          text: '我想在北京拍摄',
          scene: 'visionShare',
          options: {
            requireClarification: true,
          },
        })
        .expect(200);

      expect(response.body.data.demand.clarificationNeeded).toBe(true);
      expect(response.body.data.demand.clarificationQuestions).toHaveLength(1);
      expect(response.body.data.summary.clarificationNeeded).toBe(true);
    });

    it('should handle validation errors', async () => {
      const validationWithErrors = {
        ...mockValidationReport,
        valid: false,
        errors: [
          {
            ruleId: 'required_field_missing',
            field: 'title',
            message: 'Required field "Title" is missing',
            severity: 'error',
            category: 'completeness',
          },
        ],
        summary: {
          ...mockValidationReport.summary,
          errorCount: 1,
          completenessScore: 50,
        },
      };

      mockedGetL2Schema.mockReturnValue(mockSchema as any);
      mockedDemandExtractionService.extract.mockResolvedValue(mockDemand as any);
      mockedDemandToL2Mapper.map.mockReturnValue(mockMappingResult as any);
      mockedExtractionValidator.validate.mockReturnValue(validationWithErrors as any);

      const response = await request(app)
        .post('/api/v1/ai/extract-demand')
        .send({
          text: '我想在北京拍摄',
          scene: 'visionShare',
        })
        .expect(200);

      expect(response.body.data.validation.valid).toBe(false);
      expect(response.body.data.validation.errors).toHaveLength(1);
      expect(response.body.data.summary.validationPassed).toBe(false);
    });
  });

  describe('POST /api/v1/ai/extract-demand/batch', () => {
    it('should process batch extraction', async () => {
      const mockSchema = {
        id: 'vision-share',
        scene: 'visionShare',
        fields: [],
      };

      mockedGetL2Schema.mockReturnValue(mockSchema as any);
      mockedDemandExtractionService.extract.mockResolvedValue({
        rawText: 'test',
        intent: { intent: 'create_demand', confidence: 0.9 },
        entities: [],
        confidence: 0.9,
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
    });

    it('should return 400 for empty items array', async () => {
      const response = await request(app)
        .post('/api/v1/ai/extract-demand/batch')
        .send({
          items: [],
          scene: 'visionShare',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REQUEST');
    });

    it('should return 400 for missing items', async () => {
      const response = await request(app)
        .post('/api/v1/ai/extract-demand/batch')
        .send({
          scene: 'visionShare',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/ai/extract-demand/:id/confirm', () => {
    it('should confirm extraction', async () => {
      const response = await request(app)
        .post('/api/v1/ai/extract-demand/test-id/confirm')
        .send({
          confirmed: true,
          corrections: {
            title: 'Corrected Title',
          },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.extractionId).toBe('test-id');
      expect(response.body.data.confirmed).toBe(true);
    });

    it('should return 400 when not confirmed', async () => {
      const response = await request(app)
        .post('/api/v1/ai/extract-demand/test-id/confirm')
        .send({
          confirmed: false,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_CONFIRMED');
    });
  });

  describe('GET /api/v1/ai/extract-demand/:id/status', () => {
    it('should return extraction status', async () => {
      const response = await request(app)
        .get('/api/v1/ai/extract-demand/test-id/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.extractionId).toBe('test-id');
      expect(response.body.data.status).toBeDefined();
    });
  });

  describe('POST /api/v1/ai/extract-demand/feedback', () => {
    it('should accept feedback', async () => {
      const response = await request(app)
        .post('/api/v1/ai/extract-demand/feedback')
        .send({
          extractionId: 'test-id',
          rating: 5,
          feedback: 'Great extraction!',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.received).toBe(true);
    });

    it('should handle feedback submission', async () => {
      const response = await request(app)
        .post('/api/v1/ai/extract-demand/feedback')
        .send({
          extractionId: 'test-id',
          rating: 3,
          feedback: 'Could be better',
          corrections: {
            location: 'Corrected Location',
          },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.feedbackId).toBeDefined();
    });
  });

  describe('GET /api/v1/ai/scenes/:scene/config', () => {
    it('should return scene configuration', async () => {
      const mockSchema = {
        id: 'vision-share',
        version: '1.0.0',
        scene: 'visionShare',
        title: 'Vision Share',
        description: '摄影分享场景',
        fields: [
          { id: 'title', type: 'text', label: 'Title', required: true },
          { id: 'location', type: 'text', label: 'Location', required: false },
        ],
      };

      mockedGetL2Schema.mockReturnValue(mockSchema as any);

      const response = await request(app).get('/api/v1/ai/scenes/visionShare/config').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.scene).toBe('visionShare');
      expect(response.body.data.schema).toBeDefined();
      expect(response.body.data.schema.fields).toHaveLength(2);
    });

    it('should return 404 for unknown scene', async () => {
      mockedGetL2Schema.mockReturnValue(null);

      const response = await request(app).get('/api/v1/ai/scenes/unknown/config').expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SCENE_NOT_FOUND');
    });
  });
});
