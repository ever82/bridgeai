/**
 * VisionShare Scene Extractor
 * VisionShare场景提取器 - 摄影服务需求
 */
import { BaseSceneExtractor } from './baseExtractor';
import { VisionShareData, SceneType } from './types';
/**
 * VisionShare Extractor - Handles photography service demands
 */
export declare class VisionShareExtractor extends BaseSceneExtractor<VisionShareData> {
    readonly sceneType: SceneType;
    protected readonly detectionKeywords: string[];
    protected readonly requiredFields: string[];
    protected readonly optionalFields: string[];
    /**
     * Extract VisionShare-specific data from text
     */
    extract(text: string, _context?: Record<string, any>): Promise<VisionShareData>;
    /**
     * Extract entities specific to VisionShare scene
     */
    private extractVisionShareEntities;
    /**
     * Build structured VisionShare data from entities
     */
    private buildStructuredData;
    /**
     * Extract photography type from text
     */
    private extractPhotographyType;
    /**
     * Extract photography time from text
     */
    private extractPhotographyTime;
    /**
     * Extract requirements from text
     */
    private extractRequirements;
    /**
     * Extract photographer preferences from text
     */
    private extractPhotographerPreferences;
    /**
     * Calculate confidence score
     */
    private calculateConfidence;
    /**
     * Override get clarification question for VisionShare-specific fields
     */
    protected getClarificationQuestion(field: string): string;
}
//# sourceMappingURL=visionShareExtractor.d.ts.map