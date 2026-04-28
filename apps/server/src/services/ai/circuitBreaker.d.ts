/**
 * Circuit Breaker
 * 熔断器实现 - 防止级联故障
 */
import { EventEmitter } from 'events';
import { CircuitBreakerState, CircuitBreakerConfig, LLMProvider } from './types';
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
export declare class CircuitBreaker extends EventEmitter {
    private state;
    private metrics;
    private config;
    private provider;
    private halfOpenCalls;
    constructor(provider: LLMProvider, config?: Partial<CircuitBreakerConfig>);
    /**
     * 获取当前熔断器状态
     */
    getState(): CircuitBreakerState;
    /**
     * 获取提供商名称
     */
    getProvider(): LLMProvider;
    /**
     * 获取当前指标
     */
    getMetrics(): CircuitBreakerMetrics;
    /**
     * 检查请求是否允许通过
     */
    canExecute(): boolean;
    /**
     * 记录成功请求
     */
    recordSuccess(): void;
    /**
     * 记录失败请求
     */
    recordFailure(_errorType?: string): void;
    /**
     * 执行受保护的函数
     */
    execute<T>(fn: () => Promise<T>, fallback?: () => Promise<T>): Promise<T>;
    /**
     * 手动打开熔断器
     */
    forceOpen(): void;
    /**
     * 手动关闭熔断器
     */
    forceClose(): void;
    /**
     * 重置熔断器
     */
    reset(): void;
    /**
     * 获取当前配置
     */
    getConfig(): CircuitBreakerConfig;
    /**
     * 更新配置
     */
    updateConfig(config: Partial<CircuitBreakerConfig>): void;
    /**
     * 获取失败率
     */
    getFailureRate(): number;
    /**
     * 获取统计信息
     */
    getStats(): {
        state: CircuitBreakerState;
        provider: LLMProvider;
        failureRate: number;
        metrics: CircuitBreakerMetrics;
        config: CircuitBreakerConfig;
    };
    private checkTransition;
    private transitionTo;
    private resetMetrics;
}
/**
 * 熔断器管理器
 * 管理多个提供商的熔断器
 */
export declare class CircuitBreakerManager {
    private breakers;
    /**
     * 获取或创建熔断器
     */
    getCircuitBreaker(provider: LLMProvider, config?: Partial<CircuitBreakerConfig>): CircuitBreaker;
    /**
     * 移除熔断器
     */
    removeCircuitBreaker(provider: LLMProvider): boolean;
    /**
     * 获取所有熔断器状态
     */
    getAllStats(): Array<{
        provider: LLMProvider;
        state: CircuitBreakerState;
        failureRate: number;
    }>;
    /**
     * 重置所有熔断器
     */
    resetAll(): void;
    /**
     * 获取可用提供商列表
     */
    getAvailableProviders(): LLMProvider[];
    /**
     * Iterate over all circuit breakers.
     * Provides read-only access without exposing the internal Map directly.
     */
    forEachBreaker(callback: (provider: LLMProvider, breaker: CircuitBreaker) => void): void;
}
export {};
//# sourceMappingURL=circuitBreaker.d.ts.map