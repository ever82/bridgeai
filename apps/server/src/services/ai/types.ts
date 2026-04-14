/**
 * LLM Adapter Types
 * 定义多LLM适配器系统的核心类型和接口
 */

// LLM提供商类型
export type LLMProvider = 'openai' | 'claude' | 'wenxin';

// 模型能力
export interface ModelCapabilities {
  chatCompletion: boolean;
  embeddings: boolean;
  streaming: boolean;
  maxTokens: number;
  supportedLanguages: string[];
}

// 模型信息
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
  qualityScore: number; // 0-100
}

// 聊天消息
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// 聊天完成请求
export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

// 聊天完成响应
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

// 嵌入请求
export interface EmbeddingRequest {
  model: string;
  input: string | string[];
}

// 嵌入响应
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

// 流式响应块
export interface StreamChunk {
  id: string;
  model: string;
  choices: {
    index: number;
    delta: Partial<ChatMessage>;
    finishReason: string | null;
  }[];
}

// 路由策略
export type RoutingStrategy = 'cost' | 'latency' | 'quality' | 'round-robin' | 'weighted' | 'direct';

// 路由配置
export interface RoutingConfig {
  strategy: RoutingStrategy;
  preferredProviders?: LLMProvider[];
  fallbackEnabled: boolean;
  maxRetries: number;
  timeoutMs: number;
}

// 熔断器状态
export type CircuitBreakerState = 'CLOSED' | 'HALF_OPEN' | 'OPEN';

// 熔断器配置
export interface CircuitBreakerConfig {
  failureThreshold: number;      // 触发熔断的失败次数阈值
  recoveryTimeoutMs: number;     // 熔断后恢复探测的等待时间
  halfOpenMaxCalls: number;      // 半开状态下允许的最大测试请求数
  successThreshold: number;      // 半开状态下恢复所需的连续成功次数
}

// 熔断器事件
export interface CircuitBreakerEvent {
  timestamp: Date;
  state: CircuitBreakerState;
  provider: LLMProvider;
  reason?: string;
}

// 适配器配置
export interface AdapterConfig {
  apiKey: string;
  apiUrl?: string;
  defaultModel: string;
  timeoutMs: number;
  maxRetries: number;
}

// 请求上下文
export interface RequestContext {
  requestId: string;
  provider: LLMProvider;
  model: string;
  startTime: Date;
  routingStrategy: RoutingStrategy;
}

// 请求指标
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
