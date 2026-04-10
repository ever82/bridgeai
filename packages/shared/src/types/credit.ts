/**
 * 信用分系统共享类型
 * 供前后端共享使用
 */

// 信用等级
export enum CreditLevel {
  EXCELLENT = 'excellent', // 优秀 900-1000
  GOOD = 'good',           // 良好 750-899
  GENERAL = 'general',     // 一般 600-749
  POOR = 'poor',           // 较差 <600
}

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
