/**
 * Demand Extraction Service Tests
 */

import { DemandExtractionService, ExtractionRequest, Demand } from '../demandExtractionService';
import { LLMService, GenerateTextResponse } from '../llmService';

// Mock LLMService
jest.mock('../llmService');

describe('DemandExtractionService', () => {
  let service: DemandExtractionService;
  let mockGenerateText: jest.Mock;

  beforeEach(() => {
    mockGenerateText = jest.fn().mockResolvedValue({
      text: JSON.stringify({
        intent: {
          primary: 'find_collaborator',
          confidence: 85,
          alternatives: [{ intent: 'seek_inspiration', confidence: 30 }],
        },
        entities: {
          time: [{ text: '周末下午', type: 'datetime', normalized: 'weekend afternoon', value: '2024-04-13T14:00:00Z' }],
          location: [],
          people: [{ text: '朋友', type: 'group', normalized: 'friend' }],
          organizations: [],
          keywords: ['拍照', '摄影'],
        },
        attributes: {
          contentType: ['photography'],
          purpose: 'collaborate',
          skillLevel: 'intermediate',
          availability: ['weekend_afternoon'],
        },
        fieldConfidence: {
          contentType: { confidence: 90, reasoning: 'explicitly mentioned', source: 'explicit' },
          purpose: { confidence: 80, reasoning: 'inferred from context', source: 'inferred' },
        },
        missingFields: [],
        suggestedQuestions: [],
        overallConfidence: 82,
        clarificationNeeded: false,
      }),
      provider: 'openai',
      model: 'gpt-4',
      latencyMs: 500,
      cost: 0.02,
    } as GenerateTextResponse);

    const mockLLMService = {
      initialize: jest.fn().mockResolvedValue(undefined),
      generateText: mockGenerateText,
    } as unknown as LLMService;

    service = new DemandExtractionService(mockLLMService);
  });

  describe('initialize', () => {
    it('should initialize the service', async () => {
      await service.initialize();
      expect(mockGenerateText).not.toHaveBeenCalled();
    });
  });

  describe('extract', () => {
    const validRequest: ExtractionRequest = {
      text: '我想找个周末下午能一起拍照的朋友',
      scene: 'VISIONSHARE',
      agentId: 'test-agent-1',
      userId: 'test-user-1',
    };

    it('should extract demand from text', async () => {
      const demand = await service.extract(validRequest);

      expect(demand).toBeDefined();
      expect(demand.scene).toBe('VISIONSHARE');
      expect(demand.rawText).toBe(validRequest.text);
      expect(demand.intent.primary).toBe('find_collaborator');
      expect(demand.confidence).toBe(82);
      expect(demand.clarificationNeeded).toBe(false);
    });

    it('should have required Demand fields', async () => {
      const demand = await service.extract(validRequest);

      expect(demand.id).toBeDefined();
      expect(demand.id.startsWith('demand-')).toBe(true);
      expect(demand.scene).toBe('VISIONSHARE');
      expect(demand.intent).toBeDefined();
      expect(demand.intent.confidence).toBeDefined();
      expect(demand.entities).toBeDefined();
      expect(demand.attributes).toBeDefined();
      expect(demand.rawText).toBeDefined();
      expect(demand.confidence).toBeDefined();
      expect(demand.fieldConfidence).toBeDefined();
      expect(demand.extractedAt).toBeInstanceOf(Date);
      expect(demand.clarificationNeeded).toBeDefined();
      expect(demand.missingFields).toBeInstanceOf(Array);
      expect(demand.suggestedQuestions).toBeInstanceOf(Array);
    });

    it('should extract entities correctly', async () => {
      const demand = await service.extract(validRequest);

      expect(demand.entities.time).toHaveLength(1);
      expect(demand.entities.time[0].text).toBe('周末下午');
      expect(demand.entities.time[0].type).toBe('datetime');

      expect(demand.entities.people).toHaveLength(1);
      expect(demand.entities.people[0].text).toBe('朋友');
      expect(demand.entities.people[0].type).toBe('group');

      expect(demand.entities.keywords).toContain('拍照');
      expect(demand.entities.keywords).toContain('摄影');
    });

    it('should include confidence field', async () => {
      const demand = await service.extract(validRequest);
      expect(typeof demand.confidence).toBe('number');
      expect(demand.confidence).toBeGreaterThanOrEqual(0);
      expect(demand.confidence).toBeLessThanOrEqual(100);
    });

    it('should throw error for invalid scene', async () => {
      const invalidRequest: ExtractionRequest = {
        text: 'test text',
        scene: 'INVALID_SCENE',
      };

      await expect(service.extract(invalidRequest)).rejects.toThrow('Schema not found');
    });

    it('should handle LLM service errors', async () => {
      mockGenerateText.mockRejectedValueOnce(new Error('LLM error'));

      await expect(service.extract(validRequest)).rejects.toThrow('LLM error');
    });

    it('should handle malformed LLM responses', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: 'not valid json',
        provider: 'openai',
        model: 'gpt-4',
        latencyMs: 500,
        cost: 0.02,
      } as GenerateTextResponse);

      const demand = await service.extract(validRequest);

      // Should return default values on parse failure
      expect(demand.clarificationNeeded).toBe(true);
      expect(demand.confidence).toBe(0);
    });
  });

  describe('extractEntities', () => {
    it('should extract entities from text', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: JSON.stringify({
          time: [{ text: '明天', type: 'relative', normalized: 'tomorrow' }],
          location: [{ text: '北京', type: 'city', normalized: 'Beijing' }],
          people: [{ text: '张三', type: 'name', normalized: 'Zhang San' }],
          organizations: ['ABC公司'],
          keywords: ['会议', '项目'],
        }),
        provider: 'openai',
        model: 'gpt-4',
        latencyMs: 300,
        cost: 0.01,
      } as GenerateTextResponse);

      const entities = await service.extractEntities('明天在北京和张三开会讨论项目');

      expect(entities.time).toHaveLength(1);
      expect(entities.location).toHaveLength(1);
      expect(entities.people).toHaveLength(1);
      expect(entities.organizations).toContain('ABC公司');
      expect(entities.keywords).toContain('会议');
    });
  });

  describe('classifyIntent', () => {
    it('should classify intent from text', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: JSON.stringify({
          primary: 'seek_help',
          confidence: 90,
          alternatives: [{ intent: 'ask_question', confidence: 40 }],
        }),
        provider: 'openai',
        model: 'gpt-4',
        latencyMs: 300,
        cost: 0.01,
      } as GenerateTextResponse);

      const intent = await service.classifyIntent('请问有人能帮我吗？', ['seek_help', 'ask_question', 'share_info']);

      expect(intent.primary).toBe('seek_help');
      expect(intent.confidence).toBe(90);
      expect(intent.alternatives).toHaveLength(1);
    });
  });

  describe('getConfidenceLevel', () => {
    it('should return high for confidence >= 80', () => {
      expect(service.getConfidenceLevel(80)).toBe('high');
      expect(service.getConfidenceLevel(100)).toBe('high');
    });

    it('should return medium for confidence >= 50', () => {
      expect(service.getConfidenceLevel(50)).toBe('medium');
      expect(service.getConfidenceLevel(79)).toBe('medium');
    });

    it('should return low for confidence < 50', () => {
      expect(service.getConfidenceLevel(0)).toBe('low');
      expect(service.getConfidenceLevel(49)).toBe('low');
    });
  });

  describe('needsClarification', () => {
    it('should return true if clarificationNeeded flag is set', () => {
      const demand = {
        id: 'test',
        scene: 'VISIONSHARE',
        intent: { primary: 'test', confidence: 80, alternatives: [] },
        entities: { time: [], location: [], people: [], organizations: [], keywords: [] },
        attributes: {},
        rawText: 'test',
        confidence: 90,
        fieldConfidence: {},
        extractedAt: new Date(),
        clarificationNeeded: true,
        missingFields: [],
        suggestedQuestions: [],
      } as Demand;
      expect(service.needsClarification(demand)).toBe(true);
    });

    it('should return true if confidence is below 50', () => {
      const demand = {
        id: 'test',
        scene: 'VISIONSHARE',
        intent: { primary: 'test', confidence: 80, alternatives: [] },
        entities: { time: [], location: [], people: [], organizations: [], keywords: [] },
        attributes: {},
        rawText: 'test',
        confidence: 30,
        fieldConfidence: {},
        extractedAt: new Date(),
        clarificationNeeded: false,
        missingFields: [],
        suggestedQuestions: [],
      } as Demand;
      expect(service.needsClarification(demand)).toBe(true);
    });

    it('should return true if there are missing fields', () => {
      const demand = {
        id: 'test',
        scene: 'VISIONSHARE',
        intent: { primary: 'test', confidence: 80, alternatives: [] },
        entities: { time: [], location: [], people: [], organizations: [], keywords: [] },
        attributes: {},
        rawText: 'test',
        confidence: 90,
        fieldConfidence: {},
        extractedAt: new Date(),
        clarificationNeeded: false,
        missingFields: ['field1'],
        suggestedQuestions: [],
      } as Demand;
      expect(service.needsClarification(demand)).toBe(true);
    });

    it('should return false if none of the conditions are met', () => {
      const demand = {
        id: 'test',
        scene: 'VISIONSHARE',
        intent: { primary: 'test', confidence: 80, alternatives: [] },
        entities: { time: [], location: [], people: [], organizations: [], keywords: [] },
        attributes: {},
        rawText: 'test',
        confidence: 90,
        fieldConfidence: {},
        extractedAt: new Date(),
        clarificationNeeded: false,
        missingFields: [],
        suggestedQuestions: [],
      } as Demand;
      expect(service.needsClarification(demand)).toBe(false);
    });
  });
});
