/**
 * AgentDate Scene Extractor
 * AgentDate场景提取器 - 交友约会需求
 */
import { PersonalityTrait, InterestCategory, DatingPurpose } from '@bridgeai/shared';
import { BaseSceneExtractor } from './baseExtractor';
import { AgentDateData, SceneType } from './types';
/**
 * AgentDate Extractor - Handles dating and matchmaking demands
 */
export declare class AgentDateExtractor extends BaseSceneExtractor<AgentDateData> {
    readonly sceneType: SceneType;
    protected readonly detectionKeywords: string[];
    protected readonly requiredFields: string[];
    protected readonly optionalFields: string[];
    /**
     * Extract AgentDate-specific data from text
     */
    extract(text: string, _context?: Record<string, unknown>): Promise<AgentDateData>;
    /**
     * Extract entities specific to AgentDate scene
     */
    private extractAgentDateEntities;
    /**
     * Build structured AgentDate data from entities
     */
    private buildStructuredData;
    /**
     * Extract partner preferences from text
     */
    private extractPartnerPreferences;
    /**
     * Extract interests from text
     */
    private extractInterests;
    /**
     * Extract date time from text
     */
    private extractDateTime;
    /**
     * Extract date activities from text
     */
    private extractDateActivities;
    /**
     * Extract personal info from text
     */
    private extractPersonalInfo;
    /**
     * Calculate confidence score
     */
    private calculateConfidence;
    /**
     * Override get clarification question for AgentDate-specific fields
     */
    protected getClarificationQuestion(field: string): string;
    /**
     * Generate an ice-breaking greeting message for initial chat with another agent.
     * AS-DATE-002-AC-1: 寒暄破冰
     *
     * @param ownerName - Name of the owner's agent
     * @param partnerProfile - Partner's profile info for personalization
     * @returns Ice-breaking message content
     */
    generateIceBreakingMessage(ownerName: string, partnerProfile?: {
        name?: string;
        interests?: string[];
        personality?: string[];
    }): string;
    /**
     * Evaluate personality match between owner and partner.
     * AS-DATE-002-AC-2: 评估性格匹配度
     *
     * @param ownerTraits - Owner's personality traits
     * @param partnerTraits - Partner's personality traits
     * @param ownerInterests - Owner's interests
     * @param partnerInterests - Partner's interests
     * @param datingPurpose - Dating purpose/goals
     * @returns Personality match evaluation result
     */
    evaluatePersonalityMatch(ownerTraits: PersonalityTrait[], partnerTraits: PersonalityTrait[], ownerInterests: InterestCategory[], partnerInterests: InterestCategory[], datingPurpose?: DatingPurpose): PersonalityMatchResult;
    /**
     * Score trait compatibility between two personality sets.
     */
    private scoreTraitCompatibility;
    /**
     * Score interest overlap between owner and partner.
     */
    private scoreInterestOverlap;
    /**
     * Score MBTI complement compatibility (introvert-extrovert balance).
     */
    private scoreMbtiComplement;
    /**
     * Get purpose weight multiplier for dating purpose.
     */
    private getPurposeWeight;
    /**
     * Generate match advice based on evaluation results.
     */
    private generateMatchAdvice;
}
/**
 * Personality match evaluation result
 */
export interface PersonalityMatchResult {
    overallScore: number;
    traitScore: number;
    interestScore: number;
    mbtiScore: number;
    sharedTraits: PersonalityTrait[];
    sharedTraitsCount: number;
    sharedInterests: InterestCategory[];
    sharedInterestsCount: number;
    matchLevel: 'high' | 'medium' | 'low';
    advice: string;
}
//# sourceMappingURL=agentDateExtractor.d.ts.map