/**
 * 匹配服务
 * 支持信用分筛选和排序权重
 */

import { prisma } from '../db/client';
import { CreditFilterOptions } from '../types/credit';

export interface MatchQueryOptions {
  demandId?: string;
  supplyId?: string;
  minScore?: number;
  maxScore?: number;
  excludeLowCredit?: boolean;
  creditWeight?: number; // 0-1, 信用分权重
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
export class MatchingService {
  /**
   * 查询匹配列表，支持信用分筛选
   */
  async findMatches(options: MatchQueryOptions): Promise<{
    matches: MatchResult[];
    total: number;
  }> {
    const {
      demandId,
      supplyId,
      minScore,
      maxScore,
      excludeLowCredit = false,
      creditWeight = 0.3,
      limit = 20,
      offset = 0,
    } = options;

    // 构建基础查询条件
    const where: any = {};
    if (demandId) where.demandId = demandId;
    if (supplyId) where.supplyId = supplyId;

    // 获取匹配列表
    let matches = await prisma.match.findMany({
      where,
      include: {
        demand: {
          include: {
            agent: {
              include: {
                user: {
                  include: {
                    creditScores: true,
                  },
                },
              },
            },
          },
        },
        supply: {
          include: {
            agent: {
              include: {
                user: {
                  include: {
                    creditScores: true,
                  },
                },
              },
            },
          },
        },
      },
      take: limit * 3, // 多取一些用于筛选
      skip: offset,
    });

    // 应用信用分筛选
    if (minScore !== undefined || maxScore !== undefined || excludeLowCredit) {
      matches = matches.filter(match => {
        const demandCredit = match.demand.agent.user.creditScores?.[0]?.score ?? 0;
        const supplyCredit = match.supply.agent.user.creditScores?.[0]?.score ?? 0;
        const minCredit = Math.min(demandCredit, supplyCredit);

        if (excludeLowCredit && minCredit < 600) {
          return false;
        }
        if (minScore !== undefined && minCredit < minScore) {
          return false;
        }
        if (maxScore !== undefined && minCredit > maxScore) {
          return false;
        }
        return true;
      });
    }

    // 计算总数量
    const total = matches.length;

    // 应用信用分排序权重
    const scoredMatches = matches.map(match => {
      const demandCredit = match.demand.agent.user.creditScores?.[0]?.score ?? 0;
      const supplyCredit = match.supply.agent.user.creditScores?.[0]?.score ?? 0;
      const avgCredit = (demandCredit + supplyCredit) / 2;

      // 综合得分 = 原匹配分 * (1 - 信用权重) + 信用分归一化 * 信用权重
      const normalizedCredit = avgCredit / 1000;
      const baseMatchScore = parseFloat(match.score.toString());
      const weightedScore =
        baseMatchScore * (1 - creditWeight) + normalizedCredit * 100 * creditWeight;

      return {
        matchId: match.id,
        demandId: match.demandId,
        supplyId: match.supplyId,
        score: Math.round(weightedScore * 100) / 100,
        creditScore: Math.round(avgCredit),
        creditLevel: 'unknown',
        status: match.status,
        createdAt: match.createdAt,
      };
    });

    // 按综合得分排序
    scoredMatches.sort((a, b) => b.score - a.score);

    // 限制返回数量
    const paginatedMatches = scoredMatches.slice(0, limit);

    return {
      matches: paginatedMatches,
      total,
    };
  }

  /**
   * 获取推荐匹配（高信用用户优先）
   */
  async getRecommendedMatches(userId: string, limit: number = 10): Promise<MatchResult[]> {
    // 获取用户agents
    const agents = await prisma.agent.findMany({
      where: { userId },
    });

    const agentIds = agents.map(a => a.id);

    if (agentIds.length === 0) {
      return [];
    }

    // 查询匹配，优先展示高信用用户
    const { matches } = await this.findMatches({
      creditWeight: 0.4, // 提高信用分权重用于推荐
      limit,
    });

    // 过滤出与用户相关的匹配
    return matches.filter(m => agentIds.includes(m.demandId) || agentIds.includes(m.supplyId));
  }

  /**
   * 检查用户信用分是否满足匹配要求
   */
  async checkCreditRequirement(
    userId: string,
    minScore: number = 600
  ): Promise<{
    eligible: boolean;
    score: number;
    level: string;
    message: string;
  }> {
    const creditScore = await prisma.creditScore.findUnique({
      where: { userId },
    });

    const score = creditScore?.score ?? 0;
    const level = creditScore?.level || 'unknown';

    if (score < minScore) {
      return {
        eligible: false,
        score,
        level,
        message: `信用分不足，需要至少 ${minScore} 分才能参与匹配`,
      };
    }

    return {
      eligible: true,
      score,
      level,
      message: '信用分满足要求',
    };
  }

  /**
   * 构建信用分筛选查询
   */
  buildCreditFilter(filter: CreditFilterOptions): any {
    const conditions: any[] = [];

    if (filter.minScore !== undefined) {
      conditions.push({ score: { gte: filter.minScore } });
    }

    if (filter.maxScore !== undefined) {
      conditions.push({ score: { lte: filter.maxScore } });
    }

    if (filter.levels && filter.levels.length > 0) {
      conditions.push({ level: { in: filter.levels } });
    }

    if (conditions.length === 0) {
      return {};
    }

    if (conditions.length === 1) {
      return conditions[0];
    }

    return { AND: conditions };
  }
}

// 导出单例
export const matchingService = new MatchingService();
