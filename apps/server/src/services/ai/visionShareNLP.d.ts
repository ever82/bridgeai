/**
 * VisionShare NLP Service
 * 自然语言处理服务，用于从VisionShare任务描述中提取实体
 */
export interface ExtractedEntities {
    location?: {
        name: string;
        address?: string;
        latitude?: number;
        longitude?: number;
    };
    timeRange?: {
        start?: Date;
        end?: Date;
        flexibility?: 'strict' | 'flexible' | 'anytime';
    };
    budget?: {
        min?: number;
        max?: number;
        currency?: string;
        type?: 'fixed' | 'range' | 'hourly';
    };
    category?: string;
    tags: string[];
}
/**
 * VisionShare NLP服务
 */
export declare class VisionShareNLPService {
    private readonly logger;
    /**
     * 从描述中提取实体
     */
    extractEntities(description: string): ExtractedEntities;
    /**
     * 提取地点信息
     */
    private extractLocation;
    /**
     * 提取时间范围
     */
    private extractTimeRange;
    /**
     * 提取预算信息
     */
    private extractBudget;
    /**
     * 提取分类
     */
    private extractCategory;
    /**
     * 提取标签
     */
    private extractTags;
    /**
     * 分析文本情感/紧急程度
     */
    analyzeUrgency(description: string): number;
}
export declare const visionShareNLPService: VisionShareNLPService;
//# sourceMappingURL=visionShareNLP.d.ts.map