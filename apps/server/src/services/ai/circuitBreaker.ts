/**
 * Circuit Breaker
 * 熔断器实现 - 防止级联故障
 */

import { EventEmitter } from 'events';
import {
  CircuitBreakerState,
  CircuitBreakerConfig,
  CircuitBreakerEvent,
  LLMProvider
} from './types';

interface CircuitBreakerMetrics {
  failures: number;
  successes: number;
  lastFailureTime: number;
  consecutiveSuccesses: number;
  totalCalls: number;
}

/**
 * 熔断器类
 * 实现三种状态：CLOSED(关闭)、HALF_OPEN(半开)、OPEN(打开)
 */
export class CircuitBreaker extends EventEmitter {
  private state: CircuitBreakerState = 'CLOSED';
  private metrics: CircuitBreakerMetrics;
  private config: CircuitBreakerConfig;
  private provider: LLMProvider;
  private halfOpenCalls: number = 0;

  constructor(
    provider: LLMProvider,
    config: Partial<CircuitBreakerConfig> = {}
  ) {
    super();
    this.provider = provider;
    this.config = {
      failureThreshold: 5,
      recoveryTimeoutMs: 30000,
      halfOpenMaxCalls: 3,
      successThreshold: 2,
      ...config
    };
    this.metrics = this.resetMetrics();
  }

  /**
   * 获取当前熔断器状态
   */
  getState(): CircuitBreakerState {
    this.checkTransition();
    return this.state;
  }

  /**
   * 获取提供商名称
   */
  getProvider(): LLMProvider {
    return this.provider;
  }

  /**
   * 获取当前指标
   */
  getMetrics(): CircuitBreakerMetrics {
    return { ...this.metrics };
  }

  /**
   * 检查请求是否允许通过
   */
  canExecute(): boolean {
    this.checkTransition();

    switch (this.state) {
      case 'CLOSED':
        return true;

      case 'OPEN':
        return false;

      case 'HALF_OPEN':
        return this.halfOpenCalls < this.config.halfOpenMaxCalls;

      default:
        return false;
    }
  }

  /**
   * 记录成功请求
   */
  recordSuccess(): void {
    this.metrics.successes++;
    this.metrics.consecutiveSuccesses++;
    this.metrics.totalCalls++;

    if (this.state === 'HALF_OPEN') {
      if (this.metrics.consecutiveSuccesses >= this.config.successThreshold) {
        this.transitionTo('CLOSED');
      }
    }
  }

  /**
   * 记录失败请求
   */
  recordFailure(errorType?: string): void {
    this.metrics.failures++;
    this.metrics.consecutiveSuccesses = 0;
    this.metrics.lastFailureTime = Date.now();
    this.metrics.totalCalls++;

    if (this.state === 'HALF_OPEN') {
      this.transitionTo('OPEN');
    } else if (this.state === 'CLOSED') {
      if (this.metrics.failures >= this.config.failureThreshold) {
        this.transitionTo('OPEN');
      }
    }
  }

  /**
   * 执行受保护的函数
   */
  async execute<T>(
    fn: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    if (!this.canExecute()) {
      if (fallback) {
        return await fallback();
      }
      throw new Error(`Circuit breaker is OPEN for provider ${this.provider}`);
    }

    if (this.state === 'HALF_OPEN') {
      this.halfOpenCalls++;
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure(error instanceof Error ? error.name : 'unknown');
      throw error;
    }
  }

  /**
   * 手动打开熔断器
   */
  forceOpen(): void {
    this.transitionTo('OPEN');
  }

  /**
   * 手动关闭熔断器
   */
  forceClose(): void {
    this.transitionTo('CLOSED');
  }

  /**
   * 重置熔断器
   */
  reset(): void {
    this.state = 'CLOSED';
    this.metrics = this.resetMetrics();
    this.halfOpenCalls = 0;
  }

  /**
   * 获取当前配置
   */
  getConfig(): CircuitBreakerConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<CircuitBreakerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取失败率
   */
  getFailureRate(): number {
    if (this.metrics.totalCalls === 0) return 0;
    return this.metrics.failures / this.metrics.totalCalls;
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    state: CircuitBreakerState;
    provider: LLMProvider;
    failureRate: number;
    metrics: CircuitBreakerMetrics;
    config: CircuitBreakerConfig;
  } {
    return {
      state: this.getState(),
      provider: this.provider,
      failureRate: this.getFailureRate(),
      metrics: this.getMetrics(),
      config: this.getConfig()
    };
  }

  private checkTransition(): void {
    if (this.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - this.metrics.lastFailureTime;
      if (timeSinceLastFailure >= this.config.recoveryTimeoutMs) {
        this.transitionTo('HALF_OPEN');
      }
    }
  }

  private transitionTo(newState: CircuitBreakerState): void {
    if (this.state === newState) return;

    const oldState = this.state;
    this.state = newState;

    // 重置相关计数器
    if (newState === 'HALF_OPEN') {
      this.halfOpenCalls = 0;
      this.metrics.consecutiveSuccesses = 0;
    } else if (newState === 'CLOSED') {
      this.metrics = this.resetMetrics();
      this.halfOpenCalls = 0;
    }

    // 触发事件
    const event: CircuitBreakerEvent = {
      timestamp: new Date(),
      state: newState,
      provider: this.provider,
      reason: `Transition from ${oldState} to ${newState}`
    };

    this.emit('stateChange', event);
    this.emit(newState.toLowerCase(), event);
  }

  private resetMetrics(): CircuitBreakerMetrics {
    return {
      failures: 0,
      successes: 0,
      lastFailureTime: 0,
      consecutiveSuccesses: 0,
      totalCalls: 0
    };
  }
}

/**
 * 熔断器管理器
 * 管理多个提供商的熔断器
 */
export class CircuitBreakerManager {
  private breakers: Map<LLMProvider, CircuitBreaker> = new Map();

  /**
   * 获取或创建熔断器
   */
  getCircuitBreaker(
    provider: LLMProvider,
    config?: Partial<CircuitBreakerConfig>
  ): CircuitBreaker {
    if (!this.breakers.has(provider)) {
      const breaker = new CircuitBreaker(provider, config);
      this.breakers.set(provider, breaker);
    }
    return this.breakers.get(provider)!;
  }

  /**
   * 移除熔断器
   */
  removeCircuitBreaker(provider: LLMProvider): boolean {
    const breaker = this.breakers.get(provider);
    if (breaker) {
      breaker.removeAllListeners();
      return this.breakers.delete(provider);
    }
    return false;
  }

  /**
   * 获取所有熔断器状态
   */
  getAllStats(): Array<{
    provider: LLMProvider;
    state: CircuitBreakerState;
    failureRate: number;
  }> {
    return Array.from(this.breakers.entries()).map(([provider, breaker]) => ({
      provider,
      state: breaker.getState(),
      failureRate: breaker.getFailureRate()
    }));
  }

  /**
   * 重置所有熔断器
   */
  resetAll(): void {
    this.breakers.forEach(breaker => breaker.reset());
  }

  /**
   * 获取可用提供商列表
   */
  getAvailableProviders(): LLMProvider[] {
    return Array.from(this.breakers.entries())
      .filter(([, breaker]) => breaker.canExecute())
      .map(([provider]) => provider);
  }
}
