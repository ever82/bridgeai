/**
 * Dating Match Algorithm
 * 约会匹配算法 - 多维度相似度计算、权重配置、综合匹配度评分
 */
import type { DatingProfile } from '@bridgeai/shared';
import { type SimilarityWeights, type DimensionScore } from '@bridgeai/shared';
export interface MatchAlgorithmConfig {
    minMatchScore: number;
    maxDailyRecommendations: number;
    diversityThreshold: number;
    weights: SimilarityWeights;
}
export interface MatchScore {
    profileId: string;
    agentId: string;
    totalScore: number;
    dimensions: DimensionScore[];
    highlights: string[];
    warnings: string[];
}
export interface MatchResult {
    sourceProfileId: string;
    matches: MatchScore[];
    generatedAt: string;
    config: MatchAlgorithmConfig;
}
/**
 * 计算单个目标用户的匹配分数
 */
export declare function calculateMatchScore(sourceProfile: DatingProfile, targetProfile: DatingProfile, weights?: Partial<SimilarityWeights>): MatchScore;
/**
 * 批量计算匹配分数并排序
 */
export declare function rankMatches(sourceProfile: DatingProfile, candidateProfiles: DatingProfile[], config?: Partial<MatchAlgorithmConfig>): MatchScore[];
/**
 * 生成每日推荐候选（含多样性保证）
 */
export declare function generateDailyRecommendations(sourceProfile: DatingProfile, candidateProfiles: DatingProfile[], config?: Partial<MatchAlgorithmConfig>): MatchScore[];
/**
 * 获取匹配维度的详细分析（用于展示）
 */
export declare function getMatchAnalysis(match: MatchScore): {
    topStrengths: string[];
    topWeaknesses: string[];
    overallRating: 'excellent' | 'good' | 'fair' | 'poor';
};
declare const _default: {
    calculateMatchScore: typeof calculateMatchScore;
    rankMatches: typeof rankMatches;
    generateDailyRecommendations: typeof generateDailyRecommendations;
    getMatchAnalysis: typeof getMatchAnalysis;
};
export default _default;
//# sourceMappingURL=matchAlgorithm.d.ts.map