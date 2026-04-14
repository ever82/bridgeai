/**
 * LLM Service
 * 统一的LLM服务入口
 */

import { ILLMAdapter, OpenAIAdapter, ClaudeAdapter, WenxinAdapter } from './adapters';
import { CircuitBreakerManager } from './circuitBreaker';
import { LLMRouter } from './llmRouter';
import { LLMMetricsService } from './metricsService';
import {
  FallbackChain,
  createDefaultFallbackChain
} from './fallback';
import {
  LLMProvider,
  ChatCompletionRequest,
  ChatCompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  StreamChunk,
  RoutingStrategy,
  ModelInfo,
  RequestContext,
  RequestMetrics
} from './types';

interface LLMServiceConfig {
  // 提供商配置
  openai?: {
    apiKey: string;
    apiUrl?: string;
    organization?: string;
  };
  claude?: {
    apiKey: string;
    apiUrl?: string;
  };
  wenxin?: {
    apiKey: string;
    secretKey: string;
    apiUrl?: string;
  };
  // 路由配置
  defaultStrategy?: RoutingStrategy;
  // 熔断器配置
  circuitBreaker?: {
    failureThreshold?: number;
    recoveryTimeoutMs?: number;
  };
}

/**
 * LLM服务
 * 提供统一的LLM接入接口
 */
export class LLMService {
  private adapters: Map<LLMProvider, ILLMAdapter> = new Map();
  private circuitBreakerManager: CircuitBreakerManager;
  private router: LLMRouter;
  private metrics: LLMMetricsService;
  private fallbackChain: FallbackChain;
  private config: LLMServiceConfig;
  private initialized = false;

  constructor(config: LLMServiceConfig) {
    this.config = config;
    this.circuitBreakerManager = new CircuitBreakerManager();
    this.router = new LLMRouter({
      strategy: config.defaultStrategy || 'round-robin',
      fallbackEnabled: true,
      maxRetries: 3,
      timeoutMs: 60000
    });
    this.metrics = new LLMMetricsService();
    this.fallbackChain = createDefaultFallbackChain();
  }

  /**
   * 初始化服务
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // 初始化OpenAI适配器
    if (this.config.openai?.apiKey) {
      const adapter = new OpenAIAdapter({
        apiKey: this.config.openai.apiKey,
        apiUrl: this.config.openai.apiUrl,
        organization: this.config.openai.organization,
        timeoutMs: 60000
      });

      await adapter.initialize();
      this.adapters.set('openai', adapter);

      // 注册模型到路由器
      const models = await adapter.getModels();
      models.forEach(m => this.router.registerModel(m));

      // 配置熔断器
      this.circuitBreakerManager.getCircuitBreaker('openai', {
        failureThreshold: this.config.circuitBreaker?.failureThreshold || 5,
        recoveryTimeoutMs: this.config.circuitBreaker?.recoveryTimeoutMs || 30000
      });
    }

    // 初始化Claude适配器
    if (this.config.claude?.apiKey) {
      const adapter = new ClaudeAdapter({
        apiKey: this.config.claude.apiKey,
        apiUrl: this.config.claude.apiUrl,
        timeoutMs: 60000
      });

      await adapter.initialize();
      this.adapters.set('claude', adapter);

      const models = await adapter.getModels();
      models.forEach(m => this.router.registerModel(m));

      this.circuitBreakerManager.getCircuitBreaker('claude', {
        failureThreshold: this.config.circuitBreaker?.failureThreshold || 5,
        recoveryTimeoutMs: this.config.circuitBreaker?.recoveryTimeoutMs || 30000
      });
    }

    // 初始化文心一言适配器
    if (this.config.wenxin?.apiKey && this.config.wenxin?.secretKey) {
      const adapter = new WenxinAdapter({
        apiKey: this.config.wenxin.apiKey,
        secretKey: this.config.wenxin.secretKey,
        apiUrl: this.config.wenxin.apiUrl,
        timeoutMs: 60000
      });

      await adapter.initialize();
      this.adapters.set('wenxin', adapter);

      const models = await adapter.getModels();
      models.forEach(m => this.router.registerModel(m));

      this.circuitBreakerManager.getCircuitBreaker('wenxin', {
        failureThreshold: this.config.circuitBreaker?.failureThreshold || 5,
        recoveryTimeoutMs: this.config.circuitBreaker?.recoveryTimeoutMs || 30000
      });
    }

    // 设置熔断器事件监听
    this.circuitBreakerManager.getAllStats().forEach(({ provider }) => {
      const breaker = this.circuitBreakerManager.getCircuitBreaker(provider);
      breaker.on('stateChange', (event) => {
        this.metrics.recordCircuitBreakerEvent(event);
      });
    });

    this.initialized = true;
  }

  /**
   * 获取所有可用模型
   */
  async getModels(): Promise<ModelInfo[]> {
    const allModels: ModelInfo[] = [];

    for (const adapter of this.adapters.values()) {
      const models = await adapter.getModels();
      allModels.push(...models);
    }

    return allModels;
  }

  /**
   * 获取特定模型信息
   */
  async getModelInfo(modelId: string): Promise<ModelInfo | null> {
    for (const adapter of this.adapters.values()) {
      const info = await adapter.getModelInfo(modelId);
      if (info) return info;
    }
    return null;
  }

  /**
   * 执行聊天完成
   */
  async chatCompletion(
    request: ChatCompletionRequest,
    preferredProvider?: LLMProvider
  ): Promise<ChatCompletionResponse> {
    this.ensureInitialized();

    const startTime = Date.now();
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 确定使用哪个提供商
    let provider: LLMProvider;
    let model: string;

    if (preferredProvider && this.adapters.has(preferredProvider)) {
      provider = preferredProvider;
      model = request.model;
    } else {
      // 使用路由器选择
      const availableProviders = this.getAvailableProviders();
      const decision = this.router.route(request, availableProviders);
      provider = decision.provider;
      model = decision.model;
    }

    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new Error(`No adapter available for provider: ${provider}`);
    }

    const context: RequestContext = {
      requestId,
      provider,
      model,
      startTime: new Date(),
      routingStrategy: this.router.getConfig().strategy
    };

    // 记录请求开始
    this.metrics.recordRequestStart(requestId, provider, model);

    try {
      // 使用熔断器执行
      const breaker = this.circuitBreakerManager.getCircuitBreaker(provider);
      const response = await breaker.execute(
        () => adapter.chatCompletion({ ...request, model }, context)
      );

      // 计算成本
      const cost = adapter.calculateCost(
        model,
        response.usage.promptTokens,
        response.usage.completionTokens
      );

      // 记录指标
      const latencyMs = Date.now() - startTime;
      this.recordMetrics({
        requestId,
        provider,
        model,
        latencyMs,
        success: true,
        tokenUsage: {
          input: response.usage.promptTokens,
          output: response.usage.completionTokens,
          total: response.usage.totalTokens
        },
        costUsd: cost
      });

      return response;
    } catch (error) {
      // 记录失败指标
      const latencyMs = Date.now() - startTime;
      this.recordMetrics({
        requestId,
        provider,
        model,
        latencyMs,
        success: false,
        errorType: error instanceof Error ? error.name : 'unknown',
        tokenUsage: { input: 0, output: 0, total: 0 },
        costUsd: 0
      });

      // 尝试降级
      const fallbackResult = await this.tryFallback(request, error as Error);
      if (fallbackResult.success && fallbackResult.response) {
        return fallbackResult.response;
      }

      throw error;
    } finally {
      this.metrics.recordRequestEnd(requestId, provider, model);
    }
  }

  /**
   * 执行流式聊天完成
   */
  async streamChatCompletion(
    request: ChatCompletionRequest,
    onChunk: (chunk: StreamChunk) => void,
    preferredProvider?: LLMProvider
  ): Promise<void> {
    this.ensureInitialized();

    const startTime = Date.now();
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 确定使用哪个提供商
    let provider: LLMProvider;
    let model: string;

    if (preferredProvider && this.adapters.has(preferredProvider)) {
      provider = preferredProvider;
      model = request.model;
    } else {
      const availableProviders = this.getAvailableProviders();
      const decision = this.router.route(request, availableProviders);
      provider = decision.provider;
      model = decision.model;
    }

    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new Error(`No adapter available for provider: ${provider}`);
    }

    const context: RequestContext = {
      requestId,
      provider,
      model,
      startTime: new Date(),
      routingStrategy: this.router.getConfig().strategy
    };

    this.metrics.recordRequestStart(requestId, provider, model);

    try {
      const breaker = this.circuitBreakerManager.getCircuitBreaker(provider);
      await breaker.execute(
        () => adapter.streamChatCompletion({ ...request, model }, context, onChunk)
      );

      const latencyMs = Date.now() - startTime;
      this.recordMetrics({
        requestId,
        provider,
        model,
        latencyMs,
        success: true,
        tokenUsage: { input: 0, output: 0, total: 0 }, // 流式请求token在回调中统计
        costUsd: 0
      });
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      this.recordMetrics({
        requestId,
        provider,
        model,
        latencyMs,
        success: false,
        errorType: error instanceof Error ? error.name : 'unknown',
        tokenUsage: { input: 0, output: 0, total: 0 },
        costUsd: 0
      });
      throw error;
    } finally {
      this.metrics.recordRequestEnd(requestId, provider, model);
    }
  }

  /**
   * 执行嵌入请求
   */
  async embeddings(
    request: EmbeddingRequest,
    preferredProvider?: LLMProvider
  ): Promise<EmbeddingResponse> {
    this.ensureInitialized();

    const startTime = Date.now();
    const requestId = `emb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 选择支持embeddings的提供商
    let provider: LLMProvider;
    let model: string;

    if (preferredProvider && this.adapters.has(preferredProvider)) {
      provider = preferredProvider;
      model = request.model;
    } else {
      // 默认使用OpenAI做embeddings
      provider = 'openai';
      model = request.model || 'text-embedding-3-small';
    }

    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new Error(`No adapter available for provider: ${provider}`);
    }

    const context: RequestContext = {
      requestId,
      provider,
      model,
      startTime: new Date(),
      routingStrategy: 'direct'
    };

    try {
      const response = await adapter.embeddings({ ...request, model }, context);

      const latencyMs = Date.now() - startTime;
      this.recordMetrics({
        requestId,
        provider,
        model,
        latencyMs,
        success: true,
        tokenUsage: {
          input: response.usage.promptTokens,
          output: 0,
          total: response.usage.totalTokens
        },
        costUsd: 0
      });

      return response;
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      this.recordMetrics({
        requestId,
        provider,
        model,
        latencyMs,
        success: false,
        errorType: error instanceof Error ? error.name : 'unknown',
        tokenUsage: { input: 0, output: 0, total: 0 },
        costUsd: 0
      });
      throw error;
    }
  }

  /**
   * 设置路由策略
   */
  setRoutingStrategy(strategy: RoutingStrategy): void {
    this.router.updateConfig({ strategy });
  }

  /**
   * 获取指标服务
   */
  getMetrics(): LLMMetricsService {
    return this.metrics;
  }

  /**
   * 获取熔断器管理器
   */
  getCircuitBreakerManager(): CircuitBreakerManager {
    return this.circuitBreakerManager;
  }

  /**
   * 获取路由器
   */
  getRouter(): LLMRouter {
    return this.router;
  }

  /**
   * 获取健康状态
   */
  async getHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    providers: Array<{ provider: LLMProvider; healthy: boolean }>;
  }> {
    const results: Array<{ provider: LLMProvider; healthy: boolean }> = [];

    for (const [provider, adapter] of this.adapters.entries()) {
      const healthy = await adapter.healthCheck();
      results.push({ provider, healthy });
    }

    const healthyCount = results.filter(r => r.healthy).length;
    let status: 'healthy' | 'degraded' | 'unhealthy';

    if (healthyCount === results.length) {
      status = 'healthy';
    } else if (healthyCount > 0) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return { status, providers: results };
  }

  private getAvailableProviders(): LLMProvider[] {
    return Array.from(this.adapters.keys())
      .filter(provider => {
        const breaker = this.circuitBreakerManager.getCircuitBreaker(provider);
        return breaker.canExecute();
      });
  }

  private async tryFallback(
    request: ChatCompletionRequest,
    error: Error
  ): Promise<import('./fallback').FallbackResult> {
    // 降级策略暂未实现完整逻辑
    // 实际项目中需要实现FallbackContext
    return { success: false, strategy: 'none', message: 'Fallback not implemented' };
  }

  private recordMetrics(metrics: RequestMetrics): void {
    this.metrics.recordRequest(metrics);
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('LLMService not initialized. Call initialize() first.');
    }
  }
}

/**
 * Generate text using chat completion (simplified interface)
 * This is a helper method that wraps chatCompletion for simple text generation
 */
export interface GenerateTextOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
  provider?: LLMProvider;
}

export interface GenerateTextResponse {
  text: string;
  provider: LLMProvider;
  model: string;
  latencyMs: number;
  cost: number;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Extend LLMService with generateText method
declare module './llmService' {
  interface LLMService {
    generateText(prompt: string, options?: GenerateTextOptions): Promise<GenerateTextResponse>;
  }
}

// Add generateText method to LLMService prototype
LLMService.prototype.generateText = async function(
  this: LLMService,
  prompt: string,
  options: GenerateTextOptions = {}
): Promise<GenerateTextResponse> {
  const response = await this.chatCompletion({
    model: options.model || 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: options.temperature ?? 0.7,
    maxTokens: options.maxTokens,
  }, options.provider);

  const text = response.choices[0]?.message?.content || '';

  return {
    text,
    provider: response.model.includes('claude') ? 'claude' :
              response.model.includes('ernie') ? 'wenxin' : 'openai',
    model: response.model,
    latencyMs: 0, // Would need to track this
    cost: 0, // Would need to calculate this
    usage: {
      promptTokens: response.usage.promptTokens,
      completionTokens: response.usage.completionTokens,
      totalTokens: response.usage.totalTokens,
    },
  };
};

// Export singleton instance
export const llmService = new LLMService({
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    apiUrl: process.env.OPENAI_API_URL,
  },
  claude: {
    apiKey: process.env.CLAUDE_API_KEY || '',
    apiUrl: process.env.CLAUDE_API_URL,
  },
  wenxin: {
    apiKey: process.env.WENXIN_API_KEY || '',
    secretKey: process.env.WENXIN_SECRET_KEY || '',
    apiUrl: process.env.WENXIN_API_URL,
  },
});
