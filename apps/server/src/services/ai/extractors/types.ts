/**
 * Scene-Specific Extractor Types and Interfaces
 * 场景特定提取器类型定义
 */

import { Demand, ExtractedEntity, IntentResult } from '../demandExtractionService';

/**
 * Scene Types
 * 业务场景类型
 */
export type SceneType =
  | 'visionshare'
  | 'agentdate'
  | 'agentjob'
  | 'agentad'
  | 'unknown';

/**
 * Scene Detection Result
 * 场景检测结果
 */
export interface SceneDetectionResult {
  scene: SceneType;
  confidence: number;
  keywords: string[];
}

/**
 * Scene-Specific Entity Type
 * 场景特定实体类型
 */
export type SceneEntityType =
  | 'photographyType'
  | 'photographyTime'
  | 'age'
  | 'height'
  | 'education'
  | 'occupation'
  | 'interest'
  | 'skill'
  | 'experience'
  | 'salary'
  | 'jobType'
  | 'benefit'
  | 'product'
  | 'brand'
  | 'platform'
  | 'urgency'
  | 'time'
  | 'location'
  | 'budget'
  | 'person'
  | 'requirement'
  | 'preference';

/**
 * Scene-Specific Extracted Entity
 */
export interface SceneExtractedEntity extends Omit<ExtractedEntity, 'type'> {
  type: SceneEntityType;
}

/**
 * Scene-Specific Extracted Data
 * 场景特定的提取数据
 */
export interface SceneExtractedData {
  scene: SceneType;
  entities: SceneExtractedEntity[];
  structured: Record<string, any>;
  confidence: number;
}

/**
 * VisionShare Specific Data
 * VisionShare场景数据
 */
export interface VisionShareData extends SceneExtractedData {
  scene: 'visionshare';
  structured: {
    photographyTime?: {
      date?: string;
      timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
      flexibility?: 'strict' | 'flexible' | 'anytime';
    };
    photographyType?: string[]; // 人像, 风景, 商业, 婚礼, etc.
    budget?: {
      min?: number;
      max?: number;
      currency: string;
    };
    location?: {
      city?: string;
      district?: string;
      address?: string;
      specificVenue?: string;
      indoor?: boolean;
    };
    requirements?: string[];
    photographerPreferences?: {
      style?: string[];
      experience?: string;
      equipment?: string[];
    };
  };
}

/**
 * AgentDate Specific Data
 * AgentDate场景数据
 */
export interface AgentDateData extends SceneExtractedData {
  scene: 'agentdate';
  structured: {
    partnerPreferences?: {
      ageRange?: { min?: number; max?: number };
      height?: { min?: number; max?: number };
      education?: string[];
      occupation?: string[];
      location?: string;
    };
    interests?: string[];
    dateTime?: {
      date?: string;
      timeRange?: string;
      flexibility?: 'strict' | 'flexible' | 'anytime';
    };
    dateActivities?: string[];
    budget?: {
      min?: number;
      max?: number;
      currency: string;
    };
    personalInfo?: {
      selfIntroduction?: string;
      expectations?: string;
    };
  };
}

/**
 * AgentJob Specific Data
 * AgentJob场景数据
 */
export interface AgentJobData extends SceneExtractedData {
  scene: 'agentjob';
  structured: {
    skills?: string[];
    experience?: {
      years?: number;
      level?: 'junior' | 'mid' | 'senior' | 'expert';
      industries?: string[];
    };
    salaryExpectation?: {
      min?: number;
      max?: number;
      currency: string;
      period: 'hourly' | 'daily' | 'monthly' | 'yearly';
    };
    jobType?: string[]; // 全职, 兼职, 实习, 自由职业
    location?: {
      city?: string;
      district?: string;
      address?: string;
      remote?: boolean;
    };
    requirements?: string[];
    benefits?: string[];
  };
}

/**
 * AgentAd Specific Data
 * AgentAd场景数据
 */
export interface AgentAdData extends SceneExtractedData {
  scene: 'agentad';
  structured: {
    product?: {
      name?: string;
      category?: string;
      description?: string;
      condition?: 'new' | 'used' | 'refurbished';
    };
    budget?: {
      min?: number;
      max?: number;
      currency: string;
    };
    brandPreferences?: string[];
    platform?: string[]; // 淘宝, 京东, 拼多多, etc.
    requirements?: string[];
    urgency?: 'high' | 'medium' | 'low';
    purchaseTimeline?: string;
  };
}

/**
 * Scene-Specific Extractor Interface
 * 场景特定提取器接口
 */
export interface SceneSpecificExtractor<T extends SceneExtractedData = SceneExtractedData> {
  /**
   * Scene type this extractor handles
   */
  readonly sceneType: SceneType;

  /**
   * Extract scene-specific data from text
   */
  extract(text: string, context?: Record<string, any>): Promise<T>;

  /**
   * Check if this extractor can handle the given text
   */
  canHandle(text: string): Promise<{ canHandle: boolean; confidence: number }>;

  /**
   * Get required fields for this scene
   */
  getRequiredFields(): string[];

  /**
   * Get optional fields for this scene
   */
  getOptionalFields(): string[];

  /**
   * Validate extracted data
   */
  validate(data: T): { valid: boolean; missingFields: string[] };

  /**
   * Generate clarification questions for missing fields
   */
  generateClarificationQuestions(missingFields: string[]): string[];
}

/**
 * Extractor Registry Entry
 */
export interface ExtractorRegistryEntry {
  sceneType: SceneType;
  extractor: SceneSpecificExtractor;
  priority: number;
}
