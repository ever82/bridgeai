/**
 * 信用分系统共享类型
 * 供前后端共享使用
 */

// 信用等级枚举 (for backend use)
export enum CreditLevelEnum {
  EXCELLENT = 'excellent', // 优秀 800-1000
  GOOD = 'good',           // 良好 600-799
  AVERAGE = 'average',      // 一般 400-599
  POOR = 'poor',           // 较差 0-399
}

// 信用等级类型 (for frontend/mobile use)
export type CreditLevel = 'excellent' | 'good' | 'average' | 'poor';

// Credit level thresholds (used by mobile and server)
export const CREDIT_LEVEL_THRESHOLDS: Record<CreditLevel, { min: number; max: number }> = {
  excellent: { min: 800, max: 1000 },
  good: { min: 600, max: 799 },
  average: { min: 400, max: 599 },
  poor: { min: 0, max: 399 },
};

// 信用分维度类型
export enum CreditFactorType {
  PROFILE = 'profile',       // 基础信息
  BEHAVIOR = 'behavior',     // 行为信用
  TRANSACTION = 'transaction', // 交易信用
  SOCIAL = 'social',         // 社交信用
}

// 信用分API响应类型
export interface CreditScoreResponse {
  score: number;
  level: CreditLevel;
  levelName: string;
  levelDescription: string;
  lastUpdatedAt: string;
  nextUpdateAt?: string;
  updateCount: number;
}

export interface CreditHistoryEntry {
  id: string;
  oldScore: number;
  newScore: number;
  delta: number;
  reason: string;
  sourceType: string;
  createdAt: string;
}

export interface CreditHistoryResponse {
  histories: CreditHistoryEntry[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface SubFactorDetail {
  name: string;
  score: number;
  maxScore: number;
  description: string;
}

export interface CreditFactorDetail {
  type: CreditFactorType;
  score: number;
  weight: number;
  weightedScore: number;
  subFactors: SubFactorDetail[];
}

export interface CreditFactorsResponse {
  totalScore: number;
  rank: number;
  totalUsers: number;
  percentile: number;
  factors: CreditFactorDetail[];
}

export interface CreditLevelInfo {
  level: CreditLevel;
  name: string;
  description: string;
  minScore: number;
  maxScore: number;
  benefits: string[];
  restrictions: string[];
}

// 其他用户可见的信用信息(脱敏)
export interface PublicCreditInfo {
  level: CreditLevel;
  levelName: string;
  levelDescription: string;
  scoreRange: string;
}
