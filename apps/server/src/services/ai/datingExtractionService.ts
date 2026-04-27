/**
 * Dating Extraction Service
 * 约会资料智能提取服务
 *
 * LLM-powered extraction of dating profile data from natural language.
 * Features:
 * - Natural language to structured dating profile conversion
 * - Implicit preference detection (negation/emphasis patterns)
 * - Smart completion suggestions for partial profiles
 * - Editable confirmation with confidence scoring
 */

import type {
  DatingProfile,
  BasicConditions,
  PersonalityPreferences,
  InterestPreferences,
  Interest,
  Lifestyle,
  RelationshipExpectations,
  AIExtractedPreference,
  ExtractFromDescriptionRequest,
  ExtractFromDescriptionResponse,
} from '@bridgeai/shared';

import { logger } from '../../utils/logger';
import {
  buildExtractionPrompt,
  buildIntroductionExtractionPrompt,
  buildImplicitPreferencePrompt,
  buildSmartCompletionPrompt,
} from '../../prompts/dating';

import { llmService } from './llmService';
import { metricsService } from './metricsService';
import { LLMProvider } from './types';

// ============================================
// Types
// ============================================

/**
 * Result from extracting dating profile data from natural language text
 */
export interface DatingExtractionResult {
  success: boolean;
  profile: Partial<DatingProfile>;
  extracted: AIExtractedPreference[];
  confidence: number;
  fieldsExtracted: string[];
  fieldsFailed: string[];
  suggestions: string[];
  provider: LLMProvider;
  model: string;
  latencyMs: number;
}

/**
 * Implicit preference detection result
 */
export interface ImplicitPreferenceResult {
  negations: ImplicitPreference[];
  emphases: ImplicitPreference[];
  inferred: ImplicitPreference[];
  summary: string;
  provider: LLMProvider;
  model: string;
  latencyMs: number;
}

/**
 * Single implicit preference
 */
export interface ImplicitPreference {
  originalText: string;
  preference: string;
  category: string;
  mappedField: string;
  mappedValue: string;
  confidence: number;
  reasoning?: string;
}

/**
 * Smart completion suggestion
 */
export interface CompletionSuggestion {
  field: string;
  currentValue: any;
  suggestedValue: any;
  reasoning: string;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  prompt: string;
}

/**
 * Missing section info
 */
export interface MissingSection {
  section: string;
  importance: 'high' | 'medium' | 'low';
  fieldsMissing: number;
  suggestedPrompt: string;
}

/**
 * Smart completion result
 */
export interface SmartCompletionResult {
  suggestions: CompletionSuggestion[];
  missingSections: MissingSection[];
  overallCompleteness: number;
  topPrioritySuggestion: string;
  provider: LLMProvider;
  model: string;
  latencyMs: number;
}

// ============================================
// Service Class
// ============================================

/**
 * Dating Extraction Service
 * 约会资料智能提取服务 - 使用LLM从自然语言中提取结构化约会资料
 */
export class DatingExtractionService {
  private version = '1.0.0';

  /**
   * Extract dating profile data from natural language text
   * 从自然语言文本中提取约会资料数据
   */
  async extractFromText(
    text: string,
    currentProfile?: Partial<DatingProfile>
  ): Promise<DatingExtractionResult> {
    const startTime = Date.now();

    try {
      logger.info('Starting dating profile extraction', {
        textLength: text.length,
        hasCurrentProfile: !!currentProfile,
      });

      const prompt = buildExtractionPrompt(text, currentProfile as Record<string, any> | undefined);

      const response = await llmService.generateText(prompt, {
        temperature: 0.3,
        maxTokens: 2500,
      });

      const parsed = this.parseExtractionResult(response.text);
      const profile = this.buildProfileFromExtraction(parsed);
      const extracted = this.buildExtractedPreferences(parsed);
      const fieldsExtracted = this.getFieldsExtracted(profile);
      const fieldsFailed = this.getFieldsFailed(parsed);
      const suggestions = parsed.suggestions || [];
      const confidence = parsed.confidence || 0;

      const latencyMs = Date.now() - startTime;

      await this.recordMetrics('extractFromText', response, latencyMs, true);

      logger.info('Dating profile extraction completed', {
        confidence,
        fieldsExtracted: fieldsExtracted.length,
        fieldsFailed: fieldsFailed.length,
        latencyMs,
      });

      return {
        success: true,
        profile,
        extracted,
        confidence,
        fieldsExtracted,
        fieldsFailed,
        suggestions,
        provider: response.provider,
        model: response.model,
        latencyMs,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      logger.error('Dating profile extraction failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        textLength: text.length,
      });

      await this.recordMetrics('extractFromText', null, latencyMs, false);

      throw error;
    }
  }

  /**
   * Extract dating profile data from a self-introduction text
   * 从自我介绍中提取约会资料数据
   */
  async extractFromIntroduction(introduction: string): Promise<DatingExtractionResult> {
    const startTime = Date.now();

    try {
      logger.info('Starting dating introduction extraction', {
        textLength: introduction.length,
      });

      const prompt = buildIntroductionExtractionPrompt(introduction);

      const response = await llmService.generateText(prompt, {
        temperature: 0.3,
        maxTokens: 2000,
      });

      const parsed = this.parseExtractionResult(response.text);
      const profile = this.buildProfileFromExtraction(parsed);
      const extracted = this.buildExtractedPreferences(parsed);
      const fieldsExtracted = this.getFieldsExtracted(profile);
      const fieldsFailed = this.getFieldsFailed(parsed);
      const suggestions = parsed.suggestions || [];
      const confidence = parsed.confidence || 0;

      const latencyMs = Date.now() - startTime;

      await this.recordMetrics('extractFromIntroduction', response, latencyMs, true);

      logger.info('Dating introduction extraction completed', {
        confidence,
        fieldsExtracted: fieldsExtracted.length,
        latencyMs,
      });

      return {
        success: true,
        profile,
        extracted,
        confidence,
        fieldsExtracted,
        fieldsFailed,
        suggestions,
        provider: response.provider,
        model: response.model,
        latencyMs,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      logger.error('Dating introduction extraction failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      await this.recordMetrics('extractFromIntroduction', null, latencyMs, false);

      throw error;
    }
  }

  /**
   * Detect implicit preferences from text (negation, emphasis, inferred)
   * 检测文本中的隐含偏好（否定、强调、推断）
   */
  async detectImplicitPreferences(text: string): Promise<ImplicitPreferenceResult> {
    const startTime = Date.now();

    try {
      logger.info('Starting implicit preference detection', {
        textLength: text.length,
      });

      const prompt = buildImplicitPreferencePrompt(text);

      const response = await llmService.generateText(prompt, {
        temperature: 0.3,
        maxTokens: 1500,
      });

      const parsed = this.parseImplicitResult(response.text);
      const latencyMs = Date.now() - startTime;

      await this.recordMetrics('detectImplicitPreferences', response, latencyMs, true);

      logger.info('Implicit preference detection completed', {
        negations: parsed.negations.length,
        emphases: parsed.emphases.length,
        inferred: parsed.inferred.length,
        latencyMs,
      });

      return {
        ...parsed,
        provider: response.provider,
        model: response.model,
        latencyMs,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      logger.error('Implicit preference detection failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      await this.recordMetrics('detectImplicitPreferences', null, latencyMs, false);

      throw error;
    }
  }

  /**
   * Generate smart completion suggestions for a partial dating profile
   * 为部分填写的约会资料生成智能补全建议
   */
  async suggestCompletions(
    partialProfile: Partial<DatingProfile>,
    description?: string
  ): Promise<SmartCompletionResult> {
    const startTime = Date.now();

    try {
      logger.info('Starting smart completion suggestions', {
        hasDescription: !!description,
      });

      const prompt = buildSmartCompletionPrompt(partialProfile as Record<string, any>, description);

      const response = await llmService.generateText(prompt, {
        temperature: 0.4,
        maxTokens: 1500,
      });

      const parsed = this.parseCompletionResult(response.text);
      const latencyMs = Date.now() - startTime;

      await this.recordMetrics('suggestCompletions', response, latencyMs, true);

      logger.info('Smart completion suggestions generated', {
        suggestionCount: parsed.suggestions.length,
        overallCompleteness: parsed.overallCompleteness,
        latencyMs,
      });

      return {
        ...parsed,
        provider: response.provider,
        model: response.model,
        latencyMs,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      logger.error('Smart completion suggestion failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      await this.recordMetrics('suggestCompletions', null, latencyMs, false);

      throw error;
    }
  }

  /**
   * Convenience method matching the ExtractFromDescription API pattern
   * 便捷方法，匹配 ExtractFromDescriptionRequest/Response API
   */
  async extractFromDescription(
    request: ExtractFromDescriptionRequest
  ): Promise<ExtractFromDescriptionResponse> {
    const result = await this.extractFromText(request.description, request.currentProfile);

    return {
      extracted: {
        basicConditions: result.profile.basicConditions,
        personality: result.profile.personality,
        interests: result.profile.interests,
        lifestyle: result.profile.lifestyle,
        expectations: result.profile.expectations,
        extracted: result.extracted,
        confidence: result.confidence,
        suggestions: result.suggestions,
      },
      profile: result.profile,
      confidence: result.confidence,
    };
  }

  /**
   * Get service version
   */
  getVersion(): string {
    return this.version;
  }

  // ============================================
  // Private helpers
  // ============================================

  /**
   * Parse the LLM extraction result JSON
   */
  private parseExtractionResult(text: string): any {
    try {
      const jsonMatch =
        text.match(/```json\n?([\s\S]*?)\n?```/) ||
        text.match(/```\n?([\s\S]*?)\n?```/) ||
        text.match(/(\{[\s\S]*\})/);

      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;
      return JSON.parse(jsonStr.trim());
    } catch (error) {
      logger.error('Failed to parse dating extraction result', { error, text });
      return { confidence: 0, extracted: [], suggestions: [] };
    }
  }

  /**
   * Parse implicit preference result JSON
   */
  private parseImplicitResult(
    text: string
  ): Omit<ImplicitPreferenceResult, 'provider' | 'model' | 'latencyMs'> {
    try {
      const jsonMatch =
        text.match(/```json\n?([\s\S]*?)\n?```/) ||
        text.match(/```\n?([\s\S]*?)\n?```/) ||
        text.match(/(\{[\s\S]*\})/);

      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;
      const result = JSON.parse(jsonStr.trim());

      return {
        negations: (result.negations || []).map((n: any) => ({
          originalText: n.originalText || '',
          preference: n.preference || '',
          category: n.category || '',
          mappedField: n.mappedField || '',
          mappedValue: n.mappedValue || '',
          confidence: n.confidence || 50,
        })),
        emphases: (result.emphases || []).map((e: any) => ({
          originalText: e.originalText || '',
          preference: e.preference || '',
          category: e.category || '',
          mappedField: e.mappedField || '',
          mappedValue: e.mappedValue || '',
          confidence: e.confidence || 50,
        })),
        inferred: (result.inferred || []).map((i: any) => ({
          originalText: i.originalText || '',
          preference: i.preference || '',
          category: i.category || '',
          mappedField: i.mappedField || '',
          mappedValue: i.mappedValue || '',
          confidence: i.confidence || 50,
          reasoning: i.reasoning || '',
        })),
        summary: result.summary || '',
      };
    } catch (error) {
      logger.error('Failed to parse implicit preference result', { error, text });
      return { negations: [], emphases: [], inferred: [], summary: '' };
    }
  }

  /**
   * Parse smart completion result JSON
   */
  private parseCompletionResult(
    text: string
  ): Omit<SmartCompletionResult, 'provider' | 'model' | 'latencyMs'> {
    try {
      const jsonMatch =
        text.match(/```json\n?([\s\S]*?)\n?```/) ||
        text.match(/```\n?([\s\S]*?)\n?```/) ||
        text.match(/(\{[\s\S]*\})/);

      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;
      const result = JSON.parse(jsonStr.trim());

      return {
        suggestions: (result.suggestions || []).map((s: any) => ({
          field: s.field || '',
          currentValue: s.currentValue,
          suggestedValue: s.suggestedValue,
          reasoning: s.reasoning || '',
          confidence: s.confidence || 50,
          priority: s.priority || 'medium',
          prompt: s.prompt || '',
        })),
        missingSections: (result.missingSections || []).map((m: any) => ({
          section: m.section || '',
          importance: m.importance || 'medium',
          fieldsMissing: m.fieldsMissing || 0,
          suggestedPrompt: m.suggestedPrompt || '',
        })),
        overallCompleteness: result.overallCompleteness || 0,
        topPrioritySuggestion: result.topPrioritySuggestion || '',
      };
    } catch (error) {
      logger.error('Failed to parse smart completion result', { error, text });
      return {
        suggestions: [],
        missingSections: [],
        overallCompleteness: 0,
        topPrioritySuggestion: '',
      };
    }
  }

  /**
   * Build a Partial<DatingProfile> from the parsed LLM extraction
   */
  private buildProfileFromExtraction(parsed: any): Partial<DatingProfile> {
    const profile: Partial<DatingProfile> = {};

    if (parsed.basicConditions && Object.keys(parsed.basicConditions).length > 0) {
      profile.basicConditions = this.normalizeBasicConditions(parsed.basicConditions);
    }

    if (parsed.personality && Object.keys(parsed.personality).length > 0) {
      profile.personality = this.normalizePersonality(parsed.personality);
    }

    if (parsed.interests && Object.keys(parsed.interests).length > 0) {
      profile.interests = this.normalizeInterests(parsed.interests);
    }

    if (parsed.lifestyle && Object.keys(parsed.lifestyle).length > 0) {
      profile.lifestyle = this.normalizeLifestyle(parsed.lifestyle);
    }

    if (parsed.expectations && Object.keys(parsed.expectations).length > 0) {
      profile.expectations = this.normalizeExpectations(parsed.expectations);
    }

    return profile;
  }

  /**
   * Build AIExtractedPreference[] from the parsed extraction
   */
  private buildExtractedPreferences(parsed: any): AIExtractedPreference[] {
    const extracted: AIExtractedPreference[] = (parsed.extracted || []).map((e: any) => ({
      category: e.category || '',
      value: e.value,
      confidence: e.confidence || 50,
      source: e.source || 'inferred',
    }));

    return extracted;
  }

  /**
   * Get list of successfully extracted field paths
   */
  private getFieldsExtracted(profile: Partial<DatingProfile>): string[] {
    const fields: string[] = [];
    if (profile.basicConditions) fields.push('basicConditions');
    if (profile.personality) fields.push('personality');
    if (profile.interests) fields.push('interests');
    if (profile.lifestyle) fields.push('lifestyle');
    if (profile.expectations) fields.push('expectations');
    return fields;
  }

  /**
   * Get list of fields that failed to extract
   */
  private getFieldsFailed(parsed: any): string[] {
    const failed: string[] = [];
    const requiredSections = [
      'basicConditions',
      'personality',
      'interests',
      'lifestyle',
      'expectations',
    ];
    for (const section of requiredSections) {
      if (!parsed[section] || Object.keys(parsed[section] || {}).length === 0) {
        failed.push(section);
      }
    }
    return failed;
  }

  /**
   * Normalize basic conditions from LLM output
   */
  private normalizeBasicConditions(data: any): BasicConditions {
    const result: BasicConditions = {};
    if (data.ageRange) result.ageRange = data.ageRange;
    if (data.heightRange) result.heightRange = data.heightRange;
    if (data.education) result.education = data.education;
    if (data.income) result.income = data.income;
    if (data.location) result.location = data.location;
    if (data.hasPhoto !== undefined) result.hasPhoto = data.hasPhoto;
    if (data.isVerified !== undefined) result.isVerified = data.isVerified;
    return result;
  }

  /**
   * Normalize personality preferences from LLM output
   */
  private normalizePersonality(data: any): PersonalityPreferences {
    const result: PersonalityPreferences = {};
    if (data.traits) result.traits = data.traits;
    if (data.preferredTraits) result.preferredTraits = data.preferredTraits;
    if (data.dislikedTraits) result.dislikedTraits = data.dislikedTraits;
    if (data.mbti) result.mbti = data.mbti;
    return result;
  }

  /**
   * Normalize interest preferences from LLM output
   */
  private normalizeInterests(data: any): InterestPreferences {
    const result: InterestPreferences = { interests: [] };
    if (Array.isArray(data.interests)) {
      result.interests = data.interests.map((i: any) => {
        const interest: Interest = {
          category: i.category,
          name: i.name || i.category,
        };
        if (i.level) interest.level = i.level;
        return interest;
      });
    }
    if (data.customInterests) result.customInterests = data.customInterests;
    if (data.preferredInPartner) result.preferredInPartner = data.preferredInPartner;
    if (data.sharedInterests) result.sharedInterests = data.sharedInterests;
    return result;
  }

  /**
   * Normalize lifestyle from LLM output
   */
  private normalizeLifestyle(data: any): Lifestyle {
    const result: Lifestyle = {};
    if (data.sleepSchedule) result.sleepSchedule = data.sleepSchedule;
    if (data.smoking) result.smoking = data.smoking;
    if (data.drinking) result.drinking = data.drinking;
    if (data.pets) result.pets = data.pets;
    if (data.exercise) result.exercise = data.exercise;
    if (data.diet) result.diet = data.diet;
    if (data.workLifeBalance) result.workLifeBalance = data.workLifeBalance;
    if (data.socialFrequency) result.socialFrequency = data.socialFrequency;
    return result;
  }

  /**
   * Normalize relationship expectations from LLM output
   */
  private normalizeExpectations(data: any): RelationshipExpectations {
    const result: RelationshipExpectations = {
      purpose: data.purpose || 'NOT_SURE',
    };
    if (data.pace) result.pace = data.pace;
    if (data.living) result.living = data.living;
    if (data.familyPlan) result.familyPlan = data.familyPlan;
    if (data.marriageTimeline) result.marriageTimeline = data.marriageTimeline;
    if (data.longDistance) result.longDistance = data.longDistance;
    return result;
  }

  /**
   * Record metrics for the LLM call
   */
  private async recordMetrics(
    operation: string,
    response: any,
    latencyMs: number,
    success: boolean
  ): Promise<void> {
    try {
      await metricsService.recordRequest({
        requestId: `dating-${operation}-${Date.now()}`,
        provider: response?.provider || ('unknown' as LLMProvider),
        model: response?.model || 'unknown',
        latencyMs,
        success,
        tokenUsage: response?.usage
          ? {
              input: response.usage.promptTokens || 0,
              output: response.usage.completionTokens || 0,
              total: response.usage.totalTokens || 0,
            }
          : { input: 0, output: 0, total: 0 },
        costUsd: response?.cost || 0,
      });
    } catch (metricsError) {
      // Don't let metrics recording failure affect the main flow
      logger.warn('Failed to record dating extraction metrics', {
        error: metricsError instanceof Error ? metricsError.message : 'Unknown error',
      });
    }
  }
}

// Export singleton instance
export const datingExtractionService = new DatingExtractionService();
