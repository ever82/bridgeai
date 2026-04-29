/**
 * OpenAI Adapter
 * OpenAI GPT系列模型适配器
 */
import { BaseLLMAdapter } from './base';
export class OpenAIAdapter extends BaseLLMAdapter {
    id = 'openai';
    provider = 'OpenAI';
    config;
    baseUrl;
    constructor(config) {
        super();
        this.config = {
            timeoutMs: 60000,
            ...config,
        };
        this.baseUrl = config.apiUrl || 'https://api.openai.com/v1';
    }
    async loadModels() {
        const models = [
            {
                id: 'gpt-4',
                name: 'GPT-4',
                provider: 'openai',
                capabilities: {
                    chatCompletion: true,
                    embeddings: false,
                    streaming: true,
                    maxTokens: 8192,
                    supportedLanguages: ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de'],
                },
                costPer1KTokens: {
                    input: 0.03,
                    output: 0.06,
                },
                averageLatencyMs: 1500,
                qualityScore: 95,
            },
            {
                id: 'gpt-4-turbo',
                name: 'GPT-4 Turbo',
                provider: 'openai',
                capabilities: {
                    chatCompletion: true,
                    embeddings: false,
                    streaming: true,
                    maxTokens: 128000,
                    supportedLanguages: ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'it', 'pt', 'ru'],
                },
                costPer1KTokens: {
                    input: 0.01,
                    output: 0.03,
                },
                averageLatencyMs: 1200,
                qualityScore: 94,
            },
            {
                id: 'gpt-3.5-turbo',
                name: 'GPT-3.5 Turbo',
                provider: 'openai',
                capabilities: {
                    chatCompletion: true,
                    embeddings: false,
                    streaming: true,
                    maxTokens: 16384,
                    supportedLanguages: ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'it', 'pt', 'ru'],
                },
                costPer1KTokens: {
                    input: 0.0005,
                    output: 0.0015,
                },
                averageLatencyMs: 800,
                qualityScore: 85,
            },
            {
                id: 'text-embedding-3-small',
                name: 'Text Embedding 3 Small',
                provider: 'openai',
                capabilities: {
                    chatCompletion: false,
                    embeddings: true,
                    streaming: false,
                    maxTokens: 8191,
                    supportedLanguages: ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de'],
                },
                costPer1KTokens: {
                    input: 0.00002,
                    output: 0,
                },
                averageLatencyMs: 300,
                qualityScore: 80,
            },
            {
                id: 'text-embedding-3-large',
                name: 'Text Embedding 3 Large',
                provider: 'openai',
                capabilities: {
                    chatCompletion: false,
                    embeddings: true,
                    streaming: false,
                    maxTokens: 8191,
                    supportedLanguages: ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de'],
                },
                costPer1KTokens: {
                    input: 0.00013,
                    output: 0,
                },
                averageLatencyMs: 400,
                qualityScore: 90,
            },
        ];
        models.forEach(model => {
            this.models.set(model.id, model);
        });
    }
    async chatCompletion(request, _context) {
        const response = await this.makeRequest('/chat/completions', {
            model: request.model,
            messages: request.messages.map(m => ({
                role: m.role,
                content: m.content,
            })),
            temperature: request.temperature ?? 0.7,
            max_tokens: request.maxTokens,
            top_p: request.topP,
            frequency_penalty: request.frequencyPenalty,
            presence_penalty: request.presencePenalty,
            stream: false,
        });
        const data = (await response.json());
        return {
            id: data.id,
            model: data.model,
            choices: data.choices.map((c) => ({
                index: c.index,
                message: {
                    role: c.message.role,
                    content: c.message.content,
                },
                finishReason: c.finish_reason,
            })),
            usage: {
                promptTokens: data.usage.prompt_tokens,
                completionTokens: data.usage.completion_tokens,
                totalTokens: data.usage.total_tokens,
            },
            createdAt: new Date(data.created * 1000),
        };
    }
    async streamChatCompletion(request, context, onChunk) {
        const response = await this.makeRequest('/chat/completions', {
            model: request.model,
            messages: request.messages.map(m => ({
                role: m.role,
                content: m.content,
            })),
            temperature: request.temperature ?? 0.7,
            max_tokens: request.maxTokens,
            stream: true,
        });
        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('No response body');
        }
        const decoder = new TextDecoder();
        let buffer = '';
        try {
            // eslint-disable-next-line no-constant-condition
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]')
                            return;
                        try {
                            const chunk = JSON.parse(data);
                            onChunk({
                                id: chunk.id,
                                model: chunk.model,
                                choices: chunk.choices.map((c) => ({
                                    index: c.index,
                                    delta: c.delta,
                                    finishReason: c.finish_reason,
                                })),
                            });
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
        const inputs = Array.isArray(request.input) ? request.input : [request.input];
        const response = await this.makeRequest('/embeddings', {
            model: request.model,
            input: inputs,
        });
        const data = (await response.json());
        return {
            model: data.model,
            data: data.data.map((item) => ({
                index: item.index,
                embedding: item.embedding,
            })),
            usage: {
                promptTokens: data.usage.prompt_tokens,
                totalTokens: data.usage.total_tokens,
            },
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
    async makeRequest(endpoint, body) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.config.apiKey}`,
                    ...(this.config.organization && {
                        'OpenAI-Organization': this.config.organization,
                    }),
                    ...(this.config.apiKey === 'sk-proxy-local-llm-router' && {
                        'x-proxy-auth': 'sk-proxy-local-llm-router',
                    }),
                },
                body: JSON.stringify(body),
                signal: controller.signal,
            });
            if (!response.ok && response.status === 401) {
                // Try with x-proxy-auth header for local router
                const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-proxy-auth': 'sk-proxy-local-llm-router',
                    },
                    body: JSON.stringify(body),
                    signal: controller.signal,
                });
                if (retryResponse.ok)
                    return retryResponse;
                // If still fails, fall through to original error handling
            }
            if (!response.ok) {
                const error = await response.text();
                throw new Error(`OpenAI API error: ${response.status} - ${error}`);
            }
            return response;
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
}
//# sourceMappingURL=openai.js.map