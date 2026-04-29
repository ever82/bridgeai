/**
 * Dating Feedback Service
 * 约会推荐反馈服务 - 喜欢/跳过反馈、不感兴趣原因收集、推荐准确性评分
 */
import { logger } from '../../utils/logger';
// ============================================
// 类型定义
// ============================================
export var FeedbackAction;
(function (FeedbackAction) {
    FeedbackAction["LIKE"] = "like";
    FeedbackAction["SKIP"] = "skip";
    FeedbackAction["SUPER_LIKE"] = "super_like";
    FeedbackAction["BLOCK"] = "block";
})(FeedbackAction || (FeedbackAction = {}));
export var SkipReason;
(function (SkipReason) {
    SkipReason["NOT_MY_TYPE"] = "not_my_type";
    SkipReason["TOO_FAR"] = "too_far";
    SkipReason["DIFFERENT_GOALS"] = "different_goals";
    SkipReason["NOT_ACTIVE_ENOUGH"] = "not_active_enough";
    SkipReason["INCOMPLETE_PROFILE"] = "incomplete_profile";
    SkipReason["OTHER"] = "other";
})(SkipReason || (SkipReason = {}));
export const SKIP_REASON_LABELS = {
    [SkipReason.NOT_MY_TYPE]: '不是我的类型',
    [SkipReason.TOO_FAR]: '距离太远',
    [SkipReason.DIFFERENT_GOALS]: '交往目的不同',
    [SkipReason.NOT_ACTIVE_ENOUGH]: '不够活跃',
    [SkipReason.INCOMPLETE_PROFILE]: '资料不完整',
    [SkipReason.OTHER]: '其他',
};
// ============================================
// 存储
// ============================================
const feedbackStore = new Map();
// ============================================
// 核心逻辑
// ============================================
/**
 * 记录反馈
 */
export function submitFeedback(params) {
    const { userId } = params;
    const record = {
        id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        userId,
        targetProfileId: params.targetProfileId,
        action: params.action,
        skipReason: params.skipReason,
        skipReasonDetail: params.skipReasonDetail,
        accuracyRating: params.accuracyRating,
        comment: params.comment,
        matchScoreAtFeedback: params.matchScoreAtFeedback,
        createdAt: new Date().toISOString(),
    };
    const existing = feedbackStore.get(userId) ?? [];
    existing.push(record);
    feedbackStore.set(userId, existing);
    logger.info(`Feedback recorded: userId=${userId}, action=${params.action}, target=${params.targetProfileId}`);
    return record;
}
/**
 * 批量提交反馈
 */
export function submitBatchFeedback(userId, feedbacks) {
    return feedbacks.map(f => submitFeedback({ userId, ...f }));
}
/**
 * 获取用户的反馈摘要
 */
export function getFeedbackSummary(userId) {
    const feedbacks = feedbackStore.get(userId) ?? [];
    const likeCount = feedbacks.filter(f => f.action === FeedbackAction.LIKE || f.action === FeedbackAction.SUPER_LIKE).length;
    const skipCount = feedbacks.filter(f => f.action === FeedbackAction.SKIP).length;
    const blockCount = feedbacks.filter(f => f.action === FeedbackAction.BLOCK).length;
    // 平均准确性评分
    const ratings = feedbacks.filter(f => f.accuracyRating != null).map(f => f.accuracyRating);
    const avgAccuracyRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    // 跳过原因统计
    const skipReasonCounts = new Map();
    feedbacks
        .filter(f => f.skipReason)
        .forEach(f => {
        const count = skipReasonCounts.get(f.skipReason) ?? 0;
        skipReasonCounts.set(f.skipReason, count + 1);
    });
    const topSkipReasons = [...skipReasonCounts.entries()]
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count);
    return {
        totalFeedback: feedbacks.length,
        likeCount,
        skipCount,
        blockCount,
        likeRate: feedbacks.length > 0 ? likeCount / feedbacks.length : 0,
        avgAccuracyRating,
        topSkipReasons,
    };
}
/**
 * 获取用户的反馈历史
 */
export function getUserFeedbackHistory(userId, options) {
    let feedbacks = feedbackStore.get(userId) ?? [];
    if (options?.action) {
        feedbacks = feedbacks.filter(f => f.action === options.action);
    }
    if (options?.limit) {
        feedbacks = feedbacks.slice(-options.limit);
    }
    return feedbacks;
}
/**
 * 检查用户是否已经对某个推荐给出反馈
 */
export function hasFeedbackForProfile(userId, targetProfileId) {
    const feedbacks = feedbackStore.get(userId) ?? [];
    return feedbacks.some(f => f.targetProfileId === targetProfileId);
}
/**
 * 获取推荐准确性趋势（最近N条反馈的平均匹配度 vs 评分）
 */
export function getAccuracyTrend(userId, windowSize = 10) {
    const feedbacks = (feedbackStore.get(userId) ?? [])
        .filter(f => f.accuracyRating != null && f.matchScoreAtFeedback != null)
        .slice(-windowSize * 3); // 取足够多的数据
    const trends = [];
    for (let i = 0; i < feedbacks.length; i += windowSize) {
        const batch = feedbacks.slice(i, i + windowSize);
        if (batch.length === 0)
            break;
        trends.push({
            date: batch[batch.length - 1].createdAt,
            avgMatchScore: batch.reduce((s, f) => s + (f.matchScoreAtFeedback ?? 0), 0) / batch.length,
            avgRating: batch.reduce((s, f) => s + (f.accuracyRating ?? 0), 0) / batch.length,
        });
    }
    return trends;
}
export default {
    submitFeedback,
    submitBatchFeedback,
    getFeedbackSummary,
    getUserFeedbackHistory,
    hasFeedbackForProfile,
    getAccuracyTrend,
};
//# sourceMappingURL=feedbackService.js.map