/**
 * 信用分系统类型定义
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

// 信用分变化来源类型
export enum CreditSourceType {
  PROFILE_UPDATE = 'profile_update',   // 资料更新
  TRANSACTION = 'transaction',         // 交易完成
  RATING = 'rating',                   // 评价
  SCHEDULED = 'scheduled',             // 定时任务
  COMPLAINT = 'complaint',             // 投诉
  SYSTEM = 'system',                   // 系统调整
}

// 信用分配置
export interface CreditScoreConfig {
  minScore: number;      // 最低分
  maxScore: number;      // 最高分
  defaultScore: number;  // 默认分
  updateIntervalMinutes: number; // 更新间隔(防刷分)
}

// 维度评分配置
export interface FactorWeight {
  type: CreditFactorType;
  weight: number;        // 权重 (0-1)
  subFactors: SubFactorWeight[];
}

export interface SubFactorWeight {
  name: string;
  weight: number;        // 子维度权重
  maxScore: number;      // 该子维度最高分
}

// 信用分计算结果
export interface CreditScoreResult {
  totalScore: number;
  level: CreditLevel;
  factors: FactorScore[];
}

export interface FactorScore {
  type: CreditFactorType;
  subFactor: string;
  score: number;         // 该维度得分
  weight: number;        // 权重
  weightedScore: number; // 加权得分
}

// 信用分历史记录
export interface CreditHistoryEntry {
  id: string;
  oldScore: number;
  newScore: number;
  delta: number;
  reason: string;
  sourceType: CreditSourceType;
  sourceId?: string;
  createdAt: Date;
}

// 各维度评分详情
export interface CreditFactorDetail {
  type: CreditFactorType;
  score: number;
  weight: number;
  subFactors: SubFactorDetail[];
}

export interface SubFactorDetail {
  name: string;
  score: number;
  maxScore: number;
  description: string;
}

// API 响应类型
export interface CreditScoreResponse {
  score: number;
  level: CreditLevel;
  levelName: string;
  lastUpdatedAt: Date;
  nextUpdateAt?: Date;
}

export interface CreditHistoryResponse {
  histories: CreditHistoryEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreditFactorsResponse {
  totalScore: number;
  factors: CreditFactorDetail[];
}

// 信用等级权益
export interface CreditLevelBenefit {
  level: CreditLevel;
  minScore: number;
  maxScore: number;
  name: string;
  description: string;
  benefits: string[];
  restrictions: string[];
}

// 匹配筛选配置
export interface CreditFilterOptions {
  minScore?: number;
  maxScore?: number;
  levels?: CreditLevel[];
}
