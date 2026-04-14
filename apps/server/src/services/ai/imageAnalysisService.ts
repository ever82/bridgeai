/**
 * Image Analysis Service
 * 图像内容分析服务
 */

import {
  ImageInput,
  ImageAnalysisResult,
  DetectedObject,
  VisualFeatures,
  IVisionModelAdapter,
  VisionRequestContext
} from './vision/types';

interface ImageAnalysisServiceConfig {
  adapter: IVisionModelAdapter;
  defaultTimeoutMs?: number;
  maxRetries?: number;
}

export class ImageAnalysisService {
  private adapter: IVisionModelAdapter;
  private config: ImageAnalysisServiceConfig;

  constructor(config: ImageAnalysisServiceConfig) {
    this.adapter = config.adapter;
    this.config = {
      defaultTimeoutMs: 30000,
      maxRetries: 3,
      ...config
    };
  }

  /**
   * 分析单张图像
   * 识别场景、物体、活动等
   */
  async analyze(
    image: ImageInput,
    context?: Partial<VisionRequestContext>
  ): Promise<ImageAnalysisResult> {
    const startTime = Date.now();

    try {
      // 构建分析提示
      const analysisPrompt = this.buildAnalysisPrompt();

      // 调用Vision模型
      const response = await this.adapter.analyzeImage(image, analysisPrompt, {
        maxTokens: 2048,
        temperature: 0.3
      });

      // 解析响应
      const parsedResult = this.parseAnalysisResponse(response);

      return {
        ...parsedResult,
        confidence: this.calculateConfidence(parsedResult),
        processingTimeMs: Date.now() - startTime
      };
    } catch (error) {
      throw new Error(`Image analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 批量分析多张图像
   */
  async analyzeBatch(
    images: ImageInput[],
    context?: Partial<VisionRequestContext>
  ): Promise<ImageAnalysisResult[]> {
    const results: ImageAnalysisResult[] = [];

    // 限制并发数
    const concurrency = 3;
    for (let i = 0; i < images.length; i += concurrency) {
      const batch = images.slice(i, i + concurrency);
      const batchPromises = batch.map(image =>
        this.analyze(image, context).catch(error => {
          console.error('Batch analysis error:', error);
          return this.createErrorResult(error);
        })
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * 提取视觉特征
   */
  async extractVisualFeatures(
    image: ImageInput
  ): Promise<VisualFeatures> {
    const featurePrompt = `Analyze this image and provide visual features in the following format:
{
  "dominantColors": ["color1", "color2", "color3"],
  "brightness": 0-100,
  "contrast": 0-100,
  "sharpness": 0-100,
  "hasFaces": true/false,
  "faceCount": number (optional)
}`;

    const response = await this.adapter.analyzeImage(image, featurePrompt, {
      maxTokens: 1024,
      temperature: 0.2
    });

    return this.parseVisualFeatures(response);
  }

  /**
   * 检测图像中的物体
   */
  async detectObjects(
    image: ImageInput
  ): Promise<DetectedObject[]> {
    const detectionPrompt = `Detect and describe all significant objects in this image.
For each object, provide:
- label: object name
- confidence: detection confidence (0-1)

Return as JSON array:
[
  {"label": "person", "confidence": 0.95},
  {"label": "car", "confidence": 0.87}
]`;

    const response = await this.adapter.analyzeImage(image, detectionPrompt, {
      maxTokens: 1024,
      temperature: 0.2
    });

    return this.parseDetectedObjects(response);
  }

  /**
   * 生成场景描述
   */
  async generateDescription(
    image: ImageInput,
    options?: {
      maxLength?: number;
      detail?: 'brief' | 'normal' | 'detailed';
      language?: string;
    }
  ): Promise<string> {
    const detail = options?.detail || 'normal';
    const maxLength = options?.maxLength || 200;
    const language = options?.language || 'zh';

    const descriptionPrompt = `Describe this image in ${language}.
Detail level: ${detail}
Maximum length: ${maxLength} characters.
Focus on: scene setting, main subjects, activities, mood/atmosphere.`;

    const response = await this.adapter.analyzeImage(image, descriptionPrompt, {
      maxTokens: Math.ceil(maxLength / 2),
      temperature: 0.5
    });

    return response.trim();
  }

  /**
   * 提取活动标签
   */
  async extractActivityTags(
    image: ImageInput
  ): Promise<string[]> {
    const tagsPrompt = `Analyze this image and identify all activities, actions, or events shown.
Return as a JSON array of relevant tags (5-15 tags):
["tag1", "tag2", "tag3", ...]

Tags should be:
- Relevant to the main activities
- Specific but not too narrow
- Include both general and specific terms`;

    const response = await this.adapter.analyzeImage(image, tagsPrompt, {
      maxTokens: 512,
      temperature: 0.3
    });

    return this.parseActivityTags(response);
  }

  /**
   * 构建分析提示
   */
  private buildAnalysisPrompt(): string {
    return `Analyze this image comprehensively and provide a structured analysis.

Please provide the following information in JSON format:

{
  "sceneDescription": "detailed description of the scene (2-3 sentences)",
  "detectedObjects": [
    {"label": "object name", "confidence": 0.0-1.0},
    ...
  ],
  "activityTags": ["tag1", "tag2", ...],
  "visualFeatures": {
    "dominantColors": ["color1", "color2", ...],
    "brightness": 0-100,
    "contrast": 0-100,
    "sharpness": 0-100,
    "hasFaces": true/false,
    "faceCount": number (if hasFaces is true)
  }
}

Requirements:
- detectedObjects: list 5-15 most significant objects with confidence scores
- activityTags: identify 3-10 relevant activities or contextual tags
- dominantColors: identify 2-5 most prominent colors
- Be specific and accurate in your analysis`;
  }

  /**
   * 解析分析响应
   */
  private parseAnalysisResponse(response: string): Omit<ImageAnalysisResult, 'confidence' | 'processingTimeMs'> {
    try {
      // 尝试提取JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const data = JSON.parse(jsonMatch[0]);

      return {
        sceneDescription: data.sceneDescription || '',
        detectedObjects: Array.isArray(data.detectedObjects) ? data.detectedObjects : [],
        activityTags: Array.isArray(data.activityTags) ? data.activityTags : [],
        visualFeatures: this.normalizeVisualFeatures(data.visualFeatures)
      };
    } catch (error) {
      // 如果解析失败，返回基本结构
      return {
        sceneDescription: response.slice(0, 500),
        detectedObjects: [],
        activityTags: [],
        visualFeatures: {
          dominantColors: [],
          brightness: 50,
          contrast: 50,
          sharpness: 50,
          hasFaces: false
        }
      };
    }
  }

  /**
   * 解析视觉特征
   */
  private parseVisualFeatures(response: string): VisualFeatures {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        return this.normalizeVisualFeatures(data);
      }
    } catch {
      // 解析失败使用默认值
    }

    return {
      dominantColors: [],
      brightness: 50,
      contrast: 50,
      sharpness: 50,
      hasFaces: false
    };
  }

  /**
   * 解析检测到的物体
   */
  private parseDetectedObjects(response: string): DetectedObject[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        if (Array.isArray(data)) {
          return data.map(obj => ({
            label: String(obj.label || ''),
            confidence: Number(obj.confidence) || 0.5,
            boundingBox: obj.boundingBox
          })).filter(obj => obj.label);
        }
      }
    } catch {
      // 解析失败
    }

    return [];
  }

  /**
   * 解析活动标签
   */
  private parseActivityTags(response: string): string[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        if (Array.isArray(data)) {
          return data.map(tag => String(tag)).filter(tag => tag);
        }
      }
    } catch {
      // 如果JSON解析失败，尝试按行分割
      const lines = response.split('\n').map(line => line.trim());
      const tags: string[] = [];
      for (const line of lines) {
        const match = line.match(/^["']?(.+?)["']?,?$/);
        if (match) {
          tags.push(match[1]);
        }
      }
      if (tags.length > 0) return tags;
    }

    return [];
  }

  /**
   * 规范化视觉特征
   */
  private normalizeVisualFeatures(features: any): VisualFeatures {
    const clamp = (val: number, min = 0, max = 100) =>
      Math.max(min, Math.min(max, Number(val) || 50));

    return {
      dominantColors: Array.isArray(features?.dominantColors)
        ? features.dominantColors.slice(0, 5)
        : [],
      brightness: clamp(features?.brightness),
      contrast: clamp(features?.contrast),
      sharpness: clamp(features?.sharpness),
      hasFaces: Boolean(features?.hasFaces),
      faceCount: features?.hasFaces ? Number(features?.faceCount) || undefined : undefined
    };
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(result: Partial<ImageAnalysisResult>): number {
    let score = 0.7; // 基础分

    // 有场景描述加分
    if (result.sceneDescription && result.sceneDescription.length > 50) {
      score += 0.1;
    }

    // 有物体检测加分
    if (result.detectedObjects && result.detectedObjects.length > 0) {
      score += 0.1;
    }

    // 有活动标签加分
    if (result.activityTags && result.activityTags.length > 0) {
      score += 0.1;
    }

    return Math.min(1, score);
  }

  /**
   * 创建错误结果
   */
  private createErrorResult(error: Error): ImageAnalysisResult {
    return {
      sceneDescription: `Analysis failed: ${error.message}`,
      detectedObjects: [],
      activityTags: [],
      visualFeatures: {
        dominantColors: [],
        brightness: 0,
        contrast: 0,
        sharpness: 0,
        hasFaces: false
      },
      confidence: 0,
      processingTimeMs: 0
    };
  }
}
