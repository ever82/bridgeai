/**
 * AgentAd Scene Extractor
 * AgentAd场景提取器 - 广告商品需求
 */
import { BaseSceneExtractor } from './baseExtractor';
import { AgentAdData, SceneType } from './types';
/**
 * AgentAd Extractor - Handles product advertisement and shopping demands
 */
export declare class AgentAdExtractor extends BaseSceneExtractor<AgentAdData> {
    readonly sceneType: SceneType;
    protected readonly detectionKeywords: string[];
    protected readonly requiredFields: string[];
    protected readonly optionalFields: string[];
    /**
     * Extract AgentAd-specific data from text
     */
    extract(text: string, _context?: Record<string, any>): Promise<AgentAdData>;
    /**
     * Extract entities specific to AgentAd scene
     */
    private extractAgentAdEntities;
    /**
     * Build structured AgentAd data from entities
     */
    private buildStructuredData;
    /**
     * Extract product information from text
     */
    private extractProductInfo;
    /**
     * Extract brand preferences from text
     */
    private extractBrandPreferences;
    /**
     * Extract platform preferences from text
     */
    private extractPlatform;
    /**
     * Extract requirements from text
     */
    private extractRequirements;
    /**
     * Extract urgency level from text
     */
    private extractUrgency;
    /**
     * Extract purchase timeline from text
     */
    private extractPurchaseTimeline;
    /**
     * Calculate confidence score
     */
    private calculateConfidence;
    /**
     * Override get clarification question for AgentAd-specific fields
     */
    protected getClarificationQuestion(field: string): string;
}
//# sourceMappingURL=agentAdExtractor.d.ts.map