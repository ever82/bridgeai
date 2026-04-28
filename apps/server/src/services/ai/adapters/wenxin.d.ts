/**
 * Wenxin Adapter
 * 百度文心一言(ERNIE)模型适配器
 */
import { ChatCompletionRequest, ChatCompletionResponse, EmbeddingRequest, EmbeddingResponse, StreamChunk, RequestContext } from '../types';
import { BaseLLMAdapter } from './base';
interface WenxinConfig {
    apiKey: string;
    secretKey: string;
    apiUrl?: string;
    timeoutMs?: number;
}
export declare class WenxinAdapter extends BaseLLMAdapter {
    readonly id = "wenxin";
    readonly provider = "\u767E\u5EA6\u6587\u5FC3\u4E00\u8A00";
    private config;
    private baseUrl;
    private accessToken;
    private tokenExpireTime;
    constructor(config: WenxinConfig);
    initialize(): Promise<void>;
    protected loadModels(): Promise<void>;
    chatCompletion(request: ChatCompletionRequest, _context: RequestContext): Promise<ChatCompletionResponse>;
    streamChatCompletion(request: ChatCompletionRequest, context: RequestContext, onChunk: (chunk: StreamChunk) => void): Promise<void>;
    embeddings(request: EmbeddingRequest, _context: RequestContext): Promise<EmbeddingResponse>;
    calculateCost(modelId: string, inputTokens: number, outputTokens: number): number;
    private ensureAccessToken;
    private refreshAccessToken;
    private getChatEndpoint;
    private makeRequest;
}
export {};
//# sourceMappingURL=wenxin.d.ts.map