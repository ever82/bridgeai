/**
 * 信用分权重配置
 * 各维度权重总和应为 1.0
 */
import { CreditFactorType, FactorWeight } from '../types/credit';
export declare const CREDIT_SCORE_CONFIG: {
    minScore: number;
    maxScore: number;
    defaultScore: number;
    updateIntervalMinutes: number;
    fluctuationThreshold: number;
};
export declare const FACTOR_WEIGHTS: FactorWeight[];
export declare function getFactorWeight(type: CreditFactorType): number;
export declare function getSubFactorWeight(type: CreditFactorType, subFactorName: string): {
    weight: number;
    maxScore: number;
} | null;
export declare function calculateWeightedScore(type: CreditFactorType, subFactorScores: {
    name: string;
    score: number;
}[]): number;
//# sourceMappingURL=creditWeights.d.ts.map