/**
 * AgentDate Extractor
 * 婚恋交友场景提取器 - 提取择偶标准、兴趣、时间等信息
 */

import { BaseSceneExtractor, SceneType } from './base';
import { Demand, DemandExtractionRequest, ExtractedEntity } from '../demandExtractionService';
import { logger } from '../../../utils/logger';

/**
 * AgentDate Specific Fields
 */
export interface AgentDateFields {
  gender: string;
  ageRange: { min?: number; max?: number };
  heightRange: { min?: number; max?: number };
  location: string;
  education: string;
  occupation: string;
  incomeRange: { min?: number; max?: number };
  interests: string[];
  personalityTraits: string[];
  appearancePreferences: string[];
  relationshipGoals: string;
  meetingTime: string;
  meetingLocation: string;
  activityType: string;
}

export class AgentDateExtractor extends BaseSceneExtractor {
  protected sceneType: SceneType = 'agentdate';
  protected requiredFields = [
    'structured.title',
    'structured.people.count',
    'structured.time.startTime'
  ];

  async extract(request: DemandExtractionRequest): Promise<Partial<Demand>> {
    const startTime = Date.now();
    const { text } = request;

    logger.info('AgentDate extraction started', { textLength: text.length });

    try {
      const prompt = this.buildExtractionPrompt(text);
      const llmResult = await this.callLLM(prompt, { temperature: 0.3, maxTokens: 1200 });

      const extractedData = this.parseAgentDateData(llmResult.text);
      const demand = this.buildAgentDateDemand(text, extractedData);

      demand.metadata!.latencyMs = Date.now() - startTime;

      logger.info('AgentDate extraction completed', {
        gender: extractedData.gender,
        hasAgeRange: !!(extractedData.ageRange?.min || extractedData.ageRange?.max),
        latencyMs: demand.metadata!.latencyMs
      });

      return demand;
    } catch (error) {
      logger.error('AgentDate extraction failed', { error, text });
      return this.buildBaseDemand(text, 'agentdate');
    }
  }

  private buildExtractionPrompt(text: string): string {
    return `You are a specialized extractor for AgentDate dating/matchmaking demands. Extract the following information from the user's message.

User Message: "${text}"

Extract and return as JSON:
{
  "gender": "期望性别 (e.g., 男, 女, 不限)",
  "ageRange": {
    "min": 最低年龄 (number, optional),
    "max": 最高年龄 (number, optional)
  },
  "heightRange": {
    "min": 最低身高cm (number, optional),
    "max": 最高身高cm (number, optional)
  },
  "location": "所在地区或期望地区",
  "education": "学历要求 (e.g., 本科及以上, 硕士, 不限)",
  "occupation": "职业偏好 (e.g., 稳定工作, 技术行业, 创业)",
  "incomeRange": {
    "min": 最低收入 (number, optional),
    "max": 最高收入 (number, optional)
  },
  "interests": ["兴趣爱好列表 (e.g., 旅行, 摄影, 美食, 运动)"],
  "personalityTraits": ["性格特点列表 (e.g., 开朗, 温柔, 成熟稳重)"],
  "appearancePreferences": ["外貌偏好列表 (e.g., 阳光帅气, 甜美可爱)"],
  "relationshipGoals": "交往目的 (e.g., 寻找结婚对象, 交朋友, 短期约会)",
  "meetingTime": "约会时间 (ISO format: YYYY-MM-DD or description)",
  "meetingLocation": "约会地点偏好",
  "activityType": "活动类型 (e.g., 咖啡聊天, 看电影, 户外运动)",
  "title": "生成的需求标题",
  "description": "详细描述"
}

Important:
1. Extract all relevant information for dating/matchmaking
2. Age and height ranges should be numbers
3. Income should be monthly salary in CNY
4. Return ONLY the JSON object"`;
  }

  private parseAgentDateData(text: string): Partial<AgentDateFields> {
    const defaultData: Partial<AgentDateFields> = {
      gender: '',
      ageRange: {},
      heightRange: {},
      location: '',
      education: '',
      occupation: '',
      incomeRange: {},
      interests: [],
      personalityTraits: [],
      appearancePreferences: [],
      relationshipGoals: '',
      meetingTime: '',
      meetingLocation: '',
      activityType: ''
    };

    return this.parseJSONResponse(text, defaultData);
  }

  private buildAgentDateDemand(text: string, data: Partial<AgentDateFields>): Partial<Demand> {
    const entities: ExtractedEntity[] = [];

    if (data.location) {
      entities.push({
        type: 'location',
        value: data.location,
        normalizedValue: data.location,
        startIndex: text.indexOf(data.location) >= 0 ? text.indexOf(data.location) : 0,
        endIndex: text.indexOf(data.location) >= 0 ? text.indexOf(data.location) + data.location.length : 0,
        confidence: 0.85
      });
    }

    if (data.meetingTime) {
      entities.push({
        type: 'time',
        value: data.meetingTime,
        normalizedValue: data.meetingTime,
        startIndex: text.indexOf(data.meetingTime) >= 0 ? text.indexOf(data.meetingTime) : 0,
        endIndex: text.indexOf(data.meetingTime) >= 0 ? text.indexOf(data.meetingTime) + data.meetingTime.length : 0,
        confidence: 0.8
      });
    }

    const demand = this.buildBaseDemand(text, 'agentdate');

    demand.structured = {
      title: data.title || `${data.gender || '交友'}需求`,
      description: data.description || text,
      location: {
        city: data.location,
        address: data.meetingLocation
      },
      time: {
        startTime: data.meetingTime,
        flexibility: data.meetingTime ? 'strict' : 'flexible'
      },
      people: {
        count: 1,
        roles: data.gender ? [data.gender] : []
      },
      budget: data.incomeRange ? {
        min: data.incomeRange.min,
        max: data.incomeRange.max,
        currency: 'CNY',
        unit: 'monthly'
      } : {},
      requirements: [
        ...(data.education ? [`学历: ${data.education}`] : []),
        ...(data.occupation ? [`职业: ${data.occupation}`] : []),
        ...(data.personalityTraits || [])
      ],
      preferences: [
        ...(data.interests || []),
        ...(data.appearancePreferences || []),
        ...(data.activityType ? [`活动: ${data.activityType}`] : [])
      ].filter(Boolean),
      constraints: [
        ...(data.ageRange?.min ? [`年龄: ${data.ageRange.min}-${data.ageRange.max || '不限'}`] : []),
        ...(data.heightRange?.min ? [`身高: ${data.heightRange.min}-${data.heightRange.max || '不限'}cm`] : [])
      ].filter(Boolean)
    };

    demand.entities = entities;
    demand.confidence = this.calculateConfidence(data);

    const validation = this.validateExtraction(demand);
    demand.clarificationNeeded = !validation.valid;
    demand.clarificationQuestions = this.generateQuestions(validation.missingFields);

    return demand;
  }

  private calculateConfidence(data: Partial<AgentDateFields>): number {
    const fields = [
      data.gender,
      data.ageRange?.min || data.ageRange?.max,
      data.location,
      data.meetingTime
    ];
    const filledFields = fields.filter(f => f !== undefined && f !== '' && f !== null).length;
    return Math.round((filledFields / fields.length) * 100) / 100;
  }

  private generateQuestions(missingFields: string[]): string[] {
    const fieldToQuestion: Record<string, string> = {
      'structured.title': '请简要描述您的交友需求（如：寻找25-30岁女性伴侣）',
      'structured.people.count': '请问您希望找几位朋友/伴侣？',
      'structured.time.startTime': '请问您希望在什么时间见面？'
    };

    return missingFields
      .map(field => fieldToQuestion[field])
      .filter(Boolean) as string[];
  }
}

// Export singleton instance
export const agentDateExtractor = new AgentDateExtractor();
