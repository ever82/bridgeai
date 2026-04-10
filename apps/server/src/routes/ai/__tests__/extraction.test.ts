/**
 * AI Extraction Routes Tests
 */

import request from 'supertest';
import express, { Application } from 'express';
import extractionRoutes from '../extraction';
import { authenticateToken } from '../../../middleware/auth';

// Mock middleware
jest.mock('../../../middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user-id', email: 'test@example.com' };
    next();
  },
}));

// Mock services
jest.mock('../../../services/ai/demandExtractionService', () => ({
  DemandExtractionService: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    extract: jest.fn().mockResolvedValue({
      id: 'demand-test-123',
      scene: 'VISIONSHARE',
      intent: {
        primary: 'find_collaborator',
        confidence: 85,
        alternatives: [],
      },
      entities: {
        time: [],
        location: [],
        people: [],
        organizations: [],
        keywords: ['摄影'],
      },
      attributes: {
        contentType: ['photography'],
        purpose: 'collaborate',
        skillLevel: 'intermediate',
      },
      rawText: '我想找个一起拍照的朋友',
      confidence: 82,
      fieldConfidence: { contentType: 90 },
      extractedAt: new Date(),
      clarificationNeeded: false,
      missingFields: [],
      suggestedQuestions: [],
    }),
  })),
}));

jest.mock('../../../services/ai/mappers/demandToL2Mapper', () => ({
  DemandToL2Mapper: jest.fn().mockImplementation(() => ({
    map: jest.fn().mockReturnValue({
      success: true,
      data: {
        contentType: ['photography'],
        purpose: 'collaborate',
        skillLevel: 'intermediate',
      },
      mappedFields: ['contentType', 'purpose', 'skillLevel'],
      unmappedFields: [],
      standardizedFields: [],
      inferredFields: [],
      conflicts: [],
      errors: [],
    }),
  })),
}));

jest.mock('../../../services/ai/validators/extractionValidator', () => ({
  ExtractionValidator: jest.fn().mockImplementation(() => ({
    validate: jest.fn().mockReturnValue({
      valid: true,
      isComplete: true,
      canProceed: true,
      errors: [],
      warnings: [],
      missingRequired: [],
      invalidFields: [],
      suggestions: [],
    }),
    recordConfirmation: jest.fn(),
  })),
}));

describe('AI Extraction Routes', () => {
  let app: Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/ai/extract', extractionRoutes);
  });

  describe('POST /api/v1/ai/extract/extract-demand', () => {
    it('should extract demand from text', async () => {
      const response = await request(app)
        .post('/api/v1/ai/extract/extract-demand')
        .set('Authorization', 'Bearer test-token')
        .send({
          text: '我想找个一起拍照的朋友',
          scene: 'VISIONSHARE',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.extraction).toBeDefined();
      expect(response.body.data.extraction.scene).toBe('VISIONSHARE');
      expect(response.body.data.extraction.confidence).toBe(82);
      expect(response.body.data.clarificationNeeded).toBeDefined();
    });

    it('should return 400 for invalid scene', async () => {
      const response = await request(app)
        .post('/api/v1/ai/extract/extract-demand')
        .set('Authorization', 'Bearer test-token')
        .send({
          text: 'test text',
          scene: 'INVALID_SCENE',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid scene');
    });

    it('should return 400 for missing text', async () => {
      const response = await request(app)
        .post('/api/v1/ai/extract/extract-demand')
        .set('Authorization', 'Bearer test-token')
        .send({
          scene: 'VISIONSHARE',
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for missing scene', async () => {
      const response = await request(app)
        .post('/api/v1/ai/extract/extract-demand')
        .set('Authorization', 'Bearer test-token')
        .send({
          text: 'test text',
        });

      expect(response.status).toBe(400);
    });

    it('should accept optional agentId and context', async () => {
      const response = await request(app)
        .post('/api/v1/ai/extract/extract-demand')
        .set('Authorization', 'Bearer test-token')
        .send({
          text: '我想找个一起拍照的朋友',
          scene: 'VISIONSHARE',
          agentId: 'test-agent-id',
          context: {
            conversationHistory: [
              { role: 'user', content: 'hello' },
            ],
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return mapped data in response', async () => {
      const response = await request(app)
        .post('/api/v1/ai/extract/extract-demand')
        .set('Authorization', 'Bearer test-token')
        .send({
          text: '我想找个一起拍照的朋友',
          scene: 'VISIONSHARE',
        });

      expect(response.body.data.mappedData).toBeDefined();
      expect(response.body.data.mappedData.attributes).toBeDefined();
      expect(response.body.data.mappedData.mappedFields).toBeInstanceOf(Array);
    });

    it('should return validation results', async () => {
      const response = await request(app)
        .post('/api/v1/ai/extract/extract-demand')
        .set('Authorization', 'Bearer test-token')
        .send({
          text: '我想找个一起拍照的朋友',
          scene: 'VISIONSHARE',
        });

      expect(response.body.data.validation).toBeDefined();
      expect(response.body.data.validation.valid).toBe(true);
      expect(response.body.data.validation.isComplete).toBe(true);
    });
  });

  describe('POST /api/v1/ai/extract/extract-batch', () => {
    it('should extract multiple demands in batch', async () => {
      const response = await request(app)
        .post('/api/v1/ai/extract/extract-batch')
        .set('Authorization', 'Bearer test-token')
        .send({
          requests: [
            { text: '需求1', scene: 'VISIONSHARE' },
            { text: '需求2', scene: 'VISIONSHARE' },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBe(2);
      expect(response.body.data.results).toBeInstanceOf(Array);
    });

    it('should validate batch size limit', async () => {
      const response = await request(app)
        .post('/api/v1/ai/extract/extract-batch')
        .set('Authorization', 'Bearer test-token')
        .send({
          requests: [], // Empty array should fail validation
        });

      expect(response.status).toBe(400);
    });

    it('should accept options', async () => {
      const response = await request(app)
        .post('/api/v1/ai/extract/extract-batch')
        .set('Authorization', 'Bearer test-token')
        .send({
          requests: [
            { text: '需求1', scene: 'VISIONSHARE' },
          ],
          options: {
            continueOnError: true,
            priority: 'high',
          },
        });

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/v1/ai/extract/validate-extraction', () => {
    it('should validate extracted data', async () => {
      const response = await request(app)
        .post('/api/v1/ai/extract/validate-extraction')
        .set('Authorization', 'Bearer test-token')
        .send({
          data: {
            contentType: ['photography'],
            purpose: 'share',
            skillLevel: 'intermediate',
          },
          scene: 'VISIONSHARE',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.validation).toBeDefined();
    });

    it('should return 400 for invalid scene', async () => {
      const response = await request(app)
        .post('/api/v1/ai/extract/validate-extraction')
        .set('Authorization', 'Bearer test-token')
        .send({
          data: { field: 'value' },
          scene: 'INVALID_SCENE',
        });

      expect(response.status).toBe(400);
    });

    it('should return confirmation summary', async () => {
      const response = await request(app)
        .post('/api/v1/ai/extract/validate-extraction')
        .set('Authorization', 'Bearer test-token')
        .send({
          data: {
            contentType: ['photography'],
            purpose: 'share',
            skillLevel: 'intermediate',
          },
          scene: 'VISIONSHARE',
        });

      expect(response.body.data.confirmation).toBeDefined();
      expect(response.body.data.confirmation.isValid).toBeDefined();
      expect(response.body.data.confirmation.requiresConfirmation).toBeDefined();
    });
  });

  describe('POST /api/v1/ai/extract/confirm-extraction', () => {
    it('should confirm extraction', async () => {
      const response = await request(app)
        .post('/api/v1/ai/extract/confirm-extraction')
        .set('Authorization', 'Bearer test-token')
        .send({
          extractionId: 'extraction-123',
          confirmed: true,
          confirmedFields: ['contentType', 'purpose'],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.extractionId).toBe('extraction-123');
      expect(response.body.data.confirmed).toBe(true);
    });

    it('should accept corrections', async () => {
      const response = await request(app)
        .post('/api/v1/ai/extract/confirm-extraction')
        .set('Authorization', 'Bearer test-token')
        .send({
          extractionId: 'extraction-123',
          confirmed: true,
          corrections: {
            purpose: 'share',
          },
          feedback: 'Purpose was incorrect',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.feedback).toBe('Purpose was incorrect');
    });

    it('should reject extraction', async () => {
      const response = await request(app)
        .post('/api/v1/ai/extract/confirm-extraction')
        .set('Authorization', 'Bearer test-token')
        .send({
          extractionId: 'extraction-123',
          confirmed: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.confirmed).toBe(false);
    });

    it('should require extractionId', async () => {
      const response = await request(app)
        .post('/api/v1/ai/extract/confirm-extraction')
        .set('Authorization', 'Bearer test-token')
        .send({
          confirmed: true,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/ai/extract/scene-config/:scene', () => {
    it('should return scene configuration', async () => {
      const response = await request(app)
        .get('/api/v1/ai/extract/scene-config/VISIONSHARE')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.scene).toBe('VISIONSHARE');
      expect(response.body.data.schema).toBeDefined();
    });

    it('should return 404 for invalid scene', async () => {
      const response = await request(app)
        .get('/api/v1/ai/extract/scene-config/INVALID_SCENE')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/ai/extract/scenes', () => {
    it('should return list of available scenes', async () => {
      const response = await request(app)
        .get('/api/v1/ai/extract/scenes')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.scenes).toBeInstanceOf(Array);
    });
  });
});
