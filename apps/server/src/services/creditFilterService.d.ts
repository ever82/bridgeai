/**
 * Credit Filter Service
 * 信用分过滤服务
 */
import { FilterDSL, CreditLevel } from '@bridgeai/shared';
export { type CreditLevel, CREDIT_LEVEL_THRESHOLDS } from '@bridgeai/shared';
export interface CreditRange {
    min?: number;
    max?: number;
}
export interface CreditFilterOptions {
    minCreditScore?: number;
    maxCreditScore?: number;
    creditLevel?: CreditLevel | CreditLevel[];
    includeNoCredit?: boolean;
}
/**
 * Get credit level from score
 */
export declare function getCreditLevel(score: number | null | undefined): CreditLevel | null;
/**
 * Get credit level label
 */
export declare function getCreditLevelLabel(level: CreditLevel | null): string;
/**
 * Get credit level color
 */
export declare function getCreditLevelColor(level: CreditLevel | null): string;
/**
 * Build credit filter condition for Prisma
 */
export declare function buildCreditFilterCondition(options: CreditFilterOptions): any;
/**
 * Filter agents by credit score
 */
export declare function filterAgentsByCredit(options: CreditFilterOptions, pagination?: {
    page?: number;
    limit?: number;
}): Promise<{
    items: Array<{
        id: string;
        name: string;
        type: string;
        creditScore: number | null;
        creditLevel: CreditLevel | null;
    }>;
    total: number;
}>;
/**
 * Check if agent meets credit threshold
 */
export declare function checkCreditThreshold(agentId: string, minCreditScore: number): Promise<{
    meetsThreshold: boolean;
    agentScore: number | null;
    agentLevel: CreditLevel | null;
    requiredScore: number;
    gap: number;
}>;
/**
 * Get credit statistics
 */
export declare function getCreditStatistics(): Promise<{
    total: number;
    byLevel: Record<CreditLevel, number>;
    noCredit: number;
    average: number;
}>;
/**
 * Add credit filter to existing FilterDSL
 */
export declare function addCreditFilterToDSL(dsl: FilterDSL, options: CreditFilterOptions): FilterDSL;
//# sourceMappingURL=creditFilterService.d.ts.map