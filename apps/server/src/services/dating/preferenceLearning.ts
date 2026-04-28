/**
 * Preference Learning Service
 * 用户偏好学习服务 - 从反馈数据中学习偏好并回写至匹配算法权重/筛选条件
 */

import type { SimilarityWeights } from '@bridgeai/shared';

import { logger } from '../../utils/logger';

import type { FeedbackRecord } from './feedbackService';

// ============================================
// 类型定义
// ============================================

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

// Skip reason key constants
const SKIP_REASON_KEYS = {
  NOT_MY_TYPE: 'not_my_type',
  TOO_FAR: 'too_far',
  DIFFERENT_GOALS: 'different_goals',
  NOT_ACTIVE_ENOUGH: 'not_active_enough',
  INCOMPLETE_PROFILE: 'incomplete_profile',
  OTHER: 'other',
};

// ============================================
// 默认值
// ============================================

const DEFAULT_LEARNED_PREFERENCES: LearnedPreferences = {
  weights: {
    basicConditions: 0.2,
    personality: 0.2,
    interests: 0.15,
    lifestyle: 0.15,
    expectations: 0.15,
    complementary: 0.1,
    geoProximity: 0.05,
  },
  skipReasonWeights: {
    [SKIP_REASON_KEYS.NOT_MY_TYPE]: 0,
    [SKIP_REASON_KEYS.TOO_FAR]: -0.1,
    [SKIP_REASON_KEYS.DIFFERENT_GOALS]: -0.15,
    [SKIP_REASON_KEYS.NOT_ACTIVE_ENOUGH]: -0.05,
    [SKIP_REASON_KEYS.INCOMPLETE_PROFILE]: -0.05,
    [SKIP_REASON_KEYS.OTHER]: 0,
  },
  preferredScoreRange: { min: 40, max: 100 },
  dimensionAdjustments: {},
  learningVersion: 1,
  updatedAt: new Date().toISOString(),
};

// ============================================
// 存储
// ============================================

const preferenceStore = new Map<string, LearnedPreferences>();

// ============================================
// 核心学习逻辑
// ============================================

// Action key constants (avoiding import)
const ACTION_KEYS = {
  LIKE: 'like',
  SUPER_LIKE: 'super_like',
  SKIP: 'skip',
};

/**
 * 从用户反馈中学习偏好
 */
export function learnFromFeedback(input: LearningInput): LearnedPreferences {
  const { userId, feedbacks } = input;

  if (feedbacks.length === 0) {
    return getLearnedPreferences(userId);
  }

  const current = getLearnedPreferences(userId);

  // 分析喜欢的反馈
  const likedFeedbacks = feedbacks.filter(
    f => f.action === ACTION_KEYS.LIKE || f.action === ACTION_KEYS.SUPER_LIKE
  );
  const skippedFeedbacks = feedbacks.filter(f => f.action === ACTION_KEYS.SKIP);

  // 1. 更新偏好分数范围
  const likedScores = likedFeedbacks
    .filter(f => f.matchScoreAtFeedback != null)
    .map(f => f.matchScoreAtFeedback!);

  if (likedScores.length > 0) {
    current.preferredScoreRange.min = Math.round(Math.min(...likedScores) * 0.9);
    current.preferredScoreRange.max = 100;
  }

  // 2. 更新跳过原因权重
  const skipReasonCounts = new Map<string, number>();
  for (const f of skippedFeedbacks) {
    if (f.skipReason) {
      const count = skipReasonCounts.get(f.skipReason) ?? 0;
      skipReasonCounts.set(f.skipReason, count + 1);
    }
  }

  for (const [reason, count] of skipReasonCounts.entries()) {
    const weight = Math.max(-0.3, (current.skipReasonWeights[reason] ?? 0) - count * 0.02);
    current.skipReasonWeights[reason] = weight;
  }

  // 3. 更新维度权重（基于准确性评分）
  const ratings = feedbacks.filter(f => f.accuracyRating != null);
  if (ratings.length > 0) {
    const avgRating = ratings.reduce((s, f) => s + (f.accuracyRating ?? 0), 0) / ratings.length;

    // 如果评分低，调整权重使推荐更多样
    if (avgRating < 3) {
      const weights = current.weights;
      const entries = Object.entries(weights) as Array<[keyof SimilarityWeights, number]>;
      entries.sort((a, b) => b[1] - a[1]);

      const maxDim = entries[0][0];
      const minDim = entries[entries.length - 1][0];
      current.dimensionAdjustments[maxDim] = (current.dimensionAdjustments[maxDim] ?? 0) - 0.02;
      current.dimensionAdjustments[minDim] = (current.dimensionAdjustments[minDim] ?? 0) + 0.02;
    }
  }

  // 4. 更新版本和时间
  current.learningVersion++;
  current.updatedAt = new Date().toISOString();

  preferenceStore.set(userId, current);
  logger.info(
    `Updated learned preferences for user ${userId}: version=${current.learningVersion}, feedbacks=${feedbacks.length}`
  );

  return current;
}

/**
 * 获取用户的已学习偏好
 */
export function getLearnedPreferences(userId: string): LearnedPreferences {
  const stored = preferenceStore.get(userId);
  if (stored) return { ...stored };

  return {
    ...DEFAULT_LEARNED_PREFERENCES,
    weights: { ...DEFAULT_LEARNED_PREFERENCES.weights },
    skipReasonWeights: { ...DEFAULT_LEARNED_PREFERENCES.skipReasonWeights },
    dimensionAdjustments: { ...DEFAULT_LEARNED_PREFERENCES.dimensionAdjustments },
    preferredScoreRange: { ...DEFAULT_LEARNED_PREFERENCES.preferredScoreRange },
  };
}

/**
 * 应用学习到的权重到匹配算法配置
 */
export function getAdjustedWeights(userId: string): SimilarityWeights {
  const prefs = getLearnedPreferences(userId);
  const base = { ...prefs.weights };

  for (const [dim, adj] of Object.entries(prefs.dimensionAdjustments)) {
    if (dim in base) {
      (base as Record<string, number>)[dim] = Math.max(
        0.05,
        (base as Record<string, number>)[dim] + adj
      );
    }
  }

  const total = Object.values(base).reduce((a, b) => a + b, 0);
  if (total > 0) {
    for (const key of Object.keys(base) as Array<keyof SimilarityWeights>) {
      base[key] = base[key] / total;
    }
  }

  return base;
}

/**
 * 获取过滤条件（基于跳过原因偏好）
 */
export function getLearnedFilters(userId: string): {
  minScore: number;
  excludeReasons: string[];
} {
  const prefs = getLearnedPreferences(userId);

  const excludeReasons = Object.entries(prefs.skipReasonWeights)
    .filter(([_, weight]) => weight < -0.1)
    .map(([reason]) => reason);

  return {
    minScore: prefs.preferredScoreRange.min,
    excludeReasons,
  };
}

/**
 * 重置用户的学习偏好
 */
export function resetLearnedPreferences(userId: string): void {
  preferenceStore.delete(userId);
  logger.info(`Reset learned preferences for user ${userId}`);
}

export default {
  learnFromFeedback,
  getLearnedPreferences,
  getAdjustedWeights,
  getLearnedFilters,
  resetLearnedPreferences,
};
