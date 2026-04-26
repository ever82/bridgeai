/**
 * 信用分系统共享类型
 * 供前后端共享使用
 */
export declare enum CreditLevelEnum {
    EXCELLENT = "excellent",// 优秀 800-1000
    GOOD = "good",// 良好 600-799
    AVERAGE = "average",// 一般 400-599
    POOR = "poor"
}
export type CreditLevel = 'excellent' | 'good' | 'average' | 'poor';
export declare const CREDIT_LEVEL_THRESHOLDS: Record<CreditLevel, {
    min: number;
    max: number;
}>;
export declare enum CreditFactorType {
    PROFILE = "profile",// 基础信息
    BEHAVIOR = "behavior",// 行为信用
    TRANSACTION = "transaction",// 交易信用
    SOCIAL = "social"
}
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
export interface PublicCreditInfo {
    level: CreditLevel;
    levelName: string;
    levelDescription: string;
    scoreRange: string;
}
//# sourceMappingURL=credit.d.ts.map