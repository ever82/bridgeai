/**
 * Job Supply Extractor
 * AgentJob 供给提取器 - 求职者供给信息提取
 */
import { BaseSupplyExtractor } from './baseSupplyExtractor';
import { JobSupplyData, SupplySceneType } from './types';
/**
 * Job Supply Extractor
 * Extracts job seeker supply information (skills, experience, expectations)
 */
export declare class JobSupplyExtractor extends BaseSupplyExtractor<JobSupplyData> {
    private readonly sceneTypeValue;
    protected readonly detectionKeywords: string[];
    protected readonly requiredFields: string[];
    protected readonly optionalFields: string[];
    getSceneType(): SupplySceneType;
    /**
     * Extract Job supply data from text
     */
    extract(text: string, _context?: Record<string, any>): Promise<JobSupplyData>;
    /**
     * Extract skills
     */
    private extractSkills;
    /**
     * Extract experience
     */
    private extractExperience;
    /**
     * Extract expectations
     */
    private extractExpectations;
    /**
     * Extract education
     */
    private extractEducation;
    /**
     * Extract qualification
     */
    private extractQualification;
    /**
     * Calculate confidence
     */
    private calculateConfidence;
    protected getClarificationQuestion(field: string): string;
}
//# sourceMappingURL=jobSupplyExtractor.d.ts.map