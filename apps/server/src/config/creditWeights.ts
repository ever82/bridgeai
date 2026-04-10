/**
 * 信用分权重配置
 * 各维度权重总和应为 1.0
 */

import { CreditFactorType, FactorWeight } from '../types/credit';

export const CREDIT_SCORE_CONFIG = {
  minScore: 0,
  maxScore: 1000,
  defaultScore: 600,
  updateIntervalMinutes: 60, // 每小时最多更新一次
  fluctuationThreshold: 50,  // 异常波动阈值
};

// 维度权重配置
export const FACTOR_WEIGHTS: FactorWeight[] = [
  {
    type: CreditFactorType.PROFILE,
    weight: 0.25, // 基础信息占25%
    subFactors: [
      { name: 'completeness', weight: 0.4, maxScore: 100 }, // 资料完整度
      { name: 'verification', weight: 0.35, maxScore: 100 }, // 认证状态
      { name: 'avatar_quality', weight: 0.15, maxScore: 100 }, // 头像质量
      { name: 'bio_quality', weight: 0.1, maxScore: 100 },    // 简介质量
    ],
  },
  {
    type: CreditFactorType.BEHAVIOR,
    weight: 0.25, // 行为信用占25%
    subFactors: [
      { name: 'activity', weight: 0.3, maxScore: 100 },      // 活跃度
      { name: 'response_rate', weight: 0.3, maxScore: 100 }, // 响应率
      { name: 'login_frequency', weight: 0.2, maxScore: 100 }, // 登录频率
      { name: 'session_duration', weight: 0.2, maxScore: 100 }, // 使用时长
    ],
  },
  {
    type: CreditFactorType.TRANSACTION,
    weight: 0.35, // 交易信用占35% (最重要)
    subFactors: [
      { name: 'completion_rate', weight: 0.35, maxScore: 100 }, // 交易完成率
      { name: 'dispute_rate', weight: 0.3, maxScore: 100 },     // 纠纷率(负向)
      { name: 'cancel_rate', weight: 0.2, maxScore: 100 },      // 取消率(负向)
      { name: 'transaction_count', weight: 0.15, maxScore: 100 }, // 交易次数
    ],
  },
  {
    type: CreditFactorType.SOCIAL,
    weight: 0.15, // 社交信用占15%
    subFactors: [
      { name: 'rating_score', weight: 0.4, maxScore: 100 },   // 评价分数
      { name: 'rating_count', weight: 0.3, maxScore: 100 },   // 评价数量
      { name: 'complaint_count', weight: 0.2, maxScore: 100 }, // 被举报次数(负向)
      { name: 'connection_count', weight: 0.1, maxScore: 100 }, // 连接数
    ],
  },
];

// 评分计算辅助函数
export function getFactorWeight(type: CreditFactorType): number {
  const factor = FACTOR_WEIGHTS.find(f => f.type === type);
  return factor?.weight ?? 0;
}

export function getSubFactorWeight(
  type: CreditFactorType,
  subFactorName: string
): { weight: number; maxScore: number } | null {
  const factor = FACTOR_WEIGHTS.find(f => f.type === type);
  if (!factor) return null;

  const subFactor = factor.subFactors.find(sf => sf.name === subFactorName);
  if (!subFactor) return null;

  return {
    weight: subFactor.weight,
    maxScore: subFactor.maxScore,
  };
}

// 计算维度加权得分
export function calculateWeightedScore(
  type: CreditFactorType,
  subFactorScores: { name: string; score: number }[]
): number {
  const factor = FACTOR_WEIGHTS.find(f => f.type === type);
  if (!factor) return 0;

  let subFactorTotal = 0;
  for (const { name, score } of subFactorScores) {
    const subFactor = factor.subFactors.find(sf => sf.name === name);
    if (subFactor) {
      const normalizedScore = Math.min(score / subFactor.maxScore, 1);
      subFactorTotal += normalizedScore * subFactor.weight;
    }
  }

  return subFactorTotal * factor.weight * CREDIT_SCORE_CONFIG.maxScore;
}
