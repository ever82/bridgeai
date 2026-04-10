/**
 * 信用分定时更新任务
 * 全量计算和更新用户信用分
 */

import { PrismaClient } from '@prisma/client';
import { creditScoreService } from '../services/creditScoreService';
import { CreditSourceType } from '../types/credit';

const prisma = new PrismaClient();

interface CreditUpdateJobConfig {
  batchSize: number;
  delayBetweenBatches: number; // milliseconds
  maxUsersPerRun: number;
}

const DEFAULT_CONFIG: CreditUpdateJobConfig = {
  batchSize: 100,
  delayBetweenBatches: 1000,
  maxUsersPerRun: 10000,
};

/**
 * 全量信用分更新任务
 * 建议运行频率：每日凌晨
 */
export async function runCreditUpdateJob(
  config: Partial<CreditUpdateJobConfig> = {}
): Promise<{
  success: boolean;
  processed: number;
  failed: number;
  errors: string[];
}> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const errors: string[] = [];
  let processed = 0;
  let failed = 0;

  console.log('[CreditUpdateJob] Starting credit score update job...');
  const startTime = Date.now();

  try {
    // 获取所有用户
    const users = await prisma.user.findMany({
      select: { id: true },
      take: finalConfig.maxUsersPerRun,
    });

    console.log(`[CreditUpdateJob] Found ${users.length} users to process`);

    // 分批处理
    for (let i = 0; i < users.length; i += finalConfig.batchSize) {
      const batch = users.slice(i, i + finalConfig.batchSize);
      const batchNumber = Math.floor(i / finalConfig.batchSize) + 1;
      const totalBatches = Math.ceil(users.length / finalConfig.batchSize);

      console.log(`[CreditUpdateJob] Processing batch ${batchNumber}/${totalBatches} (${batch.length} users)`);

      // 并行处理批次内的用户
      const batchResults = await Promise.allSettled(
        batch.map(async (user) => {
          try {
            const result = await creditScoreService.updateCreditScore(
              user.id,
              CreditSourceType.SCHEDULED
            );
            return { userId: user.id, success: result.success };
          } catch (error) {
            return {
              userId: user.id,
              success: false,
              error: error instanceof Error ? error.message : String(error),
            };
          }
        })
      );

      // 统计结果
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            processed++;
          } else {
            failed++;
            if ('error' in result.value) {
              errors.push(`User ${result.value.userId}: ${result.value.error}`);
            }
          }
        } else {
          failed++;
          errors.push(String(result.reason));
        }
      }

      // 批次间延迟，避免数据库压力过大
      if (i + finalConfig.batchSize < users.length) {
        await sleep(finalConfig.delayBetweenBatches);
      }
    }

    const duration = (Date.now() - startTime) / 1000;
    console.log(`[CreditUpdateJob] Job completed in ${duration}s`);
    console.log(`[CreditUpdateJob] Processed: ${processed}, Failed: ${failed}`);

    return {
      success: failed === 0,
      processed,
      failed,
      errors: errors.slice(0, 10), // 只返回前10个错误
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[CreditUpdateJob] Job failed:', errorMessage);
    errors.push(errorMessage);

    return {
      success: false,
      processed,
      failed,
      errors,
    };
  }
}

/**
 * 检测异常波动
 * 找出信用分异常变化的用户
 */
export async function detectCreditFluctuations(
  threshold: number = 50
): Promise<Array<{
  userId: string;
  oldScore: number;
  newScore: number;
  delta: number;
}>> {
  const fluctuations: Array<{
    userId: string;
    oldScore: number;
    newScore: number;
    delta: number;
  }> = [];

  // 获取最近24小时的更新记录
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const recentHistories = await prisma.creditHistory.findMany({
    where: {
      createdAt: { gte: yesterday },
      sourceType: 'SCHEDULED',
    },
    orderBy: { createdAt: 'desc' },
    distinct: ['creditId'],
  });

  for (const history of recentHistories) {
    const delta = Math.abs(history.delta);
    if (delta >= threshold) {
      fluctuations.push({
        userId: history.creditId,
        oldScore: history.oldScore,
        newScore: history.newScore,
        delta,
      });
    }
  }

  return fluctuations;
}

/**
 * 清理过期历史记录
 * 保留最近一年的记录
 */
export async function cleanupOldCreditHistory(): Promise<{
  deleted: number;
}> {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const result = await prisma.creditHistory.deleteMany({
    where: {
      createdAt: { lt: oneYearAgo },
    },
  });

  console.log(`[CreditUpdateJob] Cleaned up ${result.count} old credit history records`);

  return { deleted: result.count };
}

/**
 * 生成信用分统计报告
 */
export async function generateCreditReport(): Promise<{
  totalUsers: number;
  averageScore: number;
  levelDistribution: Record<string, number>;
}> {
  const scores = await prisma.creditScore.findMany({
    select: { score: true, level: true },
  });

  const totalUsers = scores.length;
  const averageScore = totalUsers > 0
    ? scores.reduce((sum, s) => sum + s.score, 0) / totalUsers
    : 0;

  const levelDistribution: Record<string, number> = {};
  for (const score of scores) {
    levelDistribution[score.level] = (levelDistribution[score.level] || 0) + 1;
  }

  return {
    totalUsers,
    averageScore: Math.round(averageScore),
    levelDistribution,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 如果直接运行此文件
if (require.main === module) {
  runCreditUpdateJob()
    .then(result => {
      console.log('Credit update job result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Credit update job error:', error);
      process.exit(1);
    });
}
