/**
 * 信用等级配置
 */

import { CreditLevel, CreditLevelBenefit } from '../types/credit';

// 等级分数区间
export const CREDIT_LEVEL_RANGES: Record<CreditLevel, { min: number; max: number }> = {
  [CreditLevel.EXCELLENT]: { min: 900, max: 1000 },
  [CreditLevel.GOOD]: { min: 750, max: 899 },
  [CreditLevel.GENERAL]: { min: 600, max: 749 },
  [CreditLevel.POOR]: { min: 0, max: 599 },
};

// 等级权益配置
export const CREDIT_LEVEL_BENEFITS: CreditLevelBenefit[] = [
  {
    level: CreditLevel.EXCELLENT,
    minScore: 900,
    maxScore: 1000,
    name: '优秀',
    description: '信用极佳，享有平台最高权益',
    benefits: [
      '优先匹配展示',
      '交易手续费减免50%',
      '可发布高级需求',
      '专属客服支持',
      '可申请成为平台认证达人',
      '每日可发起匹配请求无限制',
    ],
    restrictions: [],
  },
  {
    level: CreditLevel.GOOD,
    minScore: 750,
    maxScore: 899,
    name: '良好',
    description: '信用良好，享有大部分平台权益',
    benefits: [
      '优先匹配展示',
      '交易手续费减免20%',
      '可发布标准需求',
      '每日可发起匹配请求20次',
    ],
    restrictions: [],
  },
  {
    level: CreditLevel.GENERAL,
    minScore: 600,
    maxScore: 749,
    name: '一般',
    description: '信用一般，享有基础平台权益',
    benefits: [
      '标准匹配展示',
      '可发布基础需求',
      '每日可发起匹配请求10次',
    ],
    restrictions: [
      '不可发布高级需求',
    ],
  },
  {
    level: CreditLevel.POOR,
    minScore: 0,
    maxScore: 599,
    name: '较差',
    description: '信用较差，部分功能受限',
    benefits: [
      '基础匹配展示',
      '每日可发起匹配请求3次',
    ],
    restrictions: [
      '不可发布需求',
      '不可申请成为达人',
      '交易需缴纳保证金',
      '匹配结果靠后展示',
    ],
  },
];

// 根据分数获取等级
export function getCreditLevel(score: number): CreditLevel {
  if (score >= 900) return CreditLevel.EXCELLENT;
  if (score >= 750) return CreditLevel.GOOD;
  if (score >= 600) return CreditLevel.GENERAL;
  return CreditLevel.POOR;
}

// 根据等级获取配置
export function getCreditLevelConfig(level: CreditLevel): CreditLevelBenefit {
  const config = CREDIT_LEVEL_BENEFITS.find(b => b.level === level);
  if (!config) {
    throw new Error(`Invalid credit level: ${level}`);
  }
  return config;
}

// 根据分数获取等级配置
export function getCreditLevelConfigByScore(score: number): CreditLevelBenefit {
  const level = getCreditLevel(score);
  return getCreditLevelConfig(level);
}

// 检查等级是否有特定权益
export function hasBenefit(level: CreditLevel, benefitId: string): boolean {
  const config = getCreditLevelConfig(level);
  return config.benefits.some(b => b.includes(benefitId));
}

// 检查等级是否有特定限制
export function hasRestriction(level: CreditLevel, restrictionId: string): boolean {
  const config = getCreditLevelConfig(level);
  return config.restrictions.some(r => r.includes(restrictionId));
}

// 获取等级徽章信息
export function getLevelBadge(level: CreditLevel): {
  name: string;
  color: string;
  icon: string;
} {
  const badges = {
    [CreditLevel.EXCELLENT]: { name: '优秀', color: '#FFD700', icon: '🏆' },
    [CreditLevel.GOOD]: { name: '良好', color: '#4CAF50', icon: '🌟' },
    [CreditLevel.GENERAL]: { name: '一般', color: '#2196F3', icon: '⭐' },
    [CreditLevel.POOR]: { name: '较差', color: '#9E9E9E', icon: '⚠️' },
  };
  return badges[level];
}
