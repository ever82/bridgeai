/**
 * Demand Extraction Service
 * 需求智能提炼服务 - 核心框架
 * 提供自然语言理解、实体识别、意图分类和结构化输出
 */
import { LLMProvider } from './types';
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
    normalizedValue?: string | number | {
        min: number;
        max: number;
    };
    startIndex: number;
    endIndex: number;
    confidence: number;
}
/**
 * Intent Type
 */
export type IntentType = 'create_demand' | 'update_demand' | 'search_demand' | 'clarify_demand' | 'confirm_demand' | 'cancel_demand' | 'unknown';
/**
 * Intent Classification Result
 */
export interface IntentResult {
    intent: IntentType;
    confidence: number;
    alternatives: {
        intent: IntentType;
        confidence: number;
    }[];
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
        conversationHistory?: {
            role: 'user' | 'assistant';
            content: string;
        }[];
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
export declare class DemandExtractionService {
    private version;
    private minConfidenceThreshold;
    /**
     * Extract demand from natural language text
     * 从自然语言文本中提取需求
     */
    extract(request: DemandExtractionRequest, options?: ExtractionOptions): Promise<Demand>;
    /**
     * Classify intent from text
     * 意图分类
     */
    private classifyIntent;
    /**
     * Build intent classification prompt
     */
    private buildIntentClassificationPrompt;
    /**
     * Parse intent classification result
     */
    private parseIntentResult;
    /**
     * Extract entities from text
     * 实体识别
     */
    private extractEntities;
    /**
     * Build entity extraction prompt
     */
    private buildEntityExtractionPrompt;
    /**
     * Parse entity extraction result
     */
    private parseEntities;
    /**
     * Build structured demand from entities
     */
    private buildStructuredDemand;
    /**
     * Process location entity
     */
    private processLocationEntity;
    /**
     * Process time entity
     */
    private processTimeEntity;
    /**
     * Process person entity
     */
    private processPersonEntity;
    /**
     * Process budget entity
     */
    private processBudgetEntity;
    /**
     * Generate title from demand content
     */
    private generateTitle;
    /**
     * Check if clarification is needed
     */
    private checkClarificationNeeded;
    /**
     * Calculate overall confidence score
     */
    private calculateConfidence;
    /**
     * Record metrics for the extraction
     */
    private recordMetrics;
    /**
     * Get default extraction options
     */
    private getDefaultOptions;
    /**
     * Get default intent result
     */
    private getDefaultIntent;
    /**
     * Get service version
     */
    getVersion(): string;
    /**
     * Set minimum confidence threshold
     */
    setMinConfidenceThreshold(threshold: number): void;
}
export declare const demandExtractionService: DemandExtractionService;
//# sourceMappingURL=demandExtractionService.d.ts.map