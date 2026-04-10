/**
 * 信用分计算服务
 * 实现多维度信用评分算法
 */

import { PrismaClient } from '@prisma/client';
import {
  CreditFactorType,
  CreditSourceType,
  CreditScoreResult,
  FactorScore,
  CreditFactorDetail,
  SubFactorDetail,
} from '../types/credit';
import {
  CREDIT_SCORE_CONFIG,
  FACTOR_WEIGHTS,
  getSubFactorWeight,
} from '../config/creditWeights';
import { getCreditLevel, getCreditLevelConfig } from '../config/creditLevels';

const prisma = new PrismaClient();

export class CreditScoreService {
  /**
   * 计算用户信用分
   */
  async calculateScore(userId: string): Promise<CreditScoreResult> {
    // 并行计算各维度分数
    const [
      profileScore,
      behaviorScore,
      transactionScore,
      socialScore,
    ] = await Promise.all([
      this.calculateProfileScore(userId),
      this.calculateBehaviorScore(userId),
      this.calculateTransactionScore(userId),
      this.calculateSocialScore(userId),
    ]);

    // 汇总各维度得分
    const factors: FactorScore[] = [
      ...profileScore,
      ...behaviorScore,
      ...transactionScore,
      ...socialScore,
    ];

    // 计算总分
    const totalScore = Math.round(
      factors.reduce((sum, f) => sum + f.weightedScore, 0)
    );

    // 确保分数在有效范围内
    const clampedScore = Math.max(
      CREDIT_SCORE_CONFIG.minScore,
      Math.min(CREDIT_SCORE_CONFIG.maxScore, totalScore)
    );

    const level = getCreditLevel(clampedScore);

    return {
      totalScore: clampedScore,
      level,
      factors,
    };
  }

  /**
   * 计算基础信息维度分数
   */
  private async calculateProfileScore(userId: string): Promise<FactorScore[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { agents: true },
    });

    if (!user) return [];

    const subFactors: { name: string; score: number }[] = [];

    // 资料完整度评分
    const completenessScore = this.calculateCompleteness(user);
    subFactors.push({ name: 'completeness', score: completenessScore });

    // 认证状态评分
    const verificationScore = this.calculateVerification(user);
    subFactors.push({ name: 'verification', score: verificationScore });

    // 头像质量评分
    const avatarScore = user.avatarUrl ? 100 : 0;
    subFactors.push({ name: 'avatar_quality', score: avatarScore });

    // 简介质量评分
    const bioScore = this.calculateBioQuality(user.bio);
    subFactors.push({ name: 'bio_quality', score: bioScore });

    return this.buildFactorScores(CreditFactorType.PROFILE, subFactors);
  }

  /**
   * 计算行为维度分数
   */
  private async calculateBehaviorScore(userId: string): Promise<FactorScore[]> {
    const subFactors: { name: string; score: number }[] = [];

    // 活跃度评分 (最近30天登录次数)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const loginCount = await prisma.userDevice.count({
      where: {
        userId,
        lastActiveAt: { gte: thirtyDaysAgo },
      },
    });
    const activityScore = Math.min(loginCount * 10, 100);
    subFactors.push({ name: 'activity', score: activityScore });

    // 响应率评分
    const responseScore = await this.calculateResponseRate(userId);
    subFactors.push({ name: 'response_rate', score: responseScore });

    // 登录频率评分
    const loginFreqScore = Math.min(loginCount * 5, 100);
    subFactors.push({ name: 'login_frequency', score: loginFreqScore });

    // 使用时长评分 (根据设备数量估算)
    const deviceCount = await prisma.userDevice.count({ where: { userId } });
    const sessionScore = Math.min(deviceCount * 25, 100);
    subFactors.push({ name: 'session_duration', score: sessionScore });

    return this.buildFactorScores(CreditFactorType.BEHAVIOR, subFactors);
  }

  /**
   * 计算交易维度分数
   */
  private async calculateTransactionScore(userId: string): Promise<FactorScore[]> {
    const subFactors: { name: string; score: number }[] = [];

    // 获取用户的交易记录
    const transactions = await prisma.transaction.findMany({
      where: { userId },
    });

    // 获取匹配记录
    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { demand: { agent: { userId } } },
          { supply: { agent: { userId } } },
        ],
      },
    });

    // 交易完成率
    const completionScore = this.calculateCompletionRate(matches);
    subFactors.push({ name: 'completion_rate', score: completionScore });

    // 纠纷率 (负向指标)
    const disputeScore = this.calculateDisputeRate(userId);
    subFactors.push({ name: 'dispute_rate', score: disputeScore });

    // 取消率 (负向指标)
    const cancelScore = this.calculateCancelRate(matches);
    subFactors.push({ name: 'cancel_rate', score: cancelScore });

    // 交易次数评分
    const transactionScore = Math.min(transactions.length * 5, 100);
    subFactors.push({ name: 'transaction_count', score: transactionScore });

    return this.buildFactorScores(CreditFactorType.TRANSACTION, subFactors);
  }

  /**
   * 计算社交维度分数
   */
  private async calculateSocialScore(userId: string): Promise<FactorScore[]> {
    const subFactors: { name: string; score: number }[] = [];

    // 获取评价
    const ratings = await prisma.rating.findMany({
      where: { rateeId: userId },
    });

    // 评价分数
    const avgRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length
      : 0;
    const ratingScore = avgRating * 20; // 5分制转百分制
    subFactors.push({ name: 'rating_score', score: ratingScore });

    // 评价数量评分
    const ratingCountScore = Math.min(ratings.length * 10, 100);
    subFactors.push({ name: 'rating_count', score: ratingCountScore });

    // 被举报次数 (负向指标)
    const complaintScore = 100; // 默认满分，有举报时扣分
    subFactors.push({ name: 'complaint_count', score: complaintScore });

    // 连接数评分
    const connectionCount = await prisma.connection.count({
      where: { userId },
    });
    const connectionScore = Math.min(connectionCount * 5, 100);
    subFactors.push({ name: 'connection_count', score: connectionScore });

    return this.buildFactorScores(CreditFactorType.SOCIAL, subFactors);
  }

  /**
   * 构建维度得分列表
   */
  private buildFactorScores(
    type: CreditFactorType,
    subFactors: { name: string; score: number }[]
  ): FactorScore[] {
    const factor = FACTOR_WEIGHTS.find(f => f.type === type);
    if (!factor) return [];

    return subFactors.map(({ name, score }) => {
      const subFactor = factor.subFactors.find(sf => sf.name === name);
      if (!subFactor) return null;

      const normalizedScore = Math.min(score / subFactor.maxScore, 1);
      const weightedScore = normalizedScore * subFactor.weight * factor.weight * CREDIT_SCORE_CONFIG.maxScore;

      return {
        type,
        subFactor: name,
        score,
        weight: subFactor.weight * factor.weight,
        weightedScore,
      };
    }).filter(Boolean) as FactorScore[];
  }

  // ==================== 辅助计算方法 ====================

  private calculateCompleteness(user: any): number {
    const fields = [
      'name', 'displayName', 'avatarUrl', 'bio',
      'website', 'location', 'phone'
    ];
    const filledFields = fields.filter(field => !!user[field]).length;
    return Math.round((filledFields / fields.length) * 100);
  }

  private calculateVerification(user: any): number {
    let score = 0;
    if (user.emailVerified) score += 40;
    if (user.phoneVerified) score += 40;
    if (user.name) score += 20;
    return score;
  }

  private calculateBioQuality(bio: string | null): number {
    if (!bio) return 0;
    const length = bio.length;
    if (length >= 100) return 100;
    if (length >= 50) return 70;
    if (length >= 20) return 40;
    return 20;
  }

  private async calculateResponseRate(userId: string): number {
    // 根据消息响应计算
    const conversations = await prisma.conversation.findMany({
      where: { participantIds: { has: userId } },
    });

    if (conversations.length === 0) return 50; // 默认值

    // 简化的响应率计算
    return 70;
  }

  private calculateCompletionRate(matches: any[]): number {
    if (matches.length === 0) return 50; // 默认值
    const completed = matches.filter(m => m.status === 'COMPLETED').length;
    return Math.round((completed / matches.length) * 100);
  }

  private calculateDisputeRate(userId: string): number {
    // 简化为默认高分
    return 90;
  }

  private calculateCancelRate(matches: any[]): number {
    if (matches.length === 0) return 100; // 无匹配时满分
    const cancelled = matches.filter(m => m.status === 'REJECTED').length;
    const rate = (cancelled / matches.length) * 100;
    return Math.max(0, 100 - rate * 2); // 取消率越高分数越低
  }

  // ==================== 公共API方法 ====================

  /**
   * 获取或创建用户信用分记录
   */
  async getOrCreateCreditScore(userId: string) {
    let creditScore = await prisma.creditScore.findUnique({
      where: { userId },
      include: { factors: true },
    });

    if (!creditScore) {
      creditScore = await prisma.creditScore.create({
        data: {
          userId,
          score: CREDIT_SCORE_CONFIG.defaultScore,
          level: getCreditLevel(CREDIT_SCORE_CONFIG.defaultScore),
        },
        include: { factors: true },
      });
    }

    return creditScore;
  }

  /**
   * 更新用户信用分
   */
  async updateCreditScore(
    userId: string,
    sourceType: CreditSourceType,
    sourceId?: string
  ) {
    // 检查更新频率限制
    const existing = await prisma.creditScore.findUnique({
      where: { userId },
    });

    if (existing?.nextUpdateAt && existing.nextUpdateAt > new Date()) {
      return { success: false, reason: 'Update frequency limit' };
    }

    // 计算新分数
    const result = await this.calculateScore(userId);

    // 检测异常波动
    if (existing) {
      const delta = Math.abs(result.totalScore - existing.score);
      if (delta > CREDIT_SCORE_CONFIG.fluctuationThreshold) {
        console.warn(`Credit score fluctuation detected for user ${userId}: ${delta}`);
      }
    }

    // 更新信用分记录
    const creditScore = await prisma.creditScore.upsert({
      where: { userId },
      create: {
        userId,
        score: result.totalScore,
        level: result.level,
        updateCount: 1,
        nextUpdateAt: this.calculateNextUpdateTime(),
      },
      update: {
        score: result.totalScore,
        level: result.level,
        lastUpdatedAt: new Date(),
        updateCount: { increment: 1 },
        nextUpdateAt: this.calculateNextUpdateTime(),
      },
    });

    // 创建历史记录
    await prisma.creditHistory.create({
      data: {
        creditId: creditScore.id,
        oldScore: existing?.score ?? CREDIT_SCORE_CONFIG.defaultScore,
        newScore: result.totalScore,
        delta: result.totalScore - (existing?.score ?? CREDIT_SCORE_CONFIG.defaultScore),
        reason: `Credit score updated via ${sourceType}`,
        sourceType,
        sourceId,
      },
    });

    // 更新维度因子记录
    await this.updateCreditFactors(creditScore.id, result.factors);

    return {
      success: true,
      score: result.totalScore,
      level: result.level,
      delta: result.totalScore - (existing?.score ?? CREDIT_SCORE_CONFIG.defaultScore),
    };
  }

  /**
   * 获取信用分历史
   */
  async getCreditHistory(userId: string, page: number = 1, pageSize: number = 20) {
    const creditScore = await prisma.creditScore.findUnique({
      where: { userId },
    });

    if (!creditScore) {
      return { histories: [], total: 0, page, pageSize };
    }

    const [histories, total] = await Promise.all([
      prisma.creditHistory.findMany({
        where: { creditId: creditScore.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.creditHistory.count({
        where: { creditId: creditScore.id },
      }),
    ]);

    return { histories, total, page, pageSize };
  }

  /**
   * 获取信用分维度详情
   */
  async getCreditFactors(userId: string): Promise<CreditFactorDetail[]> {
    const creditScore = await prisma.creditScore.findUnique({
      where: { userId },
      include: { factors: true },
    });

    if (!creditScore) {
      return [];
    }

    const factorDetails: CreditFactorDetail[] = [];

    for (const factorType of Object.values(CreditFactorType)) {
      const factors = creditScore.factors.filter(f => f.factorType === factorType);
      const factorConfig = FACTOR_WEIGHTS.find(f => f.type === factorType);

      if (factorConfig) {
        const subFactors: SubFactorDetail[] = factors.map(f => ({
          name: f.subFactor,
          score: f.score,
          maxScore: 100,
          description: this.getFactorDescription(f.factorType, f.subFactor),
        }));

        const avgScore = factors.length > 0
          ? factors.reduce((sum, f) => sum + f.score, 0) / factors.length
          : 0;

        factorDetails.push({
          type: factorType,
          score: Math.round(avgScore),
          weight: factorConfig.weight,
          subFactors,
        });
      }
    }

    return factorDetails;
  }

  /**
   * 获取用户信用分排名
   */
  async getCreditRank(userId: string): Promise<{ rank: number; total: number; percentile: number }> {
    const userScore = await prisma.creditScore.findUnique({
      where: { userId },
    });

    if (!userScore) {
      return { rank: 0, total: 0, percentile: 0 };
    }

    const higherScores = await prisma.creditScore.count({
      where: { score: { gt: userScore.score } },
    });

    const totalUsers = await prisma.creditScore.count();

    return {
      rank: higherScores + 1,
      total: totalUsers,
      percentile: totalUsers > 0
        ? Math.round((1 - higherScores / totalUsers) * 100)
        : 0,
    };
  }

  // ==================== 私有辅助方法 ====================

  private async updateCreditFactors(creditId: string, factors: FactorScore[]) {
    // 删除旧记录
    await prisma.creditFactor.deleteMany({
      where: { creditId },
    });

    // 创建新记录
    await prisma.creditFactor.createMany({
      data: factors.map(f => ({
        creditId,
        factorType: f.type,
        subFactor: f.subFactor,
        score: Math.round(f.score),
        weight: f.weight,
      })),
    });
  }

  private calculateNextUpdateTime(): Date {
    const nextUpdate = new Date();
    nextUpdate.setMinutes(
      nextUpdate.getMinutes() + CREDIT_SCORE_CONFIG.updateIntervalMinutes
    );
    return nextUpdate;
  }

  private getFactorDescription(type: string, subFactor: string): string {
    const descriptions: Record<string, Record<string, string>> = {
      profile: {
        completeness: '资料完整度',
        verification: '认证状态',
        avatar_quality: '头像质量',
        bio_quality: '简介质量',
      },
      behavior: {
        activity: '活跃度',
        response_rate: '响应率',
        login_frequency: '登录频率',
        session_duration: '使用时长',
      },
      transaction: {
        completion_rate: '交易完成率',
        dispute_rate: '纠纷率',
        cancel_rate: '取消率',
        transaction_count: '交易次数',
      },
      social: {
        rating_score: '评价分数',
        rating_count: '评价数量',
        complaint_count: '被举报次数',
        connection_count: '连接数',
      },
    };

    return descriptions[type]?.[subFactor] || subFactor;
  }
}

// 导出单例
export const creditScoreService = new CreditScoreService();
