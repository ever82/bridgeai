/**
 * Claude Adapter
 * Anthropic Claude模型适配器
 */

import { BaseLLMAdapter } from './base';
import {
  ChatCompletionRequest,
  ChatCompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  ModelInfo,
  StreamChunk,
  RequestContext
} from '../types';

interface ClaudeConfig {
  apiKey: string;
  apiUrl?: string;
  timeoutMs?: number;
}

export class ClaudeAdapter extends BaseLLMAdapter {
  readonly id = 'claude';
  readonly provider = 'Anthropic';

  private config: ClaudeConfig;
  private baseUrl: string;

  constructor(config: ClaudeConfig) {
    super();
    this.config = {
      timeoutMs: 60000,
      ...config
    };
    this.baseUrl = config.apiUrl || 'https://api.anthropic.com/v1';
  }

  protected async loadModels(): Promise<void> {
    const models: ModelInfo[] = [
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        provider: 'claude',
        capabilities: {
          chatCompletion: true,
          embeddings: false,
          streaming: true,
          maxTokens: 200000,
          supportedLanguages: ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'it', 'pt', 'ar', 'hi']
        },
        costPer1KTokens: {
          input: 0.015,
          output: 0.075
        },
        averageLatencyMs: 1800,
        qualityScore: 96
      },
      {
        id: 'claude-3-sonnet-20240229',
        name: 'Claude 3 Sonnet',
        provider: 'claude',
        capabilities: {
          chatCompletion: true,
          embeddings: false,
          streaming: true,
          maxTokens: 200000,
          supportedLanguages: ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'it', 'pt', 'ar', 'hi']
        },
        costPer1KTokens: {
          input: 0.003,
          output: 0.015
        },
        averageLatencyMs: 1200,
        qualityScore: 90
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        provider: 'claude',
        capabilities: {
          chatCompletion: true,
          embeddings: false,
          streaming: true,
          maxTokens: 200000,
          supportedLanguages: ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'it', 'pt', 'ar', 'hi']
        },
        costPer1KTokens: {
          input: 0.00025,
          output: 0.00125
        },
        averageLatencyMs: 600,
        qualityScore: 82
      }
    ];

    models.forEach(model => {
      this.models.set(model.id, model);
    });
  }

  async chatCompletion(
    request: ChatCompletionRequest,
    context: RequestContext
  ): Promise<ChatCompletionResponse> {
    // 转换消息格式为Claude格式
    const systemMessage = request.messages.find(m => m.role === 'system');
    const conversationMessages = request.messages.filter(m => m.role !== 'system');

    const response = await this.makeRequest('/messages', {
      model: request.model,
      system: systemMessage?.content,
      messages: conversationMessages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      })),
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0.7,
      top_p: request.topP,
      stream: false
    });

    const data = await response.json();

    // 转换为统一响应格式
    return {
      id: data.id,
      model: data.model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: data.content[0]?.text || ''
        },
        finishReason: data.stop_reason || 'stop'
      }],
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens
      },
      createdAt: new Date()
    };
  }

  async streamChatCompletion(
    request: ChatCompletionRequest,
    context: RequestContext,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<void> {
    const systemMessage = request.messages.find(m => m.role === 'system');
    const conversationMessages = request.messages.filter(m => m.role !== 'system');

    const response = await this.makeRequest('/messages', {
      model: request.model,
      system: systemMessage?.content,
      messages: conversationMessages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      })),
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0.7,
      stream: true
    });

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let messageId = '';
    let model = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const eventType = line.slice(7);
            continue;
          }

          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            try {
              const event = JSON.parse(data);

              if (event.type === 'message_start') {
                messageId = event.message.id;
                model = event.message.model;
              } else if (event.type === 'content_block_delta') {
                onChunk({
                  id: messageId,
                  model: model,
                  choices: [{
                    index: 0,
                    delta: {
                      role: 'assistant',
                      content: event.delta.text
                    },
                    finishReason: null
                  }]
                });
              } else if (event.type === 'message_delta' && event.delta.stop_reason) {
                onChunk({
                  id: messageId,
                  model: model,
                  choices: [{
                    index: 0,
                    delta: {},
                    finishReason: event.delta.stop_reason
                  }]
                });
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async embeddings(
    request: EmbeddingRequest,
    context: RequestContext
  ): Promise<EmbeddingResponse> {
    throw new Error('Claude does not support embeddings API');
  }

  calculateCost(modelId: string, inputTokens: number, outputTokens: number): number {
    const model = this.models.get(modelId);
    if (!model) return 0;

    const inputCost = (inputTokens / 1000) * model.costPer1KTokens.input;
    const outputCost = (outputTokens / 1000) * model.costPer1KTokens.output;
    return inputCost + outputCost;
  }

  private async makeRequest(endpoint: string, body: unknown): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Claude API error: ${response.status} - ${error}`);
      }

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
