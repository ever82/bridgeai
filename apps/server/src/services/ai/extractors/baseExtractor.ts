/**
 * Base Scene Extractor
 * 场景提取器基类
 */

import { logger } from '../../../utils/logger';

import {
  SceneSpecificExtractor,
  SceneType,
  SceneExtractedData,
  SceneExtractedEntity,
} from './types';

/**
 * Base class for scene-specific extractors
 */
export abstract class BaseSceneExtractor<
  T extends SceneExtractedData,
> implements SceneSpecificExtractor<T> {
  abstract readonly sceneType: SceneType;

  // Scene-specific keywords for detection
  protected abstract readonly detectionKeywords: string[];

  // Required fields for this scene
  protected abstract readonly requiredFields: string[];

  // Optional fields for this scene
  protected abstract readonly optionalFields: string[];

  /**
   * Extract scene-specific data from text
   * Must be implemented by subclasses
   */
  abstract extract(text: string, context?: Record<string, any>): Promise<T>;

  /**
   * Check if this extractor can handle the given text
   */
  async canHandle(text: string): Promise<{ canHandle: boolean; confidence: number }> {
    const lowerText = text.toLowerCase();
    let matchCount = 0;
    const matchedKeywords: string[] = [];

    for (const keyword of this.detectionKeywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        matchCount++;
        matchedKeywords.push(keyword);
      }
    }

    const confidence =
      matchCount > 0
        ? Math.min(
            Math.max(
              matchCount * 0.4,
              matchCount / Math.max(this.detectionKeywords.length * 0.3, 1)
            ),
            1
          )
        : 0;

    logger.debug('Scene detection check', {
      sceneType: this.sceneType,
      matchCount,
      confidence,
      matchedKeywords,
    });

    return {
      canHandle: confidence > 0.15,
      confidence,
    };
  }

  /**
   * Get required fields for this scene
   */
  getRequiredFields(): string[] {
    return this.requiredFields;
  }

  /**
   * Get detection keywords for this scene
   */
  getDetectionKeywords(): string[] {
    return this.detectionKeywords;
  }

  /**
   * Get optional fields for this scene
   */
  getOptionalFields(): string[] {
    return this.optionalFields;
  }

  /**
   * Validate extracted data
   */
  validate(data: T): { valid: boolean; missingFields: string[] } {
    const missingFields: string[] = [];

    for (const field of this.requiredFields) {
      if (!this.hasField(data.structured, field)) {
        missingFields.push(field);
      }
    }

    return {
      valid: missingFields.length === 0,
      missingFields,
    };
  }

  /**
   * Generate clarification questions for missing fields
   */
  generateClarificationQuestions(missingFields: string[]): string[] {
    return missingFields.map(field => this.getClarificationQuestion(field));
  }

  /**
   * Check if a field exists in the structured data
   */
  protected hasField(obj: Record<string, any>, field: string): boolean {
    const parts = field.split('.');
    let current: any = obj;

    for (const part of parts) {
      if (current == null || !(part in current)) {
        return false;
      }
      current = current[part];
    }

    // Check if the value is meaningful
    if (current == null) return false;
    if (typeof current === 'string' && current.trim() === '') return false;
    if (Array.isArray(current) && current.length === 0) return false;
    if (typeof current === 'object' && Object.keys(current).length === 0) return false;

    return true;
  }

  /**
   * Get clarification question for a specific field
   * Can be overridden by subclasses for scene-specific questions
   */
  protected getClarificationQuestion(field: string): string {
    const questionMap: Record<string, string> = {
      photographyTime: '请问您希望在什么时间拍摄？',
      photographyType: '请问您需要什么摄影类型的服务？',
      budget: '请问您的预算范围是多少？',
      location: '请问拍摄地点在哪里？',
      partnerPreferences: '请问您对理想伴侣有什么要求？',
      interests: '请问您有什么兴趣爱好？',
      dateTime: '请问您希望在什么时间见面？',
      skills: '请问您具备哪些技能？',
      experience: '请问您有多少年工作经验？',
      salaryExpectation: '请问您的薪资期望是多少？',
      jobType: '请问您希望找什么类型的工作？',
      product: '请问您想购买什么商品？',
      brandPreferences: '请问您对品牌有什么偏好吗？',
      urgency: '请问您的需求有多紧急？',
    };

    // Try to find exact match first
    if (questionMap[field]) {
      return questionMap[field];
    }

    // Try to find partial match
    for (const [key, question] of Object.entries(questionMap)) {
      if (field.includes(key) || key.includes(field)) {
        return question;
      }
    }

    return `请提供关于 "${field}" 的更多信息`;
  }

  /**
   * Extract entities from text using regex patterns
   */
  protected extractEntitiesWithPatterns(
    text: string,
    patterns: Record<string, RegExp[]>
  ): SceneExtractedEntity[] {
    const entities: SceneExtractedEntity[] = [];

    for (const [type, regexes] of Object.entries(patterns)) {
      for (const regex of regexes) {
        const matches = Array.from(text.matchAll(regex));
        for (const match of matches) {
          entities.push({
            type: type as any,
            value: match[0],
            normalizedValue: match[1] || match[0],
            startIndex: match.index || 0,
            endIndex: (match.index || 0) + match[0].length,
            confidence: 0.8,
          });
        }
      }
    }

    return entities;
  }

  /**
   * Parse budget from text
   */
  protected parseBudget(
    text: string
  ): { min?: number; max?: number; currency: string } | undefined {
    const currency = text.includes('$') || text.includes('USD') ? 'USD' : 'CNY';

    // Range pattern: 1000-2000, 1000~2000, 1000到2000
    const rangeMatch = text.match(/(\d+)\s*[-~到至]\s*(\d+)/);
    if (rangeMatch) {
      return {
        min: parseInt(rangeMatch[1], 10),
        max: parseInt(rangeMatch[2], 10),
        currency,
      };
    }

    // Single value with budget keywords
    const budgetMatch = text.match(/预算\s*[约大概]?\s*(\d+)/);
    if (budgetMatch) {
      return {
        max: parseInt(budgetMatch[1], 10),
        currency,
      };
    }

    // General number pattern
    const numberMatch = text.match(/(\d+)\s*[元块￥$]/);
    if (numberMatch) {
      return {
        max: parseInt(numberMatch[1], 10),
        currency,
      };
    }

    return undefined;
  }

  /**
   * Parse location from text
   */
  protected parseLocation(text: string): { city?: string; district?: string; address?: string } {
    const result: { city?: string; district?: string; address?: string } = {};

    // Match city patterns
    const cityMatch = text.match(/([\u4e00-\u9fa5]{2,5}(?:市|自治州|地区))/);
    if (cityMatch) {
      result.city = cityMatch[1];
    }

    // Match district patterns
    const districtMatch = text.match(/([\u4e00-\u9fa5]{2,5}(?:区|县|镇))/);
    if (districtMatch) {
      result.district = districtMatch[1];
    }

    // Match address patterns (longer text with numbers)
    const addressMatch = text.match(/([\u4e00-\u9fa5]{5,}(?:路|街|道|巷)\s*\d+[号栋室]?)/);
    if (addressMatch) {
      result.address = addressMatch[1];
    }

    return result;
  }

  /**
   * Parse time information from text
   */
  protected parseTime(text: string): {
    date?: string;
    timeRange?: string;
    flexibility?: 'strict' | 'flexible' | 'anytime';
  } {
    const result: {
      date?: string;
      timeRange?: string;
      flexibility?: 'strict' | 'flexible' | 'anytime';
    } = {};

    // Date pattern: 2024-01-01, 2024年1月1日
    const dateMatch = text.match(/(\d{4}[-/年]\d{1,2}[-/月]\d{1,2})/);
    if (dateMatch) {
      result.date = dateMatch[1].replace(/[年月]/g, '-').replace(/日/, '');
    }

    // Time of day patterns
    if (/早上|上午|早晨/.test(text)) {
      result.timeRange = 'morning';
    } else if (/下午|中午/.test(text)) {
      result.timeRange = 'afternoon';
    } else if (/晚上|傍晚|夜间/.test(text)) {
      result.timeRange = 'evening';
    } else if (/半夜|凌晨/.test(text)) {
      result.timeRange = 'night';
    }

    // Flexibility patterns
    if (/随时|都可以|任意时间/.test(text)) {
      result.flexibility = 'anytime';
    } else if (/左右|前后|大概|大约/.test(text)) {
      result.flexibility = 'flexible';
    } else if (/必须|一定|准时/.test(text)) {
      result.flexibility = 'strict';
    }

    return result;
  }
}
