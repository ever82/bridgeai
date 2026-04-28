/**
 * Fallback Strategies
 * 降级与容错策略实现
 */
import { ChatCompletionRequest, ChatCompletionResponse, LLMProvider, ModelInfo } from '../types';
/**
 * 降级策略接口
 */
export interface FallbackStrategy {
    readonly name: string;
    execute(originalRequest: ChatCompletionRequest, error: Error, context: FallbackContext): Promise<FallbackResult>;
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
export declare class ModelDowngradeStrategy implements FallbackStrategy {
    readonly name = "model-downgrade";
    execute(originalRequest: ChatCompletionRequest, error: Error, context: FallbackContext): Promise<FallbackResult>;
}
/**
 * 提供商降级策略
 * 切换到备用提供商
 */
export declare class ProviderSwitchStrategy implements FallbackStrategy {
    readonly name = "provider-switch";
    execute(originalRequest: ChatCompletionRequest, error: Error, context: FallbackContext): Promise<FallbackResult>;
}
/**
 * 缓存回退策略
 * 返回缓存的响应
 */
export declare class CacheFallbackStrategy implements FallbackStrategy {
    readonly name = "cache-fallback";
    execute(originalRequest: ChatCompletionRequest, error: Error, context: FallbackContext): Promise<FallbackResult>;
}
/**
 * 简化输出策略
 * 使用更简单的提示或限制token
 */
export declare class SimplifiedOutputStrategy implements FallbackStrategy {
    readonly name = "simplified-output";
    execute(originalRequest: ChatCompletionRequest, error: Error, context: FallbackContext): Promise<FallbackResult>;
}
/**
 * 异步队列兜底策略
 * 将请求加入异步队列稍后处理
 */
export declare class AsyncQueueFallbackStrategy implements FallbackStrategy {
    readonly name = "async-queue";
    private queue;
    private maxQueueSize;
    constructor(maxQueueSize?: number);
    execute(originalRequest: ChatCompletionRequest, _error: Error, _context: FallbackContext): Promise<FallbackResult>;
    getQueueSize(): number;
    getQueuedRequests(): Array<{
        request: ChatCompletionRequest;
        timestamp: Date;
    }>;
    clearQueue(): void;
}
/**
 * 降级策略链
 * 按顺序尝试多个降级策略
 */
export declare class FallbackChain {
    private strategies;
    addStrategy(strategy: FallbackStrategy): void;
    execute(originalRequest: ChatCompletionRequest, error: Error, context: FallbackContext): Promise<FallbackResult>;
}
/**
 * 默认降级链
 * 创建包含常用降级策略的链
 */
export declare function createDefaultFallbackChain(cache?: ResponseCache): FallbackChain;
//# sourceMappingURL=strategies.d.ts.map