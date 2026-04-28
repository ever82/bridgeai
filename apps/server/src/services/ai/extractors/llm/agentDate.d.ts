/**
 * AgentDate Extractor
 * 婚恋交友场景提取器 - 提取择偶标准、兴趣、时间等信息
 */
import { Demand, DemandExtractionRequest } from '../../demandExtractionService';
import { BaseSceneExtractor, SceneType } from './base';
/**
 * AgentDate Specific Fields
 */
export interface AgentDateFields {
    title?: string;
    description?: string;
    gender: string;
    ageRange: {
        min?: number;
        max?: number;
    };
    heightRange: {
        min?: number;
        max?: number;
    };
    location: string;
    education: string;
    occupation: string;
    incomeRange: {
        min?: number;
        max?: number;
    };
    interests: string[];
    personalityTraits: string[];
    appearancePreferences: string[];
    relationshipGoals: string;
    meetingTime: string;
    meetingLocation: string;
    activityType: string;
}
export declare class AgentDateExtractor extends BaseSceneExtractor {
    protected sceneType: SceneType;
    protected requiredFields: string[];
    extract(request: DemandExtractionRequest): Promise<Partial<Demand>>;
    private buildExtractionPrompt;
    private parseAgentDateData;
    private buildAgentDateDemand;
    private calculateConfidence;
    private generateQuestions;
}
export declare const agentDateExtractor: AgentDateExtractor;
//# sourceMappingURL=agentDate.d.ts.map