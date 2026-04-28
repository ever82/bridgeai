/**
 * 信用分系统类型定义
 */
export declare enum CreditLevel {
    EXCELLENT = "excellent",// 优秀 900-1000
    GOOD = "good",// 良好 750-899
    GENERAL = "general",// 一般 600-749
    POOR = "poor"
}
export declare enum CreditFactorType {
    PROFILE = "profile",// 基础信息
    BEHAVIOR = "behavior",// 行为信用
    TRANSACTION = "transaction",// 交易信用
    SOCIAL = "social"
}
export declare enum CreditSourceType {
    PROFILE_UPDATE = "profile_update",// 资料更新
    TRANSACTION = "transaction",// 交易完成
    RATING = "rating",// 评价
    SCHEDULED = "scheduled",// 定时任务
    COMPLAINT = "complaint",// 投诉
    SYSTEM = "system"
}
export interface CreditScoreConfig {
    minScore: number;
    maxScore: number;
    defaultScore: number;
    updateIntervalMinutes: number;
}
export interface FactorWeight {
    type: CreditFactorType;
    weight: number;
    subFactors: SubFactorWeight[];
}
export interface SubFactorWeight {
    name: string;
    weight: number;
    maxScore: number;
}
export interface CreditScoreResult {
    totalScore: number;
    level: CreditLevel;
    factors: FactorScore[];
}
export interface FactorScore {
    type: CreditFactorType;
    subFactor: string;
    score: number;
    weight: number;
    weightedScore: number;
}
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
export interface CreditFactorDetail {
    type: CreditFactorType;
    score: number;
    weight: number;
    weightedScore: number;
    subFactors: SubFactorDetail[];
}
export interface SubFactorDetail {
    name: string;
    score: number;
    maxScore: number;
    description: string;
}
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
export interface CreditLevelBenefit {
    level: CreditLevel;
    minScore: number;
    maxScore: number;
    name: string;
    description: string;
    benefits: string[];
    restrictions: string[];
}
export interface CreditFilterOptions {
    minScore?: number;
    maxScore?: number;
    levels?: CreditLevel[];
}
//# sourceMappingURL=credit.d.ts.map