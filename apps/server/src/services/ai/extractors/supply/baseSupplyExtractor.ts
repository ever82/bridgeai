/**
 * Base Supply Extractor
 * 供给提取器基类 - 供给方(服务提供者)信息提取的通用实现
 */

import { logger } from '../../../../utils/logger';

import {
  SupplyExtractor,
  SupplyExtractedData,
  SupplySceneType,
  SupplyQualification,
  QualificationLevel,
  SupplyQualityMetrics,
} from './types';

/**
 * Base class for supply-specific extractors
 */
export abstract class BaseSupplyExtractor<T extends SupplyExtractedData>
  implements SupplyExtractor<T>
{
  abstract getSceneType(): SupplySceneType;

  /** 场景检测关键词 */
  protected abstract readonly detectionKeywords: string[];

  /** 必填字段 */
  protected abstract readonly requiredFields: string[];

  /** 可选字段 */
  protected abstract readonly optionalFields: string[];

  /**
   * 从文本提取供给信息 - 子类必须实现
   */
  abstract extract(text: string, context?: Record<string, any>): Promise<T>;

  /**
   * 检查是否可以处理该文本
   */
  async canHandle(text: string): Promise<{ canHandle: boolean; confidence: number }> {
    const lowerText = text.toLowerCase();
    let matchCount = 0;

    for (const keyword of this.detectionKeywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        matchCount++;
      }
    }

    const confidence = matchCount > 0
      ? Math.min(matchCount / Math.max(this.detectionKeywords.length * 0.2, 1), 1)
      : 0;

    return {
      canHandle: confidence > 0.2,
      confidence,
    };
  }

  getRequiredFields(): string[] {
    return this.requiredFields;
  }

  getOptionalFields(): string[] {
    return this.optionalFields;
  }

  /**
   * 验证提取结果
   */
  validate(data: T): { valid: boolean; missingFields: string[] } {
    const missingFields: string[] = [];

    for (const field of this.requiredFields) {
      if (!this.hasField(data as unknown as Record<string, any>, field)) {
        missingFields.push(field);
      }
    }

    return {
      valid: missingFields.length === 0,
      missingFields,
    };
  }

  /**
   * 生成澄清问题
   */
  generateClarificationQuestions(missingFields: string[]): string[] {
    return missingFields.map(field => this.getClarificationQuestion(field));
  }

  /**
   * 解析资质等级
   */
  protected parseQualificationLevel(text: string): QualificationLevel {
    if (/大师|顶级|资深|首席|专家|专家级/.test(text)) {
      return 'master';
    }
    if (/高级|资深|丰富经验|多年|专业/.test(text)) {
      return 'expert';
    }
    if (/中级|熟练|有经验/.test(text)) {
      return 'advanced';
    }
    if (/初级|入门|新手|刚入行/.test(text)) {
      return 'beginner';
    }
    return 'intermediate';
  }

  /**
   * 解析经验年限
   */
  protected parseExperienceYears(text: string): number {
    const yearsMatch = text.match(/(\d+)\s*年\s*(?:工作|从业|拍摄|经验|经历)/);
    if (yearsMatch) {
      return parseInt(yearsMatch[1], 10);
    }
    // Also: "5年+" pattern
    const plusMatch = text.match(/(\d+)\s*年\+/);
    if (plusMatch) {
      return parseInt(plusMatch[1], 10);
    }
    return 0;
  }

  /**
   * 构建资质信息
   */
  protected buildQualification(
    text: string,
    certifications: string[],
    specializations: string[],
  ): SupplyQualification {
    const years = this.parseExperienceYears(text);
    const level = this.parseQualificationLevel(text);

    return {
      certifications,
      experienceYears: years,
      level,
      specializations,
    };
  }

  /**
   * 计算质量指标
   */
  protected calculateQualityMetrics(
    extractedFields: number,
    totalFields: number,
    hasPricing: boolean,
    hasPortfolio: boolean,
  ): SupplyQualityMetrics {
    const completeness = totalFields > 0 ? extractedFields / totalFields : 0;
    const credibility = (hasPricing ? 0.3 : 0) + (hasPortfolio ? 0.3 : 0) + (completeness > 0.6 ? 0.4 : completeness * 0.4 / 0.6);
    const competitiveness = completeness * 0.5 + credibility * 0.5;

    return {
      completeness: Math.min(Math.round(completeness * 100) / 100, 1),
      credibility: Math.min(Math.round(credibility * 100) / 100, 1),
      competitiveness: Math.min(Math.round(competitiveness * 100) / 100, 1),
    };
  }

  /**
   * 检查字段是否存在
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

    if (current == null) return false;
    if (typeof current === 'string' && current.trim() === '') return false;
    if (Array.isArray(current) && current.length === 0) return false;
    if (typeof current === 'object' && !Array.isArray(current) && Object.keys(current).length === 0) return false;

    return true;
  }

  /**
   * 获取澄清问题 - 子类可覆盖
   */
  protected getClarificationQuestion(field: string): string {
    const questionMap: Record<string, string> = {
      'equipment': '请问您使用什么摄影设备？',
      'experience': '请问您有多少年的从业经验？',
      'style': '请问您的拍摄风格是什么？',
      'skills': '请列举您的核心技能。',
      'pricing': '请问您的服务定价是多少？',
      'products': '请问您提供哪些产品或服务？',
      'qualification': '请问您有哪些相关资质或认证？',
    };

    for (const [key, question] of Object.entries(questionMap)) {
      if (field.includes(key) || key.includes(field)) {
        return question;
      }
    }

    return `请提供关于 "${field}" 的更多信息`;
  }

  /**
   * 提取关键词
   */
  protected extractKeywords(text: string): string[] {
    const keywords: string[] = [];
    const lowerText = text.toLowerCase();

    for (const keyword of this.detectionKeywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        keywords.push(keyword);
      }
    }

    return Array.from(new Set(keywords));
  }

  /**
   * 解析价格区间
   */
  protected parsePricing(text: string): { min: number; max: number; currency: string } | undefined {
    const currency = text.includes('$') || text.includes('USD') ? 'USD' : 'CNY';

    // Range with K suffix: 15K-25K, 15k~25k
    const kRangeMatch = text.match(/(\d+)\s*[Kk千]\s*[-~到至]\s*(\d+)\s*[Kk千]/);
    if (kRangeMatch) {
      return {
        min: parseInt(kRangeMatch[1], 10) * 1000,
        max: parseInt(kRangeMatch[2], 10) * 1000,
        currency,
      };
    }

    // Range: 1000-3000元, 1000~3000, 1000到3000
    const rangeMatch = text.match(/(\d+)\s*[-~到至]\s*(\d+)\s*[元块￥$]?/);
    if (rangeMatch) {
      return {
        min: parseInt(rangeMatch[1], 10),
        max: parseInt(rangeMatch[2], 10),
        currency,
      };
    }

    // Single value with K: 20K
    const kSingleMatch = text.match(/(\d+)\s*[Kk千]/);
    if (kSingleMatch) {
      const value = parseInt(kSingleMatch[1], 10) * 1000;
      return {
        min: value,
        max: value,
        currency,
      };
    }

    // Starting from: 起、起价
    const startMatch = text.match(/(\d+)\s*[元块￥$]?\s*起/);
    if (startMatch) {
      return {
        min: parseInt(startMatch[1], 10),
        max: parseInt(startMatch[1], 10) * 2,
        currency,
      };
    }

    // Single value with context
    const singleMatch = text.match(/(?:收费|价格|定价|报价)\s*[约大概]?\s*(\d+)/);
    if (singleMatch) {
      return {
        min: parseInt(singleMatch[1], 10),
        max: parseInt(singleMatch[1], 10),
        currency,
      };
    }

    return undefined;
  }

  /**
   * 解析位置信息
   */
  protected parseLocation(text: string): { city?: string; district?: string } {
    const result: { city?: string; district?: string } = {};

    // Match city patterns with or without 市 suffix
    const cityMatch = text.match(/([\u4e00-\u9fa5]{2,5}(?:市|自治州|地区))/);
    if (cityMatch) {
      result.city = cityMatch[1];
    } else {
      // Try matching known city names without suffix
      const knownCities = [
        '北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '南京',
        '重庆', '西安', '苏州', '天津', '长沙', '郑州', '东莞', '青岛',
      ];
      for (const city of knownCities) {
        if (text.includes(city)) {
          result.city = city + '市';
          break;
        }
      }
    }

    const districtMatch = text.match(/([\u4e00-\u9fa5]{2,5}(?:区|县|镇))/);
    if (districtMatch) {
      result.district = districtMatch[1];
    }

    return result;
  }
}
