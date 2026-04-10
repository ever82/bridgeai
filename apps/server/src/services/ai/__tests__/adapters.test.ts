/**
 * LLM Adapter Tests
 */

import { BaseLLMAdapter } from '../adapters/base';
import {
  ChatCompletionRequest,
  ChatCompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  ModelInfo,
  StreamChunk,
  RequestContext
} from '../types';

// Mock adapter implementation for testing
class MockAdapter extends BaseLLMAdapter {
  readonly id = 'openai';
  readonly provider = 'OpenAI';

  chatCompletionResponses: ChatCompletionResponse[] = [];
  embeddingResponses: EmbeddingResponse[] = [];

  async chatCompletion(
    request: ChatCompletionRequest,
    context: RequestContext
  ): Promise<ChatCompletionResponse> {
    if (this.chatCompletionResponses.length > 0) {
      return this.chatCompletionResponses.shift()!;
    }
    throw new Error('No mock response available');
  }

  async streamChatCompletion(
    request: ChatCompletionRequest,
    context: RequestContext,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<void> {
    // Simulate streaming by calling onChunk multiple times
    onChunk({
      id: 'chunk-1',
      model: request.model,
      choices: [{
        index: 0,
        delta: { role: 'assistant', content: 'Hello' },
        finishReason: null
      }]
    });

    onChunk({
      id: 'chunk-2',
      model: request.model,
      choices: [{
        index: 0,
        delta: { content: ' World' },
        finishReason: null
      }]
    });

    onChunk({
      id: 'chunk-3',
      model: request.model,
      choices: [{
        index: 0,
        delta: {},
        finishReason: 'stop'
      }]
    });
  }

  async embeddings(
    request: EmbeddingRequest,
    context: RequestContext
  ): Promise<EmbeddingResponse> {
    if (this.embeddingResponses.length > 0) {
      return this.embeddingResponses.shift()!;
    }
    throw new Error('No mock embedding response available');
  }

  calculateCost(modelId: string, inputTokens: number, outputTokens: number): number {
    return (inputTokens + outputTokens) * 0.00001;
  }

  protected async loadModels(): Promise<void> {
    const models: ModelInfo[] = [
      {
        id: 'mock-model-1',
        name: 'Mock Model 1',
        provider: 'openai',
        capabilities: {
          chatCompletion: true,
          embeddings: true,
          streaming: true,
          maxTokens: 4096,
          supportedLanguages: ['en', 'zh']
        },
        costPer1KTokens: { input: 0.001, output: 0.002 },
        averageLatencyMs: 500,
        qualityScore: 80
      }
    ];

    models.forEach(model => {
      this.models.set(model.id, model);
    });
  }
}

describe('BaseLLMAdapter', () => {
  let adapter: MockAdapter;

  beforeEach(async () => {
    adapter = new MockAdapter();
    await adapter.initialize();
  });

  describe('Initialization', () => {
    it('should initialize and load models', () => {
      expect(adapter).toBeDefined();
    });

    it('should have provider id', () => {
      expect(adapter.id).toBe('openai');
      expect(adapter.provider).toBe('OpenAI');
    });
  });

  describe('Model Management', () => {
    it('should get all models', async () => {
      const models = await adapter.getModels();
      expect(models).toHaveLength(1);
      expect(models[0].id).toBe('mock-model-1');
    });

    it('should get specific model info', async () => {
      const model = await adapter.getModelInfo('mock-model-1');
      expect(model).not.toBeNull();
      expect(model?.name).toBe('Mock Model 1');
    });

    it('should return null for unknown model', async () => {
      const model = await adapter.getModelInfo('unknown');
      expect(model).toBeNull();
    });
  });

  describe('Health Check', () => {
    it('should pass health check if models loaded', async () => {
      const healthy = await adapter.healthCheck();
      expect(healthy).toBe(true);
    });
  });

  describe('Chat Completion', () => {
    it('should return chat completion response', async () => {
      const mockResponse: ChatCompletionResponse = {
        id: 'resp-1',
        model: 'mock-model-1',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Hello!' },
          finishReason: 'stop'
        }],
        usage: {
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15
        },
        createdAt: new Date()
      };

      adapter.chatCompletionResponses.push(mockResponse);

      const request: ChatCompletionRequest = {
        model: 'mock-model-1',
        messages: [{ role: 'user', content: 'Hi' }]
      };

      const context: RequestContext = {
        requestId: 'req-1',
        provider: 'openai',
        model: 'mock-model-1',
        startTime: new Date(),
        routingStrategy: 'round-robin'
      };

      const response = await adapter.chatCompletion(request, context);
      expect(response.choices[0].message.content).toBe('Hello!');
    });
  });

  describe('Streaming', () => {
    it('should stream chat completion', async () => {
      const chunks: StreamChunk[] = [];

      const request: ChatCompletionRequest = {
        model: 'mock-model-1',
        messages: [{ role: 'user', content: 'Hi' }]
      };

      const context: RequestContext = {
        requestId: 'req-1',
        provider: 'openai',
        model: 'mock-model-1',
        startTime: new Date(),
        routingStrategy: 'round-robin'
      };

      await adapter.streamChatCompletion(request, context, (chunk) => {
        chunks.push(chunk);
      });

      expect(chunks).toHaveLength(3);
      expect(chunks[0].choices[0].delta.content).toBe('Hello');
      expect(chunks[1].choices[0].delta.content).toBe(' World');
      expect(chunks[2].choices[0].finishReason).toBe('stop');
    });
  });

  describe('Embeddings', () => {
    it('should return embedding response', async () => {
      const mockResponse: EmbeddingResponse = {
        model: 'mock-model-1',
        data: [{
          index: 0,
          embedding: [0.1, 0.2, 0.3]
        }],
        usage: {
          promptTokens: 5,
          totalTokens: 5
        }
      };

      adapter.embeddingResponses.push(mockResponse);

      const request: EmbeddingRequest = {
        model: 'mock-model-1',
        input: 'test text'
      };

      const context: RequestContext = {
        requestId: 'req-1',
        provider: 'openai',
        model: 'mock-model-1',
        startTime: new Date(),
        routingStrategy: 'round-robin'
      };

      const response = await adapter.embeddings(request, context);
      expect(response.data[0].embedding).toEqual([0.1, 0.2, 0.3]);
    });
  });

  describe('Cost Calculation', () => {
    it('should calculate cost correctly', () => {
      const cost = adapter.calculateCost('mock-model-1', 1000, 500);
      expect(cost).toBeCloseTo(0.015, 5); // (1000 + 500) * 0.00001
    });
  });
});

describe('Model Capabilities', () => {
  it('should verify model capabilities structure', () => {
    const capabilities = {
      chatCompletion: true,
      embeddings: true,
      streaming: true,
      maxTokens: 4096,
      supportedLanguages: ['en', 'zh']
    };

    expect(capabilities.chatCompletion).toBe(true);
    expect(capabilities.embeddings).toBe(true);
    expect(capabilities.streaming).toBe(true);
    expect(capabilities.maxTokens).toBe(4096);
    expect(capabilities.supportedLanguages).toContain('en');
    expect(capabilities.supportedLanguages).toContain('zh');
  });
});
