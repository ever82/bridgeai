/**
 * 积分服务
 * 提供积分操作的高层API，整合规则引擎和交易服务
 */

import { PrismaClient } from '@prisma/client';
import {
  PointsAccount,
  PointsTransaction,
  PointsFreeze,
  PointsAccountResponse,
  PointsTransactionListResponse,
  PointsFreezeListResponse,
  CreatePointsTransactionRequest,
  CreatePointsFreezeRequest,
  PointsOperationResult,
  PointsTransactionType,
  SceneCode,
} from '@bridgeai/shared';

import { prisma } from '../db/client';
import { AppError } from '../errors/AppError';
import {
  getRuleByCode,
  getPointsValueConfig,
  PointsValueConfig,
  PointsLimitConfig,
  getPointsLimitConfig,
  calculateRechargePoints,
  calculatePointsRmbValue,
} from '../config/pointsRules';

import { PointsRuleEngine, pointsRuleEngine } from './pointsRuleEngine';
import {
  PointsTransactionService,
  pointsTransactionService,
  TransactionOptions,
  FreezeOptions,
} from './pointsTransactionService';

// 规则执行选项
export interface RuleExecuteOptions {
  userId: string;
  ruleCode: string;
  baseAmount?: number;
  metadata?: Record<string, unknown>;
}

// 充值选项
export interface RechargeOptions {
  rmbAmount: number;
  description?: string;
  metadata?: Record<string, unknown>;
}

// 分页选项
export interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

// 交易查询过滤器
export interface TransactionFilter {
  type?: PointsTransactionType;
  scene?: SceneCode;
  startDate?: Date;
  endDate?: Date;
}

export class PointsService {
  private prisma: PrismaClient;
  private ruleEngine: PointsRuleEngine;
  private transactionService: PointsTransactionService;

  constructor(
    prismaClient: PrismaClient = prisma,
    ruleEngine: PointsRuleEngine = pointsRuleEngine,
    transactionService: PointsTransactionService = pointsTransactionService
  ) {
    this.prisma = prismaClient;
    this.ruleEngine = ruleEngine;
    this.transactionService = transactionService;
  }

  // ==================== 账户管理 ====================

  /**
   * 获取用户积分账户
   */
  async getAccount(userId: string): Promise<PointsAccountResponse | null> {
    const account = await this.prisma.pointsAccount.findUnique({
      where: { userId },
    });

    if (!account) {
      return null;
    }

    return {
      id: account.id,
      balance: account.balance,
      totalEarned: account.totalEarned,
      totalSpent: account.totalSpent,
      frozenAmount: account.frozenAmount,
      availableBalance: account.balance - account.frozenAmount,
    };
  }

  /**
   * 获取或创建积分账户
   */
  async getOrCreateAccount(userId: string): Promise<PointsAccountResponse> {
    let account = await this.getAccount(userId);

    if (!account) {
      const newAccount = await this.prisma.pointsAccount.create({
        data: {
          userId,
          balance: 0,
          totalEarned: 0,
          totalSpent: 0,
          frozenAmount: 0,
          version: 0,
        },
      });

      account = {
        id: newAccount.id,
        balance: newAccount.balance,
        totalEarned: newAccount.totalEarned,
        totalSpent: newAccount.totalSpent,
        frozenAmount: newAccount.frozenAmount,
        availableBalance: newAccount.balance,
      };
    }

    return account;
  }

  /**
   * 获取用户可用余额
   */
  async getAvailableBalance(userId: string): Promise<number> {
    const account = await this.prisma.pointsAccount.findUnique({
      where: { userId },
      select: {
        balance: true,
        frozenAmount: true,
      },
    });

    if (!account) {
      return 0;
    }

    return account.balance - account.frozenAmount;
  }

  // ==================== 积分获取 ====================

  /**
   * 执行积分获取规则
   */
  async earnByRule(options: RuleExecuteOptions): Promise<PointsOperationResult> {
    const { userId, ruleCode, metadata } = options;

    // 验证规则
    const validation = this.ruleEngine.validateRule(ruleCode);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // 检查限制
    const limitCheck = await this.ruleEngine.checkLimits({ userId, ruleCode });
    if (!limitCheck.allowed) {
      return {
        success: false,
        error: limitCheck.error,
      };
    }

    // 计算积分
    const points = await this.ruleEngine.calculatePoints({
      userId,
      ruleCode,
      baseAmount: options.baseAmount,
      metadata,
    });

    // 检查全局限制
    await this.ruleEngine.checkGlobalEarnLimits(userId, points);

    // 获取规则信息
    const rule = getRuleByCode(ruleCode);

    // 执行获取
    const result = await this.transactionService.earnPoints(userId, points, {
      description: rule?.name || ruleCode,
      scene: metadata?.scene as SceneCode,
      referenceId: metadata?.referenceId as string,
      metadata: {
        ruleCode,
        ...metadata,
      },
    });

    return {
      success: result.success,
      transaction: result.transaction,
      error: result.error,
    };
  }

  /**
   * 充值积分
   */
  async recharge(userId: string, options: RechargeOptions): Promise<PointsOperationResult> {
    const { rmbAmount, description, metadata } = options;

    if (rmbAmount <= 0) {
      return {
        success: false,
        error: 'Recharge amount must be positive',
      };
    }

    const config = getPointsValueConfig();
    if (rmbAmount < config.minRechargeAmount) {
      return {
        success: false,
        error: `Minimum recharge amount is ${config.minRechargeAmount} RMB`,
      };
    }

    const points = calculateRechargePoints(rmbAmount);

    const result = await this.transactionService.earnPoints(userId, points, {
      description: description || `Recharge ${rmbAmount} RMB`,
      metadata: {
        rmbAmount,
        ...metadata,
      },
    });

    return {
      success: result.success,
      transaction: result.transaction,
      error: result.error,
    };
  }

  /**
   * 签到获得积分
   */
  async checkIn(userId: string, continuousDays: number = 0): Promise<PointsOperationResult> {
    // 基础签到
    const baseResult = await this.earnByRule({
      userId,
      ruleCode: 'CHECKIN',
    });

    // 连续签到额外奖励
    if (continuousDays > 1) {
      await this.earnByRule({
        userId,
        ruleCode: 'CHECKIN_CONTINUOUS',
        metadata: { continuousDays },
      });
    }

    return baseResult;
  }

  /**
   * 完成任务获得积分
   */
  async completeTask(userId: string, taskType: 'daily' | 'normal' = 'normal'): Promise<PointsOperationResult> {
    const ruleCode = taskType === 'daily' ? 'TASK_DAILY' : 'TASK_COMPLETE';
    return this.earnByRule({
      userId,
      ruleCode,
    });
  }

  /**
   * 邀请好友获得积分
   */
  async inviteFriend(userId: string, invitedUserId: string): Promise<PointsOperationResult> {
    return this.earnByRule({
      userId,
      ruleCode: 'INVITE_FRIEND',
      metadata: { invitedUserId },
    });
  }

  /**
   * 分享应用获得积分
   */
  async shareApp(userId: string, platform: string): Promise<PointsOperationResult> {
    return this.earnByRule({
      userId,
      ruleCode: 'SHARE_APP',
      metadata: { platform },
    });
  }

  // ==================== 积分消耗 ====================

  /**
   * 执行积分消耗规则
   */
  async spendByRule(options: RuleExecuteOptions): Promise<PointsOperationResult> {
    const { userId, ruleCode, metadata } = options;

    // 验证规则
    const validation = this.ruleEngine.validateRule(ruleCode);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // 检查限制
    const limitCheck = await this.ruleEngine.checkLimits({ userId, ruleCode });
    if (!limitCheck.allowed) {
      return {
        success: false,
        error: limitCheck.error,
      };
    }

    // 计算积分（消耗为负值）
    const points = await this.ruleEngine.calculatePoints({
      userId,
      ruleCode,
      baseAmount: options.baseAmount,
      metadata,
    });

    const spendAmount = Math.abs(points);

    // 检查全局限制
    await this.ruleEngine.checkGlobalSpendLimits(userId, spendAmount);

    // 检查余额
    const availableBalance = await this.getAvailableBalance(userId);
    if (availableBalance < spendAmount) {
      return {
        success: false,
        error: `Insufficient points. Available: ${availableBalance}, Required: ${spendAmount}`,
      };
    }

    // 获取规则信息
    const rule = getRuleByCode(ruleCode);

    // 执行消耗
    const result = await this.transactionService.spendPoints(userId, spendAmount, {
      description: rule?.name || ruleCode,
      scene: rule?.scene || (metadata?.scene as SceneCode),
      referenceId: metadata?.referenceId as string,
      metadata: {
        ruleCode,
        ...metadata,
      },
    });

    return {
      success: result.success,
      transaction: result.transaction,
      error: result.error,
    };
  }

  /**
   * 查看照片
   */
  async viewPhoto(userId: string, photoId: string, ownerId: string): Promise<PointsOperationResult> {
    return this.spendByRule({
      userId,
      ruleCode: 'VIEW_PHOTO',
      metadata: {
        photoId,
        ownerId,
        scene: SceneCode.VISION_SHARE,
      },
    });
  }

  /**
   * 查看详细资料
   */
  async viewProfile(userId: string, targetUserId: string): Promise<PointsOperationResult> {
    return this.spendByRule({
      userId,
      ruleCode: 'VIEW_PROFILE',
      metadata: { targetUserId },
    });
  }

  /**
   * 发起匹配
   */
  async initiateMatch(userId: string, targetUserId: string): Promise<PointsOperationResult> {
    return this.spendByRule({
      userId,
      ruleCode: 'INITIATE_MATCH',
      metadata: {
        targetUserId,
        scene: SceneCode.AGENT_DATE,
      },
    });
  }

  /**
   * 超级喜欢
   */
  async superLike(userId: string, targetUserId: string): Promise<PointsOperationResult> {
    return this.spendByRule({
      userId,
      ruleCode: 'SUPER_LIKE',
      metadata: { targetUserId },
    });
  }

  /**
   * 打赏用户
   */
  async tipUser(userId: string, toUserId: string, amount: number, message?: string): Promise<PointsOperationResult> {
    // 打赏实际是转账
    return this.transfer(userId, toUserId, amount, {
      description: message || `Tip to user`,
      metadata: { type: 'tip', message },
    });
  }

  /**
   * 购买服务
   */
  async buyService(userId: string, serviceId: string, pointsCost: number, serviceName: string): Promise<PointsOperationResult> {
    return this.spendByRule({
      userId,
      ruleCode: 'BUY_SERVICE',
      baseAmount: pointsCost,
      metadata: {
        serviceId,
        serviceName,
      },
    });
  }

  /**
   * 资料推广
   */
  async boostProfile(userId: string, durationHours: number = 24): Promise<PointsOperationResult> {
    return this.spendByRule({
      userId,
      ruleCode: 'BOOST_PROFILE',
      metadata: { durationHours },
    });
  }

  // ==================== 积分冻结/解冻 ====================

  /**
   * 冻结积分
   */
  async freezePoints(
    userId: string,
    amount: number,
    options: CreatePointsFreezeRequest
  ): Promise<PointsOperationResult> {
    const result = await this.transactionService.freezePoints(userId, amount, {
      reason: options.reason,
      scene: options.scene,
      referenceId: options.referenceId,
      expiresAt: options.expiresAt ? new Date(options.expiresAt) : undefined,
    });

    return {
      success: result.success,
      transaction: result.transaction,
      freeze: result.freeze,
      error: result.error,
    };
  }

  /**
   * 解冻积分
   */
  async unfreezePoints(userId: string, freezeId: string): Promise<PointsOperationResult> {
    const result = await this.transactionService.unfreezePoints(userId, freezeId);

    return {
      success: result.success,
      transaction: result.transaction,
      freeze: result.freeze,
      error: result.error,
    };
  }

  /**
   * 确认使用冻结积分
   */
  async confirmFreeze(userId: string, freezeId: string): Promise<PointsOperationResult> {
    const result = await this.transactionService.confirmFrozenPoints(userId, freezeId);

    return {
      success: result.success,
      transaction: result.transaction,
      freeze: result.freeze,
      error: result.error,
    };
  }

  /**
   * 获取冻结记录列表
   */
  async getFreezeList(
    userId: string,
    options: PaginationOptions = {}
  ): Promise<PointsFreezeListResponse> {
    const { page = 1, pageSize = 20 } = options;
    const skip = (page - 1) * pageSize;

    const account = await this.prisma.pointsAccount.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!account) {
      return {
        freezes: [],
        pagination: {
          page,
          pageSize,
          total: 0,
          totalPages: 0,
        },
      };
    }

    const [freezes, total] = await Promise.all([
      this.prisma.pointsFreeze.findMany({
        where: { accountId: account.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.pointsFreeze.count({
        where: { accountId: account.id },
      }),
    ]);

    return {
      freezes: freezes as PointsFreeze[],
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  // ==================== 积分转账 ====================

  /**
   * 转账积分
   */
  async transfer(
    fromUserId: string,
    toUserId: string,
    amount: number,
    options: { description?: string; metadata?: Record<string, unknown> } = {}
  ): Promise<PointsOperationResult> {
    const result = await this.transactionService.transferPoints(
      fromUserId,
      toUserId,
      amount,
      options
    );

    return {
      success: result.success,
      transaction: result.transaction,
      error: result.error,
    };
  }

  // ==================== 交易记录查询 ====================

  /**
   * 获取交易记录列表
   */
  async getTransactionList(
    userId: string,
    filter: TransactionFilter = {},
    options: PaginationOptions = {}
  ): Promise<PointsTransactionListResponse> {
    const { page = 1, pageSize = 20 } = options;
    const skip = (page - 1) * pageSize;

    const where: any = { userId };

    if (filter.type) {
      where.type = filter.type;
    }

    if (filter.scene) {
      where.scene = filter.scene;
    }

    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) {
        where.createdAt.gte = filter.startDate;
      }
      if (filter.endDate) {
        where.createdAt.lte = filter.endDate;
      }
    }

    const [transactions, total] = await Promise.all([
      this.prisma.pointsTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.pointsTransaction.count({ where }),
    ]);

    return {
      transactions: transactions as PointsTransaction[],
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * 获取交易详情
   */
  async getTransactionDetail(userId: string, transactionId: string): Promise<PointsTransaction | null> {
    const transaction = await this.prisma.pointsTransaction.findFirst({
      where: {
        id: transactionId,
        userId,
      },
    });

    return transaction as PointsTransaction | null;
  }

  // ==================== 规则查询 ====================

  /**
   * 获取所有可用规则
   */
  getAllRules() {
    return this.ruleEngine.getAllRules();
  }

  /**
   * 获取场景规则
   */
  getRulesByScene(scene: SceneCode) {
    return this.ruleEngine.getRulesByScene(scene);
  }

  /**
   * 获取规则详情
   */
  getRuleDetail(ruleCode: string) {
    return this.ruleEngine.getRuleDetail(ruleCode);
  }

  /**
   * 检查规则限制
   */
  async checkRuleLimits(userId: string, ruleCode: string) {
    return this.ruleEngine.checkLimits({ userId, ruleCode });
  }

  // ==================== 配置查询 ====================

  /**
   * 获取积分价值配置
   */
  getValueConfig(): PointsValueConfig {
    return getPointsValueConfig();
  }

  /**
   * 获取积分限制配置
   */
  getLimitConfig(): PointsLimitConfig {
    return getPointsLimitConfig();
  }

  /**
   * 计算充值积分
   */
  calculateRechargePoints(rmbAmount: number): number {
    return calculateRechargePoints(rmbAmount);
  }

  /**
   * 计算积分人民币价值
   */
  calculatePointsRmbValue(points: number): number {
    return calculatePointsRmbValue(points);
  }

  // ==================== 管理功能 ====================

  /**
   * 扣除积分（用于违规惩罚等管理操作）
   */
  async deductPoints(
    userId: string,
    amount: number,
    reason: string,
    adminId?: string
  ): Promise<PointsOperationResult> {
    if (amount <= 0) {
      return {
        success: false,
        error: 'Deduct amount must be positive',
      };
    }

    // 检查余额
    const availableBalance = await this.getAvailableBalance(userId);
    if (availableBalance < amount) {
      return {
        success: false,
        error: `Insufficient points. Available: ${availableBalance}, Required: ${amount}`,
      };
    }

    const result = await this.transactionService.spendPoints(userId, amount, {
      description: `Deduct: ${reason}`,
      metadata: {
        type: 'deduct',
        reason,
        adminId,
      },
    });

    return {
      success: result.success,
      transaction: result.transaction,
      error: result.error,
    };
  }

  /**
   * 手动增加积分（用于补偿等管理操作）
   */
  async manualAddPoints(
    userId: string,
    amount: number,
    reason: string,
    adminId?: string
  ): Promise<PointsOperationResult> {
    if (amount <= 0) {
      return {
        success: false,
        error: 'Amount must be positive',
      };
    }

    const result = await this.transactionService.earnPoints(userId, amount, {
      description: `Manual add: ${reason}`,
      metadata: {
        type: 'manual',
        reason,
        adminId,
      },
    });

    return {
      success: result.success,
      transaction: result.transaction,
      error: result.error,
    };
  }

  /**
   * 批量发放积分奖励
   */
  async batchReward(
    userIds: string[],
    amount: number,
    reason: string
  ): Promise<{ success: number; failed: number }> {
    const operations = userIds.map(userId => ({
      userId,
      amount,
      options: {
        description: `Batch reward: ${reason}`,
        metadata: { type: 'batch', reason },
      } as TransactionOptions,
    }));

    const result = await this.transactionService.batchEarnPoints(operations);

    return {
      success: result.transactions.length,
      failed: userIds.length - result.transactions.length,
    };
  }

  /**
   * 清理过期冻结
   */
  async cleanupExpiredFreezes(): Promise<number> {
    return this.transactionService.cleanupExpiredFreezes();
  }
}

// 导出单例实例
export const pointsService = new PointsService();
