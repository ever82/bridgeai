/**
 * Base Vision Adapter
 * 多模态视觉模型适配器基类
 */

import {
  IVisionModelAdapter,
  ImageInput,
  VisionModelConfig,
  VisionRequestContext
} from '../../vision/types';

/**
 * 抽象基础视觉适配器类
 */
export abstract class BaseVisionAdapter implements IVisionModelAdapter {
  abstract readonly id: string;
  abstract readonly provider: string;
  abstract readonly supportsImages: boolean;

  protected initialized = false;
  protected config: VisionModelConfig;

  constructor(config: Partial<VisionModelConfig> = {}) {
    this.config = {
      provider: 'openai',
      model: 'gpt-4-vision-preview',
      maxTokens: 4096,
      temperature: 0.7,
      timeoutMs: 60000,
      ...config
    };
  }

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async healthCheck(): Promise<boolean> {
    try {
      return this.initialized;
    } catch {
      return false;
    }
  }

  abstract analyzeImage(
    image: ImageInput,
    prompt: string,
    config?: Partial<VisionModelConfig>
  ): Promise<string>;

  abstract generateEmbedding?(
    image: ImageInput,
    config?: Partial<VisionModelConfig>
  ): Promise<number[]>;

  /**
   * 将图像输入转换为API格式
   */
  protected formatImageForAPI(image: ImageInput): { type: string; [key: string]: unknown } {
    if (image.type === 'url') {
      return {
        type: 'image_url',
        image_url: {
          url: image.data,
          detail: 'auto'
        }
      };
    } else {
      // base64
      const mimeType = image.mimeType || 'image/jpeg';
      return {
        type: 'image_url',
        image_url: {
          url: `data:${mimeType};base64,${image.data}`,
          detail: 'auto'
        }
      };
    }
  }

  /**
   * 验证图像输入
   */
  protected validateImageInput(image: ImageInput): void {
    if (!image.data) {
      throw new Error('Image data is required');
    }

    if (image.type === 'base64') {
      // 验证base64格式
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Regex.test(image.data.replace(/\s/g, ''))) {
        throw new Error('Invalid base64 image data');
      }
    } else if (image.type === 'url') {
      // 验证URL格式
      try {
        new URL(image.data);
      } catch {
        throw new Error('Invalid image URL');
      }
    }
  }

  /**
   * 生成请求ID
   */
  protected generateRequestId(): string {
    return `${this.provider}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 估算token数量
   */
  protected estimateTokens(text: string): number {
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const otherChars = text.length - chineseChars;
    return Math.ceil(chineseChars / 1.5 + otherChars / 4);
  }
}
