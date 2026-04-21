/**
 * Filter Service
 * 统一过滤服务 - 集成信用分过滤
 *
 * 提供统一的 Agent 过滤接口，支持信用分范围筛选、信用等级过滤等功能
 */

import { FilterDSL, FilterCondition, FilterOperator } from '@bridgeai/shared';

import { prisma } from '../db/client';
import { logger } from '../utils/logger';
import {
  getSceneThreshold,
  checkSceneCreditThreshold,
  isUserExempted,
} from '../config/creditThresholds';

import {
  CreditLevel,
  CreditFilterOptions,
  buildCreditFilterCondition,
  CREDIT_LEVEL_THRESHOLDS,
  getCreditLevel,
} from './creditFilterService';

export interface AgentFilterOptions {
  // 基础过滤条件
  userId?: string;
  category?: string;
  status?: string;
  tags?: string[];

  // 信用分过滤条件
  minCreditScore?: number;
  maxCreditScore?: number;
  creditLevel?: CreditLevel | CreditLevel[];
  includeNoCredit?: boolean;

  // 场景信用门槛
  sceneId?: string;
  applySceneThreshold?: boolean;

  // 分页
  page?: number;
  limit?: number;

  // 排序
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
export function buildAgentFilterWhere(
  options: AgentFilterOptions
): any {
  const conditions: any[] = [];

  // 基础过滤条件
  if (options.userId) {
    conditions.push({ userId: options.userId });
  }

  if (options.category) {
    conditions.push({ category: options.category });
  }

  if (options.status) {
    conditions.push({ status: options.status });
  }

  if (options.tags && options.tags.length > 0) {
    conditions.push({
      tags: {
        hasSome: options.tags,
      },
    });
  }

  // 信用分过滤条件
  const creditFilterOptions: CreditFilterOptions = {
    minCreditScore: options.minCreditScore,
    maxCreditScore: options.maxCreditScore,
    creditLevel: options.creditLevel,
    includeNoCredit: options.includeNoCredit,
  };

  const creditCondition = buildCreditFilterCondition(creditFilterOptions);
  if (Object.keys(creditCondition).length > 0) {
    conditions.push(creditCondition);
  }

  // 场景信用门槛过滤
  if (options.applySceneThreshold && options.sceneId) {
    const threshold = getSceneThreshold(options.sceneId);
    if (threshold && threshold.isActive) {
      // 应用场景的最低信用分要求
      const sceneCondition = buildCreditFilterCondition({
        minCreditScore: threshold.minCreditScore,
        includeNoCredit: false, // 场景门槛通常不包含无信用分的用户
      });
      if (Object.keys(sceneCondition).length > 0) {
        conditions.push(sceneCondition);
      }
    }
  }

  if (conditions.length === 0) {
    return {};
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return { AND: conditions };
}

/**
 * 过滤 Agents（支持信用分过滤）
 * Filter agents with credit score support
 */
export async function filterAgents(
  options: AgentFilterOptions
): Promise<FilterResult<any>> {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const skip = (page - 1) * limit;

  try {
    const where = buildAgentFilterWhere(options);

    logger.info('Filtering agents with credit filter', {
      options,
      whereClause: JSON.stringify(where),
    });

    const [agents, total] = await Promise.all([
      prisma.agent.findMany({
        where,
        skip,
        take: limit,
        orderBy: options.sortBy
          ? { [options.sortBy]: options.sortOrder || 'desc' }
          : { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              creditScores: true,
            },
          },
          profiles: true,
        },
      }),
      prisma.agent.count({ where }),
    ]);

    // 丰富信用分信息
    const enrichedAgents = agents.map(agent => {
      const creditScore = agent.user?.creditScores?.[0]?.score;
      const creditLevel = getCreditLevel(creditScore);

      return {
        ...agent,
        creditInfo: {
          score: creditScore,
          level: creditLevel,
          levelLabel: creditLevel
            ? {
                excellent: '优秀',
                good: '良好',
                average: '一般',
                poor: '较差',
              }[creditLevel]
            : '无信用分',
        },
      };
    });

    return {
      items: enrichedAgents,
      total,
      page,
      limit,
      hasMore: page * limit < total,
    };
  } catch (error) {
    logger.error('Failed to filter agents', { error, options });
    throw error;
  }
}

/**
 * 检查 Agent 是否满足信用门槛
 * Check if agent meets credit threshold
 */
export async function checkAgentCredit(
  agentId: string,
  sceneId?: string
): Promise<{
  meetsThreshold: boolean;
  currentScore: number | null;
  requiredScore: number;
  requiredLevel: CreditLevel;
  exempted: boolean;
  gap: number;
}> {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        user: {
          include: {
            creditScores: true,
          },
        },
      },
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    const currentScore = agent.user?.creditScores?.[0]?.score ?? null;

    // 如果没有指定场景，直接返回满足条件
    if (!sceneId) {
      return {
        meetsThreshold: true,
        currentScore,
        requiredScore: 0,
        requiredLevel: 'poor',
        exempted: false,
        gap: 0,
      };
    }

    const result = checkSceneCreditThreshold(
      sceneId,
      currentScore,
      agent.userId,
      agentId
    );

    const gap = Math.max(0, result.requiredScore - (currentScore || 0));

    return {
      meetsThreshold: result.meetsThreshold,
      currentScore,
      requiredScore: result.requiredScore,
      requiredLevel: result.requiredLevel,
      exempted: result.exempted,
      gap,
    };
  } catch (error) {
    logger.error('Failed to check agent credit', { error, agentId, sceneId });
    throw error;
  }
}

/**
 * 从 FilterDSL 中提取信用分过滤条件
 * Extract credit filter conditions from FilterDSL
 */
export function extractCreditFilterFromDSL(
  dsl: FilterDSL
): CreditFilterOptions | null {
  const options: CreditFilterOptions = {};
  let hasCreditFilter = false;

  function traverseCondition(condition: FilterCondition | FilterCondition[]): void {
    if (Array.isArray(condition)) {
      condition.forEach(traverseCondition);
      return;
    }

    // 检查是否是信用分相关的条件
    if (condition.field === 'creditScore' || condition.field === 'user.creditScore.score') {
      hasCreditFilter = true;
      switch (condition.operator) {
        case 'gte':
        case 'gt':
          options.minCreditScore = condition.value as number;
          break;
        case 'lte':
        case 'lt':
          options.maxCreditScore = condition.value as number;
          break;
        case 'eq':
          options.minCreditScore = condition.value as number;
          options.maxCreditScore = condition.value as number;
          break;
      }
    }

    if (condition.field === 'creditLevel') {
      hasCreditFilter = true;
      options.creditLevel = condition.value as CreditLevel | CreditLevel[];
    }
  }

  // 遍历 DSL 的所有条件
  if ((dsl as any).filter) {
    traverseCondition((dsl as any).filter);
  }

  return hasCreditFilter ? options : null;
}

/**
 * 将信用分过滤条件添加到 FilterDSL
 * Add credit filter conditions to FilterDSL
 */
export function addCreditFilterToDSL(
  dsl: FilterDSL,
  creditOptions: CreditFilterOptions
): FilterDSL {
  const creditCondition = buildCreditFilterCondition(creditOptions);

  if (Object.keys(creditCondition).length === 0) {
    return dsl;
  }

  // 转换为 FilterDSL 格式
  const newDSL: any = {
    ...dsl,
    filter: {
      AND: [
        (dsl as any).filter || {},
        convertPrismaConditionToDSL(creditCondition),
      ],
    },
  };

  return newDSL;
}

/**
 * 将 Prisma 条件转换为 FilterDSL 格式
 * Convert Prisma condition to FilterDSL format
 */
function convertPrismaConditionToDSL(condition: any): FilterCondition {
  // 简化的转换实现
  // 实际项目中可能需要更复杂的转换逻辑
  if (condition.user?.creditScore?.score) {
    const scoreCondition = condition.user.creditScore.score;
    const filters: FilterCondition[] = [];

    if (scoreCondition.gte !== undefined) {
      filters.push({
        field: 'creditScore',
        operator: 'gte',
        value: scoreCondition.gte,
      });
    }

    if (scoreCondition.lte !== undefined) {
      filters.push({
        field: 'creditScore',
        operator: 'lte',
        value: scoreCondition.lte,
      });
    }

    if (filters.length === 1) {
      return filters[0];
    }

    if (filters.length > 1) {
      return {
        AND: filters,
      } as any;
    }
  }

  return condition;
}

/**
 * 获取信用分筛选统计
 * Get credit filter statistics
 */
export async function getCreditFilterStatistics(): Promise<{
  totalAgents: number;
  agentsWithCredit: number;
  agentsWithoutCredit: number;
  byLevel: Record<CreditLevel, number>;
}> {
  try {
    const totalAgents = await prisma.agent.count();

    const agentsWithCredit = await prisma.agent.count({
      where: {
        user: {
          creditScores: {
            some: {},
          },
        },
      },
    });

    const agentsWithoutCredit = await prisma.agent.count({
      where: {
        user: {
          creditScores: {
            none: {},
          },
        },
      },
    });

    // 按信用等级统计
    const byLevel: Record<CreditLevel, number> = {
      excellent: 0,
      good: 0,
      average: 0,
      poor: 0,
    };

    for (const level of ['excellent', 'good', 'average', 'poor'] as CreditLevel[]) {
      const range = CREDIT_LEVEL_THRESHOLDS[level];
      byLevel[level] = await prisma.agent.count({
        where: {
          user: {
            creditScores: {
              some: {
                score: {
                  gte: range.min,
                  lte: range.max,
                },
              },
            },
          },
        },
      });
    }

    return {
      totalAgents,
      agentsWithCredit,
      agentsWithoutCredit,
      byLevel,
    };
  } catch (error) {
    logger.error('Failed to get credit filter statistics', { error });
    throw error;
  }
}

/**
 * 验证信用分过滤参数
 * Validate credit filter parameters
 */
export function validateCreditFilterParams(
  options: CreditFilterOptions
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (options.minCreditScore !== undefined) {
    if (options.minCreditScore < 0 || options.minCreditScore > 1000) {
      errors.push('minCreditScore must be between 0 and 1000');
    }
  }

  if (options.maxCreditScore !== undefined) {
    if (options.maxCreditScore < 0 || options.maxCreditScore > 1000) {
      errors.push('maxCreditScore must be between 0 and 1000');
    }
  }

  if (
    options.minCreditScore !== undefined &&
    options.maxCreditScore !== undefined &&
    options.minCreditScore > options.maxCreditScore
  ) {
    errors.push('minCreditScore cannot be greater than maxCreditScore');
  }

  if (options.creditLevel) {
    const validLevels: CreditLevel[] = ['excellent', 'good', 'average', 'poor'];
    const levels = Array.isArray(options.creditLevel)
      ? options.creditLevel
      : [options.creditLevel];

    for (const level of levels) {
      if (!validLevels.includes(level)) {
        errors.push(`Invalid credit level: ${level}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// 导出类型
export { CreditLevel, CreditFilterOptions };
