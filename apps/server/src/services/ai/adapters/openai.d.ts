/**
 * OpenAI Adapter
 * OpenAI GPT系列模型适配器
 */
import { ChatCompletionRequest, ChatCompletionResponse, EmbeddingRequest, EmbeddingResponse, StreamChunk, RequestContext } from '../types';
import { BaseLLMAdapter } from './base';
interface OpenAIConfig {
    apiKey: string;
    apiUrl?: string;
    organization?: string;
    timeoutMs?: number;
}
export declare class OpenAIAdapter extends BaseLLMAdapter {
    readonly id = "openai";
    readonly provider = "OpenAI";
    private config;
    private baseUrl;
    constructor(config: OpenAIConfig);
    protected loadModels(): Promise<void>;
    chatCompletion(request: ChatCompletionRequest, _context: RequestContext): Promise<ChatCompletionResponse>;
    streamChatCompletion(request: ChatCompletionRequest, context: RequestContext, onChunk: (chunk: StreamChunk) => void): Promise<void>;
    embeddings(request: EmbeddingRequest, _context: RequestContext): Promise<EmbeddingResponse>;
    calculateCost(modelId: string, inputTokens: number, outputTokens: number): number;
    private makeRequest;
}
export {};
//# sourceMappingURL=openai.d.ts.map