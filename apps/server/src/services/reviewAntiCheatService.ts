/**
 * Review Anti-Cheat Service
 * 评价反作弊服务
 *
 * 恶意刷评价检测、真实性验证、异常评价自动标记
 */

import { prisma } from '../db/client';
import { logger } from '../utils/logger';

// 反作弊检测结果
export interface AntiCheatResult {
  passed: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  reasons: string[];
  score: number; // 0-100, 越高风险越高
}

// 刷评价检测配置
const ANTI_CHEAT_CONFIG = {
  // 同一用户在短时间内对同一评价者的评价次数阈值
  maxReviewsPerMatch: 1,
  // 时间窗口（小时）- 在这个时间内检查异常
  suspiciousTimeWindowHours: 24,
  // 同一IP短时间内提交评价的最大次数
  maxReviewsFromSameIpPerHour: 5,
  // 新账户提交评价的最小天数
  minAccountAgeDaysForReview: 0,
  // 评价内容重复度阈值
  contentSimilarityThreshold: 0.8,
};

/**
 * 检测是否已经评价过同一匹配
 * @param matchId 匹配ID
 * @param reviewerId 评价者ID
 * @returns 是否已经评价
 */
export async function hasAlreadyReviewedMatch(
  matchId: string,
  reviewerId: string
): Promise<boolean> {
  const existingReview = await prisma.review.findFirst({
    where: {
      matchId,
      reviewerId,
      status: { not: 'DELETED' },
    },
  });

  return !!existingReview;
}

/**
 * 检测用户是否在短时间内频繁评价
 * @param reviewerId 评价者ID
 * @param timeWindowHours 时间窗口（小时）
 * @returns 评价次数
 */
export async function countRecentReviews(
  reviewerId: string,
  timeWindowHours: number = 24
): Promise<number> {
  const timeWindow = new Date();
  timeWindow.setHours(timeWindow.getHours() - timeWindowHours);

  return prisma.review.count({
    where: {
      reviewerId,
      createdAt: { gte: timeWindow },
      status: { not: 'DELETED' },
    },
  });
}

/**
 * 检测用户是否给同一评价者频繁评价
 * @param reviewerId 评价者ID
 * @param revieweeId 被评价者ID
 * @returns 评价次数
 */
export async function countReviewsBetweenUsers(
  reviewerId: string,
  revieweeId: string
): Promise<number> {
  return prisma.review.count({
    where: {
      reviewerId,
      revieweeId,
      status: { not: 'DELETED' },
    },
  });
}

/**
 * 检测评价内容是否与已有评价高度相似
 * @param content 评价内容
 * @param userId 用户ID
 * @returns 相似评价数量
 */
export async function findSimilarReviews(
  content: string,
  userId: string,
  threshold: number = 0.8
): Promise<number> {
  const userReviews = await prisma.review.findMany({
    where: {
      reviewerId: userId,
      status: { not: 'DELETED' },
    },
    select: { content: true },
  });

  let similarCount = 0;
  for (const review of userReviews) {
    const similarity = calculateContentSimilarity(content, review.content);
    if (similarity >= threshold) {
      similarCount++;
    }
  }

  return similarCount;
}

/**
 * 计算两个字符串的相似度 (Jaccard 相似度)
 */
function calculateContentSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;

  const setA = new Set(a.split(''));
  const setB = new Set(b.split(''));

  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * 检测评价者是否是最近创建的账户（可能是水军）
 * @param userId 用户ID
 * @param minAgeDays 最小账户年龄
 * @returns 是否是新账户
 */
export async function isNewAccount(userId: string, minAgeDays: number = 1): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true },
  });

  if (!user) return true;

  const accountAgeDays = (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  return accountAgeDays < minAgeDays;
}

/**
 * 执行完整的反作弊检查
 * @param matchId 匹配ID
 * @param reviewerId 评价者ID
 * @param revieweeId 被评价者ID
 * @param content 评价内容
 * @returns 反作弊结果
 */
export async function performAntiCheatCheck(
  matchId: string,
  reviewerId: string,
  revieweeId: string,
  content: string
): Promise<AntiCheatResult> {
  const reasons: string[] = [];
  let riskScore = 0;

  // 1. 检查是否已经评价过同一匹配
  if (await hasAlreadyReviewedMatch(matchId, reviewerId)) {
    return {
      passed: false,
      riskLevel: 'high',
      reasons: ['您已经评价过该交易'],
      score: 100,
    };
  }

  // 2. 检查短时间内频繁评价
  const recentReviews = await countRecentReviews(reviewerId, 24);
  if (recentReviews >= ANTI_CHEAT_CONFIG.maxReviewsFromSameIpPerHour) {
    reasons.push(`24小时内评价${recentReviews}次，异常频繁`);
    riskScore += 40;
  }

  // 3. 检查对同一评价者的频繁评价
  const reviewsBetween = await countReviewsBetweenUsers(reviewerId, revieweeId);
  if (reviewsBetween > ANTI_CHEAT_CONFIG.maxReviewsPerMatch) {
    reasons.push(`对同一用户评价${reviewsBetween}次，异常频繁`);
    riskScore += 30;
  }

  // 4. 检查内容相似度（刷好评模式）
  const similarCount = await findSimilarReviews(content, reviewerId);
  if (similarCount > 2) {
    reasons.push(`与已有${similarCount}条评价内容高度相似`);
    riskScore += 35;
  }

  // 5. 检查是否是新账户
  if (await isNewAccount(reviewerId, ANTI_CHEAT_CONFIG.minAccountAgeDaysForReview)) {
    reasons.push('新创建账户，评价可信度低');
    riskScore += 15;
  }

  // 确定风险等级
  let riskLevel: 'low' | 'medium' | 'high';
  let passed = true;

  if (riskScore >= 70) {
    riskLevel = 'high';
    passed = false;
  } else if (riskScore >= 30) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }

  if (reasons.length === 0) {
    reasons.push('无反作弊风险');
  }

  return {
    passed,
    riskLevel,
    reasons,
    score: riskScore,
  };
}

/**
 * 自动标记异常评价
 * 检测并标记符合以下特征的评价：
 * - 同一用户短时间内大量评价
 * - 评价内容大量重复
 * - 评价者账户年龄极低
 */
export async function autoFlagSuspiciousReviews(): Promise<{
  flagged: number;
  checked: number;
}> {
  const suspiciousTimeWindow = new Date();
  suspiciousTimeWindow.setHours(suspiciousTimeWindow.getHours() - 24);

  // 查找24小时内有大量评价的用户
  const reviewCounts = await prisma.review.groupBy({
    by: ['reviewerId'],
    where: {
      createdAt: { gte: suspiciousTimeWindow },
      status: { not: 'DELETED' },
    },
    _count: { reviewerId: true },
    having: {
      reviewerId: { _count: { gte: 5 } },
    },
  });

  let flagged = 0;

  for (const group of reviewCounts) {
    const reviewerId = group.reviewerId;

    // 获取该用户的所有近期评价
    const reviews = await prisma.review.findMany({
      where: {
        reviewerId,
        createdAt: { gte: suspiciousTimeWindow },
        status: { not: 'DELETED' },
      },
    });

    // 如果用户评价的内容高度相似，标记为可疑
    if (reviews.length >= 3) {
      const contents = reviews.map(r => r.content);
      const hasHighSimilarity = checkContentSimilarityBatch(contents);

      if (hasHighSimilarity) {
        // 标记所有评价为待审核
        await prisma.review.updateMany({
          where: {
            id: { in: reviews.map(r => r.id) },
            moderationStatus: 'PASSED',
          },
          data: { moderationStatus: 'FLAGGED' },
        });

        flagged += reviews.length;
      }
    }
  }

  if (flagged > 0) {
    logger.warn('Auto-flagged suspicious reviews', {
      flagged,
      checked: reviewCounts.length,
    });
  }

  return { flagged, checked: reviewCounts.length };
}

/**
 * 批量检查内容相似度
 */
function checkContentSimilarityBatch(contents: string[]): boolean {
  if (contents.length < 2) return false;

  let highSimilarityPairs = 0;
  const totalPairs = (contents.length * (contents.length - 1)) / 2;

  for (let i = 0; i < contents.length; i++) {
    for (let j = i + 1; j < contents.length; j++) {
      if (
        calculateContentSimilarity(contents[i], contents[j]) >
        ANTI_CHEAT_CONFIG.contentSimilarityThreshold
      ) {
        highSimilarityPairs++;
      }
    }
  }

  // 如果超过50%的评价对内容相似，认为存在刷评价行为
  return highSimilarityPairs > totalPairs * 0.5;
}
