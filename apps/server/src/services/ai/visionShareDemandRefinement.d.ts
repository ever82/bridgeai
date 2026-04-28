/**
 * VisionShare Demand Refinement Service
 * VisionShare需求智能提炼服务
 * 提供自然语言理解、关键信息提取、智能标签生成、质量评分和优化建议
 */
import type { DemandRefinementResult } from '@bridgeai/shared/types/visionShare';
import { LLMProvider } from './types';
/**
 * VisionShare 需求提炼服务类
 */
export declare class VisionShareDemandRefinementService {
    private readonly logger;
    /**
     * 提炼需求描述
     * 解析自然语言描述，提取关键信息，生成结构化数据
     */
    refineDemand(rawDescription: string, userId: string, options?: {
        provider?: LLMProvider;
        language?: string;
    }): Promise<DemandRefinementResult>;
    /**
     * 生成提炼提示词
     */
    private buildRefinementPrompt;
    /**
     * 解析LLM响应
     */
    private parseRefinementResponse;
    /**
     * 生成降级结果
     */
    private createFallbackResult;
    /**
     * 基础描述优化
     */
    private optimizeDescription;
    /**
     * 提取基础标签
     */
    private extractBasicTags;
    /**
     * 分析需求质量
     */
    analyzeQuality(description: string): number;
    /**
     * 生成智能标签
     */
    generateTags(description: string, category?: string, options?: {
        provider?: LLMProvider;
    }): Promise<string[]>;
}
export declare const visionShareDemandRefinementService: VisionShareDemandRefinementService;
//# sourceMappingURL=visionShareDemandRefinement.d.ts.map