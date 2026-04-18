/**
 * AI Extraction Integration Tests
 * Tests the full extraction pipeline: DemandExtractionService → DemandToL2Mapper → ExtractionValidator
 */

// Mock dependencies
jest.mock('../../services/ai/llmService');
jest.mock('../../services/ai/metricsService');
jest.mock('@bridgeai/shared', () => ({
  ...jest.requireActual('../../__mocks__/@bridgeai/shared'),
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
    LOCATION: 'location',
    TAGS: 'tags',
    IMAGE: 'image',
    FILE: 'file',
  },
}));
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

import { L2Schema } from '@bridgeai/shared';

import {
  DemandExtractionService,
  DemandExtractionRequest,
} from '../../services/ai/demandExtractionService';
import { DemandToL2Mapper } from '../../services/ai/mappers/demandToL2Mapper';
import { ExtractionValidator } from '../../services/ai/validators/extractionValidator';
import { llmService } from '../../services/ai/llmService';

const L2FieldType = {
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
} as const;

const mockedLlmService = llmService as jest.Mocked<typeof llmService>;

const mockVisionShareSchema: L2Schema = {
  id: 'vision-share',
  version: '1.0.0',
  scene: 'visionShare',
  title: 'Vision Share',
  description: '摄影分享场景',
  fields: [
    { id: 'title', type: L2FieldType.TEXT, label: '标题', required: true, maxLength: 100 },
    {
      id: 'description',
      type: L2FieldType.LONG_TEXT,
      label: '描述',
      required: false,
      maxLength: 1000,
    },
    { id: 'location', type: L2FieldType.TEXT, label: '地点', required: false },
    { id: 'budgetMin', type: L2FieldType.NUMBER, label: '最低预算', required: false, min: 0 },
    { id: 'budgetMax', type: L2FieldType.NUMBER, label: '最高预算', required: false, min: 0 },
    {
      id: 'serviceType',
      type: L2FieldType.ENUM,
      label: '服务类型',
      required: false,
      options: [
        { value: 'photography', label: '摄影' },
        { value: 'video', label: '摄像' },
      ],
    },
    {
      id: 'peopleCount',
      type: L2FieldType.NUMBER,
      label: '人数',
      required: false,
      min: 1,
      max: 100,
    },
  ],
};

describe('AI Extraction Integration', () => {
  let extractionService: DemandExtractionService;
  let mapper: DemandToL2Mapper;
  let validator: ExtractionValidator;

  beforeEach(() => {
    extractionService = new DemandExtractionService();
    mapper = new DemandToL2Mapper();
    validator = new ExtractionValidator();
    jest.clearAllMocks();
  });

  describe('Full Pipeline: Extract → Map → Validate', () => {
    it('should process a complete demand through the full pipeline', async () => {
      // Mock LLM responses
      mockedLlmService.generateText
        .mockResolvedValueOnce({
          text: JSON.stringify({
            intent: 'create_demand',
            confidence: 0.95,
            alternatives: [],
          }),
          provider: 'openai',
          model: 'gpt-4',
          latencyMs: 100,
        })
        .mockResolvedValueOnce({
          text: JSON.stringify({
            entities: [
              { type: 'location', value: '北京', normalizedValue: '北京', confidence: 0.92 },
              { type: 'budget', value: '5000元', normalizedValue: 5000, confidence: 0.9 },
              { type: 'person', value: '2个人', normalizedValue: 2, confidence: 0.88 },
            ],
          }),
          provider: 'openai',
          model: 'gpt-4',
          latencyMs: 100,
        });

      const request: DemandExtractionRequest = {
        text: '想在北京拍摄，预算5000元，需要2个人',
        scene: 'visionShare',
      };

      // Step 1: Extract
      const demand = await extractionService.extract(request);
      expect(demand).toBeDefined();
      expect(demand.intent.intent).toBe('create_demand');
      expect(demand.entities.length).toBeGreaterThan(0);
      expect(demand.confidence).toBeGreaterThan(0);

      // Step 2: Map to L2
      const mappingResult = mapper.map(demand, mockVisionShareSchema);
      expect(mappingResult.success).toBe(true);
      expect(mappingResult.data).toBeDefined();
      expect(mappingResult.mappedFields).toContain('location');
      expect(mappingResult.mappedFields).toContain('budgetMax');
      expect(mappingResult.mappedFields).toContain('peopleCount');

      // Step 3: Validate
      const validationReport = validator.validate(
        mappingResult.data,
        mockVisionShareSchema,
        demand
      );
      expect(validationReport.valid).toBe(true);
      expect(validationReport.summary.completenessScore).toBeGreaterThan(0);
    });

    it('should detect missing required fields in validation', async () => {
      mockedLlmService.generateText
        .mockResolvedValueOnce({
          text: JSON.stringify({
            intent: 'create_demand',
            confidence: 0.7,
            alternatives: [],
          }),
          provider: 'openai',
          model: 'gpt-4',
          latencyMs: 100,
        })
        .mockResolvedValueOnce({
          text: JSON.stringify({ entities: [] }),
          provider: 'openai',
          model: 'gpt-4',
          latencyMs: 100,
        });

      const request: DemandExtractionRequest = {
        text: '',
        scene: 'visionShare',
      };

      const demand = await extractionService.extract(request);
      const mappingResult = mapper.map(demand, mockVisionShareSchema);
      const validationReport = validator.validate(
        mappingResult.data,
        mockVisionShareSchema,
        demand
      );

      // Title is required but no entities extracted
      expect(mappingResult.unmappedFields).toContain('title');
      expect(validationReport.valid).toBe(false);
      expect(validationReport.errors.some(e => e.field === 'title')).toBe(true);
      expect(validationReport.summary.completenessScore).toBeLessThan(50);
    });

    it('should handle budget range validation in pipeline', async () => {
      mockedLlmService.generateText
        .mockResolvedValueOnce({
          text: JSON.stringify({
            intent: 'create_demand',
            confidence: 0.9,
            alternatives: [],
          }),
          provider: 'openai',
          model: 'gpt-4',
          latencyMs: 100,
        })
        .mockResolvedValueOnce({
          text: JSON.stringify({
            entities: [
              {
                type: 'budget',
                value: '100-10000元',
                normalizedValue: { min: 100, max: 10000 },
                confidence: 0.9,
              },
            ],
          }),
          provider: 'openai',
          model: 'gpt-4',
          latencyMs: 100,
        });

      const request: DemandExtractionRequest = {
        text: '预算100到10000元',
        scene: 'visionShare',
      };

      const demand = await extractionService.extract(request);
      const mappingResult = mapper.map(demand, mockVisionShareSchema);
      const validationReport = validator.validate(
        mappingResult.data,
        mockVisionShareSchema,
        demand,
        { checkBusinessRules: true }
      );

      // Budget range too wide should trigger a warning
      expect(validationReport.warnings.some(w => w.ruleId === 'budget_range_too_wide')).toBe(true);
    });

    it('should handle invalid budget range (min > max)', async () => {
      mockedLlmService.generateText
        .mockResolvedValueOnce({
          text: JSON.stringify({
            intent: 'create_demand',
            confidence: 0.9,
            alternatives: [],
          }),
          provider: 'openai',
          model: 'gpt-4',
          latencyMs: 100,
        })
        .mockResolvedValueOnce({
          text: JSON.stringify({
            entities: [
              {
                type: 'budget',
                value: '10000-100元',
                normalizedValue: { min: 10000, max: 100 },
                confidence: 0.9,
              },
            ],
          }),
          provider: 'openai',
          model: 'gpt-4',
          latencyMs: 100,
        });

      const request: DemandExtractionRequest = {
        text: '预算10000到100元',
        scene: 'visionShare',
      };

      const demand = await extractionService.extract(request);
      const mappingResult = mapper.map(demand, mockVisionShareSchema);
      const validationReport = validator.validate(
        mappingResult.data,
        mockVisionShareSchema,
        demand,
        { checkBusinessRules: true }
      );

      expect(validationReport.errors.some(e => e.ruleId === 'invalid_budget_range')).toBe(true);
    });

    it('should handle clarification needed scenario', async () => {
      mockedLlmService.generateText
        .mockResolvedValueOnce({
          text: JSON.stringify({
            intent: 'create_demand',
            confidence: 0.8,
            alternatives: [],
          }),
          provider: 'openai',
          model: 'gpt-4',
          latencyMs: 100,
        })
        .mockResolvedValueOnce({
          text: JSON.stringify({
            entities: [
              { type: 'location', value: '上海', normalizedValue: '上海', confidence: 0.9 },
            ],
          }),
          provider: 'openai',
          model: 'gpt-4',
          latencyMs: 100,
        });

      const request: DemandExtractionRequest = {
        text: '想在上海拍点照片',
        scene: 'visionShare',
        options: { requireClarification: true },
      };

      const demand = await extractionService.extract(request);

      expect(demand.clarificationNeeded).toBe(true);
      expect(demand.clarificationQuestions?.length).toBeGreaterThan(0);
    });

    it('should handle enum validation in pipeline', async () => {
      mockedLlmService.generateText
        .mockResolvedValueOnce({
          text: JSON.stringify({
            intent: 'create_demand',
            confidence: 0.9,
            alternatives: [],
          }),
          provider: 'openai',
          model: 'gpt-4',
          latencyMs: 100,
        })
        .mockResolvedValueOnce({
          text: JSON.stringify({
            entities: [
              {
                type: 'requirement',
                value: '需要航拍服务',
                normalizedValue: '航拍',
                confidence: 0.85,
              },
            ],
          }),
          provider: 'openai',
          model: 'gpt-4',
          latencyMs: 100,
        });

      const request: DemandExtractionRequest = {
        text: '需要航拍服务',
        scene: 'visionShare',
      };

      const demand = await extractionService.extract(request);
      const mappingResult = mapper.map(demand, mockVisionShareSchema);

      // serviceType is an enum field, '航拍' is not a valid option
      expect(mappingResult.data.serviceType).toBeUndefined();
    });
  });

  describe('Error Handling Integration', () => {
    it('should propagate LLM errors through the pipeline', async () => {
      mockedLlmService.generateText.mockRejectedValueOnce(new Error('LLM Service Error'));

      const request: DemandExtractionRequest = {
        text: '测试文本',
        scene: 'visionShare',
      };

      await expect(extractionService.extract(request)).rejects.toThrow('LLM Service Error');
    });

    it('should continue pipeline when mapping produces partial results', async () => {
      mockedLlmService.generateText
        .mockResolvedValueOnce({
          text: JSON.stringify({
            intent: 'create_demand',
            confidence: 0.85,
            alternatives: [],
          }),
          provider: 'openai',
          model: 'gpt-4',
          latencyMs: 100,
        })
        .mockResolvedValueOnce({
          text: JSON.stringify({
            entities: [
              { type: 'location', value: '北京', normalizedValue: '北京', confidence: 0.92 },
            ],
          }),
          provider: 'openai',
          model: 'gpt-4',
          latencyMs: 100,
        });

      const request: DemandExtractionRequest = {
        text: '想拍照片',
        scene: 'visionShare',
      };

      const demand = await extractionService.extract(request);
      const mappingResult = mapper.map(demand, mockVisionShareSchema);
      const validationReport = validator.validate(
        mappingResult.data,
        mockVisionShareSchema,
        demand
      );

      // Pipeline completes even with partial results
      expect(mappingResult.success).toBe(true);
      expect(mappingResult.data).toBeDefined();
      // Title auto-generated from rawText
      expect(mappingResult.mappedFields.length).toBeGreaterThan(0);
      // Validation completes
      expect(validationReport).toBeDefined();
      expect(validationReport.summary).toBeDefined();
    });
  });
});
