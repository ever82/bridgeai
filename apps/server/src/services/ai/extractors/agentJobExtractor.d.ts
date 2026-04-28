/**
 * AgentJob Scene Extractor
 * AgentJob场景提取器 - 求职招聘需求
 */
import { BaseSceneExtractor } from './baseExtractor';
import { AgentJobData, SceneType } from './types';
/**
 * AgentJob Extractor - Handles job search and recruitment demands
 */
export declare class AgentJobExtractor extends BaseSceneExtractor<AgentJobData> {
    readonly sceneType: SceneType;
    protected readonly detectionKeywords: string[];
    protected readonly requiredFields: string[];
    protected readonly optionalFields: string[];
    /**
     * Extract AgentJob-specific data from text
     */
    extract(text: string, _context?: Record<string, any>): Promise<AgentJobData>;
    /**
     * Extract entities specific to AgentJob scene
     */
    private extractAgentJobEntities;
    /**
     * Build structured AgentJob data from entities
     */
    private buildStructuredData;
    /**
     * Extract skills from text
     */
    private extractSkills;
    /**
     * Extract experience from text
     */
    private extractExperience;
    /**
     * Extract salary expectation from text
     */
    private extractSalaryExpectation;
    /**
     * Extract job type from text
     */
    private extractJobType;
    /**
     * Extract location from text
     */
    private extractLocation;
    /**
     * Extract requirements from text
     */
    private extractRequirements;
    /**
     * Extract benefits from text
     */
    private extractBenefits;
    /**
     * Calculate confidence score
     */
    private calculateConfidence;
    /**
     * Override get clarification question for AgentJob-specific fields
     */
    protected getClarificationQuestion(field: string): string;
}
//# sourceMappingURL=agentJobExtractor.d.ts.map