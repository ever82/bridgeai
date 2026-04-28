/**
 * Match Query Service
 * 匹配查询服务 - 提供强大的 Agent 筛选和查询能力
 *
 * 核心功能：
 * - 基于 AgentProfile L1 数据的跨 Agent 发现和匹配
 * - 场景专属匹配策略（VisionShare, AgentDate, AgentJob, AgentAd）
 * - 支持位置、预算、时间范围、类别等多维度筛选
 * - 结合信用分门槛和智能排序
 */
import { FilterDSL, SceneId } from '@bridgeai/shared';
export interface MatchQueryRequest {
    /** 查询方的 Agent ID（发起匹配的 Agent） */
    sourceAgentId: string;
    /** 目标场景（可选，不指定则跨场景匹配） */
    sceneId?: SceneId;
    /** 自定义过滤条件（FilterDSL） */
    filter?: FilterDSL;
    /** 最大返回数量 */
    limit?: number;
    /** 偏移量 */
    offset?: number;
    /** 排序策略 */
    sortBy?: MatchSortStrategy;
    /** 排序方向 */
    sortOrder?: 'asc' | 'desc';
    /** 最低匹配分数阈值（0-100） */
    minScore?: number;
    /** 是否排除已被匹配的 Agent */
    excludeMatched?: boolean;
    /** 最大搜索半径（公里） */
    maxRadius?: number;
}
export type MatchSortStrategy = 'relevance' | 'distance' | 'credit' | 'createdAt' | 'score';
export interface MatchCandidate {
    agentId: string;
    agentName: string;
    agentType: 'DEMAND' | 'SUPPLY';
    userId: string;
    userName: string | null;
    sceneId: string;
    /** L1 可查询数据（脱敏后） */
    l1Data: Record<string, unknown>;
    /** 匹配分数（0-100） */
    matchScore: number;
    /** 匹配详情 */
    matchDetails: MatchDetails;
    /** 距离（公里，如有位置信息） */
    distance?: number;
    creditScore: number;
    createdAt: Date;
}
export interface MatchDetails {
    /** 位置匹配分数 */
    locationScore: number;
    /** 预算匹配分数 */
    budgetScore: number;
    /** 类别匹配分数 */
    categoryScore: number;
    /** 时间匹配分数 */
    timeScore: number;
    /** 信用分因子 */
    creditFactor: number;
    /** 场景特定加分 */
    sceneBonus: number;
}
export interface MatchQueryResult {
    candidates: MatchCandidate[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    queryMeta: {
        sourceAgentId: string;
        sceneId?: SceneId;
        sortStrategy: MatchSortStrategy;
        executionTimeMs: number;
    };
}
export declare class MatchQueryValidationError extends Error {
    readonly errors: Array<{
        field?: string;
        message: string;
    }>;
    constructor(message: string, errors?: Array<{
        field?: string;
        message: string;
    }>);
}
export declare class MatchQueryService {
    /**
     * 执行匹配查询 - 发现与源 Agent 匹配的候选 Agent
     */
    queryMatches(request: MatchQueryRequest): Promise<MatchQueryResult>;
    /**
     * 获取匹配查询建议（热门过滤条件、推荐场景等）
     */
    getQuerySuggestions(sceneId?: SceneId): Promise<{
        popularFilters: Array<{
            name: string;
            filter: FilterDSL;
        }>;
        availableScenes: Array<{
            id: string;
            name: string;
            description: string;
        }>;
    }>;
    /**
     * 获取匹配统计
     */
    getMatchStats(agentId: string): Promise<{
        totalCandidates: number;
        byScene: Record<string, number>;
        avgMatchScore: number;
        recentMatches: number;
    }>;
    /**
     * 计算两个 Agent 之间的匹配分数
     */
    private calculateMatchScore;
    /**
     * 提取 L1 数据
     */
    private extractL1Data;
    /**
     * 计算位置匹配分数
     */
    private calcLocationScore;
    /**
     * 计算预算匹配分数
     */
    private calcBudgetScore;
    /**
     * 计算类别匹配分数
     */
    private calcCategoryScore;
    /**
     * 计算时间匹配分数
     */
    private calcTimeScore;
    /**
     * 计算信用分因子
     */
    private calcCreditFactor;
    /**
     * 计算场景特定加分
     */
    private calcSceneBonus;
    /**
     * Haversine 公式计算两点间距离（公里）
     */
    private haversineKm;
    private toRad;
    /**
     * 计算距离
     */
    private calcDistance;
    /**
     * 排序候选
     */
    private sortCandidates;
    /**
     * 获取已有匹配的 Agent IDs
     */
    private getMatchedAgentIds;
    /**
     * 获取默认推荐过滤条件
     */
    private getDefaultFilters;
}
export declare const matchQueryService: MatchQueryService;
//# sourceMappingURL=matchQueryService.d.ts.map