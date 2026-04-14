/**
 * Scene-Specific Extractors
 * 场景特定提取器 - 为不同业务场景提供专门的需求提取能力
 */

import { Demand, DemandExtractionRequest, ExtractedEntity, IntentResult } from '../demandExtractionService';
import { LLMProvider } from '../types';
import { llmService } from '../llmService';
import { logger } from '../../../utils/logger';

/**
 * Scene Type - 支持的业务场景
 */
export type SceneType = 'visionshare' | 'agentdate' | 'agentjob' | 'agentad' | 'unknown';

/**
 * Scene Detection Result
 */
export interface SceneDetectionResult {
  scene: SceneType;
  confidence: number;
  alternativeScenes: { scene: SceneType; confidence: number }[];
}

/**
 * Scene-Specific Extractor Interface
 * 场景特定提取器接口
 */
export interface SceneSpecificExtractor {
  /**
   * 获取场景类型
   */
  getSceneType(): SceneType;

  /**
   * 从文本中提取场景特定需求
   */
  extract(request: DemandExtractionRequest): Promise<Partial<Demand>>;

  /**
   * 验证提取结果是否完整
   */
  validateExtraction(demand: Partial<Demand>): { valid: boolean; missingFields: string[] };
}

/**
 * Base Scene Extractor
 * 场景提取器基类
 */
export abstract class BaseSceneExtractor implements SceneSpecificExtractor {
  protected abstract sceneType: SceneType;
  protected abstract requiredFields: string[];
  protected version = '1.0.0';

  getSceneType(): SceneType {
    return this.sceneType;
  }

  abstract extract(request: DemandExtractionRequest): Promise<Partial<Demand>>;

  validateExtraction(demand: Partial<Demand>): { valid: boolean; missingFields: string[] } {
    const missingFields: string[] = [];
    const structured = demand.structured || {};

    for (const field of this.requiredFields) {
      const value = this.getNestedValue(structured, field);
      if (value === undefined || value === null ||
          (typeof value === 'object' && Object.keys(value).length === 0) ||
          (Array.isArray(value) && value.length === 0)) {
        missingFields.push(field);
      }
    }

    return {
      valid: missingFields.length === 0,
      missingFields
    };
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) =>
      current && current[key] !== undefined ? current[key] : undefined, obj);
  }

  protected async callLLM(prompt: string, options: { temperature?: number; maxTokens?: number } = {}): Promise<{
    text: string;
    provider: LLMProvider;
    model: string;
    latencyMs: number;
  }> {
    const startTime = Date.now();
    const response = await llmService.generateText(prompt, {
      temperature: options.temperature ?? 0.3,
      maxTokens: options.maxTokens ?? 1000
    });

    return {
      text: response.text,
      provider: response.provider,
      model: response.model,
      latencyMs: Date.now() - startTime
    };
  }

  protected parseJSONResponse<T>(text: string, defaultValue: T): T {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return defaultValue;
      }
      return JSON.parse(jsonMatch[0]) as T;
    } catch (error) {
      logger.error('Failed to parse JSON response', { error, text });
      return defaultValue;
    }
  }

  protected buildBaseDemand(rawText: string, scene: SceneType): Partial<Demand> {
    return {
      rawText,
      scene,
      intent: {
        intent: 'create_demand',
        confidence: 1.0,
        alternatives: []
      },
      entities: [],
      structured: {
        title: undefined,
        description: rawText,
        location: {},
        time: {},
        people: {},
        budget: {},
        requirements: [],
        preferences: [],
        constraints: []
      },
      confidence: 0,
      clarificationNeeded: false,
      clarificationQuestions: [],
      metadata: {
        processedAt: new Date(),
        provider: LLMProvider.OPENAI,
        model: 'gpt-4',
        latencyMs: 0,
        version: this.version
      }
    };
  }
}
