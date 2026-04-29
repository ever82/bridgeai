/**
 * 信用分计算服务
 * 实现多维度信用评分算法
 */
import { EventEmitter } from 'events';
import { prisma } from '../db/client';
import { CreditFactorType, } from '../types/credit';
import { CREDIT_SCORE_CONFIG, FACTOR_WEIGHTS } from '../config/creditWeights';
import { getCreditLevel } from '../config/creditLevels';
export class CreditScoreService {
    /**
     * 计算用户信用分
     */
    async calculateScore(userId) {
        // 并行计算各维度分数
        const [profileScore, behaviorScore, transactionScore, socialScore] = await Promise.all([
            this.calculateProfileScore(userId),
            this.calculateBehaviorScore(userId),
            this.calculateTransactionScore(userId),
            this.calculateSocialScore(userId),
        ]);
        // 汇总各维度得分
        const factors = [
            ...profileScore,
            ...behaviorScore,
            ...transactionScore,
            ...socialScore,
        ];
        // 计算总分
        const totalScore = Math.round(factors.reduce((sum, f) => sum + f.weightedScore, 0));
        // 确保分数在有效范围内
        const clampedScore = Math.max(CREDIT_SCORE_CONFIG.minScore, Math.min(CREDIT_SCORE_CONFIG.maxScore, totalScore));
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
    async calculateProfileScore(userId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { agents: true },
        });
        if (!user)
            return [];
        const subFactors = [];
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
    async calculateBehaviorScore(userId) {
        const subFactors = [];
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
    async calculateTransactionScore(userId) {
        const subFactors = [];
        // 获取用户的交易记录
        const transactions = await prisma.transaction.findMany({
            where: { userId },
        });
        // 获取匹配记录
        const matches = await prisma.match.findMany({
            where: {
                OR: [{ demand: { agent: { userId } } }, { supply: { agent: { userId } } }],
            },
        });
        // 交易完成率
        const completionScore = this.calculateCompletionRate(matches);
        subFactors.push({ name: 'completion_rate', score: completionScore });
        // 纠纷率 (负向指标)
        const disputeScore = await this.calculateDisputeRate(userId);
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
    async calculateSocialScore(userId) {
        const subFactors = [];
        // 获取评价
        const reviews = await prisma.review.findMany({
            where: { revieweeId: userId, status: 'APPROVED' },
            include: { replies: true },
        });
        // 评价分数
        const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
        const ratingScore = avgRating * 20; // 5分制转百分制
        subFactors.push({ name: 'rating_score', score: ratingScore });
        // 评价数量评分
        const ratingCountScore = Math.min(reviews.length * 10, 100);
        subFactors.push({ name: 'rating_count', score: ratingCountScore });
        // 被举报次数 (负向指标: 包含评价举报 + 通用举报)
        const reviewReportCount = await prisma.reviewReport.count({
            where: { review: { reviewerId: userId } },
        });
        const generalReportCount = await prisma.report.count({
            where: { targetId: userId, targetType: 'USER' },
        });
        const complaintCount = reviewReportCount + generalReportCount;
        const complaintScore = Math.max(0, 100 - complaintCount * 10);
        subFactors.push({ name: 'complaint_count', score: complaintScore });
        // 连接数评分
        const connectionCount = await prisma.connection.count({
            where: { userId },
        });
        const connectionScore = Math.min(connectionCount * 5, 100);
        subFactors.push({ name: 'connection_count', score: connectionScore });
        // 评价回复率评分
        const repliedReviews = reviews.filter(r => r.replies && r.replies.length > 0).length;
        const replyRateScore = calculateReplyRateBonus(reviews.length, repliedReviews) > 0 ? 100 : 0;
        subFactors.push({ name: 'reply_rate', score: replyRateScore });
        return this.buildFactorScores(CreditFactorType.SOCIAL, subFactors);
    }
    /**
     * 构建维度得分列表
     */
    buildFactorScores(type, subFactors) {
        const factor = FACTOR_WEIGHTS.find(f => f.type === type);
        if (!factor)
            return [];
        return subFactors
            .map(({ name, score }) => {
            const subFactor = factor.subFactors.find(sf => sf.name === name);
            if (!subFactor)
                return null;
            const normalizedScore = Math.min(score / subFactor.maxScore, 1);
            const weightedScore = normalizedScore * subFactor.weight * factor.weight * CREDIT_SCORE_CONFIG.maxScore;
            return {
                type,
                subFactor: name,
                score,
                weight: subFactor.weight * factor.weight,
                weightedScore,
            };
        })
            .filter(Boolean);
    }
    // ==================== 辅助计算方法 ====================
    calculateCompleteness(user) {
        const fields = ['name', 'displayName', 'avatarUrl', 'bio', 'website', 'location', 'phone'];
        const filledFields = fields.filter(field => !!user[field]).length;
        return Math.round((filledFields / fields.length) * 100);
    }
    calculateVerification(user) {
        let score = 0;
        if (user.emailVerified)
            score += 40;
        if (user.phoneVerified)
            score += 40;
        if (user.name)
            score += 20;
        return score;
    }
    calculateBioQuality(bio) {
        if (!bio)
            return 0;
        const length = bio.length;
        if (length >= 100)
            return 100;
        if (length >= 50)
            return 70;
        if (length >= 20)
            return 40;
        return 20;
    }
    async calculateResponseRate(userId) {
        const conversations = await prisma.conversation.findMany({
            where: { participantIds: { has: userId } },
        });
        if (conversations.length === 0)
            return 50; // 默认值
        // Count messages sent by the user vs total messages in their conversations
        let repliedCount = 0;
        for (const conv of conversations) {
            const messages = await prisma.message.findMany({
                where: { conversationId: conv.id },
                orderBy: { createdAt: 'desc' },
                take: 10,
            });
            const hasUserReply = messages.some((m) => m.senderId === userId);
            if (hasUserReply)
                repliedCount++;
        }
        return Math.round((repliedCount / conversations.length) * 100);
    }
    calculateCompletionRate(matches) {
        if (matches.length === 0)
            return 50; // 默认值
        const completed = matches.filter(m => m.status === 'COMPLETED').length;
        return Math.round((completed / matches.length) * 100);
    }
    async calculateDisputeRate(userId) {
        // Count disputed transactions via match status
        const disputedMatches = await prisma.match.count({
            where: {
                OR: [{ demand: { agent: { userId } } }, { supply: { agent: { userId } } }],
                status: 'DISPUTED',
            },
        });
        const totalMatches = await prisma.match.count({
            where: {
                OR: [{ demand: { agent: { userId } } }, { supply: { agent: { userId } } }],
            },
        });
        if (totalMatches === 0)
            return 100;
        const disputeRate = disputedMatches / totalMatches;
        return Math.max(0, Math.round((1 - disputeRate) * 100));
    }
    calculateCancelRate(matches) {
        if (matches.length === 0)
            return 100; // 无匹配时满分
        const cancelled = matches.filter(m => m.status === 'REJECTED').length;
        const rate = (cancelled / matches.length) * 100;
        return Math.max(0, 100 - rate * 2); // 取消率越高分数越低
    }
    /**
     * 获取用户信用分（从缓存读取，无则计算）
     */
    async getUserCreditScore(userId) {
        const creditScore = await prisma.creditScore.findUnique({
            where: { userId },
        });
        if (creditScore) {
            return creditScore.score;
        }
        // 无缓存则计算
        const result = await this.calculateScore(userId);
        return result.totalScore;
    }
    // ==================== 公共API方法 ====================
    /**
     * 获取或创建用户信用分记录
     */
    async getOrCreateCreditScore(userId) {
        let creditScore = await prisma.creditScore.findUnique({
            where: { userId },
            include: {},
        });
        if (!creditScore) {
            creditScore = await prisma.creditScore.create({
                data: {
                    userId,
                    score: CREDIT_SCORE_CONFIG.defaultScore,
                    level: getCreditLevel(CREDIT_SCORE_CONFIG.defaultScore),
                },
                include: {},
            });
        }
        return creditScore;
    }
    /**
     * 更新用户信用分
     */
    async updateCreditScore(userId, sourceType, sourceId) {
        const existing = await prisma.creditScore.findUnique({
            where: { userId },
        });
        // Rate limiting: skip update if last update was less than updateIntervalMinutes ago
        if (existing?.lastUpdated) {
            const minutesSinceUpdate = (Date.now() - existing.lastUpdated.getTime()) / (1000 * 60);
            if (minutesSinceUpdate < CREDIT_SCORE_CONFIG.updateIntervalMinutes) {
                return {
                    success: true,
                    score: existing.score,
                    level: existing.level,
                    delta: 0,
                    reason: 'Rate limited: update interval not reached',
                };
            }
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
                metadata: { updateCount: 1 },
            },
            update: {
                score: result.totalScore,
                level: result.level,
                lastUpdated: new Date(),
                metadata: { updateCount: { increment: 1 } },
            },
        });
        // 创建历史记录
        await prisma.creditHistory.create({
            data: {
                userId,
                score: result.totalScore,
                delta: result.totalScore - (existing?.score ?? CREDIT_SCORE_CONFIG.defaultScore),
                reason: `Credit score updated via ${sourceType}`,
                sourceType,
                sourceId,
                metadata: {
                    oldScore: existing?.score ?? CREDIT_SCORE_CONFIG.defaultScore,
                },
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
    async getCreditHistory(userId, page = 1, pageSize = 20) {
        const creditScore = await prisma.creditScore.findUnique({
            where: { userId },
        });
        if (!creditScore) {
            return { histories: [], total: 0, page, pageSize };
        }
        const [histories, total] = await Promise.all([
            prisma.creditHistory.findMany({
                where: { userId: creditScore.userId },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.creditHistory.count({
                where: { userId: creditScore.userId },
            }),
        ]);
        return { histories, total, page, pageSize };
    }
    /**
     * 获取信用分维度详情
     */
    async getCreditFactors(userId) {
        const creditScore = await prisma.creditScore.findUnique({
            where: { userId },
            include: { factors: true },
        });
        if (!creditScore) {
            return [];
        }
        const factorDetails = [];
        for (const factorType of Object.values(CreditFactorType)) {
            const factors = creditScore.factors.filter(f => f.factorType === factorType);
            const factorConfig = FACTOR_WEIGHTS.find(f => f.type === factorType);
            if (factorConfig && factors.length > 0) {
                const subFactors = factors.map(f => ({
                    name: f.subFactor,
                    score: f.score,
                    maxScore: 100,
                    description: this.getFactorDescription(f.factorType, f.subFactor),
                }));
                const avgScore = factors.length > 0 ? factors.reduce((sum, f) => sum + f.score, 0) / factors.length : 0;
                factorDetails.push({
                    type: factorType,
                    score: Math.round(avgScore),
                    weight: factorConfig.weight,
                    weightedScore: Math.round(avgScore * factorConfig.weight),
                    subFactors,
                });
            }
        }
        return factorDetails;
    }
    /**
     * 获取用户信用分排名
     */
    async getCreditRank(userId) {
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
            percentile: totalUsers > 0 ? Math.round((1 - higherScores / totalUsers) * 100) : 0,
        };
    }
    // ==================== 私有辅助方法 ====================
    async updateCreditFactors(creditId, factors) {
        // Delete old factors
        await prisma.creditFactor.deleteMany({
            where: { creditScoreId: creditId },
        });
        // Insert new factors
        if (factors.length === 0)
            return;
        await prisma.creditFactor.createMany({
            data: factors.map(f => ({
                creditScoreId: creditId,
                factorType: f.type,
                subFactor: f.subFactor,
                score: Math.round(f.score),
                weight: f.weight,
                weightedScore: f.weightedScore,
            })),
        });
    }
    getFactorDescription(type, subFactor) {
        const descriptions = {
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
                reply_rate: '评价回复率',
            },
        };
        return descriptions[type]?.[subFactor] || subFactor;
    }
}
// 导出单例
export const creditScoreService = new CreditScoreService();
// ============================================
// ISSUE-CR002c: Rating & Review Credit Score Functions
// ============================================
// Credit Score Events
export const creditScoreEvents = new EventEmitter();
// Credit Score Configuration for Reviews
const REVIEW_CREDIT_CONFIG = {
    GOOD_REVIEW_SCORE: 5,
    BAD_REVIEW_SCORE: -10,
    REVIEW_COUNT_BONUS: 1,
    MAX_REVIEW_COUNT_BONUS: 20,
    REPLY_RATE_THRESHOLD: 0.8,
    REPLY_RATE_BONUS: 10,
    DEFAULT_SCORE: CREDIT_SCORE_CONFIG.defaultScore,
    MIN_SCORE: CREDIT_SCORE_CONFIG.minScore,
    MAX_SCORE: CREDIT_SCORE_CONFIG.maxScore,
};
/**
 * Calculate credit score based on rating score
 * @param ratingScore - The rating score (1-5)
 * @returns Credit score delta
 */
export function calculateRatingCreditDelta(ratingScore) {
    if (ratingScore >= 4) {
        return REVIEW_CREDIT_CONFIG.GOOD_REVIEW_SCORE;
    }
    else if (ratingScore <= 2) {
        return REVIEW_CREDIT_CONFIG.BAD_REVIEW_SCORE;
    }
    return 0;
}
/**
 * Calculate credit score based on review count
 * @param reviewCount - Total number of reviews received
 * @returns Credit score bonus
 */
export function calculateReviewCountBonus(reviewCount) {
    const bonus = Math.min(reviewCount * REVIEW_CREDIT_CONFIG.REVIEW_COUNT_BONUS, REVIEW_CREDIT_CONFIG.MAX_REVIEW_COUNT_BONUS);
    return bonus;
}
/**
 * Calculate reply rate and credit bonus
 * @param totalReviews - Total reviews received
 * @param repliedReviews - Number of reviews with replies
 * @returns Credit score bonus
 */
export function calculateReplyRateBonus(totalReviews, repliedReviews) {
    if (totalReviews === 0)
        return 0;
    const replyRate = repliedReviews / totalReviews;
    if (replyRate >= REVIEW_CREDIT_CONFIG.REPLY_RATE_THRESHOLD) {
        return REVIEW_CREDIT_CONFIG.REPLY_RATE_BONUS;
    }
    return 0;
}
/**
 * Get current credit score for a user (reads cached value from DB)
 * Delegates to CreditScoreService class for unified credit score system.
 * @param userId - User ID
 * @returns Current credit score
 */
export async function getUserCreditScore(userId) {
    return creditScoreService.getUserCreditScore(userId);
}
/**
 * Update user's credit score by applying a delta
 * @param payload - Update payload
 * @returns Updated credit record
 */
export async function updateCreditScore(payload) {
    const { userId, delta, reason, sourceType, sourceId, metadata } = payload;
    const currentScore = await getUserCreditScore(userId);
    const newScore = Math.max(REVIEW_CREDIT_CONFIG.MIN_SCORE, Math.min(REVIEW_CREDIT_CONFIG.MAX_SCORE, currentScore + delta));
    // Upsert the CreditScore row
    const level = getCreditLevel(newScore);
    await prisma.creditScore.upsert({
        where: { userId },
        create: { userId, score: newScore, level },
        update: { score: newScore, level, lastUpdated: new Date() },
    });
    // Create history record
    const record = await prisma.creditHistory.create({
        data: {
            userId,
            score: newScore,
            delta,
            reason,
            sourceType,
            sourceId,
            metadata: (metadata || undefined),
        },
    });
    // Emit credit score updated event
    creditScoreEvents.emit('creditScoreUpdated', {
        userId,
        previousScore: currentScore,
        newScore,
        delta,
        reason,
        sourceType,
        sourceId,
    });
    return record;
}
/**
 * Recalculate user's credit score based on all ratings
 * Delegates to CreditScoreService class for unified credit score system.
 * @param userId - User ID
 * @returns Updated credit score
 */
export async function recalculateCreditScore(userId) {
    const result = await creditScoreService.updateCreditScore(userId, 'RECALCULATION');
    return result.score;
}
/**
 * Get credit score statistics for a user
 * @param userId - User ID
 * @returns Credit statistics
 */
export async function getCreditScoreStats(userId) {
    const currentScore = await getUserCreditScore(userId);
    const reviews = await prisma.review.findMany({
        where: { revieweeId: userId, status: 'APPROVED' },
    });
    const goodReviews = reviews.filter(r => r.rating >= 4).length;
    const badReviews = reviews.filter(r => r.rating <= 2).length;
    const averageRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
    return {
        currentScore,
        totalReviews: reviews.length,
        goodReviews,
        badReviews,
        averageRating: Math.round(averageRating * 10) / 10,
    };
}
export { REVIEW_CREDIT_CONFIG };
//# sourceMappingURL=creditScoreService.js.map