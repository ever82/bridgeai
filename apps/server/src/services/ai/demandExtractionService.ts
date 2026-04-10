/**
 * Demand Extraction Service
 * 需求智能提炼服务 - 核心解析引擎
 *
 * Provides:
 * - Natural language understanding
 * - Entity recognition (time/location/people)
 * - Intent classification
 * - Structured demand output
 * - Confidence scoring
 */

import { LLMService } from './llmService';
import { LLMProvider } from './types';
import { getL2Schema, L2Schema, L2Data, L2FieldType } from '@visionshare/shared';
import logger from '../../utils/logger';

/**
 * Extracted entity types
 */
export interface ExtractedEntities {
  time: TimeEntity[];
  location: LocationEntity[];
  people: PeopleEntity[];
  organizations: string[];
  keywords: string[];
}

/**
 * Time entity
 */
export interface TimeEntity {
  text: string;
  type: 'date' | 'time' | 'datetime' | 'duration' | 'relative';
  value?: string; // ISO format or relative description
  normalized: string;
}

/**
 * Location entity
 */
export interface LocationEntity {
  text: string;
  type: 'city' | 'district' | 'address' | 'poi' | 'region';
  normalized: string;
  coordinates?: { lat: number; lng: number };
}

/**
 * People entity
 */
export interface PeopleEntity {
  text: string;
  type: 'name' | 'role' | 'group';
  normalized: string;
}

/**
 * Intent classification result
 */
export interface IntentResult {
  primary: string;
  confidence: number;
  alternatives: { intent: string; confidence: number }[];
}

/**
 * Demand object - structured extraction result
 */
export interface Demand {
  id: string;
  scene: string;
  intent: IntentResult;
  entities: ExtractedEntities;
  attributes: L2Data;
  rawText: string;
  confidence: number; // Overall confidence score (0-100)
  fieldConfidence: Record<string, number>; // Per-field confidence
  extractedAt: Date;
  clarificationNeeded: boolean;
  missingFields: string[];
  suggestedQuestions: string[];
}

/**
 * Extraction request
 */
export interface ExtractionRequest {
  text: string;
  scene: string;
  agentId?: string;
  userId?: string;
  context?: {
    previousDemands?: Demand[];
    userPreferences?: Record<string, any>;
    conversationHistory?: { role: string; content: string }[];
  };
}

/**
 * Field extraction with confidence
 */
interface FieldExtraction {
  field: string;
  value: any;
  confidence: number;
  reasoning: string;
  source: 'explicit' | 'inferred' | 'default';
}

/**
 * LLM extraction response
 */
interface LLMExtractionResponse {
  intent: {
    primary: string;
    confidence: number;
    alternatives: { intent: string; confidence: number }[];
  };
  entities: {
    time: TimeEntity[];
    location: LocationEntity[];
    people: PeopleEntity[];
    organizations: string[];
    keywords: string[];
  };
  attributes: Record<string, any>;
  fieldConfidence: Record<string, { confidence: number; reasoning: string; source: string }>;
  missingFields: string[];
  suggestedQuestions: string[];
  overallConfidence: number;
  clarificationNeeded: boolean;
}

/**
 * Demand Extraction Service
 * Main class for extracting structured demand from natural language
 */
export class DemandExtractionService {
  private llmService: LLMService;

  constructor(llmService?: LLMService) {
    this.llmService = llmService || new LLMService();
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    await this.llmService.initialize();
    logger.info('DemandExtractionService initialized');
  }

  /**
   * Extract structured demand from natural language text
   *
   * @param request - Extraction request containing text and scene
   * @returns Promise<Demand> - Structured demand with confidence
   */
  async extract(request: ExtractionRequest): Promise<Demand> {
    const startTime = Date.now();
    const { text, scene, agentId, userId, context } = request;

    logger.info('Starting demand extraction', {
      scene,
      textLength: text.length,
      agentId,
      userId,
    });

    try {
      // Get schema for the scene
      const schema = getL2Schema(scene);
      if (!schema) {
        throw new Error(`Schema not found for scene: ${scene}`);
      }

      // Build extraction prompt
      const prompt = this.buildExtractionPrompt(text, scene, schema, context);

      // Call LLM for extraction
      const response = await this.llmService.generateText(prompt, {
        temperature: 0.2, // Low temperature for consistent extraction
        maxTokens: 2500,
      });

      // Parse LLM response
      const extractionResult = this.parseExtractionResult(response.text);

      // Build Demand object
      const demand: Demand = {
        id: `demand-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        scene,
        intent: extractionResult.intent,
        entities: extractionResult.entities,
        attributes: extractionResult.attributes,
        rawText: text,
        confidence: extractionResult.overallConfidence,
        fieldConfidence: Object.fromEntries(
          Object.entries(extractionResult.fieldConfidence).map(([k, v]) => [k, v.confidence])
        ),
        extractedAt: new Date(),
        clarificationNeeded: extractionResult.clarificationNeeded,
        missingFields: extractionResult.missingFields,
        suggestedQuestions: extractionResult.suggestedQuestions,
      };

      const latencyMs = Date.now() - startTime;

      logger.info('Demand extraction completed', {
        demandId: demand.id,
        scene,
        confidence: demand.confidence,
        fieldsExtracted: Object.keys(demand.attributes).length,
        missingFields: demand.missingFields.length,
        latencyMs,
      });

      return demand;
    } catch (error) {
      logger.error('Demand extraction failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        scene,
        agentId,
      });
      throw error;
    }
  }

  /**
   * Build extraction prompt for LLM
   */
  private buildExtractionPrompt(
    text: string,
    scene: string,
    schema: L2Schema,
    context?: ExtractionRequest['context']
  ): string {
    const fieldDescriptions = schema.fields.map(field => {
      let description = `- ${field.id}: ${field.label}`;
      if (field.description) {
        description += ` (${field.description})`;
      }
      if (field.type === L2FieldType.ENUM && field.options) {
        const options = field.options.map(o => `"${o.value}"`).join(', ');
        description += ` [可选值: ${options}]`;
      } else if (field.type === L2FieldType.MULTI_SELECT && field.options) {
        const options = field.options.map(o => `"${o.value}"`).join(', ');
        description += ` [多选值: ${options}]`;
      } else if (field.type === L2FieldType.RANGE) {
        description += ` [范围格式: {"min": 数值, "max": 数值}]`;
      } else if (field.type === L2FieldType.NUMBER) {
        description += ` [数值]`;
      } else if (field.type === L2FieldType.BOOLEAN) {
        description += ` [布尔值: true/false]`;
      } else {
        description += ` [${field.type}]`;
      }
      if (field.required) {
        description += ' (必填)';
      }
      return description;
    }).join('\n');

    const contextPrompt = context?.conversationHistory
      ? `\n## 对话历史:\n${context.conversationHistory
          .map(h => `${h.role}: ${h.content}`)
          .join('\n')}`
      : '';

    return `你是一位专业的需求解析专家。请从用户的自然语言描述中提取结构化信息。

## 场景: ${schema.title}
${schema.description || ''}
场景代码: ${scene}

## 需要提取的字段:
${fieldDescriptions}

## 用户输入:
"""${text}"""${contextPrompt}

## 提取要求:
1. 意图识别: 分析用户的主要意图和可能的替代意图
2. 实体识别: 提取时间、地点、人物等关键实体
3. 属性提取: 从文本中提取符合schema的字段值
4. 字段标准化:
   - 价格统一转换为数值（如"1000元"转为1000）
   - 时间统一转换为ISO格式或相对描述
   - 枚举值必须匹配预定义选项
5. 置信度评估: 为每个提取的字段提供置信度分数(0-100)
6. 缺失推断: 识别缺失的必填字段并提供建议问题

## 响应格式 (JSON):
{
  "intent": {
    "primary": "主要意图",
    "confidence": 85,
    "alternatives": [
      {"intent": "替代意图1", "confidence": 30}
    ]
  },
  "entities": {
    "time": [
      {"text": "原文", "type": "date|time|datetime|duration|relative", "value": "标准化值", "normalized": "标准化描述"}
    ],
    "location": [
      {"text": "原文", "type": "city|district|address|poi|region", "normalized": "标准化值"}
    ],
    "people": [
      {"text": "原文", "type": "name|role|group", "normalized": "标准化值"}
    ],
    "organizations": ["组织名称"],
    "keywords": ["关键词1", "关键词2"]
  },
  "attributes": {
    "field_id": "提取的值"
  },
  "fieldConfidence": {
    "field_id": {"confidence": 90, "reasoning": "明确提及", "source": "explicit|inferred|default"}
  },
  "missingFields": ["缺失的必填字段"],
  "suggestedQuestions": ["用于澄清的问题"],
  "overallConfidence": 75,
  "clarificationNeeded": false
}

请只返回JSON对象，不要添加其他文本。`;
  }

  /**
   * Parse LLM extraction result
   */
  private parseExtractionResult(text: string): LLMExtractionResponse {
    try {
      // Extract JSON from text (handle markdown code blocks)
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) ||
                        text.match(/```\n?([\s\S]*?)\n?```/) ||
                        text.match(/(\{[\s\S]*\})/);

      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;
      const result = JSON.parse(jsonStr.trim());

      // Normalize and validate the result
      return {
        intent: {
          primary: result.intent?.primary || 'unknown',
          confidence: result.intent?.confidence || 0,
          alternatives: result.intent?.alternatives || [],
        },
        entities: {
          time: result.entities?.time || [],
          location: result.entities?.location || [],
          people: result.entities?.people || [],
          organizations: result.entities?.organizations || [],
          keywords: result.entities?.keywords || [],
        },
        attributes: result.attributes || {},
        fieldConfidence: result.fieldConfidence || {},
        missingFields: result.missingFields || [],
        suggestedQuestions: result.suggestedQuestions || [],
        overallConfidence: result.overallConfidence || 0,
        clarificationNeeded: result.clarificationNeeded || false,
      };
    } catch (error) {
      logger.error('Failed to parse extraction result', { error, text });
      // Return empty result on parse failure
      return {
        intent: { primary: 'unknown', confidence: 0, alternatives: [] },
        entities: { time: [], location: [], people: [], organizations: [], keywords: [] },
        attributes: {},
        fieldConfidence: {},
        missingFields: [],
        suggestedQuestions: [],
        overallConfidence: 0,
        clarificationNeeded: true,
      };
    }
  }

  /**
   * Extract entities from text (standalone method for specific use cases)
   *
   * @param text - Text to analyze
   * @returns Promise<ExtractedEntities> - Extracted entities
   */
  async extractEntities(text: string): Promise<ExtractedEntities> {
    const prompt = `从以下文本中提取实体信息:

"""${text}"""

请识别并提取:
1. 时间实体 (日期、时间、持续时间、相对时间)
2. 地点实体 (城市、区域、地址、POI)
3. 人物实体 (姓名、角色、群体)
4. 组织实体 (公司、机构)
5. 关键词

以JSON格式返回:
{
  "time": [{"text": "原文", "type": "date|time|datetime|duration|relative", "normalized": "标准化值"}],
  "location": [{"text": "原文", "type": "city|district|address|poi|region", "normalized": "标准化值"}],
  "people": [{"text": "原文", "type": "name|role|group", "normalized": "标准化值"}],
  "organizations": ["组织名称"],
  "keywords": ["关键词"]
}`;

    try {
      const response = await this.llmService.generateText(prompt, {
        temperature: 0.3,
        maxTokens: 1500,
      });

      const result = JSON.parse(response.text);
      return {
        time: result.time || [],
        location: result.location || [],
        people: result.people || [],
        organizations: result.organizations || [],
        keywords: result.keywords || [],
      };
    } catch (error) {
      logger.error('Entity extraction failed', { error, text });
      return {
        time: [],
        location: [],
        people: [],
        organizations: [],
        keywords: [],
      };
    }
  }

  /**
   * Classify intent from text (standalone method)
   *
   * @param text - Text to classify
   * @param possibleIntents - List of possible intent categories
   * @returns Promise<IntentResult> - Intent classification result
   */
  async classifyIntent(text: string, possibleIntents: string[]): Promise<IntentResult> {
    const prompt = `分析以下文本的意图:

"""${text}"""

可能的意图类别:
${possibleIntents.map(i => `- ${i}`).join('\n')}

以JSON格式返回:
{
  "primary": "主要意图",
  "confidence": 85,
  "alternatives": [
    {"intent": "替代意图", "confidence": 30}
  ]
}`;

    try {
      const response = await this.llmService.generateText(prompt, {
        temperature: 0.3,
        maxTokens: 500,
      });

      const result = JSON.parse(response.text);
      return {
        primary: result.primary || 'unknown',
        confidence: result.confidence || 0,
        alternatives: result.alternatives || [],
      };
    } catch (error) {
      logger.error('Intent classification failed', { error, text });
      return {
        primary: 'unknown',
        confidence: 0,
        alternatives: [],
      };
    }
  }

  /**
   * Get confidence level description
   */
  getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
    if (confidence >= 80) return 'high';
    if (confidence >= 50) return 'medium';
    return 'low';
  }

  /**
   * Check if extraction needs clarification
   */
  needsClarification(demand: Demand): boolean {
    return demand.clarificationNeeded ||
           demand.confidence < 50 ||
           demand.missingFields.length > 0;
  }
}

// Export singleton instance
export const demandExtractionService = new DemandExtractionService();
