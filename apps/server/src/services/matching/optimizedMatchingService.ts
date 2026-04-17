/**
 * Optimized Matching Service
 * Includes performance improvements for complex queries
 */

import { Prisma } from '@prisma/client';

import { getOrSet, CacheNamespaces } from '../cache';
import { prisma } from '../db/client';

// Cache TTLs (in seconds)
const CACHE_TTL = {
  MATCH_LIST: 60, // 1 minute for match lists
  RECOMMENDED: 300, // 5 minutes for recommendations
  CREDIT_SCORE: 300, // 5 minutes for credit scores
};

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
 * Optimized Matching Service
 */
export class OptimizedMatchingService {
  /**
   * Query matches with optimized database queries and caching
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

    // Generate cache key based on query parameters
    const cacheKey = `matches:${JSON.stringify({
      demandId,
      supplyId,
      minScore,
      maxScore,
      excludeLowCredit,
      creditWeight,
      limit,
      offset,
    })}`;

    return getOrSet(
      CacheNamespaces.MATCH,
      cacheKey,
      async () => this.fetchMatchesFromDb(options),
      CACHE_TTL.MATCH_LIST
    );
  }

  /**
   * Fetch matches from database with optimized queries
   */
  private async fetchMatchesFromDb(options: MatchQueryOptions): Promise<{
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

    // Build optimized where clause
    const where: Prisma.MatchWhereInput = {};

    if (demandId) {
      where.demandId = demandId;
    }
    if (supplyId) {
      where.supplyId = supplyId;
    }

    // Get total count first (fast query)
    const total = await prisma.match.count({ where });

    // Use optimized query with select instead of deep includes
    const matches = await prisma.match.findMany({
      where,
      select: {
        id: true,
        demandId: true,
        supplyId: true,
        score: true,
        status: true,
        createdAt: true,
        demand: {
          select: {
            agent: {
              select: {
                user: {
                  select: {
                    creditScore: {
                      select: {
                        score: true,
                        level: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        supply: {
          select: {
            agent: {
              select: {
                user: {
                  select: {
                    creditScore: {
                      select: {
                        score: true,
                        level: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      take: limit * 3,
      skip: offset,
      orderBy: { score: 'desc' },
    });

    // Apply credit score filtering in memory
    let filteredMatches = matches;

    if (minScore !== undefined || maxScore !== undefined || excludeLowCredit) {
      filteredMatches = matches.filter(match => {
        const demandCredit = match.demand.agent.user.creditScore?.score ?? 0;
        const supplyCredit = match.supply.agent.user.creditScore?.score ?? 0;
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

    // Calculate weighted scores
    const scoredMatches: MatchResult[] = filteredMatches.map(match => {
      const demandCredit = match.demand.agent.user.creditScore?.score ?? 0;
      const supplyCredit = match.supply.agent.user.creditScore?.score ?? 0;
      const avgCredit = (demandCredit + supplyCredit) / 2;
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
        creditLevel: match.demand.agent.user.creditScore?.level || 'unknown',
        status: match.status,
        createdAt: match.createdAt,
      };
    });

    // Sort by weighted score
    scoredMatches.sort((a, b) => b.score - a.score);

    return {
      matches: scoredMatches.slice(0, limit),
      total,
    };
  }

  /**
   * Get recommended matches with caching
   */
  async getRecommendedMatches(userId: string, limit: number = 10): Promise<MatchResult[]> {
    const cacheKey = `recommended:${userId}:${limit}`;

    return getOrSet(
      CacheNamespaces.MATCH,
      cacheKey,
      async () => this.fetchRecommendedFromDb(userId, limit),
      CACHE_TTL.RECOMMENDED
    );
  }

  /**
   * Fetch recommended matches from database
   */
  private async fetchRecommendedFromDb(userId: string, limit: number): Promise<MatchResult[]> {
    // Get user agents
    const agents = await prisma.agent.findMany({
      where: { userId },
      select: { id: true },
    });

    const agentIds = agents.map(a => a.id);

    if (agentIds.length === 0) {
      return [];
    }

    // Use OR condition for demand or supply
    const matches = await prisma.match.findMany({
      where: {
        OR: [{ demandId: { in: agentIds } }, { supplyId: { in: agentIds } }],
      },
      select: {
        id: true,
        demandId: true,
        supplyId: true,
        score: true,
        status: true,
        createdAt: true,
        demand: {
          select: {
            agent: {
              select: {
                user: {
                  select: {
                    creditScore: {
                      select: {
                        score: true,
                        level: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        supply: {
          select: {
            agent: {
              select: {
                user: {
                  select: {
                    creditScore: {
                      select: {
                        score: true,
                        level: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      take: limit * 2,
      orderBy: { score: 'desc' },
    });

    // Calculate weighted scores with higher credit weight
    const scoredMatches: MatchResult[] = matches.map(match => {
      const demandCredit = match.demand.agent.user.creditScore?.score ?? 0;
      const supplyCredit = match.supply.agent.user.creditScore?.score ?? 0;
      const avgCredit = (demandCredit + supplyCredit) / 2;
      const normalizedCredit = avgCredit / 1000;
      const baseMatchScore = parseFloat(match.score.toString());
      const weightedScore = baseMatchScore * 0.6 + normalizedCredit * 100 * 0.4;

      return {
        matchId: match.id,
        demandId: match.demandId,
        supplyId: match.supplyId,
        score: Math.round(weightedScore * 100) / 100,
        creditScore: Math.round(avgCredit),
        creditLevel: match.demand.agent.user.creditScore?.level || 'unknown',
        status: match.status,
        createdAt: match.createdAt,
      };
    });

    scoredMatches.sort((a, b) => b.score - a.score);
    return scoredMatches.slice(0, limit);
  }

  /**
   * Check credit requirement with caching
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
    const cacheKey = `credit:${userId}`;

    const creditScore = await getOrSet(
      CacheNamespaces.CREDIT,
      cacheKey,
      async () => {
        const result = await prisma.creditScore.findUnique({
          where: { userId },
          select: { score: true, level: true },
        });
        return result ?? { score: 0, level: 'unknown' };
      },
      CACHE_TTL.CREDIT_SCORE
    );

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
   * Invalidate match cache
   */
  async invalidateCache(): Promise<void> {
    const { invalidateNamespace } = await import('../cache');
    await invalidateNamespace(CacheNamespaces.MATCH);
  }

  /**
   * Get match statistics
   */
  async getMatchStats(): Promise<{
    totalMatches: number;
    pendingMatches: number;
    acceptedMatches: number;
    avgScore: number;
  }> {
    const [totalMatches, pendingMatches, acceptedMatches, avgScoreResult] = await Promise.all([
      prisma.match.count(),
      prisma.match.count({ where: { status: 'PENDING' } }),
      prisma.match.count({ where: { status: 'ACCEPTED' } }),
      prisma.match.aggregate({
        _avg: { score: true },
      }),
    ]);

    return {
      totalMatches,
      pendingMatches,
      acceptedMatches,
      avgScore: avgScoreResult._avg.score ? parseFloat(avgScoreResult._avg.score.toString()) : 0,
    };
  }
}

// Export singleton
export const optimizedMatchingService = new OptimizedMatchingService();
