/**
 * VisionShare Extractor
 * 摄影约拍场景提取器 - 提取拍照时间、类型、预算等信息
 */

import { BaseSceneExtractor, SceneType } from './base';
import { Demand, DemandExtractionRequest, ExtractedEntity } from '../demandExtractionService';
import { logger } from '../../../utils/logger';

/**
 * VisionShare Specific Fields
 */
export interface VisionShareFields {
  photoType: string;
  style: string;
  location: string;
  shootDate: string;
  duration: string;
  budget: { min?: number; max?: number; currency: string };
  modelRequirements: string[];
  photographerRequirements: string[];
  equipmentNeeds: string[];
  postProcessingNeeds: string[];
}

export class VisionShareExtractor extends BaseSceneExtractor {
  protected sceneType: SceneType = 'visionshare';
  protected requiredFields = [
    'structured.title',
    'structured.time.startTime',
    'structured.budget.max'
  ];

  async extract(request: DemandExtractionRequest): Promise<Partial<Demand>> {
    const startTime = Date.now();
    const { text } = request;

    logger.info('VisionShare extraction started', { textLength: text.length });

    try {
      // Build scene-specific prompt
      const prompt = this.buildExtractionPrompt(text);
      const llmResult = await this.callLLM(prompt, { temperature: 0.3, maxTokens: 1200 });

      // Parse LLM response
      const extractedData = this.parseVisionShareData(llmResult.text);

      // Build demand object
      const demand = this.buildVisionShareDemand(text, extractedData);

      // Update metadata
      demand.metadata!.latencyMs = Date.now() - startTime;

      logger.info('VisionShare extraction completed', {
        photoType: extractedData.photoType,
        hasBudget: !!extractedData.budget?.max,
        latencyMs: demand.metadata!.latencyMs
      });

      return demand;
    } catch (error) {
      logger.error('VisionShare extraction failed', { error, text });
      return this.buildBaseDemand(text, 'visionshare');
    }
  }

  private buildExtractionPrompt(text: string): string {
    return `You are a specialized extractor for VisionShare photography demands. Extract the following information from the user's message.

User Message: "${text}"

Extract and return as JSON:
{
  "photoType": "拍照类型 (e.g., 人像摄影, 婚纱照, 商业拍摄, 活动跟拍, 宠物摄影)",
  "style": "风格偏好 (e.g., 日系清新, 欧美复古, 韩式唯美, 纪实风格)",
  "location": "拍摄地点 (具体地址或地点描述)",
  "shootDate": "拍摄日期 (ISO format: YYYY-MM-DD)",
  "duration": "预计时长 (e.g., 2小时, 半天, 全天)",
  "budget": {
    "min": 最低预算 (number, optional),
    "max": 最高预算 (number, required),
    "currency": "货币 (CNY or USD, default: CNY)"
  },
  "modelRequirements": ["模特要求列表 (e.g., 经验丰富, 形象好, 会摆pose)"],
  "photographerRequirements": ["摄影师要求列表 (e.g., 专业设备, 后期修图)"],
  "equipmentNeeds": ["设备需求列表 (e.g., 专业相机, 闪光灯, 反光板)"],
  "postProcessingNeeds": ["后期需求列表 (e.g., 精修30张, 调色, 磨皮)"],
  "title": "生成的需求标题",
  "description": "详细描述"
}

Important:
1. Extract all relevant information from the text
2. If a field is not mentioned, set it to null or empty array
3. Budget should be parsed as numbers (remove currency symbols)
4. Date should be in ISO format if possible
5. Return ONLY the JSON object"`;
  }

  private parseVisionShareData(text: string): Partial<VisionShareFields> {
    const defaultData: Partial<VisionShareFields> = {
      photoType: '',
      style: '',
      location: '',
      shootDate: '',
      duration: '',
      budget: { currency: 'CNY' },
      modelRequirements: [],
      photographerRequirements: [],
      equipmentNeeds: [],
      postProcessingNeeds: []
    };

    return this.parseJSONResponse(text, defaultData);
  }

  private buildVisionShareDemand(text: string, data: Partial<VisionShareFields>): Partial<Demand> {
    const entities: ExtractedEntity[] = [];

    // Build entities from extracted data
    if (data.photoType) {
      entities.push({
        type: 'requirement',
        value: data.photoType,
        normalizedValue: data.photoType,
        startIndex: text.indexOf(data.photoType) >= 0 ? text.indexOf(data.photoType) : 0,
        endIndex: text.indexOf(data.photoType) >= 0 ? text.indexOf(data.photoType) + data.photoType.length : 0,
        confidence: 0.9
      });
    }

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

    const demand = this.buildBaseDemand(text, 'visionshare');

    demand.structured = {
      title: data.title || `${data.photoType || '摄影'}需求`,
      description: data.description || text,
      location: { address: data.location },
      time: {
        startTime: data.shootDate,
        duration: data.duration,
        flexibility: data.shootDate ? 'strict' : 'flexible'
      },
      people: {},
      budget: data.budget || {},
      requirements: [
        ...(data.modelRequirements || []),
        ...(data.photographerRequirements || [])
      ],
      preferences: [
        data.style || '',
        ...(data.equipmentNeeds || []),
        ...(data.postProcessingNeeds || [])
      ].filter(Boolean),
      constraints: []
    };

    demand.entities = entities;
    demand.confidence = this.calculateConfidence(data);

    // Check if clarification is needed
    const validation = this.validateExtraction(demand);
    demand.clarificationNeeded = !validation.valid;
    demand.clarificationQuestions = this.generateQuestions(validation.missingFields);

    return demand;
  }

  private calculateConfidence(data: Partial<VisionShareFields>): number {
    const fields = [
      data.photoType,
      data.shootDate,
      data.budget?.max,
      data.location
    ];
    const filledFields = fields.filter(f => f !== undefined && f !== '' && f !== null).length;
    return Math.round((filledFields / fields.length) * 100) / 100;
  }

  private generateQuestions(missingFields: string[]): string[] {
    const fieldToQuestion: Record<string, string> = {
      'structured.title': '请简要描述您的摄影需求（如：婚纱照拍摄）',
      'structured.time.startTime': '请问您希望在什么时间进行拍摄？',
      'structured.budget.max': '请问您的预算范围是多少？'
    };

    return missingFields
      .map(field => fieldToQuestion[field])
      .filter(Boolean) as string[];
  }
}

// Export singleton instance
export const visionShareExtractor = new VisionShareExtractor();
