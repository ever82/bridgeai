/**
 * L3 Natural Language Extraction Service Tests
 * L3自然语言信息模型 - 提取服务测试
 */

import { extractL2FromL3, ExtractionRequest } from '../extractionService';
import { llmService } from '../llmService';
import { metricsService } from '../metricsService';

// Mock dependencies
jest.mock('../llmService');
jest.mock('../metricsService');
jest.mock('../../../utils/logger');

// Mock shared module
jest.mock('@bridgeai/shared', () => ({
  L2FieldType: {
    STRING: 'STRING',
    NUMBER: 'NUMBER',
    BOOLEAN: 'BOOLEAN',
    ENUM: 'ENUM',
    MULTI_SELECT: 'MULTI_SELECT',
    OBJECT: 'OBJECT',
    DATE: 'DATE',
    DATE_RANGE: 'DATE_RANGE',
    RANGE: 'RANGE',
  },
  L2Data: {},
  getL2Schema: jest.fn((scene: string) => {
    if (scene === 'nonexistent_scene') return undefined;
    return {
      id: scene,
      title: 'Test Schema',
      description: 'Test description',
      fields: [
        { id: 'photographyType', type: 'STRING', required: true, label: '摄影类型' },
        { id: 'budget', type: 'OBJECT', required: false, label: '预算' },
        { id: 'location', type: 'OBJECT', required: false, label: '地点' },
        { id: 'style', type: 'STRING', required: false, label: '风格' },
      ],
    };
  }),
}));

describe('L3 Natural Language Extraction Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractL2FromL3', () => {
    it('should extract structured data from natural language text', async () => {
      const mockLLMResponse = JSON.stringify({
        data: {
          photographyType: '人像摄影',
          budget: { min: 1500, max: 2000 },
          location: { city: '北京', district: '朝阳区' },
        },
        field_confidences: [
          { field: 'photographyType', confidence: 90, reasoning: 'mentioned' },
          { field: 'budget', confidence: 85, reasoning: 'mentioned' },
        ],
        fields_failed: [],
        reasoning: 'extracted from text',
      });

      (llmService.generateText as jest.Mock).mockResolvedValue({
        text: mockLLMResponse,
        provider: 'openai',
        model: 'gpt-4',
      });

      (metricsService.recordRequest as jest.Mock).mockResolvedValue(undefined);

      const request: ExtractionRequest = {
        text: '我想找一位有人像拍摄经验的摄影师，周末有时间，预算2000元左右，地点在朝阳区',
        scene: 'visionshare',
        agentId: 'test-agent-001',
        userId: 'test-user-001',
      };

      const result = await extractL2FromL3(request);

      expect(result.success).toBe(true);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.fieldsExtracted.length).toBeGreaterThan(0);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should handle short text', async () => {
      const request: ExtractionRequest = {
        text: 'a', // single character - very short
        scene: 'visionshare',
        agentId: 'test-agent-001',
        userId: 'test-user-001',
      };

      const mockLLMResponse = JSON.stringify({
        data: {},
        field_confidences: [],
        fields_failed: ['photographyType'],
        reasoning: 'text too short',
      });

      (llmService.generateText as jest.Mock).mockResolvedValue({
        text: mockLLMResponse,
        provider: 'openai',
        model: 'gpt-4',
      });

      (metricsService.recordRequest as jest.Mock).mockResolvedValue(undefined);

      const result = await extractL2FromL3(request);
      expect(result).toBeDefined();
    });

    it('should handle very short text', async () => {
      const mockLLMResponse = JSON.stringify({
        data: {
          photographyType: '摄影',
        },
        field_confidences: [
          { field: 'photographyType', confidence: 30, reasoning: 'short text' },
        ],
        fields_failed: ['budget', 'location'],
        reasoning: 'limited information',
      });

      (llmService.generateText as jest.Mock).mockResolvedValue({
        text: mockLLMResponse,
        provider: 'openai',
        model: 'gpt-4',
      });

      (metricsService.recordRequest as jest.Mock).mockResolvedValue(undefined);

      const request: ExtractionRequest = {
        text: '拍照',
        scene: 'visionshare',
        agentId: 'test-agent-001',
        userId: 'test-user-001',
      };

      const result = await extractL2FromL3(request);
      expect(result.success).toBe(true);
      expect(result.confidence).toBeLessThan(50);
    });

    it('should handle invalid scene', async () => {
      const request: ExtractionRequest = {
        text: '我想找一位摄影师',
        scene: 'nonexistent_scene',
        agentId: 'test-agent-001',
        userId: 'test-user-001',
      };

      await expect(extractL2FromL3(request)).rejects.toThrow('Schema not found');
    });

    it('should handle LLM service errors gracefully', async () => {
      (llmService.generateText as jest.Mock).mockRejectedValue(
        new Error('LLM service unavailable')
      );

      const request: ExtractionRequest = {
        text: '我想找一位周末有时间的人像摄影师，预算在2000元左右，地点在朝阳区',
        scene: 'visionshare',
        agentId: 'test-agent-001',
        userId: 'test-user-001',
      };

      await expect(extractL2FromL3(request)).rejects.toThrow('LLM service unavailable');
    });

    it('should handle malformed LLM response', async () => {
      (llmService.generateText as jest.Mock).mockResolvedValue({
        text: 'This is not JSON',
        provider: 'openai',
        model: 'gpt-4',
      });

      (metricsService.recordRequest as jest.Mock).mockResolvedValue(undefined);

      const request: ExtractionRequest = {
        text: '我想找一位周末有时间的人像摄影师',
        scene: 'visionshare',
        agentId: 'test-agent-001',
        userId: 'test-user-001',
      };

      const result = await extractL2FromL3(request);
      // Should handle gracefully with empty or partial data
      expect(result).toBeDefined();
    });

    it('should extract budget range from natural language', async () => {
      const mockLLMResponse = JSON.stringify({
        data: {
          budget: { min: 1500, max: 2500 },
        },
        field_confidences: [
          { field: 'budget', confidence: 80, reasoning: 'range found' },
        ],
        fields_failed: [],
        reasoning: 'budget extracted',
      });

      (llmService.generateText as jest.Mock).mockResolvedValue({
        text: mockLLMResponse,
        provider: 'openai',
        model: 'gpt-4',
      });

      (metricsService.recordRequest as jest.Mock).mockResolvedValue(undefined);

      const request: ExtractionRequest = {
        text: '预算1500到2500之间吧，差不多这个范围',
        scene: 'visionshare',
        agentId: 'test-agent-001',
        userId: 'test-user-001',
      };

      const result = await extractL2FromL3(request);
      expect(result.success).toBe(true);
      expect(result.data.budget).toBeDefined();
    });

    it('should extract location information', async () => {
      const mockLLMResponse = JSON.stringify({
        data: {
          location: { city: '上海', district: '浦东新区' },
        },
        field_confidences: [
          { field: 'location', confidence: 85, reasoning: 'location found' },
        ],
        fields_failed: [],
        reasoning: 'location extracted',
      });

      (llmService.generateText as jest.Mock).mockResolvedValue({
        text: mockLLMResponse,
        provider: 'openai',
        model: 'gpt-4',
      });

      (metricsService.recordRequest as jest.Mock).mockResolvedValue(undefined);

      const request: ExtractionRequest = {
        text: '在上海浦东新区拍照，最好是外滩附近',
        scene: 'visionshare',
        agentId: 'test-agent-001',
        userId: 'test-user-001',
      };

      const result = await extractL2FromL3(request);
      expect(result.success).toBe(true);
      expect(result.data.location).toBeDefined();
    });

    it('should record metrics for successful extraction', async () => {
      const mockLLMResponse = JSON.stringify({
        data: {
          photographyType: '人像摄影',
        },
        field_confidences: [
          { field: 'photographyType', confidence: 80, reasoning: 'found' },
        ],
        fields_failed: [],
        reasoning: 'extracted',
      });

      (llmService.generateText as jest.Mock).mockResolvedValue({
        text: mockLLMResponse,
        provider: 'openai',
        model: 'gpt-4',
      });

      (metricsService.recordRequest as jest.Mock).mockResolvedValue(undefined);

      const request: ExtractionRequest = {
        text: '我想找人像摄影师',
        scene: 'visionshare',
        agentId: 'test-agent-001',
        userId: 'test-user-001',
      };

      await extractL2FromL3(request);

      expect(metricsService.recordRequest).toHaveBeenCalled();
    });
  });
});
