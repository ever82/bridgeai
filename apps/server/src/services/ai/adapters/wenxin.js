/**
 * Wenxin Adapter
 * 百度文心一言(ERNIE)模型适配器
 */
import { BaseLLMAdapter } from './base';
export class WenxinAdapter extends BaseLLMAdapter {
    id = 'wenxin';
    provider = '百度文心一言';
    config;
    baseUrl;
    accessToken = null;
    tokenExpireTime = 0;
    constructor(config) {
        super();
        this.config = {
            timeoutMs: 60000,
            ...config
        };
        this.baseUrl = config.apiUrl || 'https://aip.baidubce.com';
    }
    async initialize() {
        await this.refreshAccessToken();
        await this.loadModels();
        this.initialized = true;
    }
    async loadModels() {
        const models = [
            {
                id: 'ernie-bot-4',
                name: '文心一言4.0',
                provider: 'wenxin',
                capabilities: {
                    chatCompletion: true,
                    embeddings: false,
                    streaming: true,
                    maxTokens: 8192,
                    supportedLanguages: ['zh', 'en']
                },
                costPer1KTokens: {
                    input: 0.008,
                    output: 0.008
                },
                averageLatencyMs: 1500,
                qualityScore: 88
            },
            {
                id: 'ernie-bot',
                name: '文心一言',
                provider: 'wenxin',
                capabilities: {
                    chatCompletion: true,
                    embeddings: false,
                    streaming: true,
                    maxTokens: 4096,
                    supportedLanguages: ['zh', 'en']
                },
                costPer1KTokens: {
                    input: 0.004,
                    output: 0.004
                },
                averageLatencyMs: 1200,
                qualityScore: 82
            },
            {
                id: 'ernie-bot-turbo',
                name: '文心一言 Turbo',
                provider: 'wenxin',
                capabilities: {
                    chatCompletion: true,
                    embeddings: false,
                    streaming: true,
                    maxTokens: 4096,
                    supportedLanguages: ['zh', 'en']
                },
                costPer1KTokens: {
                    input: 0.002,
                    output: 0.002
                },
                averageLatencyMs: 800,
                qualityScore: 78
            },
            {
                id: 'embedding-v1',
                name: '文心百中语义向量',
                provider: 'wenxin',
                capabilities: {
                    chatCompletion: false,
                    embeddings: true,
                    streaming: false,
                    maxTokens: 512,
                    supportedLanguages: ['zh', 'en']
                },
                costPer1KTokens: {
                    input: 0.001,
                    output: 0
                },
                averageLatencyMs: 300,
                qualityScore: 80
            }
        ];
        models.forEach(model => {
            this.models.set(model.id, model);
        });
    }
    async chatCompletion(request, _context) {
        await this.ensureAccessToken();
        const endpoint = this.getChatEndpoint(request.model);
        const response = await this.makeRequest(endpoint, {
            messages: request.messages.map(m => ({
                role: m.role,
                content: m.content
            })),
            temperature: request.temperature ?? 0.7,
            max_output_tokens: request.maxTokens ?? 2048,
            top_p: request.topP ?? 1.0,
            penalty_score: request.frequencyPenalty ?? 1.0
        });
        const data = await response.json();
        if (data.error_code) {
            throw new Error(`Wenxin API error: ${data.error_code} - ${data.error_msg}`);
        }
        return {
            id: data.id || `wenxin-${Date.now()}`,
            model: request.model,
            choices: [{
                    index: 0,
                    message: {
                        role: 'assistant',
                        content: data.result
                    },
                    finishReason: data.is_truncated ? 'length' : 'stop'
                }],
            usage: {
                promptTokens: data.usage?.prompt_tokens || 0,
                completionTokens: data.usage?.completion_tokens || 0,
                totalTokens: data.usage?.total_tokens || 0
            },
            createdAt: new Date()
        };
    }
    async streamChatCompletion(request, context, onChunk) {
        await this.ensureAccessToken();
        const endpoint = this.getChatEndpoint(request.model);
        const response = await this.makeRequest(endpoint, {
            messages: request.messages.map(m => ({
                role: m.role,
                content: m.content
            })),
            temperature: request.temperature ?? 0.7,
            max_output_tokens: request.maxTokens ?? 2048,
            stream: true
        });
        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('No response body');
        }
        const decoder = new TextDecoder();
        let buffer = '';
        const messageId = `wenxin-${Date.now()}`;
        try {
            let streamDone = false;
            while (!streamDone) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    if (line.trim() === '')
                        continue;
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        try {
                            const event = JSON.parse(data);
                            if (event.error_code) {
                                throw new Error(`Wenxin streaming error: ${event.error_code}`);
                            }
                            const isDone = event.is_end;
                            onChunk({
                                id: messageId,
                                model: request.model,
                                choices: [{
                                        index: 0,
                                        delta: {
                                            role: 'assistant',
                                            content: event.result || ''
                                        },
                                        finishReason: isDone ? 'stop' : null
                                    }]
                            });
                            if (isDone) {
                                streamDone = true;
                                return;
                            }
                        }
                        catch (e) {
                            // Skip invalid JSON
                        }
                    }
                }
            }
        }
        finally {
            reader.releaseLock();
        }
    }
    async embeddings(request, _context) {
        await this.ensureAccessToken();
        const inputs = Array.isArray(request.input) ? request.input : [request.input];
        // 文心 embedding API 一次只能处理一个输入
        const results = [];
        let totalTokens = 0;
        for (let i = 0; i < inputs.length; i++) {
            const response = await this.makeRequest('/rpc/2.0/ai_custom/v1/wenxinworkshop/embeddings', {
                input: inputs[i]
            });
            const data = await response.json();
            if (data.error_code) {
                throw new Error(`Wenxin embedding error: ${data.error_code} - ${data.error_msg}`);
            }
            results.push({
                index: i,
                embedding: data.data[0].embedding
            });
            totalTokens += data.usage?.prompt_tokens || 0;
        }
        return {
            model: request.model,
            data: results,
            usage: {
                promptTokens: totalTokens,
                totalTokens: totalTokens
            }
        };
    }
    calculateCost(modelId, inputTokens, outputTokens) {
        const model = this.models.get(modelId);
        if (!model)
            return 0;
        const safeInput = Math.max(0, inputTokens);
        const safeOutput = Math.max(0, outputTokens);
        const inputCost = (safeInput / 1000) * model.costPer1KTokens.input;
        const outputCost = (safeOutput / 1000) * model.costPer1KTokens.output;
        return inputCost + outputCost;
    }
    async ensureAccessToken() {
        if (!this.accessToken || Date.now() >= this.tokenExpireTime) {
            await this.refreshAccessToken();
        }
    }
    async refreshAccessToken() {
        const response = await fetch(`${this.baseUrl}/oauth/2.0/token?grant_type=client_credentials&client_id=${this.config.apiKey}&client_secret=${this.config.secretKey}`, { method: 'POST' });
        if (!response.ok) {
            throw new Error(`Failed to get Wenxin access token: ${response.status}`);
        }
        const data = await response.json();
        this.accessToken = data.access_token;
        this.tokenExpireTime = Date.now() + (data.expires_in * 1000) - 60000; // 提前1分钟过期
    }
    getChatEndpoint(model) {
        const endpointMap = {
            'ernie-bot-4': '/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions_pro',
            'ernie-bot': '/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions',
            'ernie-bot-turbo': '/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/eb-instant'
        };
        return endpointMap[model] || endpointMap['ernie-bot'];
    }
    async makeRequest(endpoint, body) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}?access_token=${this.accessToken}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body),
                signal: controller.signal
            });
            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Wenxin API error: ${response.status} - ${error}`);
            }
            return response;
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
}
//# sourceMappingURL=wenxin.js.map