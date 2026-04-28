/**
 * Base LLM Adapter Interface
 * 所有LLM提供商适配器的基础接口
 */
import { ChatCompletionRequest, ChatCompletionResponse, EmbeddingRequest, EmbeddingResponse, ModelInfo, StreamChunk, RequestContext } from '../types';
/**
 * LLM适配器接口
 * 所有LLM提供商适配器必须实现此接口
 */
export interface ILLMAdapter {
    /**
     * 适配器唯一标识
     */
    readonly id: string;
    /**
     * 提供商名称
     */
    readonly provider: string;
    /**
     * 初始化适配器
     */
    initialize(): Promise<void>;
    /**
     * 检查适配器是否可用
     */
    healthCheck(): Promise<boolean>;
    /**
     * 获取支持的模型列表
     */
    getModels(): Promise<ModelInfo[]>;
    /**
     * 获取特定模型信息
     */
    getModelInfo(modelId: string): Promise<ModelInfo | null>;
    /**
     * 执行聊天完成请求
     */
    chatCompletion(request: ChatCompletionRequest, context: RequestContext): Promise<ChatCompletionResponse>;
    /**
     * 执行流式聊天完成请求
     */
    streamChatCompletion(request: ChatCompletionRequest, context: RequestContext, onChunk: (chunk: StreamChunk) => void): Promise<void>;
    /**
     * 执行嵌入请求
     */
    embeddings(request: EmbeddingRequest, context: RequestContext): Promise<EmbeddingResponse>;
    /**
     * 计算请求成本
     */
    calculateCost(modelId: string, inputTokens: number, outputTokens: number): number;
}
/**
 * 抽象基础适配器类
 * 提供通用的适配器功能
 */
export declare abstract class BaseLLMAdapter implements ILLMAdapter {
    abstract readonly id: string;
    abstract readonly provider: string;
    protected initialized: boolean;
    protected models: Map<string, ModelInfo>;
    initialize(): Promise<void>;
    healthCheck(): Promise<boolean>;
    getModels(): Promise<ModelInfo[]>;
    getModelInfo(modelId: string): Promise<ModelInfo | null>;
    abstract chatCompletion(request: ChatCompletionRequest, context: RequestContext): Promise<ChatCompletionResponse>;
    abstract streamChatCompletion(request: ChatCompletionRequest, context: RequestContext, onChunk: (chunk: StreamChunk) => void): Promise<void>;
    abstract embeddings(request: EmbeddingRequest, context: RequestContext): Promise<EmbeddingResponse>;
    abstract calculateCost(modelId: string, inputTokens: number, outputTokens: number): number;
    protected abstract loadModels(): Promise<void>;
    protected generateRequestId(): string;
    protected estimateTokens(text: string): number;
}
//# sourceMappingURL=base.d.ts.map