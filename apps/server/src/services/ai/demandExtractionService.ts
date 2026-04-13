/**
 * Demand Extraction Service
 * 需求智能提炼服务 - 核心框架
 * 提供自然语言理解、实体识别、意图分类和结构化输出
 */

import { llmService } from './llmService';
import { metricsService } from './metricsService';
import { LLMProvider } from './types';
import { logger } from '../../utils/logger';

/**
 * Extracted Entity Types
 */
export type EntityType = 'time' | 'location' | 'person' | 'budget' | 'requirement' | 'preference';

/**
 * Extracted Entity
 */
export interface ExtractedEntity {
  type: EntityType;
  value: string;
  normalizedValue?: string | number | { min: number; max: number };
  startIndex: number;
  endIndex: number;
  confidence: number;
}

/**
 * Intent Type
 */
export type IntentType =
  | 'create_demand'
  | 'update_demand'
  | 'search_demand'
  | 'clarify_demand'
  | 'confirm_demand'
  | 'cancel_demand'
  | 'unknown';

/**
 * Intent Classification Result
 */
export interface IntentResult {
  intent: IntentType;
  confidence: number;
  alternatives: { intent: IntentType; confidence: number }[];
}

/**
 * Structured Demand Object
 */
export interface Demand {
  id?: string;
  rawText: string;
  intent: IntentResult;
  entities: ExtractedEntity[];
  structured: {
    title?: string;
    description?: string;
    location?: {
      city?: string;
      district?: string;
      address?: string;
    };
    time?: {
      startTime?: string;
      endTime?: string;
      duration?: string;
      flexibility?: 'strict' | 'flexible' | 'anytime';
    };
    people?: {
      count?: number;
      roles?: string[];
    };
    budget?: {
      min?: number;
      max?: number;
      currency?: string;
      unit?: string;
    };
    requirements?: string[];
    preferences?: string[];
    constraints?: string[];
  };
  confidence: number;
  scene?: string;
  clarificationNeeded: boolean;
  clarificationQuestions?: string[];
  metadata: {
    processedAt: Date;
    provider: LLMProvider;
    model: string;
    latencyMs: number;
    version: string;
  };
}

/**
 * Extraction Request
 */
export interface DemandExtractionRequest {
  text: string;
  scene?: string;
  context?: {
    previousDemands?: Demand[];
    userPreferences?: Record<string, any>;
    conversationHistory?: { role: 'user' | 'assistant'; content: string }[];
  };
  options?: {
    extractEntities?: boolean;
    classifyIntent?: boolean;
    requireClarification?: boolean;
    language?: string;
  };
}

/**
 * Extraction Options
 */
export interface ExtractionOptions {
  extractEntities?: boolean;
  classifyIntent?: boolean;
  requireClarification?: boolean;
  language?: string;
  minConfidence?: number;
}

/**
 * Demand Extraction Service Class
 * 需求解析引擎核心类
 */
export class DemandExtractionService {
  private version = '1.0.0';
  private minConfidenceThreshold = 0.5;

  /**
   * Extract demand from natural language text
   * 从自然语言文本中提取需求
   */
  async extract(
    request: DemandExtractionRequest,
    options: ExtractionOptions = {}
  ): Promise<Demand> {
    const startTime = Date.now();
    const { text, scene, context } = request;
    const opts = { ...this.getDefaultOptions(), ...options };

    try {
      logger.info('Starting demand extraction', {
        textLength: text.length,
        scene,
        hasContext: !!context,
      });

      // Step 1: Classify intent if enabled
      const intent = opts.classifyIntent
        ? await this.classifyIntent(text, context)
        : this.getDefaultIntent();

      // Step 2: Extract entities if enabled
      const entities = opts.extractEntities
        ? await this.extractEntities(text)
        : [];

      // Step 3: Build structured demand
      const structured = this.buildStructuredDemand(entities, text);

      // Step 4: Check if clarification is needed
      const { clarificationNeeded, questions } = this.checkClarificationNeeded(
        structured,
        intent,
        opts.requireClarification
      );

      // Step 5: Calculate overall confidence
      const confidence = this.calculateConfidence(intent, entities, structured);

      // Step 6: Build final demand object
      const demand: Demand = {
        rawText: text,
        intent,
        entities,
        structured,
        confidence,
        scene,
        clarificationNeeded,
        clarificationQuestions: questions,
        metadata: {
          processedAt: new Date(),
          provider: 'openai' as LLMProvider, // Will be set from actual LLM response
          model: 'gpt-4',
          latencyMs: Date.now() - startTime,
          version: this.version,
        },
      };

      // Step 7: Record metrics
      await this.recordMetrics(demand, startTime);

      logger.info('Demand extraction completed', {
        intent: intent.intent,
        entityCount: entities.length,
        confidence,
        clarificationNeeded,
        latencyMs: demand.metadata.latencyMs,
      });

      return demand;
    } catch (error) {
      logger.error('Demand extraction failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        textLength: text.length,
      });
      throw error;
    }
  }

  /**
   * Classify intent from text
   * 意图分类
   */
  private async classifyIntent(
    text: string,
    context?: DemandExtractionRequest['context']
  ): Promise<IntentResult> {
    const prompt = this.buildIntentClassificationPrompt(text, context);

    try {
      const response = await llmService.generateText(prompt, {
        temperature: 0.3,
        maxTokens: 500,
      });

      const result = this.parseIntentResult(response.text);

      // Record metrics for intent classification
      await metricsService.recordRequest({
        requestId: `intent-${Date.now()}`,
        provider: response.provider,
        model: response.model,
        latencyMs: response.latencyMs || 0,
        success: true,
        tokenUsage: {
          input: response.usage?.promptTokens || 0,
          output: response.usage?.completionTokens || 0,
          total: response.usage?.totalTokens || 0,
        },
        costUsd: response.cost || 0,
      });

      return result;
    } catch (error) {
      logger.error('Intent classification failed', { error });
      return this.getDefaultIntent();
    }
  }

  /**
   * Build intent classification prompt
   */
  private buildIntentClassificationPrompt(
    text: string,
    context?: DemandExtractionRequest['context']
  ): string {
    const history = context?.conversationHistory
      ?.map(h => `${h.role}: ${h.content}`)
      .join('\n');

    return `You are an intent classification system. Analyze the user's message and classify their intent.

${history ? `Conversation History:\n${history}\n\n` : ''}
User Message: "${text}"

Classify the intent into one of these categories:
- create_demand: User wants to create a new demand/requirement
- update_demand: User wants to modify an existing demand
- search_demand: User is looking for something/someone
- clarify_demand: User is providing clarification or additional info
- confirm_demand: User is confirming or approving something
- cancel_demand: User wants to cancel or delete a demand
- unknown: Cannot determine the intent

Respond in JSON format:
{
  "intent": "category_name",
  "confidence": 0.95,
  "alternatives": [
    {"intent": "other_category", "confidence": 0.05}
  ]
}

Respond with ONLY the JSON object.`;
  }

  /**
   * Parse intent classification result
   */
  private parseIntentResult(text: string): IntentResult {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return this.getDefaultIntent();
      }

      const result = JSON.parse(jsonMatch[0]);
      return {
        intent: result.intent as IntentType,
        confidence: result.confidence || 0,
        alternatives: result.alternatives || [],
      };
    } catch (error) {
      logger.error('Failed to parse intent result', { error, text });
      return this.getDefaultIntent();
    }
  }

  /**
   * Extract entities from text
   * 实体识别
   */
  private async extractEntities(text: string): Promise<ExtractedEntity[]> {
    const prompt = this.buildEntityExtractionPrompt(text);

    try {
      const response = await llmService.generateText(prompt, {
        temperature: 0.3,
        maxTokens: 1000,
      });

      const entities = this.parseEntities(response.text, text);

      // Record metrics for entity extraction
      await metricsService.recordRequest({
        requestId: `entity-${Date.now()}`,
        provider: response.provider,
        model: response.model,
        latencyMs: response.latencyMs || 0,
        success: true,
        tokenUsage: {
          input: response.usage?.promptTokens || 0,
          output: response.usage?.completionTokens || 0,
          total: response.usage?.totalTokens || 0,
        },
        costUsd: response.cost || 0,
      });

      return entities;
    } catch (error) {
      logger.error('Entity extraction failed', { error });
      return [];
    }
  }

  /**
   * Build entity extraction prompt
   */
  private buildEntityExtractionPrompt(text: string): string {
    return `You are an entity extraction system. Extract the following entity types from the text:

Entity Types:
- time: Time-related mentions (dates, times, duration, deadlines)
- location: Location mentions (cities, districts, addresses, venues)
- person: People mentions (names, roles, counts)
- budget: Budget or price mentions (amounts, ranges, currencies)
- requirement: Specific requirements or must-haves
- preference: Preferences or nice-to-haves

Text: "${text}"

Extract entities and return as JSON:
{
  "entities": [
    {
      "type": "entity_type",
      "value": "exact text from input",
      "normalizedValue": "normalized value (optional)",
      "confidence": 0.95
    }
  ]
}

Respond with ONLY the JSON object.`;
  }

  /**
   * Parse entity extraction result
   */
  private parseEntities(responseText: string, originalText: string): ExtractedEntity[] {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return [];
      }

      const result = JSON.parse(jsonMatch[0]);
      const entities: ExtractedEntity[] = [];

      for (const entity of result.entities || []) {
        // Find position in original text
        const startIndex = originalText.indexOf(entity.value);
        const endIndex = startIndex >= 0 ? startIndex + entity.value.length : -1;

        entities.push({
          type: entity.type as EntityType,
          value: entity.value,
          normalizedValue: entity.normalizedValue,
          startIndex: startIndex >= 0 ? startIndex : 0,
          endIndex: endIndex >= 0 ? endIndex : 0,
          confidence: entity.confidence || 0.5,
        });
      }

      return entities;
    } catch (error) {
      logger.error('Failed to parse entity result', { error, responseText });
      return [];
    }
  }

  /**
   * Build structured demand from entities
   */
  private buildStructuredDemand(
    entities: ExtractedEntity[],
    rawText: string
  ): Demand['structured'] {
    const structured: Demand['structured'] = {
      title: undefined,
      description: rawText,
      location: {},
      time: {},
      people: {},
      budget: {},
      requirements: [],
      preferences: [],
      constraints: [],
    };

    // Process entities by type
    for (const entity of entities) {
      switch (entity.type) {
        case 'location':
          this.processLocationEntity(entity, structured.location);
          break;
        case 'time':
          this.processTimeEntity(entity, structured.time);
          break;
        case 'person':
          this.processPersonEntity(entity, structured.people);
          break;
        case 'budget':
          this.processBudgetEntity(entity, structured.budget);
          break;
        case 'requirement':
          structured.requirements?.push(entity.value);
          break;
        case 'preference':
          structured.preferences?.push(entity.value);
          break;
      }
    }

    return structured;
  }

  /**
   * Process location entity
   */
  private processLocationEntity(
    entity: ExtractedEntity,
    location: Demand['structured']['location']
  ): void {
    const value = entity.normalizedValue?.toString() || entity.value;

    // Simple heuristic: longer text with numbers is likely an address
    if (/\d+/.test(value) && value.length > 10) {
      location.address = value;
    } else if (value.includes('区') || value.includes('县')) {
      location.district = value;
    } else {
      location.city = value;
    }
  }

  /**
   * Process time entity
   */
  private processTimeEntity(
    entity: ExtractedEntity,
    time: Demand['structured']['time']
  ): void {
    const value = entity.normalizedValue?.toString() || entity.value;

    // Try to parse as datetime
    if (/\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(value)) {
      time.startTime = value;
    } else if (/\d{1,2}:\d{2}/.test(value)) {
      time.startTime = value;
    } else if (/\d+[天小时分]/.test(value)) {
      time.duration = value;
    }

    // Check flexibility
    if (value.includes('随时') || value.includes('都可以')) {
      time.flexibility = 'anytime';
    } else if (value.includes('左右') || value.includes('前后')) {
      time.flexibility = 'flexible';
    }
  }

  /**
   * Process person entity
   */
  private processPersonEntity(
    entity: ExtractedEntity,
    people: Demand['structured']['people']
  ): void {
    const value = entity.normalizedValue?.toString() || entity.value;

    // Try to extract count
    const countMatch = value.match(/(\d+)\s*[个人]/);
    if (countMatch) {
      people.count = parseInt(countMatch[1], 10);
    }

    // Extract roles
    const roleKeywords = ['摄影师', '模特', '设计师', '导演', '演员', '助理'];
    for (const role of roleKeywords) {
      if (value.includes(role)) {
        people.roles = people.roles || [];
        if (!people.roles.includes(role)) {
          people.roles.push(role);
        }
      }
    }
  }

  /**
   * Process budget entity
   */
  private processBudgetEntity(
    entity: ExtractedEntity,
    budget: Demand['structured']['budget']
  ): void {
    const value = entity.normalizedValue;

    if (typeof value === 'object' && value !== null && 'min' in value && 'max' in value) {
      budget.min = value.min;
      budget.max = value.max;
    } else if (typeof value === 'number') {
      budget.max = value;
    } else {
      // Parse from text
      const text = value?.toString() || entity.value;
      const rangeMatch = text.match(/(\d+)\s*[-~到至]\s*(\d+)/);
      if (rangeMatch) {
        budget.min = parseInt(rangeMatch[1], 10);
        budget.max = parseInt(rangeMatch[2], 10);
      } else {
        const singleMatch = text.match(/(\d+)/);
        if (singleMatch) {
          budget.max = parseInt(singleMatch[1], 10);
        }
      }
    }

    // Extract currency
    if (/元|块|￥/.test(entity.value)) {
      budget.currency = 'CNY';
    } else if (/\$|USD|美元/.test(entity.value)) {
      budget.currency = 'USD';
    }
  }

  /**
   * Check if clarification is needed
   */
  private checkClarificationNeeded(
    structured: Demand['structured'],
    intent: IntentResult,
    requireClarification?: boolean
  ): { clarificationNeeded: boolean; questions: string[] } {
    const questions: string[] = [];

    if (!requireClarification) {
      return { clarificationNeeded: false, questions: [] };
    }

    // Check for missing critical information
    if (!structured.title) {
      questions.push('请简要描述您的需求标题');
    }

    if (!structured.location?.city && !structured.location?.address) {
      questions.push('请问您希望在哪个城市或地点进行？');
    }

    if (!structured.time?.startTime && !structured.time?.flexibility) {
      questions.push('请问您期望什么时间进行？');
    }

    if (!structured.budget?.min && !structured.budget?.max) {
      questions.push('请问您的预算范围是多少？');
    }

    return {
      clarificationNeeded: questions.length > 0,
      questions,
    };
  }

  /**
   * Calculate overall confidence score
   */
  private calculateConfidence(
    intent: IntentResult,
    entities: ExtractedEntity[],
    structured: Demand['structured']
  ): number {
    const scores: number[] = [];

    // Intent confidence
    scores.push(intent.confidence);

    // Entity confidence (average)
    if (entities.length > 0) {
      const entityAvg =
        entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length;
      scores.push(entityAvg);
    }

    // Structured data completeness
    let completenessScore = 0;
    let fieldCount = 0;

    if (structured.title) {
      completenessScore++;
      fieldCount++;
    }
    if (structured.location?.city || structured.location?.address) {
      completenessScore++;
      fieldCount++;
    }
    if (structured.time?.startTime || structured.time?.flexibility) {
      completenessScore++;
      fieldCount++;
    }
    if (structured.budget?.min || structured.budget?.max) {
      completenessScore++;
      fieldCount++;
    }

    if (fieldCount > 0) {
      scores.push(completenessScore / fieldCount);
    }

    // Calculate weighted average
    const average = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    return Math.round(average * 100) / 100;
  }

  /**
   * Record metrics for the extraction
   */
  private async recordMetrics(demand: Demand, startTime: number): Promise<void> {
    await metricsService.recordRequest({
      requestId: `demand-${Date.now()}`,
      provider: demand.metadata.provider,
      model: demand.metadata.model,
      latencyMs: Date.now() - startTime,
      success: true,
      tokenUsage: { input: 0, output: 0, total: 0 }, // Will be populated from actual usage
      costUsd: 0,
    });
  }

  /**
   * Get default extraction options
   */
  private getDefaultOptions(): ExtractionOptions {
    return {
      extractEntities: true,
      classifyIntent: true,
      requireClarification: true,
      language: 'zh-CN',
      minConfidence: this.minConfidenceThreshold,
    };
  }

  /**
   * Get default intent result
   */
  private getDefaultIntent(): IntentResult {
    return {
      intent: 'unknown',
      confidence: 0,
      alternatives: [],
    };
  }

  /**
   * Get service version
   */
  getVersion(): string {
    return this.version;
  }

  /**
   * Set minimum confidence threshold
   */
  setMinConfidenceThreshold(threshold: number): void {
    this.minConfidenceThreshold = threshold;
  }
}

// Export singleton instance
export const demandExtractionService = new DemandExtractionService();
