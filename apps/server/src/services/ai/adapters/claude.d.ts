/**
 * Claude Adapter
 * Anthropic Claude模型适配器
 */
import { ChatCompletionRequest, ChatCompletionResponse, EmbeddingRequest, EmbeddingResponse, StreamChunk, RequestContext } from '../types';
import { BaseLLMAdapter } from './base';
interface ClaudeConfig {
    apiKey: string;
    apiUrl?: string;
    timeoutMs?: number;
}
export declare class ClaudeAdapter extends BaseLLMAdapter {
    readonly id = "claude";
    readonly provider = "Anthropic";
    private config;
    private baseUrl;
    constructor(config: ClaudeConfig);
    protected loadModels(): Promise<void>;
    chatCompletion(request: ChatCompletionRequest, _context: RequestContext): Promise<ChatCompletionResponse>;
    streamChatCompletion(request: ChatCompletionRequest, context: RequestContext, onChunk: (chunk: StreamChunk) => void): Promise<void>;
    embeddings(_request: EmbeddingRequest, _context: RequestContext): Promise<EmbeddingResponse>;
    calculateCost(modelId: string, inputTokens: number, outputTokens: number): number;
    private makeRequest;
}
export {};
//# sourceMappingURL=claude.d.ts.map