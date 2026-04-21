/**
 * VisionShare Publish Validation Service
 * 发布验证服务，负责检查用户发布权限和内容合规性
 */

import type { PublishValidationResult } from '@bridgeai/shared/types/visionShare';

import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';

interface ValidationOptions {
  userId: string;
  budgetAmount: number;
  budgetType: 'POINTS' | 'CASH';
  description?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * 发布验证服务
 */
export class PublishValidationService {
  private readonly logger = logger.child({ module: 'PublishValidation' });

  // 配置常量
  private readonly MIN_CREDIT_SCORE = 500; // 最低信用分要求
  private readonly DAILY_PUBLISH_LIMIT = 10; // 每日发布限制
  private readonly MAX_LOCATION_OFFSET = 180; // 最大经纬度偏移

  /**
   * 执行完整的发布验证
   */
  async validate(options: ValidationOptions): Promise<PublishValidationResult> {
    const result: PublishValidationResult = {
      valid: false,
      creditCheck: { passed: false, score: 0, requiredScore: this.MIN_CREDIT_SCORE },
      balanceCheck: { passed: false, balance: 0, required: 0 },
      limitCheck: { passed: false, dailyCount: 0, dailyLimit: this.DAILY_PUBLISH_LIMIT },
      contentCheck: { passed: true, issues: [] },
      locationCheck: { passed: true },
    };

    try {
      this.logger.info('Starting publish validation', { userId: options.userId });

      // 并行执行所有验证
      const [
        creditResult,
        balanceResult,
        limitResult,
        contentResult,
        locationResult,
      ] = await Promise.all([
        this.checkCreditScore(options.userId),
        this.checkBalance(options.userId, options.budgetAmount, options.budgetType),
        this.checkDailyLimit(options.userId),
        this.checkContent(options.description),
        this.checkLocation(options.latitude, options.longitude),
      ]);

      result.creditCheck = creditResult;
      result.balanceCheck = balanceResult;
      result.limitCheck = limitResult;
      result.contentCheck = contentResult;
      result.locationCheck = locationResult;

      // 只有所有检查都通过才算验证通过
      result.valid =
        creditResult.passed &&
        balanceResult.passed &&
        limitResult.passed &&
        contentResult.passed &&
        locationResult.passed;

      this.logger.info('Publish validation completed', {
        userId: options.userId,
        valid: result.valid,
      });

      return result;
    } catch (error) {
      this.logger.error('Publish validation failed', { userId: options.userId, error });
      return result;
    }
  }

  /**
   * 检查用户信用分
   */
  private async checkCreditScore(userId: string): Promise<PublishValidationResult['creditCheck']> {
    try {
      const creditScore = await prisma.creditScore.findUnique({
        where: { userId },
      });

      const score = creditScore?.score || 600; // 默认600分

      return {
        passed: score >= this.MIN_CREDIT_SCORE,
        score,
        requiredScore: this.MIN_CREDIT_SCORE,
      };
    } catch (error) {
      this.logger.error('Credit score check failed', { userId, error });
      return {
        passed: false,
        score: 0,
        requiredScore: this.MIN_CREDIT_SCORE,
      };
    }
  }

  /**
   * 检查用户积分/余额
   */
  private async checkBalance(
    userId: string,
    budgetAmount: number,
    budgetType: 'POINTS' | 'CASH'
  ): Promise<PublishValidationResult['balanceCheck']> {
    try {
      if (budgetType === 'POINTS') {
        // 检查积分账户
        const pointsAccount = await prisma.pointsAccount.findUnique({
          where: { userId },
        });

        const balance = pointsAccount?.balance || 0;

        return {
          passed: balance >= budgetAmount,
          balance,
          required: budgetAmount,
        };
      } else {
        // CASH类型暂不需要实时检查余额，由支付系统处理
        return {
          passed: true,
          balance: 0,
          required: 0,
        };
      }
    } catch (error) {
      this.logger.error('Balance check failed', { userId, error });
      return {
        passed: false,
        balance: 0,
        required: budgetAmount,
      };
    }
  }

  /**
   * 检查每日发布限制
   */
  private async checkDailyLimit(userId: string): Promise<PublishValidationResult['limitCheck']> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // 统计今日已发布的任务数
      const dailyCount = await prisma.visionShareTask.count({
        where: {
          userId,
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
          status: {
            in: ['PUBLISHED', 'MATCHING', 'IN_PROGRESS'],
          },
        },
      });

      return {
        passed: dailyCount < this.DAILY_PUBLISH_LIMIT,
        dailyCount,
        dailyLimit: this.DAILY_PUBLISH_LIMIT,
      };
    } catch (error) {
      this.logger.error('Daily limit check failed', { userId, error });
      return {
        passed: false,
        dailyCount: 0,
        dailyLimit: this.DAILY_PUBLISH_LIMIT,
      };
    }
  }

  /**
   * 内容安全检查
   */
  private async checkContent(description?: string): Promise<PublishValidationResult['contentCheck']> {
    const issues: string[] = [];

    if (!description || description.trim().length < 10) {
      issues.push('任务描述至少需要10个字符');
    }

    if (description && description.length > 1000) {
      issues.push('任务描述不能超过1000个字符');
    }

    // 敏感词检查
    const sensitiveWords = [
      '色情', '赌博', '毒品', '诈骗', '洗钱',
      'porn', 'gambling', 'drugs', 'fraud', 'money laundering',
    ];

    const content = description?.toLowerCase() || '';
    for (const word of sensitiveWords) {
      if (content.includes(word.toLowerCase())) {
        issues.push(`内容包含敏感词: ${word}`);
      }
    }

    // 联系方式检查（防止绕过平台）
    const contactPatterns = [
      /\d{11}/, // 手机号
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // 邮箱
      /weixin|微信|vx|wx|qq/i, // 社交账号
    ];

    for (const pattern of contactPatterns) {
      if (pattern.test(content)) {
        issues.push('内容包含联系方式，请通过平台内沟通');
        break;
      }
    }

    return {
      passed: issues.length === 0,
      issues,
    };
  }

  /**
   * 地理位置合理性检查
   */
  private async checkLocation(
    latitude?: number,
    longitude?: number
  ): Promise<PublishValidationResult['locationCheck']> {
    if (latitude === undefined || longitude === undefined) {
      // 位置是可选的
      return { passed: true };
    }

    // 检查经纬度范围
    if (latitude < -90 || latitude > 90) {
      return {
        passed: false,
        reason: '纬度范围错误，应该在-90到90之间',
      };
    }

    if (longitude < -180 || longitude > 180) {
      return {
        passed: false,
        reason: '经度范围错误，应该在-180到180之间',
      };
    }

    // 检查是否为有效坐标（排除0,0默认值）
    if (latitude === 0 && longitude === 0) {
      return {
        passed: false,
        reason: '请提供有效的地理位置',
      };
    }

    return { passed: true };
  }

  /**
   * 快速验证（仅检查关键项）
   */
  async quickValidate(userId: string): Promise<boolean> {
    try {
      const [creditCheck, limitCheck] = await Promise.all([
        this.checkCreditScore(userId),
        this.checkDailyLimit(userId),
      ]);

      return creditCheck.passed && limitCheck.passed;
    } catch (error) {
      this.logger.error('Quick validation failed', { userId, error });
      return false;
    }
  }

  /**
   * 获取用户发布限制信息
   */
  async getPublishLimits(userId: string): Promise<{
    dailyLimit: number;
    dailyUsed: number;
    dailyRemaining: number;
    canPublish: boolean;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const dailyUsed = await prisma.visionShareTask.count({
        where: {
          userId,
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
          status: {
            in: ['PUBLISHED', 'MATCHING', 'IN_PROGRESS', 'DRAFT'],
          },
        },
      });

      const dailyRemaining = Math.max(0, this.DAILY_PUBLISH_LIMIT - dailyUsed);

      return {
        dailyLimit: this.DAILY_PUBLISH_LIMIT,
        dailyUsed,
        dailyRemaining,
        canPublish: dailyRemaining > 0,
      };
    } catch (error) {
      this.logger.error('Get publish limits failed', { userId, error });
      return {
        dailyLimit: this.DAILY_PUBLISH_LIMIT,
        dailyUsed: 0,
        dailyRemaining: this.DAILY_PUBLISH_LIMIT,
        canPublish: true,
      };
    }
  }
}

// 导出单例实例
export const publishValidationService = new PublishValidationService();
