/**
 * Fallback Strategies
 * 降级与容错策略实现
 */

import {
  ChatCompletionRequest,
  ChatCompletionResponse,
  LLMProvider,
  ModelInfo
} from '../types';

/**
 * 降级策略接口
 */
export interface FallbackStrategy {
  readonly name: string;
  execute(
    originalRequest: ChatCompletionRequest,
    error: Error,
    context: FallbackContext
  ): Promise<FallbackResult>;
}

/**
 * 降级上下文
 */
export interface FallbackContext {
  availableProviders: LLMProvider[];
  models: Map<string, ModelInfo>;
  cache?: ResponseCache;
  attemptCount: number;
  originalProvider: LLMProvider;
}

/**
 * 降级结果
 */
export interface FallbackResult {
  success: boolean;
  response?: ChatCompletionResponse;
  strategy: string;
  provider?: LLMProvider;
  model?: string;
  message?: string;
}

/**
 * 响应缓存接口
 */
export interface ResponseCache {
  get(key: string): Promise<ChatCompletionResponse | null>;
  set(key: string, value: ChatCompletionResponse, ttlMs?: number): Promise<void>;
  generateKey(request: ChatCompletionRequest): string;
}

/**
 * 模型降级策略
 * 切换到更便宜的模型
 */
export class ModelDowngradeStrategy implements FallbackStrategy {
  readonly name = 'model-downgrade';

  async execute(
    originalRequest: ChatCompletionRequest,
    error: Error,
    context: FallbackContext
  ): Promise<FallbackResult> {
    const currentModel = context.models.get(originalRequest.model);
    if (!currentModel) {
      return {
        success: false,
        strategy: this.name,
        message: 'Current model not found in registry'
      };
    }

    // 查找同提供商的更便宜模型
    const cheaperModels = Array.from(context.models.values())
      .filter(m =>
        m.provider === currentModel.provider &&
        m.id !== currentModel.id &&
        m.capabilities.chatCompletion &&
        (m.costPer1KTokens.input + m.costPer1KTokens.output) <
        (currentModel.costPer1KTokens.input + currentModel.costPer1KTokens.output)
      )
      .sort((a, b) =>
        (a.costPer1KTokens.input + a.costPer1KTokens.output) -
        (b.costPer1KTokens.input + b.costPer1KTokens.output)
      );

    if (cheaperModels.length === 0) {
      return {
        success: false,
        strategy: this.name,
        message: 'No cheaper model available from same provider'
      };
    }

    const fallbackModel = cheaperModels[0];

    return {
      success: true,
      strategy: this.name,
      provider: fallbackModel.provider,
      model: fallbackModel.id,
      message: `Downgraded from ${currentModel.id} to ${fallbackModel.id}`
    };
  }
}

/**
 * 提供商降级策略
 * 切换到备用提供商
 */
export class ProviderSwitchStrategy implements FallbackStrategy {
  readonly name = 'provider-switch';

  async execute(
    originalRequest: ChatCompletionRequest,
    error: Error,
    context: FallbackContext
  ): Promise<FallbackResult> {
    const currentModel = context.models.get(originalRequest.model);
    if (!currentModel) {
      return {
        success: false,
        strategy: this.name,
        message: 'Current model not found in registry'
      };
    }

    // 获取其他可用提供商
    const otherProviders = context.availableProviders.filter(
      p => p !== currentModel.provider
    );

    if (otherProviders.length === 0) {
      return {
        success: false,
        strategy: this.name,
        message: 'No alternative providers available'
      };
    }

    // 选择第一个备用提供商的最佳模型
    for (const provider of otherProviders) {
      const providerModels = Array.from(context.models.values())
        .filter(m =>
          m.provider === provider &&
          m.capabilities.chatCompletion
        )
        .sort((a, b) => b.qualityScore - a.qualityScore);

      if (providerModels.length > 0) {
        return {
          success: true,
          strategy: this.name,
          provider: provider,
          model: providerModels[0].id,
          message: `Switched from ${currentModel.provider} to ${provider}`
        };
      }
    }

    return {
      success: false,
      strategy: this.name,
      message: 'No suitable model found in alternative providers'
    };
  }
}

/**
 * 缓存回退策略
 * 返回缓存的响应
 */
export class CacheFallbackStrategy implements FallbackStrategy {
  readonly name = 'cache-fallback';

  async execute(
    originalRequest: ChatCompletionRequest,
    error: Error,
    context: FallbackContext
  ): Promise<FallbackResult> {
    if (!context.cache) {
      return {
        success: false,
        strategy: this.name,
        message: 'Cache not available'
      };
    }

    const cacheKey = context.cache.generateKey(originalRequest);
    const cachedResponse = await context.cache.get(cacheKey);

    if (cachedResponse) {
      return {
        success: true,
        strategy: this.name,
        response: cachedResponse,
        message: 'Returned cached response'
      };
    }

    return {
      success: false,
      strategy: this.name,
      message: 'No cached response available'
    };
  }
}

/**
 * 简化输出策略
 * 使用更简单的提示或限制token
 */
export class SimplifiedOutputStrategy implements FallbackStrategy {
  readonly name = 'simplified-output';

  async execute(
    originalRequest: ChatCompletionRequest,
    error: Error,
    context: FallbackContext
  ): Promise<FallbackResult> {
    // 检查是否是token限制相关的错误
    const isTokenError = error.message.toLowerCase().includes('token') ||
                        error.message.toLowerCase().includes('max_tokens');

    if (!isTokenError) {
      return {
        success: false,
        strategy: this.name,
        message: 'Error is not token-related'
      };
    }

    const currentModel = context.models.get(originalRequest.model);
    if (!currentModel) {
      return {
        success: false,
        strategy: this.name,
        message: 'Current model not found'
      };
    }

    // 简化请求：降低max_tokens
    const reducedMaxTokens = Math.floor((originalRequest.maxTokens || 2048) / 2);

    return {
      success: true,
      strategy: this.name,
      provider: currentModel.provider,
      model: originalRequest.model,
      message: `Reduced max_tokens from ${originalRequest.maxTokens} to ${reducedMaxTokens}`
    };
  }
}

/**
 * 异步队列兜底策略
 * 将请求加入异步队列稍后处理
 */
export class AsyncQueueFallbackStrategy implements FallbackStrategy {
  readonly name = 'async-queue';
  private queue: Array<{ request: ChatCompletionRequest; timestamp: Date }> = [];

  async execute(
    originalRequest: ChatCompletionRequest,
    error: Error,
    context: FallbackContext
  ): Promise<FallbackResult> {
    // 将请求加入队列
    this.queue.push({
      request: originalRequest,
      timestamp: new Date()
    });

    // 返回一个占位响应
    return {
      success: true,
      strategy: this.name,
      response: {
        id: `async-${Date.now()}`,
        model: originalRequest.model,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: '您的请求已加入处理队列，将在稍后完成处理。'
          },
          finishReason: 'stop'
        }],
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0
        },
        createdAt: new Date()
      },
      message: 'Request queued for async processing'
    };
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  getQueuedRequests(): Array<{ request: ChatCompletionRequest; timestamp: Date }> {
    return [...this.queue];
  }

  clearQueue(): void {
    this.queue = [];
  }
}

/**
 * 降级策略链
 * 按顺序尝试多个降级策略
 */
export class FallbackChain {
  private strategies: FallbackStrategy[] = [];

  addStrategy(strategy: FallbackStrategy): void {
    this.strategies.push(strategy);
  }

  async execute(
    originalRequest: ChatCompletionRequest,
    error: Error,
    context: FallbackContext
  ): Promise<FallbackResult> {
    const errors: string[] = [];

    for (const strategy of this.strategies) {
      try {
        const result = await strategy.execute(originalRequest, error, context);

        if (result.success) {
          return result;
        }

        errors.push(`${strategy.name}: ${result.message}`);
      } catch (e) {
        errors.push(`${strategy.name}: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    }

    return {
      success: false,
      strategy: 'fallback-chain',
      message: `All fallback strategies failed: ${errors.join('; ')}`
    };
  }
}

/**
 * 默认降级链
 * 创建包含常用降级策略的链
 */
export function createDefaultFallbackChain(
  cache?: ResponseCache
): FallbackChain {
  const chain = new FallbackChain();

  // 优先尝试缓存
  if (cache) {
    chain.addStrategy(new CacheFallbackStrategy());
  }

  // 然后尝试模型降级
  chain.addStrategy(new ModelDowngradeStrategy());

  // 再尝试切换提供商
  chain.addStrategy(new ProviderSwitchStrategy());

  // 最后尝试简化输出
  chain.addStrategy(new SimplifiedOutputStrategy());

  return chain;
}
