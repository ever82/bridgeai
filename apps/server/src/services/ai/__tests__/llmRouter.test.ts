/**
 * LLM Router Tests
 */

import { LLMRouter } from '../llmRouter';
import {
  RoutingStrategy,
  ChatCompletionRequest,
  ModelInfo
} from '../types';

// 测试用的模型数据
const mockModels: ModelInfo[] = [
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'openai',
    capabilities: {
      chatCompletion: true,
      embeddings: false,
      streaming: true,
      maxTokens: 8192,
      supportedLanguages: ['zh', 'en']
    },
    costPer1KTokens: { input: 0.03, output: 0.06 },
    averageLatencyMs: 1500,
    qualityScore: 95
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    capabilities: {
      chatCompletion: true,
      embeddings: false,
      streaming: true,
      maxTokens: 16384,
      supportedLanguages: ['zh', 'en']
    },
    costPer1KTokens: { input: 0.0005, output: 0.0015 },
    averageLatencyMs: 800,
    qualityScore: 85
  },
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'claude',
    capabilities: {
      chatCompletion: true,
      embeddings: false,
      streaming: true,
      maxTokens: 200000,
      supportedLanguages: ['zh', 'en']
    },
    costPer1KTokens: { input: 0.015, output: 0.075 },
    averageLatencyMs: 1800,
    qualityScore: 96
  },
  {
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'claude',
    capabilities: {
      chatCompletion: true,
      embeddings: false,
      streaming: true,
      maxTokens: 200000,
      supportedLanguages: ['zh', 'en']
    },
    costPer1KTokens: { input: 0.00025, output: 0.00125 },
    averageLatencyMs: 600,
    qualityScore: 82
  },
  {
    id: 'ernie-bot',
    name: '文心一言',
    provider: 'wenxin',
    capabilities: {
      chatCompletion: true,
      embeddings: false,
      streaming: true,
      maxTokens: 4096,
      supportedLanguages: ['zh', 'en']
    },
    costPer1KTokens: { input: 0.004, output: 0.004 },
    averageLatencyMs: 1200,
    qualityScore: 82
  }
];

describe('LLMRouter', () => {
  let router: LLMRouter;

  beforeEach(() => {
    router = new LLMRouter();
    mockModels.forEach(model => router.registerModel(model));
  });

  describe('Cost-based Routing', () => {
    beforeEach(() => {
      router.updateConfig({ strategy: 'cost' });
    });

    it('should select cheapest model', () => {
      const request: ChatCompletionRequest = {
        model: '',
        messages: [{ role: 'user', content: 'Hello' }]
      };

      const decision = router.route(request, ['openai', 'claude', 'wenxin']);

      // Claude 3 Haiku has the lowest cost
      expect(decision.provider).toBe('claude');
      expect(decision.model).toBe('claude-3-haiku');
      expect(decision.reason).toContain('cost');
    });

    it('should consider both input and output costs', () => {
      const cheapModel = mockModels.find(m => m.id === 'claude-3-haiku');
      const cheapTotal = cheapModel!.costPer1KTokens.input + cheapModel!.costPer1KTokens.output;
      expect(cheapTotal).toBe(0.0015); // 0.00025 + 0.00125
    });
  });

  describe('Latency-based Routing', () => {
    beforeEach(() => {
      router.updateConfig({ strategy: 'latency' });
    });

    it('should select lowest latency model', () => {
      const request: ChatCompletionRequest = {
        model: '',
        messages: [{ role: 'user', content: 'Hello' }]
      };

      const decision = router.route(request, ['openai', 'claude', 'wenxin']);

      // Claude 3 Haiku has the lowest latency (600ms)
      expect(decision.provider).toBe('claude');
      expect(decision.model).toBe('claude-3-haiku');
      expect(decision.reason).toContain('latency');
    });
  });

  describe('Quality-based Routing', () => {
    beforeEach(() => {
      router.updateConfig({ strategy: 'quality' });
    });

    it('should select highest quality model', () => {
      const request: ChatCompletionRequest = {
        model: '',
        messages: [{ role: 'user', content: 'Hello' }]
      };

      const decision = router.route(request, ['openai', 'claude', 'wenxin']);

      // Claude 3 Opus has the highest quality score (96)
      expect(decision.provider).toBe('claude');
      expect(decision.model).toBe('claude-3-opus');
      expect(decision.reason).toContain('quality');
    });
  });

  describe('Round-Robin Routing', () => {
    beforeEach(() => {
      router.updateConfig({ strategy: 'round-robin' });
    });

    it('should cycle through providers', () => {
      const request: ChatCompletionRequest = {
        model: '',
        messages: [{ role: 'user', content: 'Hello' }]
      };

      const providers: string[] = [];
      for (let i = 0; i < 6; i++) {
        const decision = router.route(request, ['openai', 'claude', 'wenxin']);
        providers.push(decision.provider);
      }

      // Should cycle through all three providers
      expect(providers).toContain('openai');
      expect(providers).toContain('claude');
      expect(providers).toContain('wenxin');
      expect(new Set(providers).size).toBe(3);
    });

    it('should include round-robin info in reason', () => {
      const request: ChatCompletionRequest = {
        model: '',
        messages: [{ role: 'user', content: 'Hello' }]
      };

      const decision = router.route(request, ['openai', 'claude', 'wenxin']);
      expect(decision.reason).toContain('Round-robin');
    });
  });

  describe('Weighted Routing', () => {
    beforeEach(() => {
      router.updateConfig({ strategy: 'weighted' });
      router.setProviderWeight('openai', 50);
      router.setProviderWeight('claude', 30);
      router.setProviderWeight('wenxin', 20);
    });

    it('should respect provider weights', () => {
      const request: ChatCompletionRequest = {
        model: '',
        messages: [{ role: 'user', content: 'Hello' }]
      };

      // Run many times to verify distribution
      const providerCounts: Record<string, number> = {};
      for (let i = 0; i < 100; i++) {
        const decision = router.route(request, ['openai', 'claude', 'wenxin']);
        providerCounts[decision.provider] = (providerCounts[decision.provider] || 0) + 1;
      }

      // Higher weight should generally get more requests
      expect(providerCounts['openai']).toBeGreaterThan(providerCounts['wenxin'] || 0);
      expect(decision.reason).toContain('weighted');
    });
  });

  describe('Health-based Filtering', () => {
    it('should filter out unhealthy providers', () => {
      router.updateConfig({ strategy: 'cost' });

      // Mark wenxin as unhealthy
      router.updateProviderHealth({
        provider: 'wenxin',
        healthy: false,
        latencyMs: 5000,
        successRate: 0.1,
        lastChecked: new Date()
      });

      const request: ChatCompletionRequest = {
        model: '',
        messages: [{ role: 'user', content: 'Hello' }]
      };

      const decision = router.route(request, ['openai', 'claude', 'wenxin']);

      // Should not select wenxin even though it might be cheapest
      expect(decision.provider).not.toBe('wenxin');
    });

    it('should throw error if no healthy providers', () => {
      router.updateConfig({ strategy: 'round-robin' });

      // Mark all as unhealthy
      ['openai', 'claude', 'wenxin'].forEach(provider => {
        router.updateProviderHealth({
          provider: provider as any,
          healthy: false,
          latencyMs: 5000,
          successRate: 0.1,
          lastChecked: new Date()
        });
      });

      const request: ChatCompletionRequest = {
        model: '',
        messages: [{ role: 'user', content: 'Hello' }]
      };

      expect(() => router.route(request, ['openai', 'claude', 'wenxin']))
        .toThrow('No healthy providers available');
    });
  });

  describe('Capability-based Routing', () => {
    it('should filter by capabilities', () => {
      const matches = router.routeByCapabilities(
        { chatCompletion: true, maxTokens: 100000 },
        ['openai', 'claude', 'wenxin']
      );

      // Only claude-3-opus and claude-3-haiku support > 100k tokens
      expect(matches.length).toBe(2);
      expect(matches.every(m => m.provider === 'claude')).toBe(true);
    });

    it('should filter by language support', () => {
      const matches = router.routeByLanguage('zh', ['openai', 'claude', 'wenxin']);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches.every(m => m.reason.includes('zh'))).toBe(true);
    });
  });

  describe('Configuration', () => {
    it('should return current config', () => {
      const config = router.getConfig();
      expect(config).toHaveProperty('strategy');
      expect(config).toHaveProperty('fallbackEnabled');
      expect(config).toHaveProperty('maxRetries');
      expect(config).toHaveProperty('timeoutMs');
    });

    it('should update config', () => {
      router.updateConfig({ strategy: 'latency', maxRetries: 5 });

      const config = router.getConfig();
      expect(config.strategy).toBe('latency');
      expect(config.maxRetries).toBe(5);
    });

    it('should set provider weights', () => {
      router.setProviderWeight('openai', 60);
      router.setProviderWeight('claude', 40);
    });
  });

  describe('Health Summary', () => {
    it('should return health summary', () => {
      router.updateProviderHealth({
        provider: 'openai',
        healthy: true,
        latencyMs: 1000,
        successRate: 0.95,
        lastChecked: new Date()
      });

      router.updateProviderHealth({
        provider: 'claude',
        healthy: false,
        latencyMs: 3000,
        successRate: 0.7,
        lastChecked: new Date()
      });

      const summary = router.getHealthSummary();

      expect(summary.total).toBe(2);
      expect(summary.healthy).toBe(1);
      expect(summary.unhealthy).toBe(1);
      expect(summary.details).toHaveLength(2);
    });
  });

  describe('Model Registration', () => {
    it('should register new models', () => {
      const newModel: ModelInfo = {
        id: 'new-model',
        name: 'New Model',
        provider: 'openai',
        capabilities: {
          chatCompletion: true,
          embeddings: true,
          streaming: true,
          maxTokens: 4096,
          supportedLanguages: ['en']
        },
        costPer1KTokens: { input: 0.001, output: 0.002 },
        averageLatencyMs: 1000,
        qualityScore: 90
      };

      router.registerModel(newModel);

      // The model should be available for routing
      const matches = router.routeByCapabilities(
        { embeddings: true },
        ['openai']
      );

      expect(matches.some(m => m.model === 'new-model')).toBe(true);
    });
  });
});
