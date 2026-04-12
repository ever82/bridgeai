/**
 * Image Moderation Service
 * 图像安全审核服务
 */

import {
  ImageInput,
  ImageModerationResult,
  ViolationType,
  IVisionModelAdapter
} from './vision/types';

interface ImageModerationServiceConfig {
  adapter: IVisionModelAdapter;
  safetyThreshold?: number; // 安全阈值 (0-1)
  strictMode?: boolean;
}

export class ImageModerationService {
  private adapter: IVisionModelAdapter;
  private config: ImageModerationServiceConfig;

  // 各违规类型的阈值
  private readonly thresholds: Record<ViolationType, number> = {
    none: 1.0,
    nsfw: 0.3,
    violence: 0.4,
    gore: 0.3,
    hate: 0.3,
    harassment: 0.4,
    self_harm: 0.2,
    illegal: 0.2,
    privacy: 0.5,
    spam: 0.7
  };

  constructor(config: ImageModerationServiceConfig) {
    this.adapter = config.adapter;
    this.config = {
      safetyThreshold: 0.7,
      strictMode: false,
      ...config
    };
  }

  /**
   * 审核单张图像
   */
  async moderate(
    image: ImageInput,
    context?: { userId?: string; requestId?: string }
  ): Promise<ImageModerationResult> {
    const startTime = Date.now();

    try {
      // 构建审核提示
      const moderationPrompt = this.buildModerationPrompt();

      // 调用Vision模型
      const response = await this.adapter.analyzeImage(image, moderationPrompt, {
        maxTokens: 1024,
        temperature: 0.1 // 低温度以获得更确定的结果
      });

      // 解析审核结果
      const result = this.parseModerationResponse(response);

      // 应用严格模式调整
      if (this.config.strictMode) {
        result.isSafe = this.applyStrictMode(result);
      }

      return {
        ...result,
        processingTimeMs: Date.now() - startTime
      };
    } catch (error) {
      // 出错时保守处理（视为不安全）
      return {
        isSafe: false,
        violationType: 'spam',
        violationDetails: `Moderation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        confidenceScore: 0.5,
        categoryScores: {
          nsfw: 0,
          violence: 0,
          gore: 0,
          hate: 0,
          harassment: 0,
          selfHarm: 0,
          illegal: 0,
          privacy: 0,
          spam: 0.5
        },
        processingTimeMs: Date.now() - startTime
      };
    }
  }

  /**
   * 批量审核图像
   */
  async moderateBatch(
    images: ImageInput[],
    context?: { userId?: string; requestId?: string }
  ): Promise<ImageModerationResult[]> {
    const results: ImageModerationResult[] = [];

    // 限制并发数
    const concurrency = 3;
    for (let i = 0; i < images.length; i += concurrency) {
      const batch = images.slice(i, i + concurrency);
      const batchPromises = batch.map(image =>
        this.moderate(image, context).catch(error => {
          console.error('Batch moderation error:', error);
          return this.createErrorResult(error);
        })
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * 快速安全检查（仅返回是否安全）
   */
  async isSafe(image: ImageInput): Promise<boolean> {
    const result = await this.moderate(image);
    return result.isSafe;
  }

  /**
   * 获取特定违规类型的风险评分
   */
  async getViolationScore(
    image: ImageInput,
    violationType: ViolationType
  ): Promise<number> {
    const result = await this.moderate(image);
    return result.categoryScores[violationType as keyof typeof result.categoryScores] || 0;
  }

  /**
   * 更新阈值配置
   */
  updateThresholds(thresholds: Partial<Record<ViolationType, number>>): void {
    Object.entries(thresholds).forEach(([type, threshold]) => {
      if (threshold !== undefined && threshold >= 0 && threshold <= 1) {
        this.thresholds[type as ViolationType] = threshold;
      }
    });
  }

  /**
   * 构建审核提示
   */
  private buildModerationPrompt(): string {
    return `Analyze this image for safety and content policy compliance.

Please evaluate the image for the following violation categories and provide scores (0.0-1.0):

1. NSFW (Not Safe For Work): Adult, sexual, or explicit content
2. Violence: Physical violence, threats, or aggressive content
3. Gore: Blood, injuries, disturbing medical content
4. Hate: Hate speech, symbols, discriminatory content
5. Harassment: Bullying, targeted abuse, intimidation
6. Self-harm: Suicide, self-injury, eating disorders
7. Illegal: Criminal activity, drugs, weapons (in context)
8. Privacy: Personal information, doxxing, unauthorized faces
9. Spam: Low quality, repetitive, misleading content

Return results in JSON format:
{
  "isSafe": true/false,
  "violationType": "none/nsfw/violence/gore/hate/harassment/self_harm/illegal/privacy/spam",
  "violationDetails": "description if unsafe, empty if safe",
  "confidenceScore": 0.0-1.0,
  "categoryScores": {
    "nsfw": 0.0-1.0,
    "violence": 0.0-1.0,
    "gore": 0.0-1.0,
    "hate": 0.0-1.0,
    "harassment": 0.0-1.0,
    "selfHarm": 0.0-1.0,
    "illegal": 0.0-1.0,
    "privacy": 0.0-1.0,
    "spam": 0.0-1.0
  }
}

Be thorough but fair. Consider context and intent. When in doubt, err on the side of caution.`;
  }

  /**
   * 解析审核响应
   */
  private parseModerationResponse(response: string): ImageModerationResult {
    const defaultResult: ImageModerationResult = {
      isSafe: true,
      violationType: 'none',
      confidenceScore: 1.0,
      categoryScores: {
        nsfw: 0,
        violence: 0,
        gore: 0,
        hate: 0,
        harassment: 0,
        selfHarm: 0,
        illegal: 0,
        privacy: 0,
        spam: 0
      },
      processingTimeMs: 0
    };

    try {
      // 尝试提取JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return defaultResult;
      }

      const data = JSON.parse(jsonMatch[0]);

      // 映射字段名（处理可能的camelCase/snake_case差异）
      const categoryScores = {
        nsfw: this.extractScore(data, 'nsfw'),
        violence: this.extractScore(data, 'violence'),
        gore: this.extractScore(data, 'gore'),
        hate: this.extractScore(data, 'hate'),
        harassment: this.extractScore(data, 'harassment'),
        selfHarm: this.extractScore(data, 'selfHarm', 'self_harm'),
        illegal: this.extractScore(data, 'illegal'),
        privacy: this.extractScore(data, 'privacy'),
        spam: this.extractScore(data, 'spam')
      };

      // 确定违规类型
      let violationType: ViolationType = 'none';
      let highestScore = 0;

      for (const [type, score] of Object.entries(categoryScores)) {
        const threshold = this.thresholds[type as ViolationType];
        if (score > threshold && score > highestScore) {
          highestScore = score;
          violationType = type as ViolationType;
        }
      }

      const isSafe = violationType === 'none';

      return {
        isSafe,
        violationType,
        violationDetails: isSafe ? undefined : data.violationDetails || this.getDefaultViolationDescription(violationType),
        confidenceScore: Number(data.confidenceScore) || highestScore || 1.0,
        categoryScores,
        processingTimeMs: 0
      };
    } catch (error) {
      // 解析失败返回安全结果
      return defaultResult;
    }
  }

  /**
   * 提取评分值
   */
  private extractScore(data: any, ...fieldNames: string[]): number {
    const categoryScores = data.categoryScores || data.category_scores || {};

    for (const field of fieldNames) {
      const value = categoryScores[field];
      if (typeof value === 'number') {
        return Math.max(0, Math.min(1, value));
      }
    }

    return 0;
  }

  /**
   * 获取默认违规描述
   */
  private getDefaultViolationDescription(violationType: ViolationType): string {
    const descriptions: Record<ViolationType, string> = {
      none: '',
      nsfw: 'Detected adult or explicit content',
      violence: 'Detected violent content',
      gore: 'Detected graphic or disturbing content',
      hate: 'Detected hate speech or discriminatory content',
      harassment: 'Detected harassing or bullying content',
      self_harm: 'Detected self-harm related content',
      illegal: 'Detected potentially illegal content',
      privacy: 'Detected privacy concerns',
      spam: 'Detected low-quality or spam content'
    };

    return descriptions[violationType];
  }

  /**
   * 应用严格模式
   */
  private applyStrictMode(result: ImageModerationResult): boolean {
    // 严格模式下，任何类别超过阈值都视为不安全
    for (const [type, score] of Object.entries(result.categoryScores)) {
      const threshold = this.thresholds[type as ViolationType] * 0.8; // 降低阈值20%
      if (score > threshold) {
        return false;
      }
    }
    return true;
  }

  /**
   * 创建错误结果
   */
  private createErrorResult(error: Error): ImageModerationResult {
    return {
      isSafe: false,
      violationType: 'spam',
      violationDetails: `Moderation error: ${error.message}`,
      confidenceScore: 0.5,
      categoryScores: {
        nsfw: 0,
        violence: 0,
        gore: 0,
        hate: 0,
        harassment: 0,
        selfHarm: 0,
        illegal: 0,
        privacy: 0,
        spam: 0.5
      },
      processingTimeMs: 0
    };
  }
}
