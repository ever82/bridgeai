/**
 * VisionShare Demand Refinement Service
 * VisionShare需求智能提炼服务
 * 提供自然语言理解、关键信息提取、智能标签生成、质量评分和优化建议
 */

import type { DemandRefinementResult } from '@packages/shared/types/visionShare';

import { logger } from '../../utils/logger';

import { llmService } from './llmService';
import { metricsService } from './metricsService';
import { LLMProvider } from './types';

/**
 * VisionShare 需求提炼服务类
 */
export class VisionShareDemandRefinementService {
  private readonly logger = logger.child({ module: 'VisionShareDemandRefinement' });

  /**
   * 提炼需求描述
   * 解析自然语言描述，提取关键信息，生成结构化数据
   */
  async refineDemand(
    rawDescription: string,
    userId: string,
    options?: {
      provider?: LLMProvider;
      language?: string;
    }
  ): Promise<DemandRefinementResult> {
    const startTime = Date.now();
    const provider = options?.provider || 'claude';

    try {
      this.logger.info('Starting demand refinement', { userId, provider });

      // 构建提炼提示词
      const prompt = this.buildRefinementPrompt(rawDescription, options?.language);

      // 调用LLM服务
      const llmResponse = await llmService.complete(prompt, {
        provider,
        maxTokens: 2000,
        temperature: 0.3,
      });

      // 解析LLM响应
      const refinementResult = this.parseRefinementResponse(
        llmResponse.content,
        rawDescription
      );

      // 记录指标
      const duration = Date.now() - startTime;
      metricsService.recordLLMCall('visionshare_refinement', provider, duration, true);

      this.logger.info('Demand refinement completed', {
        userId,
        qualityScore: refinementResult.qualityScore,
        duration,
      });

      return refinementResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      metricsService.recordLLMCall('visionshare_refinement', provider, duration, false);
      this.logger.error('Demand refinement failed', { userId, error });

      // 返回降级结果
      return this.createFallbackResult(rawDescription);
    }
  }

  /**
   * 生成提炼提示词
   */
  private buildRefinementPrompt(description: string, language = 'zh'): string {
    const lang = language === 'zh' ? '中文' : 'English';

    return `你是一个专业的需求分析助手。请分析以下VisionShare任务描述，提取关键信息并生成优化后的内容。

原始描述：
"""${description}"""

请按以下JSON格式输出分析结果（使用${lang}）：

{
  "refinedDescription": "优化后的描述（更清晰、具体、吸引人）",
  "extractedInfo": {
    "location": "提取的地点信息",
    "timeRange": {
      "start": "开始时间（ISO格式）",
      "end": "结束时间（ISO格式）"
    },
    "budget": {
      "min": "最低预算（数字）",
      "max": "最高预算（数字）",
      "currency": "货币类型（CNY/USD等）"
    },
    "category": "任务分类"
  },
  "generatedTags": ["标签1", "标签2", "标签3", "标签4", "标签5"],
  "qualityScore": "质量评分（0-100的数字）",
  "suggestions": ["改进建议1", "改进建议2", "改进建议3"]
}

注意事项：
1. 如果原始描述缺少某些信息，对应字段可以为null
2. 生成的标签应该准确反映任务类型和特点
3. 质量评分基于描述的完整性、清晰度和具体性
4. 改进建议应该具体且可操作`;
  }

  /**
   * 解析LLM响应
   */
  private parseRefinementResponse(
    response: string,
    rawDescription: string
  ): DemandRefinementResult {
    try {
      // 提取JSON部分
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        refinedDescription: parsed.refinedDescription || this.optimizeDescription(rawDescription),
        extractedInfo: {
          location: parsed.extractedInfo?.location || undefined,
          timeRange: parsed.extractedInfo?.timeRange
            ? {
                start: parsed.extractedInfo.timeRange.start
                  ? new Date(parsed.extractedInfo.timeRange.start)
                  : undefined,
                end: parsed.extractedInfo.timeRange.end
                  ? new Date(parsed.extractedInfo.timeRange.end)
                  : undefined,
              }
            : undefined,
          budget: parsed.extractedInfo?.budget
            ? {
                min: typeof parsed.extractedInfo.budget.min === 'number'
                  ? parsed.extractedInfo.budget.min
                  : undefined,
                max: typeof parsed.extractedInfo.budget.max === 'number'
                  ? parsed.extractedInfo.budget.max
                  : undefined,
                currency: parsed.extractedInfo.budget.currency || undefined,
              }
            : undefined,
          category: parsed.extractedInfo?.category || undefined,
        },
        generatedTags: Array.isArray(parsed.generatedTags) ? parsed.generatedTags : [],
        qualityScore: typeof parsed.qualityScore === 'number' ? parsed.qualityScore : 50,
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      };
    } catch (error) {
      this.logger.warn('Failed to parse refinement response, using fallback', { error });
      return this.createFallbackResult(rawDescription);
    }
  }

  /**
   * 生成降级结果
   */
  private createFallbackResult(rawDescription: string): DemandRefinementResult {
    return {
      refinedDescription: this.optimizeDescription(rawDescription),
      extractedInfo: {},
      generatedTags: this.extractBasicTags(rawDescription),
      qualityScore: 50,
      suggestions: [
        '建议添加更具体的地点信息',
        '建议明确时间要求',
        '建议提供更详细的任务描述',
      ],
    };
  }

  /**
   * 基础描述优化
   */
  private optimizeDescription(description: string): string {
    // 清理和格式化描述
    let optimized = description.trim();

    // 确保句末有标点
    if (!/[。.！!？?]$/.test(optimized)) {
      optimized += '。';
    }

    // 首字母大写（英文）或保持中文
    return optimized;
  }

  /**
   * 提取基础标签
   */
  private extractBasicTags(description: string): string[] {
    const tags: string[] = [];
    const keywords = [
      { pattern: /拍照|摄影|photo|picture/i, tag: '摄影' },
      { pattern: /视频|video|录像/i, tag: '视频' },
      { pattern: /直播|live/i, tag: '直播' },
      { pattern: /风景|风景照|landscape/i, tag: '风景' },
      { pattern: /人像|portrait|人物/i, tag: '人像' },
      { pattern: /美食|food/i, tag: '美食' },
      { pattern: /街拍|street/i, tag: '街拍' },
      { pattern: /夜景|night/i, tag: '夜景' },
      { pattern: /建筑|architecture/i, tag: '建筑' },
      { pattern: /自然|nature/i, tag: '自然' },
    ];

    for (const { pattern, tag } of keywords) {
      if (pattern.test(description) && !tags.includes(tag)) {
        tags.push(tag);
      }
    }

    // 如果没有任何标签，添加一个通用标签
    if (tags.length === 0) {
      tags.push('摄影');
    }

    return tags.slice(0, 5); // 最多5个标签
  }

  /**
   * 分析需求质量
   */
  analyzeQuality(description: string): number {
    let score = 50; // 基础分

    // 长度评分 (0-20)
    const length = description.length;
    if (length >= 50 && length <= 200) {
      score += 20;
    } else if (length >= 30 && length < 50) {
      score += 10;
    } else if (length > 200) {
      score += 15;
    }

    // 包含关键信息 (+5 each, max 20)
    const keywords = [
      /地点|位置|地方|location|place|where/i,
      /时间|时候|几点|when|time/i,
      /预算|价格|多少钱|budget|price|cost/i,
      /要求|需求|需要|requirement|need/i,
    ];

    for (const pattern of keywords) {
      if (pattern.test(description)) {
        score += 5;
      }
    }

    // 清晰度评分 (0-10)
    if (/[!！。，,;；]/.test(description)) {
      score += 10;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * 生成智能标签
   */
  async generateTags(
    description: string,
    category?: string,
    options?: { provider?: LLMProvider }
  ): Promise<string[]> {
    const provider = options?.provider || 'claude';

    try {
      const prompt = `请为以下任务描述生成5个最相关的标签（JSON数组格式）：

"""${description}"""

${category ? `任务分类: ${category}` : ''}

要求：
1. 每个标签2-4个字
2. 标签应该准确反映任务特点
3. 返回格式: ["标签1", "标签2", "标签3", "标签4", "标签5"]`;

      const response = await llmService.complete(prompt, {
        provider,
        maxTokens: 200,
        temperature: 0.3,
      });

      const match = response.content.match(/\[[\s\S]*\]/);
      if (match) {
        const tags = JSON.parse(match[0]);
        if (Array.isArray(tags) && tags.length > 0) {
          return tags.slice(0, 5);
        }
      }
    } catch (error) {
      this.logger.warn('Failed to generate tags', { error });
    }

    return this.extractBasicTags(description);
  }
}

// 导出单例实例
export const visionShareDemandRefinementService = new VisionShareDemandRefinementService();
