/**
 * AgentAd Scene Extractor
 * AgentAd场景提取器 - 广告商品需求
 */

import { logger } from '../../../utils/logger';

import { BaseSceneExtractor } from './baseExtractor';
import { AgentAdData, SceneType, SceneExtractedEntity } from './types';

/**
 * AgentAd Extractor - Handles product advertisement and shopping demands
 */
export class AgentAdExtractor extends BaseSceneExtractor<AgentAdData> {
  readonly sceneType: SceneType = 'agentad';

  protected readonly detectionKeywords = [
    '商品', '购买', '买', '卖', '购物',
    'product', 'buy', 'purchase', 'shop', 'shopping',
    '品牌', '预算', '价格', '多少钱', '优惠',
    '淘宝', '京东', '拼多多', '天猫', '亚马逊',
    '推荐', '想买', '需要', '找', '求购',
  ];

  protected readonly requiredFields = [
    'product',
  ];

  protected readonly optionalFields = [
    'budget',
    'brandPreferences',
    'platform',
    'requirements',
    'urgency',
    'purchaseTimeline',
  ];

  /**
   * Extract AgentAd-specific data from text
   */
  async extract(text: string, _context?: Record<string, any>): Promise<AgentAdData> {
    logger.info('Extracting AgentAd demand', { textLength: text.length });

    const entities = this.extractAgentAdEntities(text);
    const structured = this.buildStructuredData(text, entities);

    const data: AgentAdData = {
      scene: 'agentad',
      entities,
      structured,
      confidence: this.calculateConfidence(entities, structured),
    };

    logger.info('AgentAd extraction completed', {
      confidence: data.confidence,
      entityCount: entities.length,
    });

    return data;
  }

  /**
   * Extract entities specific to AgentAd scene
   */
  private extractAgentAdEntities(text: string): SceneExtractedEntity[] {
    const patterns: Record<string, RegExp[]> = {
      product: [
        /(手机|电脑|相机|耳机|手表|包包|鞋子|衣服)/g,
        /([\u4e00-\u9fa5]{2,8})(?:手机|电脑|相机|耳机)/g,
      ],
      brand: [
        /(Apple|iPhone|Samsung|华为|小米|OPPO|vivo)/gi,
        /(Nike|Adidas|优衣库|Zara|H&M)/gi,
        /(索尼|佳能|尼康|富士)/g,
      ],
      budget: [
        /预算\s*[约大概]?\s*(\d+)/g,
        /(\d+)\s*[-~到至]\s*(\d+)\s*[元块￥$]/g,
        /(\d+)\s*[元块￥$]/g,
      ],
      platform: [
        /(淘宝|天猫|京东|拼多多|亚马逊|苏宁)/g,
      ],
      urgency: [
        /(急|紧急|马上|立刻|尽快)/g,
        /(不急|可以等|慢慢)/g,
      ],
    };

    return this.extractEntitiesWithPatterns(text, patterns);
  }

  /**
   * Build structured AgentAd data from entities
   */
  private buildStructuredData(text: string, entities: SceneExtractedEntity[]): AgentAdData['structured'] {
    const structured: AgentAdData['structured'] = {};

    // Extract product info
    structured.product = this.extractProductInfo(text, entities);

    // Extract budget
    structured.budget = this.parseBudget(text);

    // Extract brand preferences
    structured.brandPreferences = this.extractBrandPreferences(text, entities);

    // Extract platform
    structured.platform = this.extractPlatform(text, entities);

    // Extract requirements
    structured.requirements = this.extractRequirements(text);

    // Extract urgency
    structured.urgency = this.extractUrgency(text);

    // Extract purchase timeline
    structured.purchaseTimeline = this.extractPurchaseTimeline(text);

    return structured;
  }

  /**
   * Extract product information from text
   */
  private extractProductInfo(text: string, entities: SceneExtractedEntity[]): AgentAdData['structured']['product'] {
    const product: AgentAdData['structured']['product'] = {};

    // Extract product name
    const productPatterns = [
      { pattern: /iPhone\s*(\d+)/i, name: (m: string[]) => `iPhone ${m[1]}` },
      { pattern: /小米\s*(\d+)/, name: (m: string[]) => `小米${m[1]}` },
      { pattern: /华为\s*([\u4e00-\u9fa5\w]+)/, name: (m: string[]) => `华为${m[1]}` },
      { pattern: /MacBook\s*(Pro|Air)?/i, name: (m: string[]) => `MacBook${m[1] ? ' ' + m[1] : ''}` },
    ];

    for (const { pattern, name } of productPatterns) {
      const match = text.match(pattern);
      if (match) {
        product.name = name(match);
        break;
      }
    }

    // If no specific name found, try to extract generic product
    if (!product.name) {
      const genericMatch = text.match(/(?:买|购买|求购|想要)\s*([\u4e00-\u9fa5\w\s]{2,20})/);
      if (genericMatch) {
        product.name = genericMatch[1].trim();
      }
    }

    // Extract category
    const categories = [
      { pattern: /手机|Phone/i, category: '手机' },
      { pattern: /电脑|笔记本|laptop/i, category: '电脑' },
      { pattern: /相机|camera/i, category: '相机' },
      { pattern: /耳机|earphone/i, category: '耳机' },
      { pattern: /手表|watch/i, category: '手表' },
      { pattern: /包包|bag/i, category: '箱包' },
      { pattern: /鞋子|鞋|shoes/i, category: '鞋子' },
      { pattern: /衣服|服装|clothes/i, category: '服装' },
    ];

    for (const { pattern, category } of categories) {
      if (pattern.test(text)) {
        product.category = category;
        break;
      }
    }

    // Extract description
    const descMatch = text.match(/(?:要求|需要|想要)\s*([^，。]{10,100})/);
    if (descMatch) {
      product.description = descMatch[1];
    }

    // Extract condition
    if (/全新|new|未拆封/.test(text)) {
      product.condition = 'new';
    } else if (/二手|used|旧| refurbished|翻新/.test(text)) {
      product.condition = 'used';
    } else if (/官方翻新|官翻/.test(text)) {
      product.condition = 'refurbished';
    }

    return product;
  }

  /**
   * Extract brand preferences from text
   */
  private extractBrandPreferences(text: string, entities: SceneExtractedEntity[]): string[] {
    const brands: string[] = [];

    const brandPatterns = [
      { pattern: /Apple|iPhone|iPad|Mac|苹果/, brand: 'Apple' },
      { pattern: /Samsung|三星/, brand: 'Samsung' },
      { pattern: /华为|Huawei/, brand: '华为' },
      { pattern: /小米|Xiaomi|红米|Redmi/, brand: '小米' },
      { pattern: /OPPO|欧珀/, brand: 'OPPO' },
      { pattern: /vivo/, brand: 'vivo' },
      { pattern: /索尼|Sony/, brand: '索尼' },
      { pattern: /佳能|Canon/, brand: '佳能' },
      { pattern: /尼康|Nikon/, brand: '尼康' },
      { pattern: /富士|Fujifilm/, brand: '富士' },
      { pattern: /Nike|耐克/, brand: 'Nike' },
      { pattern: /Adidas|阿迪达斯/, brand: 'Adidas' },
      { pattern: /优衣库|Uniqlo/, brand: '优衣库' },
      { pattern: /Zara/, brand: 'Zara' },
      { pattern: /H&M/, brand: 'H&M' },
    ];

    for (const { pattern, brand } of brandPatterns) {
      if (pattern.test(text) && !brands.includes(brand)) {
        brands.push(brand);
      }
    }

    // Extract from entities
    for (const entity of entities) {
      if (entity.type === 'brand' && !brands.includes(entity.value)) {
        brands.push(entity.value);
      }
    }

    return brands;
  }

  /**
   * Extract platform preferences from text
   */
  private extractPlatform(text: string, _entities: SceneExtractedEntity[]): string[] {
    const platforms: string[] = [];

    const platformPatterns = [
      { pattern: /淘宝|天猫/, platform: '淘宝/天猫' },
      { pattern: /京东|JD/, platform: '京东' },
      { pattern: /拼多多|PDD/, platform: '拼多多' },
      { pattern: /亚马逊|Amazon/, platform: '亚马逊' },
      { pattern: /苏宁/, platform: '苏宁易购' },
      { pattern: /闲鱼|二手/, platform: '闲鱼' },
    ];

    for (const { pattern, platform } of platformPatterns) {
      if (pattern.test(text) && !platforms.includes(platform)) {
        platforms.push(platform);
      }
    }

    return platforms;
  }

  /**
   * Extract requirements from text
   */
  private extractRequirements(text: string): string[] {
    const requirements: string[] = [];

    // Condition requirements
    if (/全新|未拆封/.test(text)) {
      requirements.push('全新正品');
    }
    if (/正品|官方|官网|旗舰店/.test(text)) {
      requirements.push('官方正品');
    }
    if (/保修|质保/.test(text)) {
      requirements.push('有保修');
    }
    if (/发票/.test(text)) {
      requirements.push('提供发票');
    }
    if (/包邮|免邮|运费/.test(text)) {
      requirements.push('包邮');
    }
    if (/7天|退换|退货/.test(text)) {
      requirements.push('支持7天退换');
    }

    return requirements;
  }

  /**
   * Extract urgency level from text
   */
  private extractUrgency(text: string): AgentAdData['structured']['urgency'] {
    // Check negative urgency first (higher priority)
    if (/不急|可以等|慢慢|不着急|以后再说/.test(text)) {
      return 'low';
    }
    if (/急|紧急|马上|立刻|尽快|急需|急用/.test(text)) {
      return 'high';
    }
    return 'medium';
  }

  /**
   * Extract purchase timeline from text
   */
  private extractPurchaseTimeline(text: string): string | undefined {
    const patterns = [
      { pattern: /马上|立刻|现在|今天|明天/, timeline: '立即' },
      { pattern: /这周|本周/, timeline: '本周内' },
      { pattern: /下周|下个月|下个月|下月/, timeline: '下月' },
      { pattern: /双11|双十一/, timeline: '双十一' },
      { pattern: /双12|双十二/, timeline: '双十二' },
      { pattern: /618/, timeline: '618购物节' },
      { pattern: /年底|年终/, timeline: '年底' },
      { pattern: /年后|明年/, timeline: '年后' },
    ];

    for (const { pattern, timeline } of patterns) {
      if (pattern.test(text)) {
        return timeline;
      }
    }

    return undefined;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(entities: SceneExtractedEntity[], structured: AgentAdData['structured']): number {
    let score = 0.4; // Base score

    // +0.3 for having product info
    if (structured.product?.name || structured.product?.category) {
      score += 0.3;
    }

    // +0.1 for having budget
    if (structured.budget?.min || structured.budget?.max) {
      score += 0.1;
    }

    // +0.1 for having brand preferences
    if (structured.brandPreferences && structured.brandPreferences.length > 0) {
      score += 0.1;
    }

    // +0.1 for having platform preferences
    if (structured.platform && structured.platform.length > 0) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Override get clarification question for AgentAd-specific fields
   */
  protected getClarificationQuestion(field: string): string {
    const agentAdQuestions: Record<string, string> = {
      'product': '请问您想购买什么产品？',
      'product.name': '请问具体是什么商品？（如：iPhone 15、MacBook Pro等）',
      'product.category': '请问商品属于哪个类别？（如：手机、电脑、相机等）',
      'product.condition': '请问您接受全新、二手还是官方翻新的商品？',
      'brandPreferences': '请问您对品牌有什么偏好吗？',
      'platform': '请问您希望在哪个平台购买？（如：淘宝、京东、拼多多等）',
      'urgency': '请问您购买的需求有多紧急？',
      'purchaseTimeline': '请问您计划什么时候购买？',
    };

    return agentAdQuestions[field] || super.getClarificationQuestion(field);
  }
}
