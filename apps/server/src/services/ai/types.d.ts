/**
 * LLM Adapter Types
 * 定义多LLM适配器系统的核心类型和接口
 */
export type LLMProvider = 'openai' | 'claude' | 'wenxin';
export interface ModelCapabilities {
    chatCompletion: boolean;
    embeddings: boolean;
    streaming: boolean;
    maxTokens: number;
    supportedLanguages: string[];
}
export interface ModelInfo {
    id: string;
    name: string;
    provider: LLMProvider;
    capabilities: ModelCapabilities;
    costPer1KTokens: {
        input: number;
        output: number;
    };
    averageLatencyMs: number;
    qualityScore: number;
}
export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}
export interface ChatCompletionRequest {
    model: string;
    messages: Array<{
        role: string;
        content: string;
        name?: string;
    }>;
    temperature?: number;
    maxTokens?: number;
    max_tokens?: number;
    n?: number;
    stream?: boolean;
    stop?: string | string[];
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    logitBias?: Record<string, number>;
    user?: string;
    functions?: unknown[];
    functionCall?: unknown;
    response_format?: {
        type: 'text' | 'json_object';
    };
}
export interface ChatCompletionResponse {
    id: string;
    model: string;
    choices: {
        index: number;
        message: ChatMessage;
        finishReason: string;
    }[];
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    createdAt: Date;
}
export interface EmbeddingRequest {
    model: string;
    input: string | string[];
    dimensions?: number;
    encodingFormat?: string;
}
export interface EmbeddingResponse {
    model: string;
    data: {
        index: number;
        embedding: number[];
    }[];
    usage: {
        promptTokens: number;
        totalTokens: number;
    };
}
export interface StreamChunk {
    id: string;
    model: string;
    choices: {
        index: number;
        delta: Partial<ChatMessage>;
        finishReason: string | null;
    }[];
}
export type RoutingStrategy = 'cost' | 'latency' | 'quality' | 'round-robin' | 'weighted' | 'least-connections' | 'direct' | 'fallback';
export interface RoutingConfig {
    strategy: RoutingStrategy;
    preferredProviders?: LLMProvider[];
    fallbackEnabled: boolean;
    maxRetries: number;
    timeoutMs: number;
    healthCheckIntervalMs?: number;
}
export type CircuitBreakerState = 'CLOSED' | 'HALF_OPEN' | 'OPEN';
export interface CircuitBreakerConfig {
    failureThreshold: number;
    recoveryTimeoutMs: number;
    halfOpenMaxCalls: number;
    successThreshold: number;
}
export interface CircuitBreakerEvent {
    timestamp: Date;
    state: CircuitBreakerState;
    provider: LLMProvider;
    reason?: string;
}
export interface AdapterConfig {
    apiKey: string;
    apiUrl?: string;
    defaultModel: string;
    timeoutMs: number;
    maxRetries: number;
}
export interface RequestContext {
    requestId: string;
    provider: LLMProvider;
    model: string;
    startTime: Date;
    routingStrategy: RoutingStrategy;
}
export interface RequestMetrics {
    requestId: string;
    provider: LLMProvider;
    model: string;
    latencyMs: number;
    success: boolean;
    errorType?: string;
    tokenUsage: {
        input: number;
        output: number;
        total: number;
    };
    costUsd: number;
}
/** Extended ChatCompletionRequest for legacy compatibility - merged above */
//# sourceMappingURL=types.d.ts.map