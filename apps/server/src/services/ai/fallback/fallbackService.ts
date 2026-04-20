/**
 * AI Fallback Service
 * AI 服务降级与容错策略编排器
 */

import { EventEmitter } from 'events';

import {
  ChatCompletionRequest,
  ChatCompletionResponse,
  LLMProvider,
  ModelInfo,
  RequestMetrics,
  CircuitBreakerEvent,
  CircuitBreakerState,
} from './types';
import {
  FallbackStrategy,
  FallbackContext,
  FallbackResult,
  FallbackChain,
  createDefaultFallbackChain,
  ResponseCache,
  AsyncQueueFallbackStrategy,
} from './strategies';
import { LRAResponseCache } from './responseCache';
import { CircuitBreaker, CircuitBreakerManager } from './circuitBreaker';
import { LLMRouter } from './llmRouter';

/**
 * 健康检查配置
 */
export interface HealthCheckConfig {
  intervalMs: number;
  timeoutMs: number;
  failureThreshold: number;
  recoveryThreshold: number;
}

/**
 * 健康状态
 */
export interface ProviderHealthStatus {
  provider: LLMProvider;
  state: CircuitBreakerState;
  healthy: boolean;
  latencyMs: number;
  failureRate: number;
  consecutiveFailures: number;
  lastChecked: Date;
}

/**
 * 降级服务状态
 */
export interface AIFallbackServiceState {
  status: 'healthy' | 'degraded' | 'unhealthy';
  healthyProviders: number;
  totalProviders: number;
  cacheHitRate: number;
  pendingRequests: number;
  providerStates: ProviderHealthStatus[];
}

/**
 * 降级事件
 */
export interface AIFallbackEvent {
  timestamp: Date;
  type: 'degraded' | 'recovered' | 'provider_failed' | 'fallback_triggered' | 'cache_hit' | 'cache_miss';
  provider?: LLMProvider;
  strategy?: string;
  message: string;
  metrics?: Partial<RequestMetrics>;
}

/**
 * 降级策略配置
 */
export interface FallbackPolicy {
  // 缓存配置
  cacheEnabled: boolean;
  cacheTtlMs: number;
  cacheMaxSize: number;

  // 异步队列配置
  asyncQueueEnabled: boolean;
  asyncQueueMaxSize: number;

  // 健康检查配置
  healthCheckEnabled: boolean;
  healthCheckIntervalMs: number;

  // 超时配置
  requestTimeoutMs: number;
  slowRequestThresholdMs: number;

  // 降级级别 (0=无降级, 1=缓存优先, 2=缓存+模型降级, 3=全量降级)
  degradationLevel: 0 | 1 | 2 | 3;
}

/**
 * AI 降级服务
 * 统一的降级与容错策略编排器
 */
export class AIFallbackService extends EventEmitter {
  private router: LLMRouter;
  private breakerManager: CircuitBreakerManager;
  private cache: LRAResponseCache;
  private asyncQueue: AsyncQueueFallbackStrategy;
  private fallbackChain: FallbackChain;
  private models: Map<string, ModelInfo> = new Map();
  private policies: FallbackPolicy;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private metrics = { cacheHits: 0, cacheMisses: 0, fallbackTriggers: 0 };
  private providerLastHealth: Map<LLMProvider, ProviderHealthStatus> = new Map();

  constructor(
    router: LLMRouter,
    breakerManager: CircuitBreakerManager,
    policyOverrides: Partial<FallbackPolicy> = {}
  ) {
    super();
    this.router = router;
    this.breakerManager = breakerManager;
    this.cache = new LRAResponseCache({
      defaultTtlMs: policyOverrides.cacheTtlMs ?? 5 * 60 * 1000,
      maxSize: policyOverrides.cacheMaxSize ?? 1000,
    });
    this.asyncQueue = new AsyncQueueFallbackStrategy();
    this.fallbackChain = new FallbackChain();
    this.policies = {
      cacheEnabled: true,
      cacheTtlMs: 5 * 60 * 1000,
      cacheMaxSize: 1000,
      asyncQueueEnabled: true,
      asyncQueueMaxSize: 100,
      healthCheckEnabled: true,
      healthCheckIntervalMs: 30 * 1000,
      requestTimeoutMs: 30 * 1000,
      slowRequestThresholdMs: 10 * 1000,
      degradationLevel: 2,
      ...policyOverrides,
    };

    this.setupFallbackChain();
    this.setupCircuitBreakerListeners();
  }

  /**
   * 注册模型
   */
  registerModel(model: ModelInfo): void {
    this.models.set(model.id, model);
  }

  /**
   * 执行降级处理
   */
  async executeWithFallback(
    request: ChatCompletionRequest,
    executeFn: () => Promise<ChatCompletionResponse>,
    availableProviders: LLMProvider[]
  ): Promise<FallbackResult> {
    const startTime = Date.now();

    // Step 1: 尝试缓存 (Level 1+)
    if (this.policies.cacheEnabled) {
      const cacheKey = this.cache.generateKey(request);
      const cachedResponse = await this.cache.get(cacheKey);

      if (cachedResponse) {
        this.metrics.cacheHits++;
        this.emit('event', {
          timestamp: new Date(),
          type: 'cache_hit',
          message: 'Returning cached response',
        } as AIFallbackEvent);

        return {
          success: true,
          response: cachedResponse,
          strategy: 'cache',
          message: 'Returned cached response',
        };
      }
      this.metrics.cacheMisses++;
    }

    // Step 2: 执行主请求
    try {
      const response = await this.executeWithTimeout(executeFn, this.policies.requestTimeoutMs);
      return {
        success: true,
        response,
        strategy: 'primary',
        provider: availableProviders[0],
        model: request.model,
        message: 'Primary request succeeded',
      };
    } catch (error) {
      const err = error as Error;
      this.metrics.fallbackTriggers++;

      this.emit('event', {
        timestamp: new Date(),
        type: 'fallback_triggered',
        message: `Primary failed: ${err.message}`,
        metrics: { latencyMs: Date.now() - startTime },
      } as AIFallbackEvent);

      // Step 3: 尝试降级策略链
      const context: FallbackContext = {
        availableProviders,
        models: this.models,
        cache: this.policies.cacheEnabled ? this.cache : undefined,
        attemptCount: 1,
        originalProvider: availableProviders[0],
      };

      const fallbackResult = await this.fallbackChain.execute(request, err, context);

      if (!fallbackResult.success && this.policies.asyncQueueEnabled) {
        // Step 4: 最后兜底 - 异步队列
        const queueSize = this.asyncQueue.getQueueSize();
        if (queueSize < this.policies.asyncQueueMaxSize) {
          const asyncResult = await this.asyncQueue.execute(request, err, context);
          return asyncResult;
        }
      }

      return fallbackResult;
    }
  }

  /**
   * 获取当前状态
   */
  getState(): AIFallbackServiceState {
    const providerStates = this.getProviderHealthStatuses();
    const healthyCount = providerStates.filter(p => p.healthy).length;
    const total = providerStates.length;

    const cacheStats = this.cache.getStats();
    const totalCache = cacheStats.hits + cacheStats.misses;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyCount === total && totalCache > 0 && cacheStats.hitRate > 0.3) {
      status = 'healthy';
    } else if (healthyCount > 0) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      healthyProviders: healthyCount,
      totalProviders: total,
      cacheHitRate: totalCache > 0 ? cacheStats.hits / totalCache : 0,
      pendingRequests: this.asyncQueue.getQueueSize(),
      providerStates,
    };
  }

  /**
   * 获取提供商健康状态
   */
  getProviderHealthStatuses(): ProviderHealthStatus[] {
    const states: ProviderHealthStatus[] = [];
    for (const [provider, breaker] of this.breakerManager['breakers']) {
      const metrics = breaker.getMetrics();
      const state = breaker.getState();
      states.push({
        provider,
        state,
        healthy: state !== 'OPEN',
        latencyMs: 0, // 需要从指标服务获取
        failureRate: breaker.getFailureRate(),
        consecutiveFailures: metrics.consecutiveSuccesses,
        lastChecked: new Date(),
      });
    }
    return states;
  }

  /**
   * 缓存命中情况
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * 获取异步队列大小
   */
  getAsyncQueueSize(): number {
    return this.asyncQueue.getQueueSize();
  }

  /**
   * 获取队列中的请求
   */
  getQueuedRequests() {
    return this.asyncQueue.getQueuedRequests();
  }

  /**
   * 获取指标摘要
   */
  getMetricsSummary() {
    return {
      ...this.metrics,
      cacheHitRate: this.getState().cacheHitRate,
      pendingRequests: this.asyncQueue.getQueueSize(),
      overallStatus: this.getState().status,
    };
  }

  /**
   * 更新策略配置
   */
  updatePolicies(updates: Partial<FallbackPolicy>): void {
    this.policies = { ...this.policies, ...updates };
  }

  /**
   * 获取当前策略
   */
  getPolicies(): FallbackPolicy {
    return { ...this.policies };
  }

  /**
   * 开始健康检查
   */
  startHealthCheck(): void {
    if (this.healthCheckInterval) return;

    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.policies.healthCheckIntervalMs);
  }

  /**
   * 停止健康检查
   */
  stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * 获取健康状态摘要 (供 LLMService 使用)
   */
  getHealthSummary(): { status: 'healthy' | 'degraded' | 'unhealthy'; providers: Array<{ provider: LLMProvider; healthy: boolean }> } {
    const states = this.getProviderHealthStatuses();
    const providers = states.map(s => ({
      provider: s.provider,
      healthy: s.healthy,
    }));
    const status = this.getState().status;
    return { status, providers };
  }

  private setupFallbackChain(): void {
    // 缓存回退
    if (this.policies.cacheEnabled) {
      // CacheFallbackStrategy 通过 executeWithFallback 单独处理
    }

    // 模型降级
    this.fallbackChain.addStrategy({
      name: 'model-downgrade',
      execute: async (req, err, ctx) => {
        const model = ctx.models.get(req.model);
        if (!model) return { success: false, strategy: 'model-downgrade', message: 'Model not found' };

        const cheaper = Array.from(ctx.models.values())
          .filter(m => m.provider === model.provider && m.id !== model.id)
          .sort((a, b) => (a.costPer1KTokens.input + a.costPer1KTokens.output) - (b.costPer1KTokens.input + b.costPer1KTokens.output));

        if (cheaper.length === 0) return { success: false, strategy: 'model-downgrade', message: 'No cheaper model' };

        return { success: true, strategy: 'model-downgrade', provider: cheaper[0].provider, model: cheaper[0].id, message: `Downgraded to ${cheaper[0].id}` };
      },
    });

    // 提供商切换
    this.fallbackChain.addStrategy({
      name: 'provider-switch',
      execute: async (req, err, ctx) => {
        const model = ctx.models.get(req.model);
        if (!model) return { success: false, strategy: 'provider-switch', message: 'Model not found' };

        const other = ctx.availableProviders.filter(p => p !== model.provider);
        if (other.length === 0) return { success: false, strategy: 'provider-switch', message: 'No alternative provider' };

        const alternativeModels = Array.from(ctx.models.values())
          .filter(m => m.provider === other[0] && m.capabilities.chatCompletion)
          .sort((a, b) => b.qualityScore - a.qualityScore);

        if (alternativeModels.length === 0) return { success: false, strategy: 'provider-switch', message: 'No alternative model' };

        return { success: true, strategy: 'provider-switch', provider: other[0], model: alternativeModels[0].id, message: `Switched to ${other[0]}` };
      },
    });

    // 简化输出
    this.fallbackChain.addStrategy({
      name: 'simplified-output',
      execute: async (req, err, ctx) => {
        const reducedTokens = Math.floor((req.maxTokens || 2048) / 2);
        return {
          success: true,
          strategy: 'simplified-output',
          provider: ctx.originalProvider,
          model: req.model,
          message: `Reduced tokens to ${reducedTokens}`,
        };
      },
    });
  }

  private setupCircuitBreakerListeners(): void {
    // 监听熔断器状态变化
    for (const [, breaker] of this.breakerManager['breakers']) {
      breaker.on('stateChange', (event: CircuitBreakerEvent) => {
        this.emit('event', {
          timestamp: new Date(),
          type: event.state === 'OPEN' ? 'provider_failed' : 'recovered',
          provider: event.provider,
          message: `Provider ${event.provider} state changed to ${event.state}`,
        } as AIFallbackEvent);

        if (event.state === 'OPEN') {
          this.emit('providerOpen', event.provider);
        }
      });
    }
  }

  private async performHealthCheck(): Promise<void> {
    for (const [provider, breaker] of this.breakerManager['breakers']) {
      const state = breaker.getState();
      const lastState = this.providerLastHealth.get(provider);

      // 状态从非 OPEN 变成 OPEN 时发送降级通知
      if (lastState && lastState.state !== 'OPEN' && state === 'OPEN') {
        this.emit('event', {
          timestamp: new Date(),
          type: 'degraded',
          provider,
          message: `Provider ${provider} became unavailable, triggering degradation`,
        } as AIFallbackEvent);
      }

      this.providerLastHealth.set(provider, {
        provider,
        state,
        healthy: state !== 'OPEN',
        latencyMs: 0,
        failureRate: breaker.getFailureRate(),
        consecutiveFailures: breaker.getMetrics().consecutiveSuccesses,
        lastChecked: new Date(),
      });
    }
  }

  private async executeWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Request timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      fn()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(err => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }
}