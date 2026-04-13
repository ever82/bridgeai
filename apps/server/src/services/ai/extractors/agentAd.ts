/**
 * AgentAd Extractor
 * 广告投放场景提取器 - 提取商品、预算、品牌偏好等信息
 */

import { BaseSceneExtractor, SceneType } from './base';
import { Demand, DemandExtractionRequest, ExtractedEntity } from '../demandExtractionService';
import { logger } from '../../../utils/logger';

/**
 * AgentAd Specific Fields
 */
export interface AgentAdFields {
  title?: string;
  description?: string;
  adType: string;
  productCategory: string;
  productName: string;
  brand: string;
  targetAudience: string;
  targetLocation: string;
  budget: { min?: number; max?: number; currency: string; daily?: number };
  duration: { startDate: string; endDate: string; days?: number };
  adFormat: string[];
  platforms: string[];
  campaignGoals: string[];
  creativeRequirements: string[];
  kpiTargets: { impressions?: number; clicks?: number; conversions?: number; cpa?: number };
  industry: string;
  urgency: string;
}

export class AgentAdExtractor extends BaseSceneExtractor {
  protected sceneType: SceneType = 'agentad';
  protected requiredFields = [
    'structured.title',
    'structured.budget.max',
    'structured.time.startTime'
  ];

  async extract(request: DemandExtractionRequest): Promise<Partial<Demand>> {
    const startTime = Date.now();
    const { text } = request;

    logger.info('AgentAd extraction started', { textLength: text.length });

    try {
      const prompt = this.buildExtractionPrompt(text);
      const llmResult = await this.callLLM(prompt, { temperature: 0.3, maxTokens: 1200 });

      const extractedData = this.parseAgentAdData(llmResult.text);
      const demand = this.buildAgentAdDemand(text, extractedData);

      demand.metadata!.latencyMs = Date.now() - startTime;

      logger.info('AgentAd extraction completed', {
        adType: extractedData.adType,
        productCategory: extractedData.productCategory,
        hasBudget: !!(extractedData.budget?.max || extractedData.budget?.daily),
        latencyMs: demand.metadata!.latencyMs
      });

      return demand;
    } catch (error) {
      logger.error('AgentAd extraction failed', { error, text });
      return this.buildBaseDemand(text, 'agentad');
    }
  }

  private buildExtractionPrompt(text: string): string {
    return `You are a specialized extractor for AgentAd advertising/marketing demands. Extract the following information from the user's message.

User Message: "${text}"

Extract and return as JSON:
{
  "adType": "广告类型 (e.g., 品牌推广, 产品推广, 活动推广, 应用下载)",
  "productCategory": "产品类别 (e.g., 电商, 教育, 游戏, 金融, 本地服务)",
  "productName": "产品名称",
  "brand": "品牌名称",
  "targetAudience": "目标受众描述 (e.g., 18-35岁女性, 企业主)",
  "targetLocation": "投放地区",
  "budget": {
    "min": 最低总预算 (number, optional),
    "max": 最高总预算 (number, optional),
    "daily": 日预算 (number, optional),
    "currency": "货币 (CNY or USD, default: CNY)"
  },
  "duration": {
    "startDate": "开始日期 (ISO format, optional)",
    "endDate": "结束日期 (ISO format, optional)",
    "days": 投放天数 (number, optional)
  },
  "adFormat": ["广告形式列表 (e.g., 图文, 视频, 信息流, 开屏广告)"],
  "platforms": ["投放平台列表 (e.g., 微信朋友圈, 抖音, 百度, 小红书)"],
  "campaignGoals": ["营销目标列表 (e.g., 品牌曝光, 线索收集, 销售转化, 应用下载)"],
  "creativeRequirements": ["创意要求列表 (e.g., 需要文案, 需要视频制作, 需要设计)"],
  "kpiTargets": {
    "impressions": 曝光量目标 (number, optional),
    "clicks": 点击量目标 (number, optional),
    "conversions": 转化量目标 (number, optional),
    "cpa": 目标CPA/转化成本 (number, optional)
  },
  "industry": "所属行业",
  "urgency": "紧急程度 (e.g., 急投, 尽快开始, 可协商)",
  "title": "生成的需求标题",
  "description": "详细描述"
}

Important:
1. Extract all advertising-related requirements
2. Budget should be total campaign budget in CNY
3. Dates should be in ISO format if possible
4. Return ONLY the JSON object"`;
  }

  private parseAgentAdData(text: string): Partial<AgentAdFields> {
    const defaultData: Partial<AgentAdFields> = {
      adType: '',
      productCategory: '',
      productName: '',
      brand: '',
      targetAudience: '',
      targetLocation: '',
      budget: { currency: 'CNY' },
      duration: { startDate: '', endDate: '' },
      adFormat: [],
      platforms: [],
      campaignGoals: [],
      creativeRequirements: [],
      kpiTargets: {},
      industry: '',
      urgency: ''
    };

    return this.parseJSONResponse(text, defaultData);
  }

  private buildAgentAdDemand(text: string, data: Partial<AgentAdFields>): Partial<Demand> {
    const entities: ExtractedEntity[] = [];

    if (data.productName) {
      entities.push({
        type: 'requirement',
        value: data.productName,
        normalizedValue: data.productName,
        startIndex: text.indexOf(data.productName) >= 0 ? text.indexOf(data.productName) : 0,
        endIndex: text.indexOf(data.productName) >= 0 ? text.indexOf(data.productName) + data.productName.length : 0,
        confidence: 0.95
      });
    }

    if (data.brand) {
      entities.push({
        type: 'preference',
        value: data.brand,
        normalizedValue: data.brand,
        startIndex: text.indexOf(data.brand) >= 0 ? text.indexOf(data.brand) : 0,
        endIndex: text.indexOf(data.brand) >= 0 ? text.indexOf(data.brand) + data.brand.length : 0,
        confidence: 0.9
      });
    }

    if (data.targetLocation) {
      entities.push({
        type: 'location',
        value: data.targetLocation,
        normalizedValue: data.targetLocation,
        startIndex: text.indexOf(data.targetLocation) >= 0 ? text.indexOf(data.targetLocation) : 0,
        endIndex: text.indexOf(data.targetLocation) >= 0 ? text.indexOf(data.targetLocation) + data.targetLocation.length : 0,
        confidence: 0.85
      });
    }

    const demand = this.buildBaseDemand(text, 'agentad');

    demand.structured = {
      title: data.title || `${data.brand || ''}${data.productName || '广告投放'}需求`,
      description: data.description || text,
      location: { city: data.targetLocation },
      time: {
        startTime: data.duration?.startDate,
        endTime: data.duration?.endDate,
        duration: data.duration?.days ? `${data.duration.days}天` : undefined,
        flexibility: data.urgency?.includes('急') ? 'strict' : 'flexible'
      },
      people: {
        count: undefined,
        roles: data.targetAudience ? [data.targetAudience] : []
      },
      budget: data.budget ? {
        min: data.budget.min,
        max: data.budget.max,
        currency: data.budget.currency || 'CNY',
        unit: 'total'
      } : {},
      requirements: [
        ...(data.adFormat || []),
        ...(data.platforms || []),
        ...(data.campaignGoals || [])
      ],
      preferences: [
        ...(data.creativeRequirements || []),
        ...(data.industry ? [`行业: ${data.industry}`] : []),
        ...(data.adType ? [`广告类型: ${data.adType}`] : [])
      ].filter(Boolean),
      constraints: [
        ...(data.productCategory ? [`产品类别: ${data.productCategory}`] : [])
      ].filter(Boolean)
    };

    demand.entities = entities;
    demand.confidence = this.calculateConfidence(data);

    const validation = this.validateExtraction(demand);
    demand.clarificationNeeded = !validation.valid;
    demand.clarificationQuestions = this.generateQuestions(validation.missingFields);

    return demand;
  }

  private calculateConfidence(data: Partial<AgentAdFields>): number {
    const fields = [
      data.adType,
      data.productName,
      data.brand,
      data.budget?.max || data.budget?.daily,
      data.platforms?.length,
      data.duration?.startDate
    ];
    const filledFields = fields.filter(f => f !== undefined && f !== '' && f !== null && f !== 0).length;
    return Math.round((filledFields / fields.length) * 100) / 100;
  }

  private generateQuestions(missingFields: string[]): string[] {
    const fieldToQuestion: Record<string, string> = {
      'structured.title': '请描述您的广告需求（如：推广新产品上市）',
      'structured.budget.max': '请问您的广告投放预算是多少？',
      'structured.time.startTime': '请问希望什么时候开始投放？'
    };

    return missingFields
      .map(field => fieldToQuestion[field])
      .filter(Boolean) as string[];
  }
}

// Export singleton instance
export const agentAdExtractor = new AgentAdExtractor();
