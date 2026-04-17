/**
 * 积分规则引擎
 * 处理积分规则的校验、计算和执行
 */

import { PrismaClient } from '@prisma/client';
import {
  PointsTransactionType,
  SceneCode,
} from '@bridgeai/shared';
import { prisma } from '../db/client';
import { AppError } from '../errors/AppError';
import {
  PointsRule,
  getRuleByCode,
  getPointsLimitConfig,
  getTransferConfig,
  getFreezeConfig,
  calculateRechargePoints,
  calculateTransferFee,
  EARN_RULES,
  SPEND_RULES,
} from '../config/pointsRules';

// 规则验证结果
export interface RuleValidationResult {
  valid: boolean;
  rule?: PointsRule;
  points: number;
  error?: string;
}

// 限制检查上下文
export interface LimitCheckContext {
  userId: string;
  ruleCode: string;
  amount?: number;
}

// 限制检查结果
export interface LimitCheckResult {
  allowed: boolean;
  currentDailyCount: number;
  currentWeeklyCount: number;
  remainingDaily: number;
  remainingWeekly: number;
  error?: string;
}

// 积分计算上下文
export interface PointsCalculationContext {
  userId: string;
  ruleCode: string;
  baseAmount?: number;
  metadata?: Record<string, unknown>;
}

// 规则引擎类
export class PointsRuleEngine {
  private prisma: PrismaClient;

  constructor(prismaClient: PrismaClient = prisma) {
    this.prisma = prismaClient;
  }

  /**
   * 验证并获取规则
   */
  validateRule(ruleCode: string): RuleValidationResult {
    const rule = getRuleByCode(ruleCode);

    if (!rule) {
      return {
        valid: false,
        points: 0,
        error: `Rule not found: ${ruleCode}`,
      };
    }

    if (!rule.enabled) {
      return {
        valid: false,
        rule,
        points: 0,
        error: `Rule is disabled: ${ruleCode}`,
      };
    }

    return {
      valid: true,
      rule,
      points: rule.points,
    };
  }

  /**
   * 检查限制（每日/每周上限）
   */
  async checkLimits(context: LimitCheckContext): Promise<LimitCheckResult> {
    const { userId, ruleCode, amount } = context;

    const rule = getRuleByCode(ruleCode);
    if (!rule) {
      return {
        allowed: false,
        currentDailyCount: 0,
        currentWeeklyCount: 0,
        remainingDaily: 0,
        remainingWeekly: 0,
        error: `Rule not found: ${ruleCode}`,
      };
    }

    // 获取今日开始时间
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    // 查询今日/本周的交易次数
    const [dailyCount, weeklyCount] = await Promise.all([
      this.prisma.pointsTransaction.count({
        where: {
          userId,
          type: rule.type === 'earn' ? PointsTransactionType.EARN : PointsTransactionType.SPEND,
          createdAt: {
            gte: today,
          },
          description: {
            contains: ruleCode,
          },
        },
      }),
      this.prisma.pointsTransaction.count({
        where: {
          userId,
          type: rule.type === 'earn' ? PointsTransactionType.EARN : PointsTransactionType.SPEND,
          createdAt: {
            gte: weekStart,
          },
          description: {
            contains: ruleCode,
          },
        },
      }),
    ]);

    // 检查每日限制
    if (rule.dailyLimit !== undefined) {
      const remainingDaily = Math.max(0, rule.dailyLimit - dailyCount);
      if (remainingDaily <= 0) {
        return {
          allowed: false,
          currentDailyCount: dailyCount,
          currentWeeklyCount: weeklyCount,
          remainingDaily: 0,
          remainingWeekly: rule.weeklyLimit !== undefined
            ? Math.max(0, rule.weeklyLimit - weeklyCount)
            : -1,
          error: `Daily limit exceeded for ${rule.name}`,
        };
      }
    }

    // 检查每周限制
    if (rule.weeklyLimit !== undefined) {
      const remainingWeekly = Math.max(0, rule.weeklyLimit - weeklyCount);
      if (remainingWeekly <= 0) {
        return {
          allowed: false,
          currentDailyCount: dailyCount,
          currentWeeklyCount: weeklyCount,
          remainingDaily: rule.dailyLimit !== undefined
            ? Math.max(0, rule.dailyLimit - dailyCount)
            : -1,
          remainingWeekly: 0,
          error: `Weekly limit exceeded for ${rule.name}`,
        };
      }
    }

    // 检查冷却时间
    if (rule.cooldownMinutes && rule.cooldownMinutes > 0) {
      const cooldownTime = new Date(now.getTime() - rule.cooldownMinutes * 60 * 1000);
      const recentTransaction = await this.prisma.pointsTransaction.findFirst({
        where: {
          userId,
          type: rule.type === 'earn' ? PointsTransactionType.EARN : PointsTransactionType.SPEND,
          description: {
            contains: ruleCode,
          },
          createdAt: {
            gte: cooldownTime,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (recentTransaction) {
        const remainingCooldown = Math.ceil(
          (recentTransaction.createdAt.getTime() + rule.cooldownMinutes * 60 * 1000 - now.getTime()) / 60000
        );
        return {
          allowed: false,
          currentDailyCount: dailyCount,
          currentWeeklyCount: weeklyCount,
          remainingDaily: rule.dailyLimit !== undefined
            ? Math.max(0, rule.dailyLimit - dailyCount)
            : -1,
          remainingWeekly: rule.weeklyLimit !== undefined
            ? Math.max(0, rule.weeklyLimit - weeklyCount)
            : -1,
          error: `Cooldown period not over. Please wait ${remainingCooldown} minutes`,
        };
      }
    }

    return {
      allowed: true,
      currentDailyCount: dailyCount,
      currentWeeklyCount: weeklyCount,
      remainingDaily: rule.dailyLimit !== undefined
        ? Math.max(0, rule.dailyLimit - dailyCount)
        : -1,
      remainingWeekly: rule.weeklyLimit !== undefined
        ? Math.max(0, rule.weeklyLimit - weeklyCount)
        : -1,
    };
  }

  /**
   * 计算积分（根据规则和上下文）
   */
  async calculatePoints(context: PointsCalculationContext): Promise<number> {
    const { ruleCode, baseAmount, metadata } = context;

    const validation = this.validateRule(ruleCode);
    if (!validation.valid || !validation.rule) {
      throw new AppError(validation.error || 'Invalid rule', 'INVALID_RULE', 400);
    }

    const rule = validation.rule;

    // 特殊规则处理
    switch (ruleCode) {
      case 'RECHARGE':
        if (!baseAmount || baseAmount <= 0) {
          throw new AppError('Invalid recharge amount', 'INVALID_AMOUNT', 400);
        }
        return calculateRechargePoints(baseAmount);

      case 'TIP_USER':
      case 'BUY_SERVICE':
        if (!baseAmount || baseAmount <= 0) {
          throw new AppError('Invalid amount', 'INVALID_AMOUNT', 400);
        }
        return -Math.abs(baseAmount); // 消耗为负数

      case 'DEDUCT_VIOLATION':
        if (!baseAmount || baseAmount <= 0) {
          throw new AppError('Invalid deduction amount', 'INVALID_AMOUNT', 400);
        }
        return -Math.abs(baseAmount);

      case 'CHECKIN_CONTINUOUS':
        // 连续签到额外奖励
        const continuousDays = (metadata?.continuousDays as number) || 0;
        return rule.points + Math.min(continuousDays * 5, 50); // 每天多5分，最多50分额外奖励

      default:
        // 默认返回规则定义的积分
        return rule.points;
    }
  }

  /**
   * 检查全局每日/每周获取限制
   */
  async checkGlobalEarnLimits(userId: string, amount: number): Promise<boolean> {
    const limits = getPointsLimitConfig();

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    // 查询今日/本周已获取积分
    const [dailyEarned, weeklyEarned] = await Promise.all([
      this.prisma.pointsTransaction.aggregate({
        where: {
          userId,
          type: PointsTransactionType.EARN,
          createdAt: {
            gte: today,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.pointsTransaction.aggregate({
        where: {
          userId,
          type: PointsTransactionType.EARN,
          createdAt: {
            gte: weekStart,
          },
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const dailyTotal = (dailyEarned._sum.amount || 0) + amount;
    const weeklyTotal = (weeklyEarned._sum.amount || 0) + amount;

    if (dailyTotal > limits.dailyEarnLimit) {
      throw new AppError(
        `Daily earn limit exceeded. Limit: ${limits.dailyEarnLimit}`,
        'DAILY_EARN_LIMIT_EXCEEDED',
        400
      );
    }

    if (weeklyTotal > limits.weeklyEarnLimit) {
      throw new AppError(
        `Weekly earn limit exceeded. Limit: ${limits.weeklyEarnLimit}`,
        'WEEKLY_EARN_LIMIT_EXCEEDED',
        400
      );
    }

    return true;
  }

  /**
   * 检查全局每日/每周消耗限制
   */
  async checkGlobalSpendLimits(userId: string, amount: number): Promise<boolean> {
    const limits = getPointsLimitConfig();

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    // 查询今日/本周已消耗积分
    const [dailySpent, weeklySpent] = await Promise.all([
      this.prisma.pointsTransaction.aggregate({
        where: {
          userId,
          type: PointsTransactionType.SPEND,
          createdAt: {
            gte: today,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.pointsTransaction.aggregate({
        where: {
          userId,
          type: PointsTransactionType.SPEND,
          createdAt: {
            gte: weekStart,
          },
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const dailyTotal = Math.abs(dailySpent._sum.amount || 0) + Math.abs(amount);
    const weeklyTotal = Math.abs(weeklySpent._sum.amount || 0) + Math.abs(amount);

    if (dailyTotal > limits.dailySpendLimit) {
      throw new AppError(
        `Daily spend limit exceeded. Limit: ${limits.dailySpendLimit}`,
        'DAILY_SPEND_LIMIT_EXCEEDED',
        400
      );
    }

    if (weeklyTotal > limits.weeklySpendLimit) {
      throw new AppError(
        `Weekly spend limit exceeded. Limit: ${limits.weeklySpendLimit}`,
        'WEEKLY_SPEND_LIMIT_EXCEEDED',
        400
      );
    }

    return true;
  }

  /**
   * 验证转账参数
   */
  validateTransfer(fromUserId: string, toUserId: string, amount: number): { valid: boolean; fee: number; error?: string } {
    const config = getTransferConfig();

    if (!config.enabled) {
      return { valid: false, fee: 0, error: 'Transfer is currently disabled' };
    }

    if (fromUserId === toUserId) {
      return { valid: false, fee: 0, error: 'Cannot transfer to yourself' };
    }

    if (amount < config.minAmount) {
      return { valid: false, fee: 0, error: `Minimum transfer amount is ${config.minAmount}` };
    }

    if (amount > config.maxAmount) {
      return { valid: false, fee: 0, error: `Maximum transfer amount is ${config.maxAmount}` };
    }

    const fee = calculateTransferFee(amount);
    return { valid: true, fee };
  }

  /**
   * 验证冻结参数
   */
  validateFreeze(accountBalance: number, currentFrozen: number, freezeAmount: number): { valid: boolean; error?: string } {
    const config = getFreezeConfig();

    if (freezeAmount <= 0) {
      return { valid: false, error: 'Freeze amount must be positive' };
    }

    const maxFreezeAmount = Math.floor(accountBalance * config.maxFreezeAmount);
    const availableAfterFreeze = accountBalance - currentFrozen;

    if (freezeAmount > availableAfterFreeze) {
      return { valid: false, error: 'Insufficient available balance to freeze' };
    }

    if (freezeAmount > maxFreezeAmount) {
      return { valid: false, error: `Cannot freeze more than ${config.maxFreezeAmount * 100}% of balance` };
    }

    return { valid: true };
  }

  /**
   * 获取所有可用规则
   */
  getAllRules(): PointsRule[] {
    return Object.values({ ...EARN_RULES, ...SPEND_RULES }).filter(rule => rule.enabled);
  }

  /**
   * 获取场景规则
   */
  getRulesByScene(scene: SceneCode): PointsRule[] {
    return Object.values(SPEND_RULES).filter(
      rule => rule.enabled && rule.scene === scene
    );
  }

  /**
   * 获取规则详情
   */
  getRuleDetail(ruleCode: string): PointsRule | undefined {
    return getRuleByCode(ruleCode);
  }
}

// 导出单例实例
export const pointsRuleEngine = new PointsRuleEngine();
