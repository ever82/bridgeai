/**
 * AgentAd Extractor
 * 广告投放场景提取器 - 提取商品、预算、品牌偏好等信息
 */
import { Demand, DemandExtractionRequest } from '../../demandExtractionService';
import { BaseSceneExtractor, SceneType } from './base';
/**
 * AgentAd Specific Fields
 */
export interface AgentAdFields {
    title?: string;
    description?: string;
    adType: string;
    productCategory: string;
    productName: string;
    brand: string;
    targetAudience: string;
    targetLocation: string;
    budget: {
        min?: number;
        max?: number;
        currency: string;
        daily?: number;
    };
    duration: {
        startDate: string;
        endDate: string;
        days?: number;
    };
    adFormat: string[];
    platforms: string[];
    campaignGoals: string[];
    creativeRequirements: string[];
    kpiTargets: {
        impressions?: number;
        clicks?: number;
        conversions?: number;
        cpa?: number;
    };
    industry: string;
    urgency: string;
}
export declare class AgentAdExtractor extends BaseSceneExtractor {
    protected sceneType: SceneType;
    protected requiredFields: string[];
    extract(request: DemandExtractionRequest): Promise<Partial<Demand>>;
    private buildExtractionPrompt;
    private parseAgentAdData;
    private buildAgentAdDemand;
    private calculateConfidence;
    private generateQuestions;
}
export declare const agentAdExtractor: AgentAdExtractor;
//# sourceMappingURL=agentAd.d.ts.map