/**
 * Demand Extraction Service Tests
 */

import {
  DemandExtractionService,
  Demand,
  DemandExtractionRequest,
  IntentType,
  EntityType,
} from '../demandExtractionService';

// Mock dependencies
jest.mock('../llmService');
jest.mock('../metricsService');
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

import { llmService } from '../llmService';
import { metricsService } from '../metricsService';

const mockedLlmService = llmService as jest.Mocked<typeof llmService>;
const mockedMetricsService = metricsService as jest.Mocked<typeof metricsService>;

describe('DemandExtractionService', () => {
  let service: DemandExtractionService;

  beforeEach(() => {
    service = new DemandExtractionService();
    jest.clearAllMocks();

    // Default mock for metrics
    mockedMetricsService.recordRequest.mockResolvedValue(undefined);
  });

  describe('extract', () => {
    it('should extract demand from text', async () => {
      // Mock LLM response for intent classification
      mockedLlmService.generateText.mockResolvedValueOnce({
        text: JSON.stringify({
          intent: 'create_demand',
          confidence: 0.95,
          alternatives: [],
        }),
        provider: 'openai',
        model: 'gpt-4',
        latencyMs: 100,
        cost: 0,
      });

      // Mock LLM response for entity extraction
      mockedLlmService.generateText.mockResolvedValueOnce({
        text: JSON.stringify({
          entities: [
            {
              type: 'location',
              value: '北京朝阳区',
              normalizedValue: '北京朝阳区',
              confidence: 0.9,
            },
            {
              type: 'time',
              value: '明天下午3点',
              normalizedValue: '2024-01-16T15:00:00',
              confidence: 0.85,
            },
          ],
        }),
        provider: 'openai',
        model: 'gpt-4',
        latencyMs: 100,
        cost: 0,
      });

      const request: DemandExtractionRequest = {
        text: '我想在北京朝阳区拍摄，明天下午3点，需要一个摄影师',
        scene: 'visionShare',
      };

      const result = await service.extract(request);

      expect(result).toBeDefined();
      expect(result.rawText).toBe(request.text);
      expect(result.intent.intent).toBe('create_demand');
      expect(result.intent.confidence).toBe(0.95);
      expect(result.entities).toHaveLength(2);
      expect(result.entities[0].type).toBe('location');
      expect(result.metadata).toBeDefined();
      expect(result.metadata.version).toBe('1.0.0');
    });

    it('should handle entity extraction', async () => {
      mockedLlmService.generateText.mockResolvedValueOnce({
        text: JSON.stringify({
          intent: 'search_demand',
          confidence: 0.88,
          alternatives: [],
        }),
        provider: 'openai',
        model: 'gpt-4',
        latencyMs: 100,
      });

      mockedLlmService.generateText.mockResolvedValueOnce({
        text: JSON.stringify({
          entities: [
            {
              type: 'budget',
              value: '1000-2000元',
              normalizedValue: { min: 1000, max: 2000 },
              confidence: 0.92,
            },
            {
              type: 'person',
              value: '2个人',
              normalizedValue: 2,
              confidence: 0.9,
            },
          ],
        }),
        provider: 'openai',
        model: 'gpt-4',
        latencyMs: 100,
      });

      const request: DemandExtractionRequest = {
        text: '预算1000-2000元，需要2个人',
        scene: 'agentAd',
      };

      const result = await service.extract(request);

      expect(result.entities).toHaveLength(2);
      expect(result.structured.budget?.max).toBe(2000);
      expect(result.structured.people?.count).toBe(2);
    });

    it('should calculate confidence score', async () => {
      mockedLlmService.generateText.mockResolvedValueOnce({
        text: JSON.stringify({
          intent: 'create_demand',
          confidence: 0.9,
          alternatives: [],
        }),
        provider: 'openai',
        model: 'gpt-4',
        latencyMs: 100,
      });

      mockedLlmService.generateText.mockResolvedValueOnce({
        text: JSON.stringify({
          entities: [
            { type: 'location', value: '上海', confidence: 0.95 },
            { type: 'time', value: '下周', confidence: 0.8 },
          ],
        }),
        provider: 'openai',
        model: 'gpt-4',
        latencyMs: 100,
      });

      const request: DemandExtractionRequest = {
        text: '下周在上海拍摄',
        scene: 'visionShare',
      };

      const result = await service.extract(request);

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should detect clarification needed', async () => {
      mockedLlmService.generateText.mockResolvedValueOnce({
        text: JSON.stringify({
          intent: 'create_demand',
          confidence: 0.7,
          alternatives: [],
        }),
        provider: 'openai',
        model: 'gpt-4',
        latencyMs: 100,
      });

      mockedLlmService.generateText.mockResolvedValueOnce({
        text: JSON.stringify({
          entities: [],
        }),
        provider: 'openai',
        model: 'gpt-4',
        latencyMs: 100,
      });

      const request: DemandExtractionRequest = {
        text: '我想找个摄影师',
        scene: 'visionShare',
        options: {
          requireClarification: true,
        },
      };

      const result = await service.extract(request);

      expect(result.clarificationNeeded).toBe(true);
      expect(result.clarificationQuestions?.length).toBeGreaterThan(0);
    });

    it('should handle errors gracefully', async () => {
      mockedLlmService.generateText.mockRejectedValueOnce(new Error('LLM Error'));

      const request: DemandExtractionRequest = {
        text: '测试文本',
        scene: 'visionShare',
      };

      await expect(service.extract(request)).rejects.toThrow('LLM Error');
    });

    it('should process location entities correctly', async () => {
      mockedLlmService.generateText.mockResolvedValueOnce({
        text: JSON.stringify({ intent: 'create_demand', confidence: 0.9, alternatives: [] }),
        provider: 'openai',
        model: 'gpt-4',
        latencyMs: 100,
      });

      mockedLlmService.generateText.mockResolvedValueOnce({
        text: JSON.stringify({
          entities: [
            { type: 'location', value: '北京市朝阳区三里屯', confidence: 0.95 },
            { type: 'location', value: '海淀区', confidence: 0.88 },
          ],
        }),
        provider: 'openai',
        model: 'gpt-4',
        latencyMs: 100,
      });

      const result = await service.extract({ text: '北京拍摄', scene: 'visionShare' });

      expect(result.structured.location?.address).toContain('三里屯');
    });

    it('should process budget entities correctly', async () => {
      mockedLlmService.generateText.mockResolvedValueOnce({
        text: JSON.stringify({ intent: 'create_demand', confidence: 0.9, alternatives: [] }),
        provider: 'openai',
        model: 'gpt-4',
        latencyMs: 100,
      });

      mockedLlmService.generateText.mockResolvedValueOnce({
        text: JSON.stringify({
          entities: [
            { type: 'budget', value: '5000元', normalizedValue: 5000, confidence: 0.9 },
          ],
        }),
        provider: 'openai',
        model: 'gpt-4',
        latencyMs: 100,
      });

      const result = await service.extract({ text: '预算5000元', scene: 'visionShare' });

      expect(result.structured.budget?.max).toBe(5000);
      expect(result.structured.budget?.currency).toBe('CNY');
    });

    it('should process time entities correctly', async () => {
      mockedLlmService.generateText.mockResolvedValueOnce({
        text: JSON.stringify({ intent: 'create_demand', confidence: 0.9, alternatives: [] }),
        provider: 'openai',
        model: 'gpt-4',
        latencyMs: 100,
      });

      mockedLlmService.generateText.mockResolvedValueOnce({
        text: JSON.stringify({
          entities: [
            { type: 'time', value: '随时都可以', confidence: 0.85 },
          ],
        }),
        provider: 'openai',
        model: 'gpt-4',
        latencyMs: 100,
      });

      const result = await service.extract({ text: '时间灵活', scene: 'visionShare' });

      expect(result.structured.time?.flexibility).toBe('anytime');
    });
  });

  describe('intent classification', () => {
    it('should classify create_demand intent', async () => {
      mockedLlmService.generateText.mockResolvedValueOnce({
        text: JSON.stringify({
          intent: 'create_demand',
          confidence: 0.95,
          alternatives: [{ intent: 'search_demand', confidence: 0.05 }],
        }),
        provider: 'openai',
        model: 'gpt-4',
        latencyMs: 100,
      });

      mockedLlmService.generateText.mockResolvedValueOnce({
        text: JSON.stringify({ entities: [] }),
        provider: 'openai',
        model: 'gpt-4',
        latencyMs: 100,
      });

      const result = await service.extract({
        text: '我想发布一个拍摄需求',
        scene: 'visionShare',
      });

      expect(result.intent.intent).toBe('create_demand');
      expect(result.intent.confidence).toBe(0.95);
    });

    it('should classify search_demand intent', async () => {
      mockedLlmService.generateText.mockResolvedValueOnce({
        text: JSON.stringify({
          intent: 'search_demand',
          confidence: 0.92,
          alternatives: [],
        }),
        provider: 'openai',
        model: 'gpt-4',
        latencyMs: 100,
      });

      mockedLlmService.generateText.mockResolvedValueOnce({
        text: JSON.stringify({ entities: [] }),
        provider: 'openai',
        model: 'gpt-4',
        latencyMs: 100,
      });

      const result = await service.extract({
        text: '搜索北京的摄影师',
        scene: 'visionShare',
      });

      expect(result.intent.intent).toBe('search_demand');
    });
  });

  describe('configuration', () => {
    it('should return version', () => {
      expect(service.getVersion()).toBe('1.0.0');
    });

    it('should set confidence threshold', () => {
      service.setMinConfidenceThreshold(0.7);
      expect(service['minConfidenceThreshold']).toBe(0.7);
    });
  });

  describe('options handling', () => {
    it('should respect extractEntities option', async () => {
      mockedLlmService.generateText.mockResolvedValueOnce({
        text: JSON.stringify({ intent: 'create_demand', confidence: 0.9, alternatives: [] }),
        provider: 'openai',
        model: 'gpt-4',
        latencyMs: 100,
      });

      const result = await service.extract(
        { text: '测试', scene: 'visionShare' },
        { extractEntities: false }
      );

      // Should only call LLM once for intent
      expect(mockedLlmService.generateText).toHaveBeenCalledTimes(1);
      expect(result.entities).toHaveLength(0);
    });

    it('should respect classifyIntent option', async () => {
      mockedLlmService.generateText.mockResolvedValueOnce({
        text: JSON.stringify({ entities: [] }),
        provider: 'openai',
        model: 'gpt-4',
        latencyMs: 100,
      });

      const result = await service.extract(
        { text: '测试', scene: 'visionShare' },
        { classifyIntent: false }
      );

      expect(result.intent.intent).toBe('unknown');
      expect(result.intent.confidence).toBe(0);
    });
  });
});
