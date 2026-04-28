/**
 * LLM Metrics Service
 * 监控与指标收集
 */
import { EventEmitter } from 'events';
import { LLMProvider, RequestMetrics, CircuitBreakerEvent } from './types';
/**
 * LLM指标服务
 * 收集和暴露Prometheus指标
 */
export declare class LLMMetricsService extends EventEmitter {
    private requestCounter;
    private errorCounter;
    private tokenCounter;
    private latencyHistogram;
    private costCounter;
    private circuitBreakerEvents;
    private activeRequests;
    /**
     * Sanitize a numeric metric value: reject NaN, Infinity, and negative numbers.
     * Returns 0 for invalid values.
     */
    private sanitizeNumber;
    /**
     * 记录请求指标
     */
    recordRequest(metrics: RequestMetrics): void;
    /**
     * 记录请求开始
     */
    recordRequestStart(requestId: string, provider: LLMProvider, model: string): void;
    /**
     * 记录请求结束
     */
    recordRequestEnd(requestId: string, provider: LLMProvider, model: string): void;
    /**
     * 记录熔断器事件
     */
    recordCircuitBreakerEvent(event: CircuitBreakerEvent): void;
    /**
     * 获取Prometheus格式的指标
     */
    getPrometheusMetrics(): string;
    /**
     * 获取统计摘要
     */
    getStats(): {
        totalRequests: number;
        totalTokens: {
            input: number;
            output: number;
        };
        totalCost: number;
        averageLatency: number;
        errorRate: number;
        circuitBreakerEvents: number;
    };
    /**
     * 获取提供商统计
     */
    getProviderStats(provider: LLMProvider): {
        requests: number;
        tokens: {
            input: number;
            output: number;
        };
        cost: number;
        averageLatency: number;
        errorCount: number;
    } | null;
    /**
     * 获取熔断器事件
     */
    getCircuitBreakerEvents(provider?: LLMProvider, since?: Date): CircuitBreakerEvent[];
    /**
     * 重置所有指标
     */
    reset(): void;
    /**
     * Record LLM call (legacy method for backward compatibility)
     */
    recordLLMCall(name: string, provider: string, duration: number, success: boolean): void;
    private incrementCounter;
    private incrementErrorCounter;
    private recordLatency;
    private recordTokens;
    private incrementCost;
}
export declare const metricsService: LLMMetricsService;
//# sourceMappingURL=metricsService.d.ts.map