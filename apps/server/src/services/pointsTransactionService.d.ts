/**
 * 积分交易服务
 * 实现积分获取、消耗、冻结、转账等原子性操作
 * 包含事务安全和并发控制
 */
import { PrismaClient } from '@prisma/client';
import { SceneCode, PointsTransaction, PointsFreeze } from '@bridgeai/shared';
import { PointsRuleEngine } from './pointsRuleEngine';
export interface TransactionOptions {
    description?: string;
    scene?: SceneCode;
    referenceId?: string;
    metadata?: Record<string, unknown>;
}
export interface FreezeOptions {
    reason: string;
    scene?: SceneCode;
    referenceId?: string;
    expiresAt?: Date;
}
export interface TransferOptions {
    description?: string;
    referenceId?: string;
    metadata?: Record<string, unknown>;
}
export interface TransactionResult {
    success: boolean;
    transaction?: PointsTransaction;
    freeze?: PointsFreeze;
    balanceAfter: number;
    frozenAmountAfter?: number;
    error?: string;
}
export interface BatchTransactionResult {
    success: boolean;
    transactions: PointsTransaction[];
    totalEarned: number;
    totalSpent: number;
    error?: string;
}
export declare class PointsTransactionService {
    private prisma;
    private ruleEngine;
    constructor(prismaClient?: PrismaClient, ruleEngine?: PointsRuleEngine);
    /**
     * 获取或创建积分账户
     */
    getOrCreateAccount(userId: string): Promise<{
        id: string;
        userId: string;
        createdAt: Date;
        version: number;
        updatedAt: Date;
        totalEarned: number;
        balance: number;
        totalSpent: number;
        frozenAmount: number;
    }>;
    /**
     * 原子性增加积分（获取）
     * 使用乐观锁防止并发问题
     */
    earnPoints(userId: string, amount: number, options?: TransactionOptions): Promise<TransactionResult>;
    /**
     * 原子性扣除积分（消耗）
     * 使用乐观锁防止并发问题和超卖
     */
    spendPoints(userId: string, amount: number, options?: TransactionOptions): Promise<TransactionResult>;
    /**
     * 原子性冻结积分（交易担保）
     */
    freezePoints(userId: string, amount: number, options: FreezeOptions): Promise<TransactionResult>;
    /**
     * 解冻积分（释放冻结）
     */
    unfreezePoints(userId: string, freezeId: string, options?: {
        description?: string;
    }): Promise<TransactionResult>;
    /**
     * 确认使用冻结积分（完成交易）
     */
    confirmFrozenPoints(userId: string, freezeId: string, options?: {
        description?: string;
    }): Promise<TransactionResult>;
    /**
     * 积分转账（用户间）
     */
    transferPoints(fromUserId: string, toUserId: string, amount: number, options?: TransferOptions): Promise<TransactionResult>;
    /**
     * 批量处理积分操作（用于批量奖励）
     */
    batchEarnPoints(operations: Array<{
        userId: string;
        amount: number;
        options: TransactionOptions;
    }>): Promise<BatchTransactionResult>;
    /**
     * 获取默认过期时间
     */
    private getDefaultExpiry;
    /**
     * 清理过期的冻结记录
     */
    cleanupExpiredFreezes(): Promise<number>;
}
export declare const pointsTransactionService: PointsTransactionService;
//# sourceMappingURL=pointsTransactionService.d.ts.map