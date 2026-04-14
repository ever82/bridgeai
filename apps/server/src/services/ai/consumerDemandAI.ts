/**
 * Consumer Demand AI Integration
 * 消费者需求 AI 提取集成
 *
 * 集成 AI002 的需求提炼服务，支持自然语言输入
 */

import {
  demandExtractionService,
  sceneDetector,
  AgentAdExtractor,
  DemandToL2Mapper,
  extractionValidator,
  clarificationService,
} from './index';
import { logger } from '../../utils/logger';
import {
  ExtractedDemandData,
  AgentAdRole,
  DemandUrgency,
} from '@visionshare/shared';

// Re-export types
export { ExtractedDemandData } from '@visionshare/shared';

/**
 * Extract consumer demand from natural language text
 * 从自然语言文本中提取消费者需求
 *
 * @param text 用户输入的自然语言文本
 * @param context 可选的上下文信息
 * @returns 提取的结构化需求数据
 */
export async function extractConsumerDemand(
  text: string,
  context?: {
    userId?: string;
    location?: { latitude: number; longitude: number };
    previousContext?: Record<string, any>;
  }
): Promise<ExtractedDemandData> {
  logger.info('Extracting consumer demand from text', { textLength: text.length });

  try {
    // Step 1: Use scene detector to confirm this is AgentAd scene
    const detectionResult = await sceneDetector.detectScene(text);

    if (detectionResult.scene !== 'agentad') {
      logger.warn('Scene detection did not identify agentad', {
        detectedScene: detectionResult.scene,
        confidence: detectionResult.confidence,
      });
    }

    // Step 2: Use AgentAdExtractor to extract specific entities
    const agentAdExtractor = new AgentAdExtractor();
    const extractionResult = await agentAdExtractor.extract(text, context);

    logger.info('AgentAd extraction completed', {
      confidence: extractionResult.confidence,
      entityCount: extractionResult.entities.length,
    });

    // Step 3: Map to consumer demand format
    const extractedData = mapToConsumerDemand(extractionResult, text);

    // Step 4: Validate extraction
    const validationResult = extractionValidator.validate(extractedData, {
      requiredFields: ['categories'],
      customRules: [
        {
          field: 'budget.min',
          validate: (value) => value === undefined || value >= 0,
          message: 'Budget minimum must be non-negative',
        },
        {
          field: 'budget.max',
          validate: (value, data) => {
            if (value === undefined) return true;
            const min = data.budget?.min;
            if (min !== undefined && value < min) return false;
            return value >= 0;
          },
          message: 'Budget maximum must be greater than or equal to minimum',
        },
      ],
    });

    if (!validationResult.valid) {
      logger.warn('Extraction validation found issues', {
        errors: validationResult.errors,
      });
    }

    return extractedData;
  } catch (error) {
    logger.error('Error extracting consumer demand', { error });
    throw error;
  }
}

/**
 * Map AgentAd extraction result to consumer demand format
 * 将 AgentAd 提取结果映射为消费者需求格式
 */
function mapToConsumerDemand(
  extractionResult: any,
  originalText: string
): ExtractedDemandData {
  const { structured, entities, confidence } = extractionResult;
  const result: ExtractedDemandData = {
    confidence,
    rawEntities: entities,
  };

  // Map categories from product/category entities
  if (structured.product?.category) {
    result.categories = mapCategoryToConsumerCategory(structured.product.category);
  }

  // Map budget
  if (structured.budget) {
    result.budget = {
      min: structured.budget.min,
      max: structured.budget.max,
      type: inferBudgetType(originalText),
    };
  }

  // Map brands
  if (structured.brandPreferences?.length > 0) {
    result.brands = {
      preferred: structured.brandPreferences,
      avoided: [], // Will be populated from negative sentiment detection
    };
  }

  // Map urgency from urgency/purchase timeline
  if (structured.urgency) {
    result.urgency = mapUrgency(structured.urgency);
  } else if (structured.purchaseTimeline) {
    result.urgency = mapTimelineToUrgency(structured.purchaseTimeline);
  }

  // Extract time constraints from text
  const timeConstraints = extractTimeConstraints(originalText);
  if (timeConstraints.length > 0) {
    result.timeline = {
      startDate: timeConstraints[0],
    };
  }

  // Extract location from text
  const locationInfo = extractLocationFromText(originalText);
  if (locationInfo) {
    result.location = locationInfo;
  }

  return result;
}

/**
 * Map product category to consumer category IDs
 * 将产品类别映射为消费者类别 ID
 */
function mapCategoryToConsumerCategory(productCategory: string): string[] {
  const categoryMap: Record<string, string[]> = {
    '手机': ['electronics', 'retail'],
    '电脑': ['electronics', 'retail'],
    '相机': ['electronics', 'retail'],
    '耳机': ['electronics', 'retail'],
    '手表': ['jewelry', 'retail'],
    '箱包': ['retail'],
    '鞋子': ['clothing', 'retail'],
    '服装': ['clothing', 'retail'],
    '美妆': ['beauty', 'retail'],
    '餐饮': ['food', 'restaurant'],
    '餐厅': ['food', 'restaurant'],
    '咖啡': ['cafe', 'food'],
    '酒店': ['hotel', 'travel'],
    '旅游': ['travel'],
    '健身': ['fitness', 'services'],
    '美容': ['beauty_salon', 'services'],
  };

  // Find matching categories
  for (const [key, value] of Object.entries(categoryMap)) {
    if (productCategory.includes(key)) {
      return value;
    }
  }

  // Default to retail if no match
  return ['retail'];
}

/**
 * Infer budget type from text
 * 从文本中推断预算类型
 */
function inferBudgetType(text: string): string {
  if (/每周|周预算|weekly/.test(text)) {
    return 'weekly';
  }
  if (/每月|月度|月预算|monthly/.test(text)) {
    return 'monthly';
  }
  if (/每年|年度|年预算|yearly/.test(text)) {
    return 'custom';
  }
  return 'single';
}

/**
 * Map urgency string to DemandUrgency
 * 映射紧急程度字符串
 */
function mapUrgency(urgency: string): DemandUrgency {
  switch (urgency) {
    case 'high':
      return DemandUrgency.URGENT;
    case 'medium':
      return DemandUrgency.MEDIUM;
    case 'low':
      return DemandUrgency.LOW;
    default:
      return DemandUrgency.MEDIUM;
  }
}

/**
 * Map purchase timeline to urgency
 * 将购买时间线映射为紧急程度
 */
function mapTimelineToUrgency(timeline: string): DemandUrgency {
  if (/立即|马上|立刻|今天|明天|急需/.test(timeline)) {
    return DemandUrgency.URGENT;
  }
  if (/这周|本周|近期/.test(timeline)) {
    return DemandUrgency.HIGH;
  }
  if (/下周|下个月|下月/.test(timeline)) {
    return DemandUrgency.MEDIUM;
  }
  if (/年底|明年|以后/.test(timeline)) {
    return DemandUrgency.LOW;
  }
  return DemandUrgency.FLEXIBLE;
}

/**
 * Extract time constraints from text
 * 从文本中提取时间约束
 */
function extractTimeConstraints(text: string): string[] {
  const constraints: string[] = [];

  // Weekend preference
  if (/周末|周六|周日|星期六|星期日/.test(text)) {
    constraints.push('weekend');
  }
  // Weekday preference
  else if (/工作日|周一|周二|周三|周四|周五/.test(text)) {
    constraints.push('weekday');
  }

  // Time of day
  if (/上午|早上/.test(text)) {
    constraints.push('morning');
  }
  if (/下午/.test(text)) {
    constraints.push('afternoon');
  }
  if (/晚上|夜间/.test(text)) {
    constraints.push('evening');
  }

  return constraints;
}

/**
 * Extract location information from text
 * 从文本中提取位置信息
 */
function extractLocationFromText(text: string): { city?: string; radius?: number } | undefined {
  // Common Chinese cities
  const cityPatterns = [
    /在(北京|上海|广州|深圳|杭州|成都|武汉|西安|南京|重庆)/,
    /(北京|上海|广州|深圳|杭州|成都|武汉|西安|南京|重庆)市?/,
    /附近|周边|周围/,
  ];

  for (const pattern of cityPatterns) {
    const match = text.match(pattern);
    if (match) {
      let city = match[1] || '当前城市';
      let radius = 5; // Default 5km

      // Check for distance specification
      const distanceMatch = text.match(/(\d+)\s*公里|(\d+)\s*km/i);
      if (distanceMatch) {
        radius = parseInt(distanceMatch[1] || distanceMatch[2], 10);
      }

      // Check for proximity keywords
      if (/附近|周边|周围|就近/.test(text)) {
        radius = Math.min(radius, 3); // Reduce radius for nearby searches
      }

      return { city, radius };
    }
  }

  return undefined;
}

/**
 * Check if clarification is needed based on extracted data
 * 检查是否需要澄清
 *
 * @param extractedData 提取的数据
 * @returns 是否需要澄清
 */
export function needsClarification(extractedData: ExtractedDemandData): boolean {
  // Check confidence threshold
  if (extractedData.confidence < 0.6) {
    return true;
  }

  // Check required fields
  if (!extractedData.categories || extractedData.categories.length === 0) {
    return true;
  }

  // Check if budget is missing
  if (!extractedData.budget || extractedData.budget.max === undefined) {
    return true;
  }

  return false;
}

/**
 * Generate clarification questions based on missing data
 * 生成澄清问题
 *
 * @param extractedData 提取的数据
 * @returns 问题列表
 */
export function generateClarificationQuestions(
  extractedData: ExtractedDemandData
): string[] {
  const questions: string[] = [];

  if (!extractedData.categories || extractedData.categories.length === 0) {
    questions.push('请问您想购买什么类型的商品或服务？');
  }

  if (!extractedData.budget || extractedData.budget.max === undefined) {
    questions.push('请问您的预算范围是多少？');
  }

  if (!extractedData.urgency) {
    questions.push('请问您的时间要求是怎样的？需要尽快找到吗？');
  }

  if (!extractedData.location?.city) {
    questions.push('请问您希望在哪个城市或区域寻找商家？');
  }

  return questions;
}

/**
 * Process natural language input for consumer demand
 * 处理消费者需求的自然语言输入
 *
 * This is the main entry point for AI integration
 * 这是 AI 集成的主要入口
 */
export async function processNaturalLanguageDemand(
  text: string,
  options?: {
    userId?: string;
    requireConfirmation?: boolean;
    previousContext?: Record<string, any>;
  }
): Promise<{
  extractedData: ExtractedDemandData;
  needsClarification: boolean;
  clarificationQuestions?: string[];
  summary: string;
}> {
  logger.info('Processing natural language demand', { textLength: text.length });

  // Extract demand data
  const extractedData = await extractConsumerDemand(text, {
    userId: options?.userId,
    previousContext: options?.previousContext,
  });

  // Check if clarification is needed
  const clarificationNeeded = needsClarification(extractedData);
  const clarificationQuestions = clarificationNeeded
    ? generateClarificationQuestions(extractedData)
    : undefined;

  // Generate summary
  const summary = generateDemandSummary(extractedData, text);

  return {
    extractedData,
    needsClarification: clarificationNeeded,
    clarificationQuestions,
    summary,
  };
}

/**
 * Generate a human-readable summary of the extracted demand
 * 生成提取需求的人类可读摘要
 */
function generateDemandSummary(
  extractedData: ExtractedDemandData,
  originalText: string
): string {
  const parts: string[] = [];

  if (extractedData.categories && extractedData.categories.length > 0) {
    parts.push(`类别：${extractedData.categories.join('、')}`);
  }

  if (extractedData.budget) {
    const budgetStr = extractedData.budget.max !== undefined
      ? `预算：${extractedData.budget.min || 0}-${extractedData.budget.max}元`
      : `预算：约${extractedData.budget.min}元`;
    parts.push(budgetStr);
  }

  if (extractedData.brands?.preferred && extractedData.brands.preferred.length > 0) {
    parts.push(`偏好品牌：${extractedData.brands.preferred.join('、')}`);
  }

  if (extractedData.urgency) {
    const urgencyLabels: Record<string, string> = {
      URGENT: '急需',
      HIGH: '高优先级',
      MEDIUM: '中等优先级',
      LOW: '低优先级',
      FLEXIBLE: '时间灵活',
    };
    parts.push(`紧急程度：${urgencyLabels[extractedData.urgency] || extractedData.urgency}`);
  }

  if (extractedData.location?.city) {
    parts.push(`位置：${extractedData.location.city}`);
  }

  if (parts.length === 0) {
    return '未能从输入中提取有效需求信息';
  }

  return parts.join('；');
}

// Export all functions
export default {
  extractConsumerDemand,
  needsClarification,
  generateClarificationQuestions,
  processNaturalLanguageDemand,
};
