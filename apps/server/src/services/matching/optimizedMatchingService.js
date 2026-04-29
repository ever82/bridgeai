/**
 * Optimized Matching Service
 * Includes performance improvements for complex queries
 */
import { cacheGet, cacheSet } from '../cache';
import { getCreditLevel } from '../creditFilterService';
import { prisma } from '../../db/client';
const CacheNamespaces = { MATCH: 'match', CREDIT: 'credit', AGENT: 'agent' };
async function getOrSet(ns, key, factory, ttl) {
    const cacheKey = `${ns}:${key}`;
    const cached = await cacheGet(cacheKey);
    if (cached !== null)
        return cached;
    const value = await factory();
    await cacheSet(cacheKey, value, ttl);
    return value;
}
// Cache TTLs (in seconds)
const CACHE_TTL = {
    MATCH_LIST: 60, // 1 minute for match lists
    RECOMMENDED: 300, // 5 minutes for recommendations
    CREDIT_SCORE: 300, // 5 minutes for credit scores
};
/**
 * Optimized Matching Service
 */
export class OptimizedMatchingService {
    /**
     * Query matches with optimized database queries and caching
     */
    async findMatches(options) {
        const { demandId, supplyId, minScore, maxScore, excludeLowCredit = false, creditWeight = 0.3, limit = 20, offset = 0, } = options;
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
        return getOrSet(CacheNamespaces.MATCH, cacheKey, async () => this.fetchMatchesFromDb(options), CACHE_TTL.MATCH_LIST);
    }
    /**
     * Fetch matches from database with optimized queries
     */
    async fetchMatchesFromDb(options) {
        const { demandId, supplyId, minScore, maxScore, excludeLowCredit = false, creditWeight = 0.3, limit = 20, offset = 0, } = options;
        // Build optimized where clause
        const where = {};
        if (demandId) {
            where.demandId = demandId;
        }
        if (supplyId) {
            where.supplyId = supplyId;
        }
        // Use optimized query with select instead of deep includes
        const matches = (await prisma.match.findMany({
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
                                        creditScores: {
                                            take: 1,
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
                                        creditScores: {
                                            take: 1,
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
        }));
        // Apply credit score filtering in memory
        let filteredMatches = matches;
        if (minScore !== undefined || maxScore !== undefined || excludeLowCredit) {
            filteredMatches = matches.filter(match => {
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
        // Calculate weighted scores
        const scoredMatches = filteredMatches.map(match => {
            const demandCredit = match.demand.agent.user.creditScores?.[0]?.score ?? 0;
            const supplyCredit = match.supply.agent.user.creditScores?.[0]?.score ?? 0;
            const avgCredit = (demandCredit + supplyCredit) / 2;
            const normalizedCredit = avgCredit / 1000;
            const baseMatchScore = parseFloat(match.score.toString());
            const weightedScore = baseMatchScore * (1 - creditWeight) + normalizedCredit * 100 * creditWeight;
            return {
                matchId: match.id,
                demandId: match.demandId,
                supplyId: match.supplyId,
                score: Math.round(weightedScore * 100) / 100,
                creditScore: Math.round(avgCredit),
                creditLevel: getCreditLevel(demandCredit),
                status: match.status,
                createdAt: match.createdAt,
            };
        });
        // Sort by weighted score
        scoredMatches.sort((a, b) => b.score - a.score);
        return {
            matches: scoredMatches.slice(0, limit),
            total: filteredMatches.length,
        };
    }
    /**
     * Get recommended matches with caching
     */
    async getRecommendedMatches(userId, limit = 10) {
        const cacheKey = `recommended:${userId}:${limit}`;
        return getOrSet(CacheNamespaces.MATCH, cacheKey, async () => this.fetchRecommendedFromDb(userId, limit), CACHE_TTL.RECOMMENDED);
    }
    /**
     * Fetch recommended matches from database
     */
    async fetchRecommendedFromDb(userId, limit) {
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
        const matches = (await prisma.match.findMany({
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
                                        creditScores: {
                                            take: 1,
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
                                        creditScores: {
                                            take: 1,
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
        }));
        // Calculate weighted scores with higher credit weight
        const scoredMatches = matches.map(match => {
            const demandCredit = match.demand.agent.user.creditScores?.[0]?.score ?? 0;
            const supplyCredit = match.supply.agent.user.creditScores?.[0]?.score ?? 0;
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
                creditLevel: getCreditLevel(demandCredit),
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
    async checkCreditRequirement(userId, minScore = 600) {
        const cacheKey = `credit:${userId}`;
        const creditScore = await getOrSet(CacheNamespaces.CREDIT, cacheKey, async () => {
            const result = await prisma.creditScore.findUnique({
                where: { userId },
                select: { score: true, level: true },
            });
            return result ?? { score: 0, level: 'unknown' };
        }, CACHE_TTL.CREDIT_SCORE);
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
    async invalidateCache(userId) {
        const { invalidateMatchResults } = await import('../cache');
        await invalidateMatchResults(userId);
    }
    /**
     * Get match statistics
     */
    async getMatchStats() {
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
//# sourceMappingURL=optimizedMatchingService.js.map