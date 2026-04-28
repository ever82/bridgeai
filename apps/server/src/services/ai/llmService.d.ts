/**
 * LLM Service
 * 统一的LLM服务入口
 */
import { CircuitBreakerManager } from './circuitBreaker';
import { LLMRouter } from './llmRouter';
import { LLMMetricsService } from './metricsService';
import { LLMProvider, ChatCompletionRequest, ChatCompletionResponse, EmbeddingRequest, EmbeddingResponse, StreamChunk, RoutingStrategy, ModelInfo } from './types';
interface LLMServiceConfig {
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
    defaultStrategy?: RoutingStrategy;
    circuitBreaker?: {
        failureThreshold?: number;
        recoveryTimeoutMs?: number;
    };
}
/**
 * LLM服务
 * 提供统一的LLM接入接口
 */
export declare class LLMService {
    private adapters;
    private circuitBreakerManager;
    private router;
    private metrics;
    private fallbackChain;
    private config;
    private initialized;
    constructor(config: LLMServiceConfig);
    /**
     * 初始化服务
     */
    initialize(): Promise<void>;
    /**
     * 获取所有可用模型
     */
    getModels(): Promise<ModelInfo[]>;
    /**
     * 获取特定模型信息
     */
    getModelInfo(modelId: string): Promise<ModelInfo | null>;
    /**
     * 执行聊天完成
     */
    chatCompletion(request: ChatCompletionRequest, preferredProvider?: LLMProvider): Promise<ChatCompletionResponse>;
    /**
     * 执行流式聊天完成
     */
    streamChatCompletion(request: ChatCompletionRequest, onChunk: (chunk: StreamChunk) => void, preferredProvider?: LLMProvider): Promise<void>;
    /**
     * 执行嵌入请求
     */
    createEmbedding(request: EmbeddingRequest, preferredProvider?: LLMProvider): Promise<EmbeddingResponse>;
    /**
     * 简单补全接口（用于兼容旧代码）
     */
    complete(prompt: string, options?: {
        provider?: LLMProvider;
        maxTokens?: number;
        temperature?: number;
    }): Promise<{
        content: string;
        provider: string;
    }>;
    /**
     * 执行嵌入请求
     */
    embeddings(request: EmbeddingRequest, preferredProvider?: LLMProvider): Promise<EmbeddingResponse>;
    /**
     * 设置路由策略
     */
    setRoutingStrategy(strategy: RoutingStrategy): void;
    /**
     * 获取指标服务
     */
    getMetrics(): LLMMetricsService;
    /**
     * 获取熔断器管理器
     */
    getCircuitBreakerManager(): CircuitBreakerManager;
    /**
     * 获取路由器
     */
    getRouter(): LLMRouter;
    /**
     * 关闭服务，清理资源
     */
    shutdown(): Promise<void>;
    /**
     * 获取健康状态
     */
    getHealth(): Promise<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        providers: Array<{
            provider: LLMProvider;
            healthy: boolean;
        }>;
    }>;
    private getAvailableProviders;
    private tryFallback;
    private detectProvider;
    private recordMetrics;
    private ensureInitialized;
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
declare module './llmService' {
    interface LLMService {
        generateText(prompt: string, options?: GenerateTextOptions): Promise<GenerateTextResponse>;
    }
}
export declare const llmService: LLMService;
export {};
//# sourceMappingURL=llmService.d.ts.map