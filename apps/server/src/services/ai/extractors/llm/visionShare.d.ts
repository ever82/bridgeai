/**
 * VisionShare Extractor
 * 摄影约拍场景提取器 - 提取拍照时间、类型、预算等信息
 */
import { Demand, DemandExtractionRequest } from '../../demandExtractionService';
import { BaseSceneExtractor, SceneType } from './base';
/**
 * VisionShare Specific Fields
 */
export interface VisionShareFields {
    title?: string;
    description?: string;
    photoType: string;
    style: string;
    location: string;
    shootDate: string;
    duration: string;
    budget: {
        min?: number;
        max?: number;
        currency: string;
    };
    modelRequirements: string[];
    photographerRequirements: string[];
    equipmentNeeds: string[];
    postProcessingNeeds: string[];
}
export declare class VisionShareExtractor extends BaseSceneExtractor {
    protected sceneType: SceneType;
    protected requiredFields: string[];
    extract(request: DemandExtractionRequest): Promise<Partial<Demand>>;
    private buildExtractionPrompt;
    private parseVisionShareData;
    private buildVisionShareDemand;
    private calculateConfidence;
    private generateQuestions;
}
export declare const visionShareExtractor: VisionShareExtractor;
//# sourceMappingURL=visionShare.d.ts.map