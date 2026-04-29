/**
 * Dating Feedback Service
 * 约会推荐反馈服务 - 喜欢/跳过反馈、不感兴趣原因收集、推荐准确性评分
 */

import { logger } from '../../utils/logger';

// ============================================
// 类型定义
// ============================================

export enum FeedbackAction {
  LIKE = 'like', // 喜欢/感兴趣
  SKIP = 'skip', // 跳过
  SUPER_LIKE = 'super_like', // 超级喜欢
  BLOCK = 'block', // 拉黑
}

export enum SkipReason {
  NOT_MY_TYPE = 'not_my_type', // 不是我的类型
  TOO_FAR = 'too_far', // 距离太远
  DIFFERENT_GOALS = 'different_goals', // 目标不同
  NOT_ACTIVE_ENOUGH = 'not_active_enough', // 不够活跃
  INCOMPLETE_PROFILE = 'incomplete_profile', // 资料不完整
  OTHER = 'other', // 其他
}

export const SKIP_REASON_LABELS: Record<SkipReason, string> = {
  [SkipReason.NOT_MY_TYPE]: '不是我的类型',
  [SkipReason.TOO_FAR]: '距离太远',
  [SkipReason.DIFFERENT_GOALS]: '交往目的不同',
  [SkipReason.NOT_ACTIVE_ENOUGH]: '不够活跃',
  [SkipReason.INCOMPLETE_PROFILE]: '资料不完整',
  [SkipReason.OTHER]: '其他',
};

export interface FeedbackRecord {
  id: string;
  userId: string;
  targetProfileId: string;
  action: FeedbackAction;
  skipReason?: SkipReason;
  skipReasonDetail?: string;
  accuracyRating?: number; // 1-5 推荐准确性评分
  comment?: string;
  matchScoreAtFeedback?: number; // 反馈时的匹配度
  createdAt: string;
}

export interface FeedbackSummary {
  totalFeedback: number;
  likeCount: number;
  skipCount: number;
  blockCount: number;
  likeRate: number; // 喜欢率
  avgAccuracyRating: number;
  topSkipReasons: Array<{ reason: SkipReason; count: number }>;
}

// ============================================
// 存储
// ============================================

const feedbackStore = new Map<string, FeedbackRecord[]>();

// ============================================
// 核心逻辑
// ============================================

/**
 * 记录反馈
 */
export function submitFeedback(params: {
  userId: string;
  targetProfileId: string;
  action: FeedbackAction;
  skipReason?: SkipReason;
  skipReasonDetail?: string;
  accuracyRating?: number;
  comment?: string;
  matchScoreAtFeedback?: number;
}): FeedbackRecord {
  const { userId } = params;

  const record: FeedbackRecord = {
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

  logger.info(
    `Feedback recorded: userId=${userId}, action=${params.action}, target=${params.targetProfileId}`
  );

  return record;
}

/**
 * 批量提交反馈
 */
export function submitBatchFeedback(
  userId: string,
  feedbacks: Array<{
    targetProfileId: string;
    action: FeedbackAction;
    skipReason?: SkipReason;
    accuracyRating?: number;
  }>
): FeedbackRecord[] {
  return feedbacks.map(f => submitFeedback({ userId, ...f }));
}

/**
 * 获取用户的反馈摘要
 */
export function getFeedbackSummary(userId: string): FeedbackSummary {
  const feedbacks = feedbackStore.get(userId) ?? [];

  const likeCount = feedbacks.filter(
    f => f.action === FeedbackAction.LIKE || f.action === FeedbackAction.SUPER_LIKE
  ).length;
  const skipCount = feedbacks.filter(f => f.action === FeedbackAction.SKIP).length;
  const blockCount = feedbacks.filter(f => f.action === FeedbackAction.BLOCK).length;

  // 平均准确性评分
  const ratings = feedbacks.filter(f => f.accuracyRating != null).map(f => f.accuracyRating!);
  const avgAccuracyRating =
    ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

  // 跳过原因统计
  const skipReasonCounts = new Map<SkipReason, number>();
  feedbacks
    .filter(f => f.skipReason)
    .forEach(f => {
      const count = skipReasonCounts.get(f.skipReason!) ?? 0;
      skipReasonCounts.set(f.skipReason!, count + 1);
    });
  const topSkipReasons = Array.from(skipReasonCounts.entries())
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
export function getUserFeedbackHistory(
  userId: string,
  options?: { action?: FeedbackAction; limit?: number }
): FeedbackRecord[] {
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
export function hasFeedbackForProfile(userId: string, targetProfileId: string): boolean {
  const feedbacks = feedbackStore.get(userId) ?? [];
  return feedbacks.some(f => f.targetProfileId === targetProfileId);
}

/**
 * 获取推荐准确性趋势（最近N条反馈的平均匹配度 vs 评分）
 */
export function getAccuracyTrend(
  userId: string,
  windowSize: number = 10
): Array<{ date: string; avgMatchScore: number; avgRating: number }> {
  const feedbacks = (feedbackStore.get(userId) ?? [])
    .filter(f => f.accuracyRating != null && f.matchScoreAtFeedback != null)
    .slice(-windowSize * 3); // 取足够多的数据

  const trends: Array<{ date: string; avgMatchScore: number; avgRating: number }> = [];
  for (let i = 0; i < feedbacks.length; i += windowSize) {
    const batch = feedbacks.slice(i, i + windowSize);
    if (batch.length === 0) break;

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
