/**
 * 信用等级配置
 */
import { CreditLevel, CreditLevelBenefit } from '../types/credit';
export declare const CREDIT_LEVEL_RANGES: Record<CreditLevel, {
    min: number;
    max: number;
}>;
export declare const CREDIT_LEVEL_BENEFITS: CreditLevelBenefit[];
export declare function getCreditLevel(score: number): CreditLevel;
export declare function getCreditLevelConfig(level: CreditLevel): CreditLevelBenefit;
export declare function getCreditLevelConfigByScore(score: number): CreditLevelBenefit;
export declare function hasBenefit(level: CreditLevel, benefitId: string): boolean;
export declare function hasRestriction(level: CreditLevel, restrictionId: string): boolean;
export declare function getLevelBadge(level: CreditLevel): {
    name: string;
    color: string;
    icon: string;
};
//# sourceMappingURL=creditLevels.d.ts.map