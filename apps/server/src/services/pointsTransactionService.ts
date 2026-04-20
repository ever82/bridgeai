/**
 * 积分交易服务
 * 实现积分获取、消耗、冻结、转账等原子性操作
 * 包含事务安全和并发控制
 */

import { PrismaClient, Prisma } from '@prisma/client';
import {
  PointsTransactionType,
  SceneCode,
  PointsTransaction,
  PointsFreeze,
} from '@bridgeai/shared';

import { prisma } from '../db/client';
import { AppError } from '../errors/AppError';
import { getFreezeConfig } from '../config/pointsRules';

import { PointsRuleEngine, pointsRuleEngine } from './pointsRuleEngine';

// 交易选项
export interface TransactionOptions {
  description?: string;
  scene?: SceneCode;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}

// 冻结选项
export interface FreezeOptions {
  reason: string;
  scene?: SceneCode;
  referenceId?: string;
  expiresAt?: Date;
}

// 转账选项
export interface TransferOptions {
  description?: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}

// 交易结果
export interface TransactionResult {
  success: boolean;
  transaction?: PointsTransaction;
  freeze?: PointsFreeze;
  balanceAfter: number;
  frozenAmountAfter?: number;
  error?: string;
}

// 批量交易结果
export interface BatchTransactionResult {
  success: boolean;
  transactions: PointsTransaction[];
  totalEarned: number;
  totalSpent: number;
  error?: string;
}

export class PointsTransactionService {
  private prisma: PrismaClient;
  private ruleEngine: PointsRuleEngine;

  constructor(prismaClient: PrismaClient = prisma, ruleEngine: PointsRuleEngine = pointsRuleEngine) {
    this.prisma = prismaClient;
    this.ruleEngine = ruleEngine;
  }

  /**
   * 获取或创建积分账户
   */
  async getOrCreateAccount(userId: string) {
    let account = await this.prisma.pointsAccount.findUnique({
      where: { userId },
    });

    if (!account) {
      account = await this.prisma.pointsAccount.create({
        data: {
          userId,
          balance: 0,
          totalEarned: 0,
          totalSpent: 0,
          frozenAmount: 0,
          version: 0,
        },
      });
    }

    return account;
  }

  /**
   * 原子性增加积分（获取）
   * 使用乐观锁防止并发问题
   */
  async earnPoints(
    userId: string,
    amount: number,
    options: TransactionOptions = {}
  ): Promise<TransactionResult> {
    const { description, scene, referenceId, metadata } = options;

    if (amount <= 0) {
      return { success: false, balanceAfter: 0, error: 'Earn amount must be positive' };
    }

    // 重试机制（乐观锁冲突时重试）
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await this.prisma.$transaction(async (tx) => {
          // 获取当前账户（使用排他锁）
          const account = await tx.pointsAccount.findUnique({
            where: { userId },
          });

          if (!account) {
            throw new AppError('Points account not found', 'ACCOUNT_NOT_FOUND', 404);
          }

          // 计算新余额
          const newBalance = account.balance + amount;
          const newTotalEarned = account.totalEarned + amount;
          const newVersion = account.version + 1;

          // 更新账户（乐观锁检查）
          const updatedAccount = await tx.pointsAccount.update({
            where: {
              userId,
              version: account.version, // 乐观锁条件
            },
            data: {
              balance: newBalance,
              totalEarned: newTotalEarned,
              version: newVersion,
            },
          });

          // 创建交易记录
          const transaction = await tx.pointsTransaction.create({
            data: {
              accountId: account.id,
              userId,
              type: PointsTransactionType.EARN,
              amount,
              balanceAfter: newBalance,
              description,
              scene,
              referenceId,
              metadata: metadata ? JSON.stringify(metadata) : null,
            },
          });

          return {
            transaction,
            balanceAfter: newBalance,
          };
        }, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });

        return {
          success: true,
          transaction: result.transaction as PointsTransaction,
          balanceAfter: result.balanceAfter,
        };
      } catch (error) {
        lastError = error as Error;

        // 乐观锁冲突，重试
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2034') { // Transaction conflict
            await new Promise(resolve => setTimeout(resolve, 10 * Math.pow(2, attempt)));
            continue;
          }
        }

        // 其他错误，直接返回
        throw error;
      }
    }

    return {
      success: false,
      balanceAfter: 0,
      error: `Failed after ${maxRetries} retries: ${lastError?.message}`,
    };
  }

  /**
   * 原子性扣除积分（消耗）
   * 使用乐观锁防止并发问题和超卖
   */
  async spendPoints(
    userId: string,
    amount: number,
    options: TransactionOptions = {}
  ): Promise<TransactionResult> {
    const { description, scene, referenceId, metadata } = options;

    if (amount <= 0) {
      return { success: false, balanceAfter: 0, error: 'Spend amount must be positive' };
    }

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await this.prisma.$transaction(async (tx) => {
          // 获取当前账户
          const account = await tx.pointsAccount.findUnique({
            where: { userId },
          });

          if (!account) {
            throw new AppError('Points account not found', 'ACCOUNT_NOT_FOUND', 404);
          }

          // 检查余额（考虑冻结金额）
          const availableBalance = account.balance - account.frozenAmount;
          if (availableBalance < amount) {
            throw new AppError(
              `Insufficient points. Available: ${availableBalance}, Required: ${amount}`,
              'INSUFFICIENT_POINTS',
              400
            );
          }

          // 计算新余额
          const newBalance = account.balance - amount;
          const newTotalSpent = account.totalSpent + amount;
          const newVersion = account.version + 1;

          // 更新账户（乐观锁检查）
          const updatedAccount = await tx.pointsAccount.update({
            where: {
              userId,
              version: account.version,
            },
            data: {
              balance: newBalance,
              totalSpent: newTotalSpent,
              version: newVersion,
            },
          });

          // 创建交易记录
          const transaction = await tx.pointsTransaction.create({
            data: {
              accountId: account.id,
              userId,
              type: PointsTransactionType.SPEND,
              amount: -amount, // 消耗为负值
              balanceAfter: newBalance,
              description,
              scene,
              referenceId,
              metadata: metadata ? JSON.stringify(metadata) : null,
            },
          });

          return {
            transaction,
            balanceAfter: newBalance,
          };
        }, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });

        return {
          success: true,
          transaction: result.transaction as PointsTransaction,
          balanceAfter: result.balanceAfter,
        };
      } catch (error) {
        lastError = error as Error;

        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2034') {
            await new Promise(resolve => setTimeout(resolve, 10 * Math.pow(2, attempt)));
            continue;
          }
        }

        throw error;
      }
    }

    return {
      success: false,
      balanceAfter: 0,
      error: `Failed after ${maxRetries} retries: ${lastError?.message}`,
    };
  }

  /**
   * 原子性冻结积分（交易担保）
   */
  async freezePoints(
    userId: string,
    amount: number,
    options: FreezeOptions
  ): Promise<TransactionResult> {
    const { reason, scene, referenceId, expiresAt } = options;

    if (amount <= 0) {
      return { success: false, balanceAfter: 0, error: 'Freeze amount must be positive' };
    }

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await this.prisma.$transaction(async (tx) => {
          // 获取当前账户
          const account = await tx.pointsAccount.findUnique({
            where: { userId },
          });

          if (!account) {
            throw new AppError('Points account not found', 'ACCOUNT_NOT_FOUND', 404);
          }

          // 验证冻结参数
          const validation = this.ruleEngine.validateFreeze(
            account.balance,
            account.frozenAmount,
            amount
          );

          if (!validation.valid) {
            throw new AppError(validation.error || 'Invalid freeze parameters', 'INVALID_FREEZE', 400);
          }

          const newFrozenAmount = account.frozenAmount + amount;
          const newVersion = account.version + 1;

          // 更新账户冻结金额
          const updatedAccount = await tx.pointsAccount.update({
            where: {
              userId,
              version: account.version,
            },
            data: {
              frozenAmount: newFrozenAmount,
              version: newVersion,
            },
          });

          // 创建冻结记录
          const freeze = await tx.pointsFreeze.create({
            data: {
              accountId: account.id,
              amount,
              reason,
              scene,
              referenceId,
              status: 'FROZEN',
              expiresAt: expiresAt || this.getDefaultExpiry(),
            },
          });

          // 创建交易记录
          const transaction = await tx.pointsTransaction.create({
            data: {
              accountId: account.id,
              userId,
              type: PointsTransactionType.FROZEN,
              amount: -amount,
              balanceAfter: account.balance, // 余额不变，只是冻结
              description: `Freeze: ${reason}`,
              scene,
              referenceId,
            },
          });

          return {
            transaction,
            freeze,
            balanceAfter: account.balance,
            frozenAmountAfter: newFrozenAmount,
          };
        }, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });

        return {
          success: true,
          transaction: result.transaction as PointsTransaction,
          freeze: result.freeze as PointsFreeze,
          balanceAfter: result.balanceAfter,
          frozenAmountAfter: result.frozenAmountAfter,
        };
      } catch (error) {
        lastError = error as Error;

        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2034') {
            await new Promise(resolve => setTimeout(resolve, 10 * Math.pow(2, attempt)));
            continue;
          }
        }

        throw error;
      }
    }

    return {
      success: false,
      balanceAfter: 0,
      error: `Failed after ${maxRetries} retries: ${lastError?.message}`,
    };
  }

  /**
   * 解冻积分（释放冻结）
   */
  async unfreezePoints(
    userId: string,
    freezeId: string,
    options: { description?: string } = {}
  ): Promise<TransactionResult> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await this.prisma.$transaction(async (tx) => {
          // 获取冻结记录
          const freezeRecord = await tx.pointsFreeze.findFirst({
            where: {
              id: freezeId,
              account: {
                userId,
              },
            },
            include: {
              account: true,
            },
          });

          if (!freezeRecord) {
            throw new AppError('Freeze record not found', 'FREEZE_NOT_FOUND', 404);
          }

          if (freezeRecord.status !== 'FROZEN') {
            throw new AppError(
              `Freeze record is already ${freezeRecord.status}`,
              'FREEZE_ALREADY_PROCESSED',
              400
            );
          }

          const account = freezeRecord.account;
          const newFrozenAmount = account.frozenAmount - freezeRecord.amount;
          const newVersion = account.version + 1;

          // 更新账户
          await tx.pointsAccount.update({
            where: {
              userId,
              version: account.version,
            },
            data: {
              frozenAmount: Math.max(0, newFrozenAmount),
              version: newVersion,
            },
          });

          // 更新冻结记录
          const updatedFreeze = await tx.pointsFreeze.update({
            where: { id: freezeId },
            data: {
              status: 'RELEASED',
            },
          });

          // 创建交易记录（解冻返还）
          const transaction = await tx.pointsTransaction.create({
            data: {
              accountId: account.id,
              userId,
              type: PointsTransactionType.UNFROZEN,
              amount: freezeRecord.amount,
              balanceAfter: account.balance,
              description: options.description || `Unfreeze: ${freezeRecord.reason}`,
              scene: freezeRecord.scene as SceneCode,
              referenceId: freezeRecord.referenceId,
            },
          });

          return {
            transaction,
            freeze: updatedFreeze,
            balanceAfter: account.balance,
            frozenAmountAfter: Math.max(0, newFrozenAmount),
          };
        }, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });

        return {
          success: true,
          transaction: result.transaction as PointsTransaction,
          freeze: result.freeze as PointsFreeze,
          balanceAfter: result.balanceAfter,
          frozenAmountAfter: result.frozenAmountAfter,
        };
      } catch (error) {
        lastError = error as Error;

        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2034') {
            await new Promise(resolve => setTimeout(resolve, 10 * Math.pow(2, attempt)));
            continue;
          }
        }

        throw error;
      }
    }

    return {
      success: false,
      balanceAfter: 0,
      error: `Failed after ${maxRetries} retries: ${lastError?.message}`,
    };
  }

  /**
   * 确认使用冻结积分（完成交易）
   */
  async confirmFrozenPoints(
    userId: string,
    freezeId: string,
    options: { description?: string } = {}
  ): Promise<TransactionResult> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await this.prisma.$transaction(async (tx) => {
          // 获取冻结记录
          const freezeRecord = await tx.pointsFreeze.findFirst({
            where: {
              id: freezeId,
              account: {
                userId,
              },
            },
            include: {
              account: true,
            },
          });

          if (!freezeRecord) {
            throw new AppError('Freeze record not found', 'FREEZE_NOT_FOUND', 404);
          }

          if (freezeRecord.status !== 'FROZEN') {
            throw new AppError(
              `Freeze record is already ${freezeRecord.status}`,
              'FREEZE_ALREADY_PROCESSED',
              400
            );
          }

          const account = freezeRecord.account;
          const newBalance = account.balance - freezeRecord.amount;
          const newFrozenAmount = account.frozenAmount - freezeRecord.amount;
          const newTotalSpent = account.totalSpent + freezeRecord.amount;
          const newVersion = account.version + 1;

          // 更新账户（扣除冻结的积分）
          await tx.pointsAccount.update({
            where: {
              userId,
              version: account.version,
            },
            data: {
              balance: newBalance,
              frozenAmount: Math.max(0, newFrozenAmount),
              totalSpent: newTotalSpent,
              version: newVersion,
            },
          });

          // 更新冻结记录
          const updatedFreeze = await tx.pointsFreeze.update({
            where: { id: freezeId },
            data: {
              status: 'USED',
            },
          });

          // 创建交易记录（实际消耗）
          const transaction = await tx.pointsTransaction.create({
            data: {
              accountId: account.id,
              userId,
              type: PointsTransactionType.SPEND,
              amount: -freezeRecord.amount,
              balanceAfter: newBalance,
              description: options.description || `Use frozen: ${freezeRecord.reason}`,
              scene: freezeRecord.scene as SceneCode,
              referenceId: freezeRecord.referenceId,
            },
          });

          return {
            transaction,
            freeze: updatedFreeze,
            balanceAfter: newBalance,
            frozenAmountAfter: Math.max(0, newFrozenAmount),
          };
        }, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });

        return {
          success: true,
          transaction: result.transaction as PointsTransaction,
          freeze: result.freeze as PointsFreeze,
          balanceAfter: result.balanceAfter,
          frozenAmountAfter: result.frozenAmountAfter,
        };
      } catch (error) {
        lastError = error as Error;

        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2034') {
            await new Promise(resolve => setTimeout(resolve, 10 * Math.pow(2, attempt)));
            continue;
          }
        }

        throw error;
      }
    }

    return {
      success: false,
      balanceAfter: 0,
      error: `Failed after ${maxRetries} retries: ${lastError?.message}`,
    };
  }

  /**
   * 积分转账（用户间）
   */
  async transferPoints(
    fromUserId: string,
    toUserId: string,
    amount: number,
    options: TransferOptions = {}
  ): Promise<TransactionResult> {
    const { description, referenceId, metadata } = options;

    if (amount <= 0) {
      return { success: false, balanceAfter: 0, error: 'Transfer amount must be positive' };
    }

    // 验证转账参数
    const validation = this.ruleEngine.validateTransfer(fromUserId, toUserId, amount);
    if (!validation.valid) {
      return { success: false, balanceAfter: 0, error: validation.error };
    }

    const fee = validation.fee;
    const totalDeduction = amount + fee;

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await this.prisma.$transaction(async (tx) => {
          // 获取转出方账户
          const fromAccount = await tx.pointsAccount.findUnique({
            where: { userId: fromUserId },
          });

          if (!fromAccount) {
            throw new AppError('Sender account not found', 'SENDER_NOT_FOUND', 404);
          }

          const availableBalance = fromAccount.balance - fromAccount.frozenAmount;
          if (availableBalance < totalDeduction) {
            throw new AppError(
              `Insufficient points. Available: ${availableBalance}, Required: ${totalDeduction} (including ${fee} fee)`,
              'INSUFFICIENT_POINTS',
              400
            );
          }

          // 获取或创建转入方账户
          let toAccount = await tx.pointsAccount.findUnique({
            where: { userId: toUserId },
          });

          if (!toAccount) {
            toAccount = await tx.pointsAccount.create({
              data: {
                userId: toUserId,
                balance: 0,
                totalEarned: 0,
                totalSpent: 0,
                frozenAmount: 0,
                version: 0,
              },
            });
          }

          // 更新转出方
          const newFromBalance = fromAccount.balance - totalDeduction;
          const newFromTotalSpent = fromAccount.totalSpent + totalDeduction;

          await tx.pointsAccount.update({
            where: {
              userId: fromUserId,
              version: fromAccount.version,
            },
            data: {
              balance: newFromBalance,
              totalSpent: newFromTotalSpent,
              version: fromAccount.version + 1,
            },
          });

          // 更新转入方
          const newToBalance = toAccount.balance + amount;
          const newToTotalEarned = toAccount.totalEarned + amount;

          await tx.pointsAccount.update({
            where: {
              userId: toUserId,
              version: toAccount.version,
            },
            data: {
              balance: newToBalance,
              totalEarned: newToTotalEarned,
              version: toAccount.version + 1,
            },
          });

          // 创建转出方交易记录
          const outTransaction = await tx.pointsTransaction.create({
            data: {
              accountId: fromAccount.id,
              userId: fromUserId,
              type: PointsTransactionType.TRANSFER_OUT,
              amount: -totalDeduction,
              balanceAfter: newFromBalance,
              description: description || `Transfer to ${toUserId}`,
              referenceId,
              metadata: metadata ? JSON.stringify({ ...metadata, fee, netAmount: amount }) : null,
            },
          });

          // 创建转入方交易记录
          await tx.pointsTransaction.create({
            data: {
              accountId: toAccount.id,
              userId: toUserId,
              type: PointsTransactionType.TRANSFER_IN,
              amount,
              balanceAfter: newToBalance,
              description: description || `Transfer from ${fromUserId}`,
              referenceId,
              metadata: metadata ? JSON.stringify(metadata) : null,
            },
          });

          return {
            transaction: outTransaction,
            balanceAfter: newFromBalance,
          };
        }, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });

        return {
          success: true,
          transaction: result.transaction as PointsTransaction,
          balanceAfter: result.balanceAfter,
        };
      } catch (error) {
        lastError = error as Error;

        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2034') {
            await new Promise(resolve => setTimeout(resolve, 10 * Math.pow(2, attempt)));
            continue;
          }
        }

        throw error;
      }
    }

    return {
      success: false,
      balanceAfter: 0,
      error: `Failed after ${maxRetries} retries: ${lastError?.message}`,
    };
  }

  /**
   * 批量处理积分操作（用于批量奖励）
   */
  async batchEarnPoints(
    operations: Array<{
      userId: string;
      amount: number;
      options: TransactionOptions;
    }>
  ): Promise<BatchTransactionResult> {
    const transactions: PointsTransaction[] = [];
    let totalEarned = 0;
    const totalSpent = 0;

    // 串行处理避免并发冲突
    for (const op of operations) {
      try {
        const result = await this.earnPoints(op.userId, op.amount, op.options);
        if (result.success && result.transaction) {
          transactions.push(result.transaction);
          totalEarned += op.amount;
        }
      } catch (error) {
        console.error(`Failed to earn points for user ${op.userId}:`, error);
        // 继续处理其他用户
      }
    }

    return {
      success: transactions.length > 0,
      transactions,
      totalEarned,
      totalSpent,
    };
  }

  /**
   * 获取默认过期时间
   */
  private getDefaultExpiry(): Date {
    const config = getFreezeConfig();
    return new Date(Date.now() + config.defaultExpireHours * 60 * 60 * 1000);
  }

  /**
   * 清理过期的冻结记录
   */
  async cleanupExpiredFreezes(): Promise<number> {
    const expired = await this.prisma.pointsFreeze.findMany({
      where: {
        status: 'FROZEN',
        expiresAt: {
          lt: new Date(),
        },
      },
      include: {
        account: true,
      },
    });

    let releasedCount = 0;

    for (const freeze of expired) {
      try {
        await this.unfreezePoints(freeze.account.userId, freeze.id, {
          description: 'Auto-release expired freeze',
        });
        releasedCount++;
      } catch (error) {
        console.error(`Failed to release expired freeze ${freeze.id}:`, error);
      }
    }

    return releasedCount;
  }
}

// 导出单例实例
export const pointsTransactionService = new PointsTransactionService();
