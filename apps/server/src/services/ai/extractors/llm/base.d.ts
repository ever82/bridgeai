/**
 * Scene-Specific Extractors
 * 场景特定提取器 - 为不同业务场景提供专门的需求提取能力
 */
import { Demand, DemandExtractionRequest } from '../../demandExtractionService';
import { LLMProvider } from '../../types';
/**
 * Scene Type - 支持的业务场景
 */
export type SceneType = 'visionshare' | 'agentdate' | 'agentjob' | 'agentad' | 'unknown';
/**
 * Scene Detection Result
 */
export interface SceneDetectionResult {
    scene: SceneType;
    confidence: number;
    alternativeScenes: {
        scene: SceneType;
        confidence: number;
    }[];
}
/**
 * Scene-Specific Extractor Interface
 * 场景特定提取器接口
 */
export interface SceneSpecificExtractor {
    /**
     * 获取场景类型
     */
    getSceneType(): SceneType;
    /**
     * 从文本中提取场景特定需求
     */
    extract(request: DemandExtractionRequest): Promise<Partial<Demand>>;
    /**
     * 验证提取结果是否完整
     */
    validateExtraction(demand: Partial<Demand>): {
        valid: boolean;
        missingFields: string[];
    };
}
/**
 * Base Scene Extractor
 * 场景提取器基类
 */
export declare abstract class BaseSceneExtractor implements SceneSpecificExtractor {
    protected abstract sceneType: SceneType;
    protected abstract requiredFields: string[];
    protected version: string;
    getSceneType(): SceneType;
    abstract extract(request: DemandExtractionRequest): Promise<Partial<Demand>>;
    validateExtraction(demand: Partial<Demand>): {
        valid: boolean;
        missingFields: string[];
    };
    private getNestedValue;
    protected callLLM(prompt: string, options?: {
        temperature?: number;
        maxTokens?: number;
    }): Promise<{
        text: string;
        provider: LLMProvider;
        model: string;
        latencyMs: number;
    }>;
    protected parseJSONResponse<T>(text: string, defaultValue: T): T;
    protected buildBaseDemand(rawText: string, scene: SceneType): Partial<Demand>;
}
//# sourceMappingURL=base.d.ts.map