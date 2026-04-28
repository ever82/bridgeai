/**
 * Base Scene Extractor
 * 场景提取器基类
 */
import { SceneSpecificExtractor, SceneType, SceneExtractedData, SceneExtractedEntity } from './types';
/**
 * Base class for scene-specific extractors
 */
export declare abstract class BaseSceneExtractor<T extends SceneExtractedData> implements SceneSpecificExtractor<T> {
    abstract readonly sceneType: SceneType;
    protected abstract readonly detectionKeywords: string[];
    protected abstract readonly requiredFields: string[];
    protected abstract readonly optionalFields: string[];
    /**
     * Extract scene-specific data from text
     * Must be implemented by subclasses
     */
    abstract extract(text: string, context?: Record<string, any>): Promise<T>;
    /**
     * Check if this extractor can handle the given text
     */
    canHandle(text: string): Promise<{
        canHandle: boolean;
        confidence: number;
    }>;
    /**
     * Get required fields for this scene
     */
    getRequiredFields(): string[];
    /**
     * Get detection keywords for this scene
     */
    getDetectionKeywords(): string[];
    /**
     * Get optional fields for this scene
     */
    getOptionalFields(): string[];
    /**
     * Validate extracted data
     */
    validate(data: T): {
        valid: boolean;
        missingFields: string[];
    };
    /**
     * Generate clarification questions for missing fields
     */
    generateClarificationQuestions(missingFields: string[]): string[];
    /**
     * Check if a field exists in the structured data
     */
    protected hasField(obj: Record<string, any>, field: string): boolean;
    /**
     * Get clarification question for a specific field
     * Can be overridden by subclasses for scene-specific questions
     */
    protected getClarificationQuestion(field: string): string;
    /**
     * Extract entities from text using regex patterns
     */
    protected extractEntitiesWithPatterns(text: string, patterns: Record<string, RegExp[]>): SceneExtractedEntity[];
    /**
     * Parse budget from text
     */
    protected parseBudget(text: string): {
        min?: number;
        max?: number;
        currency: string;
    } | undefined;
    /**
     * Parse location from text
     */
    protected parseLocation(text: string): {
        city?: string;
        district?: string;
        address?: string;
    };
    /**
     * Parse time information from text
     */
    protected parseTime(text: string): {
        date?: string;
        timeRange?: string;
        flexibility?: 'strict' | 'flexible' | 'anytime';
    };
}
//# sourceMappingURL=baseExtractor.d.ts.map