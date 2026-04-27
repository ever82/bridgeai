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
import type { Prisma } from '@prisma/client';

import { prisma } from '../../db/client';
import { buildPrismaQuery, validateFilterDSL } from '../../utils/queryBuilder';

// ============================================
// Types
// ============================================

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

export type MatchSortStrategy =
  | 'relevance' // 综合匹配度
  | 'distance' // 距离最近
  | 'credit' // 信用分最高
  | 'createdAt' // 最新发布
  | 'score'; // 匹配分数

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

// ============================================
// Scene-specific matching weights
// ============================================

interface SceneWeights {
  location: number;
  budget: number;
  category: number;
  time: number;
  credit: number;
}

const SCENE_WEIGHTS: Record<string, SceneWeights> = {
  visionshare: { location: 0.35, budget: 0.1, category: 0.25, time: 0.2, credit: 0.1 },
  agentdate: { location: 0.25, budget: 0.1, category: 0.3, time: 0.15, credit: 0.2 },
  agentjob: { location: 0.15, budget: 0.3, category: 0.3, time: 0.1, credit: 0.15 },
  agentad: { location: 0.3, budget: 0.25, category: 0.2, time: 0.1, credit: 0.15 },
};

const DEFAULT_WEIGHTS: SceneWeights = {
  location: 0.2,
  budget: 0.2,
  category: 0.25,
  time: 0.15,
  credit: 0.2,
};

// ============================================
// MatchQueryValidationError
// ============================================

export class MatchQueryValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: Array<{ field?: string; message: string }> = []
  ) {
    super(message);
    this.name = 'MatchQueryValidationError';
    Error.captureStackTrace?.(this, this.constructor);
  }
}

// ============================================
// Match Query Service
// ============================================

export class MatchQueryService {
  /**
   * 执行匹配查询 - 发现与源 Agent 匹配的候选 Agent
   */
  async queryMatches(request: MatchQueryRequest): Promise<MatchQueryResult> {
    const startTime = Date.now();

    const {
      sourceAgentId,
      sceneId,
      filter,
      limit = 20,
      offset = 0,
      sortBy = 'relevance',
      sortOrder = 'desc',
      minScore = 0,
      excludeMatched = true,
      maxRadius,
    } = request;

    // 1. 获取源 Agent 信息
    const sourceAgent = await prisma.agent.findUnique({
      where: { id: sourceAgentId },
      include: {
        profiles: {
          where: sceneId ? { scene: { code: sceneCodeToDbCode(sceneId) } } : undefined,
          include: { scene: true },
        },
      },
    });

    if (!sourceAgent) {
      throw new Error('Source agent not found');
    }

    // 2. 确定目标类型（供需互补）
    const targetType = sourceAgent.type === 'DEMAND' ? 'SUPPLY' : 'DEMAND';

    // 3. 构建基础查询条件
    const baseConditions: any = {
      type: targetType,
      isActive: true,
      id: { not: sourceAgentId }, // 排除自身
      userId: { not: sourceAgent.userId }, // 排除自己的其他 Agent
    };

    // 4. 如果指定场景，限定场景范围
    if (sceneId) {
      baseConditions.profiles = {
        some: {
          scene: { code: sceneCodeToDbCode(sceneId) },
          isActive: true,
        },
      };
    }

    // 5. 应用自定义 FilterDSL
    if (filter) {
      const validation = validateFilterDSL(filter);
      if (!validation.valid) {
        throw new Error(`Invalid filter: ${validation.errors.join(', ')}`);
      }
      const customQuery = buildPrismaQuery(filter);
      baseConditions.AND = [baseConditions.AND, customQuery.where].filter(Boolean);
    }

    // 6. 排除已有匹配（如果要求）
    let excludeAgentIds: string[] = [];
    if (excludeMatched) {
      excludeAgentIds = await this.getMatchedAgentIds(sourceAgentId, targetType);
      if (excludeAgentIds.length > 0) {
        baseConditions.id = { ...baseConditions.id, notIn: excludeAgentIds };
      }
    }

    // 7. 查询候选 Agent
    const candidates = await prisma.agent.findMany({
      where: baseConditions,
      include: {
        user: {
          select: { id: true, name: true },
        },
        profiles: {
          where: sceneId ? { scene: { code: sceneCodeToDbCode(sceneId) } } : undefined,
          include: { scene: true },
        },
      },
      take: limit * 5, // 多取一些用于打分筛选
    });

    // 8. 计算匹配分数
    const scoredCandidates = candidates.map(agent => {
      return this.calculateMatchScore(sourceAgent, agent, sceneId, maxRadius);
    });

    // 9. 过滤低分候选
    const filtered = scoredCandidates.filter(c => c.matchScore >= minScore);

    // 10. 排序
    const sorted = this.sortCandidates(filtered, sortBy, sortOrder);

    // 11. 分页
    const total = sorted.length;
    const paginated = sorted.slice(offset, offset + limit);

    const executionTimeMs = Date.now() - startTime;

    return {
      candidates: paginated,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
      queryMeta: {
        sourceAgentId,
        sceneId,
        sortStrategy: sortBy,
        executionTimeMs,
      },
    };
  }

  /**
   * 获取匹配查询建议（热门过滤条件、推荐场景等）
   */
  async getQuerySuggestions(sceneId?: SceneId): Promise<{
    popularFilters: Array<{ name: string; filter: FilterDSL }>;
    availableScenes: Array<{ id: string; name: string; description: string }>;
  }> {
    const scenes = await prisma.scene.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, description: true },
    });

    const popularFilters = this.getDefaultFilters(sceneId);

    return {
      popularFilters,
      availableScenes: scenes.map(s => ({
        id: s.code,
        name: s.name,
        description: s.description || '',
      })),
    };
  }

  /**
   * 获取匹配统计
   */
  async getMatchStats(agentId: string): Promise<{
    totalCandidates: number;
    byScene: Record<string, number>;
    avgMatchScore: number;
    recentMatches: number;
  }> {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    const targetType = agent.type === 'DEMAND' ? 'SUPPLY' : 'DEMAND';

    const totalCandidates = await prisma.agent.count({
      where: {
        type: targetType,
        isActive: true,
        id: { not: agentId },
        userId: { not: agent.userId },
      },
    });

    // 按场景统计
    const profilesWithScene = await prisma.agentProfile.findMany({
      where: {
        agent: {
          type: targetType,
          isActive: true,
          id: { not: agentId },
          userId: { not: agent.userId },
        },
      },
      include: { scene: { select: { code: true } } },
    });

    const byScene: Record<string, number> = {};
    for (const p of profilesWithScene) {
      const code = p.scene.code;
      byScene[code] = (byScene[code] || 0) + 1;
    }

    // 最近匹配数（最近7天）
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentMatches = await prisma.match.count({
      where: {
        OR: [{ demand: { agentId } }, { supply: { agentId } }],
        createdAt: { gte: sevenDaysAgo },
      },
    });

    // 平均匹配分
    const avgResult = await prisma.match.aggregate({
      _avg: { score: true },
      where: {
        OR: [{ demand: { agentId } }, { supply: { agentId } }],
      },
    });

    return {
      totalCandidates,
      byScene,
      avgMatchScore: avgResult._avg.score ? parseFloat(avgResult._avg.score.toString()) : 0,
      recentMatches,
    };
  }

  // ============================================
  // Private methods
  // ============================================

  /**
   * 计算两个 Agent 之间的匹配分数
   */
  private calculateMatchScore(
    source: any,
    target: any,
    sceneId?: SceneId,
    maxRadius?: number
  ): MatchCandidate {
    const weights = sceneId ? SCENE_WEIGHTS[sceneId] || DEFAULT_WEIGHTS : DEFAULT_WEIGHTS;

    // 获取源和目标的 L1 数据
    const sourceL1 = this.extractL1Data(source);
    const targetL1 = this.extractL1Data(target);

    // 计算各维度分数
    const locationScore = this.calcLocationScore(source, target, maxRadius);
    const budgetScore = this.calcBudgetScore(sourceL1, targetL1);
    const categoryScore = this.calcCategoryScore(sourceL1, targetL1);
    const timeScore = this.calcTimeScore(sourceL1, targetL1);
    const creditFactor = this.calcCreditFactor(target);

    // 场景加分
    const sceneBonus = sceneId ? this.calcSceneBonus(source, target, sceneId) : 0;

    // 综合分数
    const rawScore =
      locationScore * weights.location +
      budgetScore * weights.budget +
      categoryScore * weights.category +
      timeScore * weights.time +
      creditFactor * weights.credit;

    const matchScore = Math.min(100, Math.round(rawScore * 100 + sceneBonus));

    // 计算距离
    const distance = this.calcDistance(source, target);

    // 获取目标用户的信用分
    const creditScore = target.creditScore || 75;

    // 获取 L1 数据
    const targetProfile = target.profiles?.[0];
    const l1Data = targetProfile?.l1Data || {};

    return {
      agentId: target.id,
      agentName: target.name,
      agentType: target.type,
      userId: target.user?.id || target.userId,
      userName: target.user?.name || null,
      sceneId: targetProfile?.scene?.code || '',
      l1Data,
      matchScore,
      matchDetails: {
        locationScore: Math.round(locationScore * 100),
        budgetScore: Math.round(budgetScore * 100),
        categoryScore: Math.round(categoryScore * 100),
        timeScore: Math.round(timeScore * 100),
        creditFactor: Math.round(creditFactor * 100),
        sceneBonus: Math.round(sceneBonus),
      },
      distance,
      creditScore,
      createdAt: target.createdAt,
    };
  }

  /**
   * 提取 L1 数据
   */
  private extractL1Data(agent: any): Record<string, any> {
    const profile = agent.profiles?.[0];
    if (profile?.l1Data && typeof profile.l1Data === 'object') {
      return profile.l1Data as Record<string, any>;
    }
    return {};
  }

  /**
   * 计算位置匹配分数
   */
  private calcLocationScore(source: any, target: any, maxRadius?: number): number {
    if (!source.latitude || !source.longitude || !target.latitude || !target.longitude) {
      return 0.5; // 无位置信息时给中等分
    }

    const dist = this.haversineKm(
      source.latitude,
      source.longitude,
      target.latitude,
      target.longitude
    );

    if (maxRadius && dist > maxRadius) return 0;

    // 50km 以内满分，超过线性递减
    if (dist <= 1) return 1;
    if (dist <= 5) return 0.9;
    if (dist <= 10) return 0.8;
    if (dist <= 25) return 0.7;
    if (dist <= 50) return 0.6;
    if (dist <= 100) return 0.4;
    if (dist <= 200) return 0.2;
    return 0.1;
  }

  /**
   * 计算预算匹配分数
   */
  private calcBudgetScore(sourceL1: Record<string, any>, targetL1: Record<string, any>): number {
    const sourceBudget = sourceL1.budget || sourceL1.budgetRange;
    const targetBudget = targetL1.budget || targetL1.budgetRange;

    if (!sourceBudget && !targetBudget) return 0.5;

    const sMin = sourceBudget?.min ?? 0;
    const sMax = sourceBudget?.max ?? Infinity;
    const tMin = targetBudget?.min ?? 0;
    const tMax = targetBudget?.max ?? Infinity;

    // 检查范围是否有重叠
    const overlap = Math.max(0, Math.min(sMax, tMax) - Math.max(sMin, tMin));
    if (overlap <= 0) return 0;

    // 重叠比例
    const sRange = sMax - sMin || 1;
    return Math.min(1, overlap / sRange);
  }

  /**
   * 计算类别匹配分数
   */
  private calcCategoryScore(sourceL1: Record<string, any>, targetL1: Record<string, any>): number {
    const sourceCat = sourceL1.category || sourceL1.categories || [];
    const targetCat = targetL1.category || targetL1.categories || [];

    if (!sourceCat || !targetCat) return 0.5;

    const sArr = Array.isArray(sourceCat) ? sourceCat : [sourceCat];
    const tArr = Array.isArray(targetCat) ? targetCat : [targetCat];

    if (sArr.length === 0 || tArr.length === 0) return 0.5;

    const matches = sArr.filter((c: string) =>
      tArr.some((tc: string) => tc.toLowerCase() === c.toLowerCase())
    ).length;

    return matches / Math.max(sArr.length, tArr.length);
  }

  /**
   * 计算时间匹配分数
   */
  private calcTimeScore(sourceL1: Record<string, any>, targetL1: Record<string, any>): number {
    const sourceTime = sourceL1.timeRange || sourceL1.availability;
    const targetTime = targetL1.timeRange || targetL1.availability;

    if (!sourceTime || !targetTime) return 0.5;

    // 简单的时间范围重叠检查
    const sStart = sourceTime.start ? new Date(sourceTime.start).getTime() : 0;
    const sEnd = sourceTime.end ? new Date(sourceTime.end).getTime() : Infinity;
    const tStart = targetTime.start ? new Date(targetTime.start).getTime() : 0;
    const tEnd = targetTime.end ? new Date(targetTime.end).getTime() : Infinity;

    if (sStart === 0 && sEnd === Infinity) return 0.5;
    if (tStart === 0 && tEnd === Infinity) return 0.5;

    const overlap = Math.max(0, Math.min(sEnd, tEnd) - Math.max(sStart, tStart));
    if (overlap <= 0) return 0;

    const sRange = sEnd - sStart || 1;
    return Math.min(1, overlap / sRange);
  }

  /**
   * 计算信用分因子
   */
  private calcCreditFactor(target: any): number {
    const score = target.creditScore || 75;
    // 75 is default, 0-1000 scale
    return Math.min(1, score / 1000);
  }

  /**
   * 计算场景特定加分
   */
  private calcSceneBonus(source: any, target: any, sceneId: SceneId): number {
    switch (sceneId) {
      case 'visionshare': {
        // VisionShare: AI 内容置信度加分
        const sourceProfile = source.profiles?.[0];
        const targetProfile = target.profiles?.[0];
        const sourceConfidence = sourceProfile?.sceneConfig?.aiConfidence || 0;
        const targetConfidence = targetProfile?.sceneConfig?.aiConfidence || 0;
        return (sourceConfidence + targetConfidence) * 2; // 0-4 分加分
      }
      case 'agentdate': {
        // AgentDate: 兴趣匹配加分
        const sourceInterests = source.profiles?.[0]?.sceneConfig?.interests || [];
        const targetInterests = target.profiles?.[0]?.sceneConfig?.interests || [];
        if (sourceInterests.length === 0 || targetInterests.length === 0) return 0;
        const common = sourceInterests.filter((i: string) => targetInterests.includes(i)).length;
        return Math.min(5, common * 1.5);
      }
      case 'agentjob': {
        // AgentJob: 技能匹配加分
        const sourceSkills = source.profiles?.[0]?.l1Data?.skills || [];
        const targetSkills = target.profiles?.[0]?.l1Data?.skills || [];
        if (sourceSkills.length === 0 || targetSkills.length === 0) return 0;
        const sArr = Array.isArray(sourceSkills) ? sourceSkills : [sourceSkills];
        const tArr = Array.isArray(targetSkills) ? targetSkills : [targetSkills];
        const common = sArr.filter((s: string) => tArr.includes(s)).length;
        return Math.min(5, common * 1.5);
      }
      case 'agentad': {
        // AgentAd: 商家信用加分
        const merchantRating = target.merchant?.rating || 0;
        return Math.min(5, merchantRating);
      }
      default:
        return 0;
    }
  }

  /**
   * Haversine 公式计算两点间距离（公里）
   */
  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * 计算距离
   */
  private calcDistance(source: any, target: any): number | undefined {
    if (!source.latitude || !source.longitude || !target.latitude || !target.longitude) {
      return undefined;
    }
    return (
      Math.round(
        this.haversineKm(source.latitude, source.longitude, target.latitude, target.longitude) * 10
      ) / 10
    );
  }

  /**
   * 排序候选
   */
  private sortCandidates(
    candidates: MatchCandidate[],
    strategy: MatchSortStrategy,
    order: 'asc' | 'desc'
  ): MatchCandidate[] {
    const sorted = [...candidates];
    const dir = order === 'desc' ? -1 : 1;

    sorted.sort((a, b) => {
      switch (strategy) {
        case 'relevance':
        case 'score':
          return (b.matchScore - a.matchScore) * dir;
        case 'distance':
          return ((a.distance ?? Infinity) - (b.distance ?? Infinity)) * dir;
        case 'credit':
          return (b.creditScore - a.creditScore) * dir;
        case 'createdAt':
          return (b.createdAt.getTime() - a.createdAt.getTime()) * dir;
        default:
          return (b.matchScore - a.matchScore) * dir;
      }
    });

    return sorted;
  }

  /**
   * 获取已有匹配的 Agent IDs
   */
  private async getMatchedAgentIds(
    agentId: string,
    targetType: 'DEMAND' | 'SUPPLY'
  ): Promise<string[]> {
    // 如果源是 DEMAND，找已经匹配的 SUPPLY（通过 Match 表）
    // 如果源是 SUPPLY，找已经匹配的 DEMAND
    const matches = await prisma.match.findMany({
      where: {
        status: { in: ['PENDING', 'ACCEPTED'] },
        ...(targetType === 'SUPPLY' ? { demand: { agentId } } : { supply: { agentId } }),
      },
      select: {
        demand: targetType === 'SUPPLY' ? { select: { agentId: true } } : undefined,
        supply: targetType === 'DEMAND' ? { select: { agentId: true } } : undefined,
      } as any,
    });

    return matches
      .map((m: any) => {
        if (targetType === 'SUPPLY') return m.supply?.agentId;
        return m.demand?.agentId;
      })
      .filter(Boolean) as string[];
  }

  /**
   * 获取默认推荐过滤条件
   */
  private getDefaultFilters(sceneId?: SceneId): Array<{ name: string; filter: FilterDSL }> {
    const filters: Array<{ name: string; filter: FilterDSL }> = [
      {
        name: '高信用分',
        filter: {
          where: {
            and: [{ field: 'creditScore', operator: 'gte', value: 750 }],
          },
        },
      },
      {
        name: '最近活跃',
        filter: {
          where: {
            and: [{ field: 'isActive', operator: 'eq', value: true }],
          },
          orderBy: { field: 'createdAt', direction: 'desc' },
        },
      },
    ];

    if (sceneId === 'agentjob') {
      filters.push({
        name: '技能匹配优先',
        filter: {
          where: {
            and: [{ field: 'profiles.l1Data.skills', operator: 'exists', value: true }],
          },
        },
      });
    }

    return filters;
  }
}

// ============================================
// Helpers
// ============================================

/**
 * 将 SceneId 转换为数据库 SceneCode
 */
function sceneCodeToDbCode(sceneId: SceneId): Prisma.SceneCode {
  const mapping: Record<SceneId, Prisma.SceneCode> = {
    visionshare: 'VISION_SHARE',
    agentdate: 'AGENT_DATE',
    agentjob: 'AGENT_JOB',
    agentad: 'AGENT_AD',
  };
  return mapping[sceneId];
}

// Export singleton
export const matchQueryService = new MatchQueryService();
