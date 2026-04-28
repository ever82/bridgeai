/**
 * Filter Service
 * 统一过滤服务 - 集成信用分过滤
 *
 * 提供统一的 Agent 过滤接口，支持信用分范围筛选、信用等级过滤等功能
 */
import { FilterDSL } from '@bridgeai/shared';
import { CreditLevel, CreditFilterOptions } from './creditFilterService';
export interface AgentFilterOptions {
    userId?: string;
    category?: string;
    status?: string;
    tags?: string[];
    minCreditScore?: number;
    maxCreditScore?: number;
    creditLevel?: CreditLevel | CreditLevel[];
    includeNoCredit?: boolean;
    sceneId?: string;
    applySceneThreshold?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface FilterResult<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}
/**
 * 构建完整的 Agent 过滤查询条件
 * Build complete agent filter query conditions
 */
export declare function buildAgentFilterWhere(options: AgentFilterOptions): any;
/**
 * 过滤 Agents（支持信用分过滤）
 * Filter agents with credit score support
 */
export declare function filterAgents(options: AgentFilterOptions): Promise<FilterResult<any>>;
/**
 * 检查 Agent 是否满足信用门槛
 * Check if agent meets credit threshold
 */
export declare function checkAgentCredit(agentId: string, sceneId?: string): Promise<{
    meetsThreshold: boolean;
    currentScore: number | null;
    requiredScore: number;
    requiredLevel: CreditLevel;
    exempted: boolean;
    gap: number;
}>;
/**
 * 从 FilterDSL 中提取信用分过滤条件
 * Extract credit filter conditions from FilterDSL
 */
export declare function extractCreditFilterFromDSL(dsl: FilterDSL): CreditFilterOptions | null;
/**
 * 将信用分过滤条件添加到 FilterDSL
 * Add credit filter conditions to FilterDSL
 */
export declare function addCreditFilterToDSL(dsl: FilterDSL, creditOptions: CreditFilterOptions): FilterDSL;
/**
 * 获取信用分筛选统计
 * Get credit filter statistics
 */
export declare function getCreditFilterStatistics(): Promise<{
    totalAgents: number;
    agentsWithCredit: number;
    agentsWithoutCredit: number;
    byLevel: Record<CreditLevel, number>;
}>;
/**
 * 验证信用分过滤参数
 * Validate credit filter parameters
 */
export declare function validateCreditFilterParams(options: CreditFilterOptions): {
    valid: boolean;
    errors: string[];
};
export { CreditLevel, CreditFilterOptions };
//# sourceMappingURL=filterService.d.ts.map