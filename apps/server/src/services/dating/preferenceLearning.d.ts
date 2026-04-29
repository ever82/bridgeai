/**
 * Preference Learning Service
 * 用户偏好学习服务 - 从反馈数据中学习偏好并回写至匹配算法权重/筛选条件
 */
import type { SimilarityWeights } from '@bridgeai/shared';
import type { FeedbackRecord } from './feedbackService';
export type SkipReason = string;
export interface LearnedPreferences {
    weights: SimilarityWeights;
    skipReasonWeights: Record<string, number>;
    preferredScoreRange: {
        min: number;
        max: number;
    };
    dimensionAdjustments: Record<string, number>;
    learningVersion: number;
    updatedAt: string;
}
export interface LearningInput {
    userId: string;
    feedbacks: FeedbackRecord[];
}
/**
 * 从用户反馈中学习偏好
 */
export declare function learnFromFeedback(input: LearningInput): LearnedPreferences;
/**
 * 获取用户的已学习偏好
 */
export declare function getLearnedPreferences(userId: string): LearnedPreferences;
/**
 * 应用学习到的权重到匹配算法配置
 */
export declare function getAdjustedWeights(userId: string): SimilarityWeights;
/**
 * 获取过滤条件（基于跳过原因偏好）
 */
export declare function getLearnedFilters(userId: string): {
    minScore: number;
    excludeReasons: string[];
};
/**
 * 重置用户的学习偏好
 */
export declare function resetLearnedPreferences(userId: string): void;
declare const _default: {
    learnFromFeedback: typeof learnFromFeedback;
    getLearnedPreferences: typeof getLearnedPreferences;
    getAdjustedWeights: typeof getAdjustedWeights;
    getLearnedFilters: typeof getLearnedFilters;
    resetLearnedPreferences: typeof resetLearnedPreferences;
};
export default _default;
//# sourceMappingURL=preferenceLearning.d.ts.map