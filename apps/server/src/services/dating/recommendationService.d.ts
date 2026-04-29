/**
 * Dating Recommendation Service
 * 约会推荐服务 - 每日候选池生成、自动筛选、排序、过滤、多样性保证
 */
import type { DatingProfile } from '@bridgeai/shared';
import { type MatchScore, type MatchAlgorithmConfig } from './matchAlgorithm';
export interface RecommendationCandidate {
    profile: DatingProfile;
    matchScore: MatchScore;
}
export interface DailyRecommendationResult {
    userId: string;
    agentId: string;
    recommendations: RecommendationCandidate[];
    generatedAt: string;
    poolSize: number;
    filteredSize: number;
}
export interface UserFeedbackRecord {
    targetProfileId: string;
    action: 'like' | 'skip' | 'block';
    reason?: string;
    createdAt: string;
}
export interface RecommendationFilter {
    excludeProfileIds?: string[];
    excludeAgentIds?: string[];
    minScore?: number;
    maxResults?: number;
    onlyActive?: boolean;
    onlyComplete?: boolean;
}
/**
 * 生成每日推荐
 */
export declare function generateRecommendations(userId: string, agentId: string, config?: Partial<MatchAlgorithmConfig>, filter?: Partial<RecommendationFilter>): Promise<DailyRecommendationResult>;
/**
 * 记录用户反馈（用于过滤后续推荐）
 */
export declare function recordFeedback(userId: string, feedback: UserFeedbackRecord): void;
/**
 * 获取用户的反馈历史
 */
export declare function getUserFeedbackHistory(userId: string): UserFeedbackRecord[];
/**
 * 使推荐缓存失效
 */
export declare function invalidateCache(userId?: string): void;
/**
 * 获取单个用户的推荐刷新状态
 */
export declare function getRecommendationStatus(userId: string, agentId: string): {
    hasCachedRecommendations: boolean;
    cacheExpiresAt?: string;
    feedbackCount: number;
};
declare const _default: {
    generateRecommendations: typeof generateRecommendations;
    recordFeedback: typeof recordFeedback;
    getUserFeedbackHistory: typeof getUserFeedbackHistory;
    invalidateCache: typeof invalidateCache;
    getRecommendationStatus: typeof getRecommendationStatus;
};
export default _default;
//# sourceMappingURL=recommendationService.d.ts.map