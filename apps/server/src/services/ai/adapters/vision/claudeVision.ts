/**
 * Claude Vision Adapter
 * Anthropic Claude Vision模型适配器
 */

import { BaseVisionAdapter } from './base';
import {
  ImageInput,
  VisionModelConfig
} from '../../vision/types';

interface ClaudeVisionConfig {
  apiKey: string;
  apiUrl?: string;
  timeoutMs?: number;
}

export class ClaudeVisionAdapter extends BaseVisionAdapter {
  readonly id = 'claude-vision';
  readonly provider = 'Anthropic';
  readonly supportsImages = true;

  private apiConfig: ClaudeVisionConfig;
  private baseUrl: string;

  constructor(apiConfig: ClaudeVisionConfig, modelConfig?: Partial<VisionModelConfig>) {
    super({
      provider: 'claude',
      model: 'claude-3-opus-20240229',
      maxTokens: 4096,
      temperature: 0.7,
      ...modelConfig
    });
    this.apiConfig = {
      timeoutMs: 60000,
      ...apiConfig
    };
    this.baseUrl = apiConfig.apiUrl || 'https://api.anthropic.com/v1';
  }

  async initialize(): Promise<void> {
    await super.initialize();

    if (!this.apiConfig.apiKey) {
      throw new Error('Anthropic API key is required');
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Claude没有直接的模型列表API，尝试一个简单的请求
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiConfig.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }]
        })
      });
      return response.ok || response.status === 400; // 400 means API is up but request was bad
    } catch {
      return false;
    }
  }

  async analyzeImage(
    image: ImageInput,
    prompt: string,
    config?: Partial<VisionModelConfig>
  ): Promise<string> {
    this.validateImageInput(image);

    const mergedConfig = { ...this.config, ...config };
    const imageContent = this.formatImageForClaude(image);

    const response = await this.makeRequest('/messages', {
      model: mergedConfig.model || 'claude-3-opus-20240229',
      max_tokens: mergedConfig.maxTokens || 4096,
      temperature: mergedConfig.temperature ?? 0.7,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            imageContent
          ]
        }
      ]
    });

    const data = await response.json() as { content?: Array<{ text: string }> };

    if (!data.content || data.content.length === 0) {
      throw new Error('No response from Claude Vision');
    }

    return data.content[0].text;
  }

  /**
   * 批量分析多张图像
   */
  async analyzeMultipleImages(
    images: ImageInput[],
    prompt: string,
    config?: Partial<VisionModelConfig>
  ): Promise<string> {
    if (images.length === 0) {
      throw new Error('At least one image is required');
    }

    // 验证所有图像
    images.forEach(img => this.validateImageInput(img));

    const mergedConfig = { ...this.config, ...config };

    // 构建包含多张图像的消息内容
    const content: Array<{ type: string; [key: string]: unknown }> = [
      { type: 'text', text: prompt }
    ];

    images.forEach(image => {
      content.push(this.formatImageForClaude(image));
    });

    const response = await this.makeRequest('/messages', {
      model: mergedConfig.model || 'claude-3-opus-20240229',
      max_tokens: mergedConfig.maxTokens || 4096,
      temperature: mergedConfig.temperature ?? 0.7,
      messages: [
        {
          role: 'user',
          content
        }
      ]
    });

    const data = await response.json() as { content?: Array<{ text: string }> };

    if (!data.content || data.content.length === 0) {
      throw new Error('No response from Claude Vision');
    }

    return data.content[0].text;
  }

  /**
   * Claude不支持直接的图像嵌入，使用图像描述生成文本嵌入
   */
  async generateEmbedding(
    image: ImageInput,
    config?: Partial<VisionModelConfig>
  ): Promise<number[]> {
    // Claude没有嵌入API，返回描述文本，需要外部服务生成嵌入
    const description = await this.analyzeImage(
      image,
      'Describe this image in detail for semantic search. Be concise but comprehensive.',
      { maxTokens: 512 }
    );

    // 返回一个基于描述的哈希模拟嵌入（实际应用中使用外部嵌入服务）
    // 这里生成一个固定维度的向量用于测试
    const dimension = 1536;
    const embedding = new Array(dimension).fill(0);

    // 使用描述的哈希值填充向量
    let hash = 0;
    for (let i = 0; i < description.length; i++) {
      const char = description.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    for (let i = 0; i < dimension; i++) {
      embedding[i] = Math.sin(hash + i) * 0.5;
    }

    // 归一化
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }

  /**
   * 将图像输入转换为Claude API格式
   */
  private formatImageForClaude(image: ImageInput): { type: string; [key: string]: unknown } {
    if (image.type === 'url') {
      return {
        type: 'image',
        source: {
          type: 'url',
          url: image.data
        }
      };
    } else {
      // base64
      const mimeType = image.mimeType || 'image/jpeg';
      return {
        type: 'image',
        source: {
          type: 'base64',
          media_type: mimeType,
          data: image.data
        }
      };
    }
  }

  private async makeRequest(endpoint: string, body: unknown): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.apiConfig.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiConfig.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Claude Vision API error: ${response.status} - ${error}`);
      }

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
