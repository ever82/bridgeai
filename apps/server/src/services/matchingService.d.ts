/**
 * 匹配服务
 * 支持信用分筛选和排序权重
 */
import { CreditFilterOptions } from '../types/credit';
export interface MatchQueryOptions {
    demandId?: string;
    supplyId?: string;
    minScore?: number;
    maxScore?: number;
    excludeLowCredit?: boolean;
    creditWeight?: number;
    limit?: number;
    offset?: number;
}
export interface MatchResult {
    matchId: string;
    demandId: string;
    supplyId: string;
    score: number;
    creditScore?: number;
    creditLevel?: string;
    status: string;
    createdAt: Date;
}
/**
 * 匹配服务类
 */
export declare class MatchingService {
    /**
     * 查询匹配列表，支持信用分筛选
     */
    findMatches(options: MatchQueryOptions): Promise<{
        matches: MatchResult[];
        total: number;
    }>;
    /**
     * 获取推荐匹配（高信用用户优先）
     */
    getRecommendedMatches(userId: string, limit?: number): Promise<MatchResult[]>;
    /**
     * 检查用户信用分是否满足匹配要求
     */
    checkCreditRequirement(userId: string, minScore?: number): Promise<{
        eligible: boolean;
        score: number;
        level: string;
        message: string;
    }>;
    /**
     * 构建信用分筛选查询
     */
    buildCreditFilter(filter: CreditFilterOptions): any;
}
export declare const matchingService: MatchingService;
//# sourceMappingURL=matchingService.d.ts.map