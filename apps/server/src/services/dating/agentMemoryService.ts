/**
 * Agent Long-Term Memory Service (AS-LEARN-001 / ISSUE-AI006)
 *
 * 持久化 Agent 学习信号：
 *   - 成功引荐特征 (SUCCESS_TRAIT)
 *   - 失败原因 (FAILURE_REASON)
 *   - 主人偏好/否决 (OWNER_PREFERENCE)
 *   - 交互结果 (INTERACTION_OUTCOME)
 *
 * Phase 7.4 - 7.6 AS-LEARN AC 数据落点。
 */

import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';

export type AgentMemoryType =
  | 'SUCCESS_TRAIT'
  | 'FAILURE_REASON'
  | 'OWNER_PREFERENCE'
  | 'INTERACTION_OUTCOME';

export interface AgentMemoryRecord {
  id: string;
  userId: string;
  agentId: string;
  memoryType: AgentMemoryType;
  structuredFields: Record<string, unknown>;
  sourceEventType: string;
  sourceEventId: string | null;
  createdAt: Date;
}

interface WriteMemoryInput {
  userId: string;
  agentId: string;
  memoryType: AgentMemoryType;
  structuredFields: Record<string, unknown>;
  sourceEventType: string;
  sourceEventId?: string;
}

/**
 * 内部统一写入入口，包含 try/catch + logger 兜底。
 * 失败不抛出 — 学习信号丢失不应中断业务主流程。
 */
async function writeMemory(input: WriteMemoryInput): Promise<AgentMemoryRecord | null> {
  try {
    // Prisma 客户端可能在迁移生成前不存在 agentMemory 字段，
    // 用动态访问避免编译期类型检查失败。
    const client = prisma as unknown as {
      agentMemory?: {
        create: (args: { data: Record<string, unknown> }) => Promise<AgentMemoryRecord>;
      };
    };

    if (!client.agentMemory) {
      logger.warn('[AgentMemoryService] agentMemory model not available on prisma client', {
        memoryType: input.memoryType,
        sourceEventType: input.sourceEventType,
      });
      return null;
    }

    const record = await client.agentMemory.create({
      data: {
        userId: input.userId,
        agentId: input.agentId,
        memoryType: input.memoryType,
        structuredFields: input.structuredFields,
        sourceEventType: input.sourceEventType,
        sourceEventId: input.sourceEventId ?? null,
      },
    });

    logger.info('[AgentMemoryService] memory recorded', {
      memoryId: record.id,
      memoryType: input.memoryType,
      agentId: input.agentId,
      userId: input.userId,
      sourceEventType: input.sourceEventType,
    });

    return record;
  } catch (error) {
    logger.error('[AgentMemoryService] failed to write memory', {
      error,
      memoryType: input.memoryType,
      agentId: input.agentId,
      userId: input.userId,
      sourceEventType: input.sourceEventType,
    });
    return null;
  }
}

/**
 * 记录一次成功匹配/引荐特征。
 * 典型来源：双 Agent 对话质量达标后，引荐被双方接受。
 */
export async function recordSuccessTrait(
  userId: string,
  agentId: string,
  traitData: Record<string, unknown>,
  sourceEventId?: string,
  sourceEventType: string = 'referral_success'
): Promise<AgentMemoryRecord | null> {
  return writeMemory({
    userId,
    agentId,
    memoryType: 'SUCCESS_TRAIT',
    structuredFields: traitData,
    sourceEventType,
    sourceEventId,
  });
}

/**
 * 记录一次失败原因（被对方拒绝、协商破裂、超时等）。
 */
export async function recordFailureReason(
  userId: string,
  agentId: string,
  reasonData: Record<string, unknown>,
  sourceEventId?: string,
  sourceEventType: string = 'referral_rejected'
): Promise<AgentMemoryRecord | null> {
  return writeMemory({
    userId,
    agentId,
    memoryType: 'FAILURE_REASON',
    structuredFields: reasonData,
    sourceEventType,
    sourceEventId,
  });
}

/**
 * 记录主人偏好 — 用户对 Agent 决策的覆盖/否决信号。
 */
export async function recordOwnerPreference(
  userId: string,
  agentId: string,
  preferenceData: Record<string, unknown>,
  sourceEventId?: string,
  sourceEventType: string = 'user_override'
): Promise<AgentMemoryRecord | null> {
  return writeMemory({
    userId,
    agentId,
    memoryType: 'OWNER_PREFERENCE',
    structuredFields: preferenceData,
    sourceEventType,
    sourceEventId,
  });
}

/**
 * 记录任意 Agent 交互结果（兜底/通用学习信号）。
 */
export async function recordInteractionOutcome(
  userId: string,
  agentId: string,
  outcomeData: Record<string, unknown>,
  sourceEventId?: string,
  sourceEventType: string = 'interaction_outcome'
): Promise<AgentMemoryRecord | null> {
  return writeMemory({
    userId,
    agentId,
    memoryType: 'INTERACTION_OUTCOME',
    structuredFields: outcomeData,
    sourceEventType,
    sourceEventId,
  });
}

/**
 * 读取 Agent 的近期长期记忆，用于学习/推断。
 */
export async function getMemoriesForAgent(
  agentId: string,
  options?: { types?: AgentMemoryType[]; limit?: number }
): Promise<AgentMemoryRecord[]> {
  const limit = options?.limit ?? 50;
  const types = options?.types;

  try {
    const client = prisma as unknown as {
      agentMemory?: {
        findMany: (args: {
          where: Record<string, unknown>;
          orderBy: Record<string, unknown>;
          take: number;
        }) => Promise<AgentMemoryRecord[]>;
      };
    };

    if (!client.agentMemory) {
      logger.warn('[AgentMemoryService] agentMemory model not available on prisma client');
      return [];
    }

    const where: Record<string, unknown> = { agentId };
    if (types && types.length > 0) {
      where.memoryType = { in: types };
    }

    return await client.agentMemory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  } catch (error) {
    logger.error('[AgentMemoryService] failed to read memories', { error, agentId });
    return [];
  }
}
