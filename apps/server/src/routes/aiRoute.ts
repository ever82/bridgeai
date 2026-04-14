/**
 * AI Routes
 * LLM服务API端点
 */

import { Router, Request, Response } from 'express';
import { LLMService } from '../services/ai/llmService';
import { CircuitBreakerManager } from '../services/ai/circuitBreaker';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { z } from 'zod';
import logger from '../utils/logger';
import extractionRoutes from './ai/extraction';

const router = Router();

// Mount extraction routes
router.use('/extract', extractionRoutes);

// 初始化LLM服务
const llmService = new LLMService({
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    apiUrl: process.env.OPENAI_API_URL,
    organization: process.env.OPENAI_ORGANIZATION
  },
  claude: {
    apiKey: process.env.CLAUDE_API_KEY || '',
    apiUrl: process.env.CLAUDE_API_URL
  },
  wenxin: {
    apiKey: process.env.WENXIN_API_KEY || '',
    secretKey: process.env.WENXIN_SECRET_KEY || '',
    apiUrl: process.env.WENXIN_API_URL
  },
  defaultStrategy: (process.env.LLM_ROUTING_STRATEGY as any) || 'round-robin'
});

// 服务初始化状态
let serviceInitialized = false;

/**
 * 确保服务已初始化
 */
async function ensureService(): Promise<void> {
  if (!serviceInitialized) {
    await llmService.initialize();
    serviceInitialized = true;
    logger.info('LLM Service initialized');
  }
}

// 验证规则
const chatCompletionSchema = z.object({
  model: z.string().optional(),
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string()
  })).min(1),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().positive().optional(),
  stream: z.boolean().optional(),
  top_p: z.number().min(0).max(1).optional(),
  frequency_penalty: z.number().min(-2).max(2).optional(),
  presence_penalty: z.number().min(-2).max(2).optional()
});

const embeddingSchema = z.object({
  model: z.string().optional(),
  input: z.union([z.string(), z.array(z.string())])
});

/**
 * @route   GET /api/v1/ai/models
 * @desc    获取可用模型列表
 * @access  Private
 */
router.get(
  '/models',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      await ensureService();
      const models = await llmService.getModels();

      res.json({
        success: true,
        data: {
          models,
          count: models.length
        }
      });
    } catch (error) {
      logger.error('Failed to get models:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve models'
      });
    }
  }
);

/**
 * @route   POST /api/v1/ai/chat
 * @desc    执行聊天完成
 * @access  Private
 */
router.post(
  '/chat',
  authenticateToken,
  validateRequest(chatCompletionSchema),
  async (req: Request, res: Response) => {
    try {
      await ensureService();

      const { stream = false, ...requestData } = req.body;

      if (stream) {
        // 流式响应
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const chunks: any[] = [];

        await llmService.streamChatCompletion(
          {
            model: requestData.model,
            messages: requestData.messages,
            temperature: requestData.temperature,
            maxTokens: requestData.max_tokens,
            topP: requestData.top_p,
            frequencyPenalty: requestData.frequency_penalty,
            presencePenalty: requestData.presence_penalty
          },
          (chunk) => {
            chunks.push(chunk);
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
          }
        );

        res.write('data: [DONE]\n\n');
        res.end();
      } else {
        // 非流式响应
        const response = await llmService.chatCompletion({
          model: requestData.model,
          messages: requestData.messages,
          temperature: requestData.temperature,
          maxTokens: requestData.max_tokens,
          topP: requestData.top_p,
          frequencyPenalty: requestData.frequency_penalty,
          presencePenalty: requestData.presence_penalty
        });

        res.json({
          success: true,
          data: {
            id: response.id,
            model: response.model,
            choices: response.choices.map(c => ({
              index: c.index,
              message: c.message,
              finish_reason: c.finishReason
            })),
            usage: {
              prompt_tokens: response.usage.promptTokens,
              completion_tokens: response.usage.completionTokens,
              total_tokens: response.usage.totalTokens
            },
            created_at: response.createdAt.toISOString()
          }
        });
      }
    } catch (error) {
      logger.error('Chat completion failed:', error);

      const statusCode = error instanceof Error &&
        error.message.includes('Circuit breaker') ? 503 : 500;

      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Chat completion failed'
      });
    }
  }
);

/**
 * @route   POST /api/v1/ai/embeddings
 * @desc    生成文本嵌入向量
 * @access  Private
 */
router.post(
  '/embeddings',
  authenticateToken,
  validateRequest(embeddingSchema),
  async (req: Request, res: Response) => {
    try {
      await ensureService();

      const { model, input } = req.body;

      const response = await llmService.embeddings({
        model: model || 'text-embedding-3-small',
        input
      });

      res.json({
        success: true,
        data: {
          model: response.model,
          embeddings: response.data.map(d => ({
            index: d.index,
            embedding: d.embedding
          })),
          usage: {
            prompt_tokens: response.usage.promptTokens,
            total_tokens: response.usage.totalTokens
          }
        }
      });
    } catch (error) {
      logger.error('Embeddings generation failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Embeddings generation failed'
      });
    }
  }
);

/**
 * @route   GET /api/v1/ai/health
 * @desc    获取服务健康状态
 * @access  Private
 */
router.get(
  '/health',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      await ensureService();
      const health = await llmService.getHealth();

      res.json({
        success: true,
        data: health
      });
    } catch (error) {
      logger.error('Health check failed:', error);
      res.status(500).json({
        success: false,
        error: 'Health check failed'
      });
    }
  }
);

/**
 * @route   GET /api/v1/ai/metrics
 * @desc    获取Prometheus指标
 * @access  Private
 */
router.get(
  '/metrics',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      await ensureService();
      const metrics = llmService.getMetrics();
      const prometheusMetrics = metrics.getPrometheusMetrics();

      res.setHeader('Content-Type', 'text/plain');
      res.send(prometheusMetrics);
    } catch (error) {
      logger.error('Metrics retrieval failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve metrics'
      });
    }
  }
);

/**
 * @route   GET /api/v1/ai/stats
 * @desc    获取统计摘要
 * @access  Private
 */
router.get(
  '/stats',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      await ensureService();
      const metrics = llmService.getMetrics();
      const stats = metrics.getStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Stats retrieval failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve stats'
      });
    }
  }
);

/**
 * @route   POST /api/v1/ai/routing/strategy
 * @desc    更新路由策略
 * @access  Private (Admin only)
 */
router.post(
  '/routing/strategy',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { strategy } = req.body;
      const validStrategies = ['cost', 'latency', 'quality', 'round-robin', 'weighted'];

      if (!validStrategies.includes(strategy)) {
        return res.status(400).json({
          success: false,
          error: `Invalid strategy. Must be one of: ${validStrategies.join(', ')}`
        });
      }

      llmService.setRoutingStrategy(strategy as any);

      res.json({
        success: true,
        data: { strategy }
      });
    } catch (error) {
      logger.error('Failed to update routing strategy:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update routing strategy'
      });
    }
  }
);

/**
 * @route   GET /api/v1/ai/circuit-breakers
 * @desc    获取熔断器状态
 * @access  Private
 */
router.get(
  '/circuit-breakers',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      await ensureService();
      const circuitBreakerManager = llmService.getCircuitBreakerManager();
      const stats = circuitBreakerManager.getAllStats();

      res.json({
        success: true,
        data: {
          circuit_breakers: stats
        }
      });
    } catch (error) {
      logger.error('Failed to get circuit breaker stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve circuit breaker status'
      });
    }
  }
);

export default router;
