/**
 * Dating Feedback Service
 * 约会推荐反馈服务 - 喜欢/跳过反馈、不感兴趣原因收集、推荐准确性评分
 */
export declare enum FeedbackAction {
    LIKE = "like",// 喜欢/感兴趣
    SKIP = "skip",// 跳过
    SUPER_LIKE = "super_like",// 超级喜欢
    BLOCK = "block"
}
export declare enum SkipReason {
    NOT_MY_TYPE = "not_my_type",// 不是我的类型
    TOO_FAR = "too_far",// 距离太远
    DIFFERENT_GOALS = "different_goals",// 目标不同
    NOT_ACTIVE_ENOUGH = "not_active_enough",// 不够活跃
    INCOMPLETE_PROFILE = "incomplete_profile",// 资料不完整
    OTHER = "other"
}
export declare const SKIP_REASON_LABELS: Record<SkipReason, string>;
export interface FeedbackRecord {
    id: string;
    userId: string;
    targetProfileId: string;
    action: FeedbackAction;
    skipReason?: SkipReason;
    skipReasonDetail?: string;
    accuracyRating?: number;
    comment?: string;
    matchScoreAtFeedback?: number;
    createdAt: string;
}
export interface FeedbackSummary {
    totalFeedback: number;
    likeCount: number;
    skipCount: number;
    blockCount: number;
    likeRate: number;
    avgAccuracyRating: number;
    topSkipReasons: Array<{
        reason: SkipReason;
        count: number;
    }>;
}
/**
 * 记录反馈
 */
export declare function submitFeedback(params: {
    userId: string;
    targetProfileId: string;
    action: FeedbackAction;
    skipReason?: SkipReason;
    skipReasonDetail?: string;
    accuracyRating?: number;
    comment?: string;
    matchScoreAtFeedback?: number;
}): FeedbackRecord;
/**
 * 批量提交反馈
 */
export declare function submitBatchFeedback(userId: string, feedbacks: Array<{
    targetProfileId: string;
    action: FeedbackAction;
    skipReason?: SkipReason;
    accuracyRating?: number;
}>): FeedbackRecord[];
/**
 * 获取用户的反馈摘要
 */
export declare function getFeedbackSummary(userId: string): FeedbackSummary;
/**
 * 获取用户的反馈历史
 */
export declare function getUserFeedbackHistory(userId: string, options?: {
    action?: FeedbackAction;
    limit?: number;
}): FeedbackRecord[];
/**
 * 检查用户是否已经对某个推荐给出反馈
 */
export declare function hasFeedbackForProfile(userId: string, targetProfileId: string): boolean;
/**
 * 获取推荐准确性趋势（最近N条反馈的平均匹配度 vs 评分）
 */
export declare function getAccuracyTrend(userId: string, windowSize?: number): Array<{
    date: string;
    avgMatchScore: number;
    avgRating: number;
}>;
declare const _default: {
    submitFeedback: typeof submitFeedback;
    submitBatchFeedback: typeof submitBatchFeedback;
    getFeedbackSummary: typeof getFeedbackSummary;
    getUserFeedbackHistory: typeof getUserFeedbackHistory;
    hasFeedbackForProfile: typeof hasFeedbackForProfile;
    getAccuracyTrend: typeof getAccuracyTrend;
};
export default _default;
//# sourceMappingURL=feedbackService.d.ts.map