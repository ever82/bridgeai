/**
 * Match Algorithm
 * 匹配算法核心实现 - 委托给 resumeMatcher 多维度评分
 */
export interface MatchConfig {
    enableMachineLearning?: boolean;
    weightFactors?: {
        compatibility?: number;
        distance?: number;
        activity?: number;
        verification?: number;
    };
    minMatchScore?: number;
    maxResultsPerQuery?: number;
}
export declare class MatchScoringModel {
    constructor(_config?: Partial<MatchConfig>, _version?: string);
    /**
     * 计算匹配分数 (0-1)
     * 委托给 resumeMatcher 多维度评分算法，结果转换为 0-1 范围
     */
    calculateScore(params: {
        userA: Record<string, unknown>;
        userB: Record<string, unknown>;
        config?: Partial<MatchConfig>;
    }): Promise<number>;
    getCompatibilityFactors(_userId: string): Promise<Record<string, number>>;
}
export interface MatchResult {
    score: number;
    factors: Record<string, number>;
    recommendations: string[];
}
export interface MatchRecommendation {
    targetUserId: string;
    score: number;
    reasons: string[];
}
//# sourceMappingURL=matchAlgorithm.d.ts.map