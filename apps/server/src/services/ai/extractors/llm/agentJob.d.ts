/**
 * AgentJob Extractor
 * 招聘求职场景提取器 - 提取技能、经验、薪资期望等信息
 */
import { Demand, DemandExtractionRequest } from '../../demandExtractionService';
import { BaseSceneExtractor, SceneType } from './base';
/**
 * AgentJob Specific Fields
 */
export interface AgentJobFields {
    title?: string;
    description?: string;
    jobType: 'hire' | 'seek' | '';
    position: string;
    jobCategory: string;
    skills: string[];
    experienceYears: {
        min?: number;
        max?: number;
    };
    educationRequirement: string;
    salaryRange: {
        min?: number;
        max?: number;
        currency: string;
        unit: string;
    };
    location: string;
    workType: string;
    companySize: string;
    companyIndustry: string;
    benefits: string[];
    responsibilities: string[];
    startDate: string;
    urgency: string;
}
export declare class AgentJobExtractor extends BaseSceneExtractor {
    protected sceneType: SceneType;
    protected requiredFields: string[];
    extract(request: DemandExtractionRequest): Promise<Partial<Demand>>;
    private buildExtractionPrompt;
    private parseAgentJobData;
    private buildAgentJobDemand;
    private calculateConfidence;
    private generateQuestions;
}
export declare const agentJobExtractor: AgentJobExtractor;
//# sourceMappingURL=agentJob.d.ts.map