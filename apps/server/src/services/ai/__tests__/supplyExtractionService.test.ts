/**
 * Supply Extraction Service Tests
 * 供给智能提炼服务单元测试
 */

import { SupplyExtractionService } from '../supplyExtractionService';
import { LLMService } from '../llmService';

// Mock LLMService
jest.mock('../llmService');

describe('SupplyExtractionService', () => {
  let service: SupplyExtractionService;
  let mockLLMService: jest.Mocked<LLMService>;

  beforeEach(() => {
    // 创建 mock LLMService
    mockLLMService = {
      initialize: jest.fn().mockResolvedValue(undefined),
      generateText: jest.fn(),
    } as unknown as jest.Mocked<LLMService>;

    // 创建服务实例
    service = new SupplyExtractionService(mockLLMService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize the LLM service', async () => {
      await service.initialize();
      expect(mockLLMService.initialize).toHaveBeenCalled();
    });
  });

  describe('extract', () => {
    const mockExtractionResponse = {
      text: JSON.stringify({
        title: 'Full Stack Web Development Service',
        description: 'Professional web development services using React and Node.js',
        service_type: 'web_development',
        capabilities: [
          {
            name: 'Frontend Development',
            description: 'Building modern web interfaces with React',
            level: 'expert',
            category: 'frontend',
            keywords: ['React', 'TypeScript', 'CSS'],
          },
          {
            name: 'Backend Development',
            description: 'Server-side development with Node.js',
            level: 'advanced',
            category: 'backend',
            keywords: ['Node.js', 'Express', 'MongoDB'],
          },
        ],
        pricing: {
          type: 'hourly',
          min_rate: 50,
          max_rate: 100,
          currency: 'USD',
          unit: 'hour',
          description: 'Hourly rate for development work',
        },
        skills: ['React', 'Node.js', 'TypeScript', 'MongoDB'],
        availability: {
          schedule: 'Monday to Friday, 9 AM - 6 PM EST',
          timezone: 'America/New_York',
          response_time: 'Within 24 hours',
        },
        location: {
          city: 'New York',
          country: 'USA',
          remote: true,
          onsite: false,
          hybrid: true,
        },
        experience: {
          years: 5,
          total_projects: 20,
          relevant_projects: 15,
          certifications: ['AWS Certified Developer'],
          portfolio: ['https://example.com/portfolio'],
        },
        quality_assessment: {
          completeness: 90,
          clarity: 95,
          relevance: 92,
          confidence: 92,
          issues: [],
        },
      }),
      provider: 'openai' as const,
      model: 'gpt-4',
      usage: { input: 100, output: 200, total: 300 },
      cost: 0.05,
    };

    it('should extract supply information from text', async () => {
      mockLLMService.generateText.mockResolvedValue(mockExtractionResponse);

      const result = await service.extract({
        text: 'I provide full stack web development services using React and Node.js. My hourly rate is $50-100.',
        scene: 'visionshare',
        agentId: 'agent-123',
        userId: 'user-456',
      });

      expect(result.success).toBe(true);
      expect(result.supply.title).toBe('Full Stack Web Development Service');
      expect(result.supply.serviceType).toBe('web_development');
      expect(result.supply.capabilities).toHaveLength(2);
      expect(result.supply.pricing.type).toBe('hourly');
      expect(result.supply.skills).toContain('React');
      expect(result.fieldsExtracted).toContain('title');
      expect(result.fieldsExtracted).toContain('capabilities');
      expect(result.fieldsExtracted).toContain('pricing');
    });

    it('should return quality metrics', async () => {
      mockLLMService.generateText.mockResolvedValue(mockExtractionResponse);

      const result = await service.extract({
        text: 'I provide full stack web development services.',
        scene: 'visionshare',
      });

      expect(result.supply.quality).toBeDefined();
      expect(result.supply.quality.confidence).toBeGreaterThan(0);
      expect(result.supply.quality.completenessScore).toBeGreaterThan(0);
      expect(result.supply.quality.clarityScore).toBeGreaterThan(0);
      expect(result.supply.quality.relevanceScore).toBeGreaterThan(0);
      expect(result.supply.quality.overallScore).toBeGreaterThan(0);
    });

    it('should handle missing fields gracefully', async () => {
      const incompleteResponse = {
        text: JSON.stringify({
          title: 'Basic Service',
          description: 'A basic service',
          service_type: 'general',
          capabilities: [],
          pricing: {},
          skills: [],
        }),
        provider: 'openai' as const,
        model: 'gpt-4',
        usage: { input: 50, output: 100, total: 150 },
        cost: 0.02,
      };

      mockLLMService.generateText.mockResolvedValue(incompleteResponse);

      const result = await service.extract({
        text: 'I provide a basic service.',
        scene: 'visionshare',
      });

      expect(result.success).toBe(true);
      expect(result.supply.title).toBe('Basic Service');
      expect(result.fieldsFailed).toContain('capabilities');
      expect(result.fieldsFailed).toContain('pricing');
    });

    it('should handle LLM errors', async () => {
      mockLLMService.generateText.mockRejectedValue(new Error('LLM service unavailable'));

      await expect(
        service.extract({
          text: 'Some service description',
          scene: 'visionshare',
        })
      ).rejects.toThrow('LLM service unavailable');
    });

    it('should include provider and model info in result', async () => {
      mockLLMService.generateText.mockResolvedValue(mockExtractionResponse);

      const result = await service.extract({
        text: 'Service description',
        scene: 'visionshare',
      });

      expect(result.provider).toBe('openai');
      expect(result.model).toBe('gpt-4');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should respect extraction options', async () => {
      mockLLMService.generateText.mockResolvedValue(mockExtractionResponse);

      await service.extract({
        text: 'Service description',
        scene: 'visionshare',
        options: {
          includeCapabilities: false,
          includePricing: false,
        },
      });

      // 验证 prompt 中包含了选项
      const callArg = mockLLMService.generateText.mock.calls[0][0];
      expect(callArg).toContain('Extraction Instructions');
    });
  });

  describe('extractBulk', () => {
    const mockResponse = {
      text: JSON.stringify({
        title: 'Test Service',
        description: 'A test service',
        service_type: 'testing',
        capabilities: [],
        pricing: { type: 'negotiable', currency: 'USD' },
        skills: ['testing'],
      }),
      provider: 'openai' as const,
      model: 'gpt-4',
      usage: { input: 50, output: 100, total: 150 },
      cost: 0.02,
    };

    it('should process multiple extraction requests', async () => {
      mockLLMService.generateText.mockResolvedValue(mockResponse);

      const result = await service.extractBulk({
        items: [
          { text: 'Service 1', scene: 'visionshare' },
          { text: 'Service 2', scene: 'visionshare' },
          { text: 'Service 3', scene: 'visionshare' },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.total).toBe(3);
      expect(result.results).toHaveLength(3);
      expect(result.failed).toBe(0);
    });

    it('should handle partial failures in bulk extraction', async () => {
      mockLLMService.generateText
        .mockResolvedValueOnce(mockResponse)
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce(mockResponse);

      const result = await service.extractBulk({
        items: [
          { text: 'Service 1', scene: 'visionshare' },
          { text: 'Service 2', scene: 'visionshare' },
          { text: 'Service 3', scene: 'visionshare' },
        ],
      });

      expect(result.total).toBe(3);
      expect(result.results).toHaveLength(2);
      expect(result.failed).toBe(1);
      expect(result.success).toBe(false);
    });

    it('should generate quality report for bulk extraction', async () => {
      mockLLMService.generateText.mockResolvedValue(mockResponse);

      const result = await service.extractBulk({
        items: [
          { text: 'Service 1', scene: 'visionshare' },
          { text: 'Service 2', scene: 'visionshare' },
        ],
      });

      expect(result.qualityReport).toBeDefined();
      expect(result.qualityReport.averageConfidence).toBeGreaterThan(0);
      expect(result.qualityReport.extractionRate).toBeGreaterThan(0);
      expect(result.qualityReport.recommendations).toBeDefined();
    });

    it('should handle empty items array', async () => {
      const result = await service.extractBulk({
        items: [],
      });

      expect(result.total).toBe(0);
      expect(result.results).toHaveLength(0);
      expect(result.qualityReport.overallQuality).toBe(0);
    });
  });

  describe('getConfidenceLevel', () => {
    it('should return high for confidence >= 80', () => {
      expect(service.getConfidenceLevel(80)).toBe('high');
      expect(service.getConfidenceLevel(90)).toBe('high');
      expect(service.getConfidenceLevel(100)).toBe('high');
    });

    it('should return medium for confidence 50-79', () => {
      expect(service.getConfidenceLevel(50)).toBe('medium');
      expect(service.getConfidenceLevel(65)).toBe('medium');
      expect(service.getConfidenceLevel(79)).toBe('medium');
    });

    it('should return low for confidence < 50', () => {
      expect(service.getConfidenceLevel(0)).toBe('low');
      expect(service.getConfidenceLevel(25)).toBe('low');
      expect(service.getConfidenceLevel(49)).toBe('low');
    });
  });

  describe('getQualityGrade', () => {
    it('should return A for score >= 90', () => {
      expect(service.getQualityGrade(90)).toBe('A');
      expect(service.getQualityGrade(95)).toBe('A');
      expect(service.getQualityGrade(100)).toBe('A');
    });

    it('should return B for score 80-89', () => {
      expect(service.getQualityGrade(80)).toBe('B');
      expect(service.getQualityGrade(85)).toBe('B');
      expect(service.getQualityGrade(89)).toBe('B');
    });

    it('should return C for score 70-79', () => {
      expect(service.getQualityGrade(70)).toBe('C');
      expect(service.getQualityGrade(75)).toBe('C');
      expect(service.getQualityGrade(79)).toBe('C');
    });

    it('should return D for score 60-69', () => {
      expect(service.getQualityGrade(60)).toBe('D');
      expect(service.getQualityGrade(65)).toBe('D');
      expect(service.getQualityGrade(69)).toBe('D');
    });

    it('should return F for score < 60', () => {
      expect(service.getQualityGrade(0)).toBe('F');
      expect(service.getQualityGrade(30)).toBe('F');
      expect(service.getQualityGrade(59)).toBe('F');
    });
  });

  describe('Supply data structure', () => {
    it('should have capabilities with correct structure', async () => {
      const mockResponse = {
        text: JSON.stringify({
          title: 'Test Service',
          description: 'Test',
          service_type: 'test',
          capabilities: [
            {
              name: 'Skill 1',
              description: 'Description 1',
              level: 'expert',
              category: 'technical',
              keywords: ['keyword1', 'keyword2'],
            },
          ],
          pricing: { type: 'hourly', min_rate: 50, max_rate: 100, currency: 'USD' },
          skills: ['skill1', 'skill2'],
        }),
        provider: 'openai' as const,
        model: 'gpt-4',
        usage: { input: 50, output: 100, total: 150 },
        cost: 0.02,
      };

      mockLLMService.generateText.mockResolvedValue(mockResponse);

      const result = await service.extract({
        text: 'Test service with capabilities',
        scene: 'visionshare',
      });

      const capability = result.supply.capabilities[0];
      expect(capability).toHaveProperty('name');
      expect(capability).toHaveProperty('description');
      expect(capability).toHaveProperty('level');
      expect(capability).toHaveProperty('category');
      expect(capability).toHaveProperty('keywords');
      expect(['beginner', 'intermediate', 'advanced', 'expert']).toContain(capability.level);
    });

    it('should have pricing with correct structure', async () => {
      const mockResponse = {
        text: JSON.stringify({
          title: 'Test Service',
          description: 'Test',
          service_type: 'test',
          capabilities: [],
          pricing: {
            type: 'range',
            min_rate: 50,
            max_rate: 150,
            currency: 'USD',
            unit: 'hour',
            description: 'Range pricing',
          },
          skills: [],
        }),
        provider: 'openai' as const,
        model: 'gpt-4',
        usage: { input: 50, output: 100, total: 150 },
        cost: 0.02,
      };

      mockLLMService.generateText.mockResolvedValue(mockResponse);

      const result = await service.extract({
        text: 'Test service with pricing',
        scene: 'visionshare',
      });

      expect(result.supply.pricing).toHaveProperty('type');
      expect(result.supply.pricing).toHaveProperty('currency');
      expect(['hourly', 'fixed', 'range', 'negotiable']).toContain(result.supply.pricing.type);
    });
  });
});
