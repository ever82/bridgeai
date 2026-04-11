/**
 * Credit Filter Service
 * 信用分过滤服务
 */

import { prisma } from '../db/client';
import {
  FilterDSL,
  FilterCondition,
  FilterExpression,
  isAndFilter,
  isOrFilter,
  isNotFilter,
} from '@visionshare/shared';
import { logger } from '../utils/logger';

export type CreditLevel = 'excellent' | 'good' | 'average' | 'poor';

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
 * Credit score thresholds for levels
 */
export const CREDIT_LEVEL_THRESHOLDS: Record<CreditLevel, { min: number; max: number }> = {
  excellent: { min: 800, max: 1000 },
  good: { min: 600, max: 799 },
  average: { min: 400, max: 599 },
  poor: { min: 0, max: 399 },
};

/**
 * Get credit level from score
 */
export function getCreditLevel(score: number | null | undefined): CreditLevel | null {
  if (score === null || score === undefined) return null;

  for (const level of ['excellent', 'good', 'average', 'poor'] as CreditLevel[]) {
    const threshold = CREDIT_LEVEL_THRESHOLDS[level];
    if (score >= threshold.min && score <= threshold.max) {
      return level;
    }
  }
  return null;
}

/**
 * Get credit level label
 */
export function getCreditLevelLabel(level: CreditLevel | null): string {
  const labels: Record<CreditLevel, string> = {
    excellent: '优秀',
    good: '良好',
    average: '一般',
    poor: '较差',
  };
  return level ? labels[level] : '无信用分';
}

/**
 * Get credit level color
 */
export function getCreditLevelColor(level: CreditLevel | null): string {
  const colors: Record<CreditLevel, string> = {
    excellent: '#4CAF50',
    good: '#8BC34A',
    average: '#FFC107',
    poor: '#FF5722',
  };
  return level ? colors[level] : '#9E9E9E';
}

/**
 * Build credit filter condition for Prisma
 */
export function buildCreditFilterCondition(
  options: CreditFilterOptions
): any {
  const conditions: any[] = [];

  // Min/max credit score
  if (options.minCreditScore !== undefined || options.maxCreditScore !== undefined) {
    const scoreCondition: any = {};
    if (options.minCreditScore !== undefined) {
      scoreCondition.gte = options.minCreditScore;
    }
    if (options.maxCreditScore !== undefined) {
      scoreCondition.lte = options.maxCreditScore;
    }
    conditions.push({
      user: {
        creditScore: {
          score: scoreCondition,
        },
      },
    });
  }

  // Credit level filter
  if (options.creditLevel) {
    const levels = Array.isArray(options.creditLevel)
      ? options.creditLevel
      : [options.creditLevel];

    const levelRanges = levels.map(level => CREDIT_LEVEL_THRESHOLDS[level]);
    const levelConditions = levelRanges.map(range => ({
      user: {
        creditScore: {
          score: {
            gte: range.min,
            lte: range.max,
          },
        },
      },
    }));

    if (levelConditions.length === 1) {
      conditions.push(levelConditions[0]);
    } else if (levelConditions.length > 1) {
      conditions.push({ OR: levelConditions });
    }
  }

  // Include agents without credit score
  if (options.includeNoCredit) {
    conditions.push({
      user: {
        creditScore: {
          is: null,
        },
      },
    });
  }

  if (conditions.length === 0) {
    return {};
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return { OR: conditions };
}

/**
 * Filter agents by credit score
 */
export async function filterAgentsByCredit(
  options: CreditFilterOptions,
  pagination?: { page?: number; limit?: number }
): Promise<{
  items: Array<{
    id: string;
    name: string;
    type: string;
    creditScore: number | null;
    creditLevel: CreditLevel | null;
  }>;
  total: number;
}> {
  try {
    const creditCondition = buildCreditFilterCondition(options);

    const where = {
      AND: [
        { status: 'ACTIVE' },
        creditCondition,
      ],
    };

    const [agents, total] = await Promise.all([
      prisma.agent.findMany({
        where,
        skip: pagination?.page ? (pagination.page - 1) * (pagination?.limit || 20) : 0,
        take: pagination?.limit || 20,
        include: {
          user: {
            select: {
              creditScore: {
                select: {
                  score: true,
                },
              },
            },
          },
        },
        orderBy: {
          user: {
            creditScore: {
              score: 'desc',
            },
          },
        },
      }),
      prisma.agent.count({ where }),
    ]);

    return {
      items: agents.map((agent: any) => {
        const score = agent.user?.creditScore?.score ?? null;
        return {
          id: agent.id,
          name: agent.name,
          type: agent.type,
          creditScore: score,
          creditLevel: getCreditLevel(score),
        };
      }),
      total,
    };
  } catch (error) {
    logger.error('Failed to filter agents by credit', { error, options });
    throw error;
  }
}

/**
 * Check if agent meets credit threshold
 */
export async function checkCreditThreshold(
  agentId: string,
  minCreditScore: number
): Promise<{
  meetsThreshold: boolean;
  agentScore: number | null;
  agentLevel: CreditLevel | null;
  requiredScore: number;
  gap: number;
}> {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        user: {
          select: {
            creditScore: {
              select: {
                score: true,
              },
            },
          },
        },
      },
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    const score = agent.user?.creditScore?.score ?? null;
    const level = getCreditLevel(score);
    const meetsThreshold = score !== null && score >= minCreditScore;

    return {
      meetsThreshold,
      agentScore: score,
      agentLevel: level,
      requiredScore: minCreditScore,
      gap: meetsThreshold ? 0 : (minCreditScore - (score || 0)),
    };
  } catch (error) {
    logger.error('Failed to check credit threshold', { error, agentId, minCreditScore });
    throw error;
  }
}

/**
 * Get credit statistics
 */
export async function getCreditStatistics(): Promise<{
  total: number;
  byLevel: Record<CreditLevel, number>;
  noCredit: number;
  average: number;
}> {
  try {
    const scores = await prisma.creditScore.findMany({
      select: {
        score: true,
      },
    });

    const byLevel: Record<CreditLevel, number> = {
      excellent: 0,
      good: 0,
      average: 0,
      poor: 0,
    };

    let totalScore = 0;
    let count = 0;

    for (const { score } of scores) {
      const level = getCreditLevel(score);
      if (level) {
        byLevel[level]++;
        totalScore += score;
        count++;
      }
    }

    // Count users without credit score
    const noCreditCount = await prisma.user.count({
      where: {
        creditScore: {
          is: null,
        },
      },
    });

    return {
      total: scores.length + noCreditCount,
      byLevel,
      noCredit: noCreditCount,
      average: count > 0 ? Math.round(totalScore / count) : 0,
    };
  } catch (error) {
    logger.error('Failed to get credit statistics', { error });
    throw error;
  }
}

/**
 * Add credit filter to existing FilterDSL
 */
export function addCreditFilterToDSL(
  dsl: FilterDSL,
  options: CreditFilterOptions
): FilterDSL {
  const creditCondition: FilterCondition = {
    field: 'user.creditScore.score',
    operator: 'gte',
    value: options.minCreditScore || 0,
  };

  // Combine with existing filter using AND
  if (isAndFilter(dsl.where)) {
    return {
      ...dsl,
      where: {
        and: [...dsl.where.and, creditCondition],
      },
    };
  }

  return {
    ...dsl,
    where: {
      and: [dsl.where, creditCondition],
    },
  };
}
