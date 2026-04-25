/**
 * AI Route Integration Tests
 * Tests for chat, embeddings, health, metrics, and circuit-breaker endpoints
 */

import request from 'supertest';
import express, { Express } from 'express';

// Mock auth middleware
jest.mock('../../../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { id: 'test-user-id', email: 'test@test.com' };
    next();
  },
}));

// Mock validation middleware to pass through
jest.mock('../../../middleware/validation', () => ({
  validate: () => (req: any, res: any, next: any) => next(),
}));

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockChatCompletion = jest.fn();
const mockStreamChatCompletion = jest.fn();
const mockEmbeddings = jest.fn();
const mockGetModels = jest.fn();
const mockGetHealth = jest.fn().mockResolvedValue({
  status: 'healthy',
  providers: [
    { provider: 'openai', healthy: true },
  ],
});
const mockGetMetrics = jest.fn();
const mockSetRoutingStrategy = jest.fn();
const mockInitialize = jest.fn().mockResolvedValue(undefined);
const mockGetCircuitBreakerManager = jest.fn();

jest.mock('../../../services/ai/llmService', () => {
  return {
    LLMService: jest.fn().mockImplementation(() => ({
      initialize: mockInitialize,
      chatCompletion: mockChatCompletion,
      streamChatCompletion: mockStreamChatCompletion,
      embeddings: mockEmbeddings,
      getModels: mockGetModels,
      getHealth: mockGetHealth,
      getMetrics: mockGetMetrics,
      setRoutingStrategy: mockSetRoutingStrategy,
      getCircuitBreakerManager: mockGetCircuitBreakerManager,
    })),
    // Prevent singleton from being auto-created with real env
    llmService: undefined,
  };
});

// Must import after mocks are set up
import aiRoute from '../../aiRoute';

function makeChatResponse(overrides = {}) {
  return {
    id: 'chatcmpl-123',
    model: 'gpt-4',
    choices: [{
      index: 0,
      message: { role: 'assistant', content: 'Hello! How can I help you?' },
      finishReason: 'stop',
    }],
    usage: { promptTokens: 10, completionTokens: 8, totalTokens: 18 },
    createdAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

function makeEmbeddingResponse(overrides = {}) {
  return {
    model: 'text-embedding-3-small',
    data: [{
      index: 0,
      embedding: [0.1, 0.2, 0.3],
    }],
    usage: { promptTokens: 5, totalTokens: 5 },
    ...overrides,
  };
}

describe('AI Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/ai', aiRoute);

    jest.clearAllMocks();
    mockInitialize.mockResolvedValue(undefined);
    mockGetHealth.mockResolvedValue({
      status: 'healthy',
      providers: [{ provider: 'openai', healthy: true }],
    });
    mockGetMetrics.mockReturnValue({
      getPrometheusMetrics: () => '# HELP llm_requests_total Total requests\nllm_requests_total 10\n',
      getStats: () => ({ totalRequests: 10, successRate: 0.95 }),
    });
    mockGetCircuitBreakerManager.mockReturnValue({
      getAllStats: () => [
        { provider: 'openai', state: 'CLOSED', failures: 0, successes: 10 },
      ],
    });
  });

  // ---- POST /api/v1/ai/chat ----

  describe('POST /api/v1/ai/chat', () => {
    it('should return chat completion response', async () => {
      mockChatCompletion.mockResolvedValue(makeChatResponse());

      const res = await request(app)
        .post('/api/v1/ai/chat')
        .send({
          messages: [{ role: 'user', content: 'Hello' }],
          model: 'gpt-4',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.model).toBe('gpt-4');
      expect(res.body.data.choices[0].message.content).toBe('Hello! How can I help you?');
      expect(mockChatCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Hello' }],
        })
      );
    });

    it('should handle chat completion errors', async () => {
      mockChatCompletion.mockRejectedValue(new Error('Provider unavailable'));

      const res = await request(app)
        .post('/api/v1/ai/chat')
        .send({
          messages: [{ role: 'user', content: 'Hello' }],
        });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Provider unavailable');
    });

    it('should return 503 when circuit breaker is open', async () => {
      mockChatCompletion.mockRejectedValue(new Error('Circuit breaker is OPEN'));

      const res = await request(app)
        .post('/api/v1/ai/chat')
        .send({
          messages: [{ role: 'user', content: 'Hello' }],
        });

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
    });
  });

  // ---- POST /api/v1/ai/embeddings ----

  describe('POST /api/v1/ai/embeddings', () => {
    it('should return embedding response', async () => {
      mockEmbeddings.mockResolvedValue(makeEmbeddingResponse());

      const res = await request(app)
        .post('/api/v1/ai/embeddings')
        .send({
          input: 'Hello world',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.model).toBe('text-embedding-3-small');
      expect(res.body.data.embeddings[0].embedding).toEqual([0.1, 0.2, 0.3]);
      expect(mockEmbeddings).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'text-embedding-3-small',
          input: 'Hello world',
        })
      );
    });

    it('should accept custom model', async () => {
      mockEmbeddings.mockResolvedValue(makeEmbeddingResponse({ model: 'custom-emb' }));

      const res = await request(app)
        .post('/api/v1/ai/embeddings')
        .send({
          model: 'custom-emb',
          input: 'Test text',
        });

      expect(res.status).toBe(200);
      expect(mockEmbeddings).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'custom-emb' })
      );
    });

    it('should handle embedding errors', async () => {
      mockEmbeddings.mockRejectedValue(new Error('Embedding failed'));

      const res = await request(app)
        .post('/api/v1/ai/embeddings')
        .send({ input: 'text' });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ---- GET /api/v1/ai/health ----

  describe('GET /api/v1/ai/health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/api/v1/ai/health');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('healthy');
      expect(res.body.data.providers).toEqual([{ provider: 'openai', healthy: true }]);
    });

    it('should handle health check errors', async () => {
      mockGetHealth.mockRejectedValue(new Error('Service unavailable'));

      const res = await request(app).get('/api/v1/ai/health');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ---- GET /api/v1/ai/metrics ----

  describe('GET /api/v1/ai/metrics', () => {
    it('should return prometheus metrics', async () => {
      const res = await request(app).get('/api/v1/ai/metrics');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/plain');
      expect(res.text).toContain('llm_requests_total');
    });

    it('should handle metrics errors', async () => {
      mockGetMetrics.mockReturnValue({
        getPrometheusMetrics: () => { throw new Error('Metrics error'); },
      });

      const res = await request(app).get('/api/v1/ai/metrics');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ---- GET /api/v1/ai/circuit-breakers ----

  describe('GET /api/v1/ai/circuit-breakers', () => {
    it('should return circuit breaker stats', async () => {
      const res = await request(app).get('/api/v1/ai/circuit-breakers');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.circuit_breakers).toEqual([
        { provider: 'openai', state: 'CLOSED', failures: 0, successes: 10 },
      ]);
    });

    it('should handle circuit breaker errors', async () => {
      mockGetCircuitBreakerManager.mockReturnValue({
        getAllStats: () => { throw new Error('CB error'); },
      });

      const res = await request(app).get('/api/v1/ai/circuit-breakers');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ---- POST /api/v1/ai/routing/strategy ----

  describe('POST /api/v1/ai/routing/strategy', () => {
    it('should update routing strategy', async () => {
      const res = await request(app)
        .post('/api/v1/ai/routing/strategy')
        .send({ strategy: 'cost' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.strategy).toBe('cost');
      expect(mockSetRoutingStrategy).toHaveBeenCalledWith('cost');
    });

    it('should reject invalid strategy', async () => {
      const res = await request(app)
        .post('/api/v1/ai/routing/strategy')
        .send({ strategy: 'invalid' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Invalid strategy');
    });
  });

  // ---- GET /api/v1/ai/models ----

  describe('GET /api/v1/ai/models', () => {
    it('should return model list', async () => {
      mockGetModels.mockResolvedValue([
        { id: 'gpt-4', name: 'GPT-4', provider: 'openai' },
        { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'claude' },
      ]);

      const res = await request(app).get('/api/v1/ai/models');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.models).toHaveLength(2);
      expect(res.body.data.count).toBe(2);
    });

    it('should handle model list errors', async () => {
      mockGetModels.mockRejectedValue(new Error('List failed'));

      const res = await request(app).get('/api/v1/ai/models');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });
});
