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
import type { DatingProfile, AIExtractedPreference, ExtractFromDescriptionRequest, ExtractFromDescriptionResponse } from '@bridgeai/shared';
import { LLMProvider } from './types';
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
/**
 * Dating Extraction Service
 * 约会资料智能提取服务 - 使用LLM从自然语言中提取结构化约会资料
 */
export declare class DatingExtractionService {
    private version;
    /**
     * Extract dating profile data from natural language text
     * 从自然语言文本中提取约会资料数据
     */
    extractFromText(text: string, currentProfile?: Partial<DatingProfile>): Promise<DatingExtractionResult>;
    /**
     * Extract dating profile data from a self-introduction text
     * 从自我介绍中提取约会资料数据
     */
    extractFromIntroduction(introduction: string): Promise<DatingExtractionResult>;
    /**
     * Detect implicit preferences from text (negation, emphasis, inferred)
     * 检测文本中的隐含偏好（否定、强调、推断）
     */
    detectImplicitPreferences(text: string): Promise<ImplicitPreferenceResult>;
    /**
     * Generate smart completion suggestions for a partial dating profile
     * 为部分填写的约会资料生成智能补全建议
     */
    suggestCompletions(partialProfile: Partial<DatingProfile>, description?: string): Promise<SmartCompletionResult>;
    /**
     * Convenience method matching the ExtractFromDescription API pattern
     * 便捷方法，匹配 ExtractFromDescriptionRequest/Response API
     */
    extractFromDescription(request: ExtractFromDescriptionRequest): Promise<ExtractFromDescriptionResponse>;
    /**
     * Get service version
     */
    getVersion(): string;
    /**
     * Parse the LLM extraction result JSON
     */
    private parseExtractionResult;
    /**
     * Parse implicit preference result JSON
     */
    private parseImplicitResult;
    /**
     * Parse smart completion result JSON
     */
    private parseCompletionResult;
    /**
     * Build a Partial<DatingProfile> from the parsed LLM extraction
     */
    private buildProfileFromExtraction;
    /**
     * Build AIExtractedPreference[] from the parsed extraction
     */
    private buildExtractedPreferences;
    /**
     * Get list of successfully extracted field paths
     */
    private getFieldsExtracted;
    /**
     * Get list of fields that failed to extract
     */
    private getFieldsFailed;
    /**
     * Normalize basic conditions from LLM output
     */
    private normalizeBasicConditions;
    /**
     * Normalize personality preferences from LLM output
     */
    private normalizePersonality;
    /**
     * Normalize interest preferences from LLM output
     */
    private normalizeInterests;
    /**
     * Normalize lifestyle from LLM output
     */
    private normalizeLifestyle;
    /**
     * Normalize relationship expectations from LLM output
     */
    private normalizeExpectations;
    /**
     * Record metrics for the LLM call
     */
    private recordMetrics;
}
export declare const datingExtractionService: DatingExtractionService;
//# sourceMappingURL=datingExtractionService.d.ts.map