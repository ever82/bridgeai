/**
 * Review Moderation Service
 * 评价审核服务
 *
 * 敏感词过滤、AI内容审核、异常评价标记
 */

import { ReviewModerationLog } from '@prisma/client';

import { prisma } from '../db/client';
import { logger } from '../utils/logger';

// 敏感词列表（简化版，实际应该使用更完善的词库）
const SENSITIVE_WORDS = [
  '垃圾',
  '骗子',
  '诈骗',
  '傻逼',
  '他妈的',
  '操',
  '滚',
  '去死',
  '垃圾平台',
  '骗钱',
  '虚假宣传',
  '无良商家',
  '黑心',
];

// 敏感词匹配类型
interface ISensitiveWordMatch {
  word: string;
  position: number;
}

// 内容审核结果
export interface IModerationResult {
  passed: boolean;
  flagged: boolean;
  blocked: boolean;
  reason?: string;
  matchedWords?: ISensitiveWordMatch[];
  score: number; // 0-100, 越高越可疑
}

// 审核规则配置
interface IModerationRule {
  name: string;
  enabled: boolean;
  weight: number;
  check: (content: string, title?: string) => Promise<IRuleCheckResult>;
}

// 规则检查结果
interface IRuleCheckResult {
  triggered: boolean;
  score: number;
  details?: string;
}

/**
 * 敏感词过滤检查
 * @param content 内容
 * @returns 检查结果
 */
function checkSensitiveWords(content: string): ISensitiveWordMatch[] {
  const matches: ISensitiveWordMatch[] = [];
  const lowerContent = content.toLowerCase();

  for (const word of SENSITIVE_WORDS) {
    let position = lowerContent.indexOf(word.toLowerCase());
    while (position !== -1) {
      matches.push({ word, position });
      position = lowerContent.indexOf(word.toLowerCase(), position + 1);
    }
  }

  return matches;
}

/**
 * 检查内容长度
 * @param content 内容
 * @returns 检查结果
 */
async function checkContentLength(content: string): Promise<IRuleCheckResult> {
  const minLength = 5;
  const maxLength = 2000;
  const length = content.length;

  if (length < minLength) {
    return {
      triggered: true,
      score: 30,
      details: `内容过短 (${length}/${minLength})`,
    };
  }

  if (length > maxLength) {
    return {
      triggered: true,
      score: 20,
      details: `内容过长 (${length}/${maxLength})`,
    };
  }

  return { triggered: false, score: 0 };
}

/**
 * 检查重复字符
 * @param content 内容
 * @returns 检查结果
 */
async function checkRepeatedChars(content: string): Promise<IRuleCheckResult> {
  // 检查是否有大量重复字符（如"好好好好好"、"aaaaa"）
  const repeatedPattern = /(.)\1{4,}/;

  if (repeatedPattern.test(content)) {
    return {
      triggered: true,
      score: 40,
      details: '检测到重复字符',
    };
  }

  return { triggered: false, score: 0 };
}

/**
 * 检查垃圾信息特征
 * @param content 内容
 * @returns 检查结果
 */
async function checkSpamPatterns(content: string): Promise<IRuleCheckResult> {
  const spamPatterns = [
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // 邮箱
    /\b1[3-9]\d{9}\b/, // 手机号
    /(微信|wechat|vx|薇信)[：:]?\s*[a-zA-Z0-9_-]+/, // 微信号
    /(QQ|qq)[：:]?\s*\d{5,11}/, // QQ号
    /https?:\/\/\S+/, // URL链接
  ];

  let score = 0;
  const matches: string[] = [];

  for (const pattern of spamPatterns) {
    if (pattern.test(content)) {
      score += 15;
      matches.push(pattern.source);
    }
  }

  if (score > 0) {
    return {
      triggered: true,
      score: Math.min(score, 50),
      details: `检测到可能的联系方式: ${matches.length} 处`,
    };
  }

  return { triggered: false, score: 0 };
}

/**
 * 检查无意义内容
 * @param content 内容
 * @returns 检查结果
 */
async function checkMeaninglessContent(content: string): Promise<IRuleCheckResult> {
  // 检查是否全是标点符号或空格
  const meaningfulChars = content.replace(/[\s\p{P}]/gu, '');
  if (meaningfulChars.length < 3) {
    return {
      triggered: true,
      score: 50,
      details: '内容无意义（主要是标点符号）',
    };
  }

  // 检查是否全是数字
  if (/^\d+$/.test(meaningfulChars)) {
    return {
      triggered: true,
      score: 35,
      details: '内容全是数字',
    };
  }

  return { triggered: false, score: 0 };
}

// 审核规则列表
const MODERATION_RULES: IModerationRule[] = [
  {
    name: 'sensitive_words',
    enabled: true,
    weight: 1.0,
    check: async (content: string) => {
      const matches = checkSensitiveWords(content);
      return {
        triggered: matches.length > 0,
        score: Math.min(matches.length * 20, 80),
        details:
          matches.length > 0 ? `发现敏感词: ${matches.map(m => m.word).join(', ')}` : undefined,
      };
    },
  },
  {
    name: 'content_length',
    enabled: true,
    weight: 0.5,
    check: checkContentLength,
  },
  {
    name: 'repeated_chars',
    enabled: true,
    weight: 0.8,
    check: checkRepeatedChars,
  },
  {
    name: 'spam_patterns',
    enabled: true,
    weight: 0.9,
    check: checkSpamPatterns,
  },
  {
    name: 'meaningless_content',
    enabled: true,
    weight: 0.7,
    check: checkMeaninglessContent,
  },
];

/**
 * 执行内容审核
 * @param content 评价内容
 * @param title 评价标题
 * @returns 审核结果
 */
export async function moderateContent(content: string, title?: string): Promise<IModerationResult> {
  const fullContent = title ? `${title} ${content}` : content;
  let totalScore = 0;
  const triggeredRules: string[] = [];
  let matchedWords: ISensitiveWordMatch[] = [];

  // 运行所有审核规则
  for (const rule of MODERATION_RULES) {
    if (!rule.enabled) continue;

    try {
      const result = await rule.check(fullContent, title);
      if (result.triggered) {
        totalScore += result.score * rule.weight;
        triggeredRules.push(`${rule.name}: ${result.details}`);

        // 特别处理敏感词
        if (rule.name === 'sensitive_words') {
          matchedWords = checkSensitiveWords(fullContent);
        }
      }
    } catch (error) {
      logger.error(`Moderation rule ${rule.name} failed`, error as Error);
    }
  }

  // 标准化分数到 0-100
  const normalizedScore = Math.min(Math.round(totalScore), 100);

  // 判定结果
  let passed = true;
  let flagged = false;
  let blocked = false;
  let reason: string | undefined;

  if (normalizedScore >= 80) {
    // 高风险，直接拦截
    blocked = true;
    passed = false;
    reason = `内容违规: ${triggeredRules.join('; ')}`;
  } else if (normalizedScore >= 40) {
    // 中等风险，标记待审核
    flagged = true;
    reason = `内容需审核: ${triggeredRules.join('; ')}`;
  }

  logger.debug('Content moderation completed', {
    score: normalizedScore,
    passed,
    flagged,
    blocked,
  });

  return {
    passed,
    flagged,
    blocked,
    reason,
    matchedWords: matchedWords.length > 0 ? matchedWords : undefined,
    score: normalizedScore,
  };
}

/**
 * 审核评价（异步）
 * @param reviewId 评价ID
 * @returns 审核结果
 */
export async function moderateReview(reviewId: string): Promise<IModerationResult> {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw new Error('评价不存在');
  }

  const result = await moderateContent(review.content, review.title || undefined);

  // 更新评价审核状态
  if (result.blocked) {
    await prisma.review.update({
      where: { id: reviewId },
      data: {
        moderationStatus: 'BLOCKED',
        status: 'REJECTED',
      },
    });

    // 记录审核日志
    await prisma.reviewModerationLog.create({
      data: {
        reviewId,
        action: 'BLOCKED',
        reason: result.reason,
        triggeredBy: 'system',
        metadata: {
          score: result.score,
          matchedWords: result.matchedWords,
        } as import('@prisma/client').Prisma.InputJsonValue,
      },
    });
  } else if (result.flagged) {
    await prisma.review.update({
      where: { id: reviewId },
      data: {
        moderationStatus: 'FLAGGED',
      },
    });

    // 记录审核日志
    await prisma.reviewModerationLog.create({
      data: {
        reviewId,
        action: 'FLAGGED',
        reason: result.reason,
        triggeredBy: 'system',
        metadata: {
          score: result.score,
          matchedWords: result.matchedWords,
        } as import('@prisma/client').Prisma.InputJsonValue,
      },
    });
  } else {
    await prisma.review.update({
      where: { id: reviewId },
      data: {
        moderationStatus: 'PASSED',
        status: 'APPROVED',
      },
    });

    // 记录审核日志
    await prisma.reviewModerationLog.create({
      data: {
        reviewId,
        action: 'APPROVED',
        triggeredBy: 'system',
        metadata: {
          score: result.score,
        },
      },
    });
  }

  logger.info('Review moderation completed', {
    reviewId,
    status: result.blocked ? 'BLOCKED' : result.flagged ? 'FLAGGED' : 'PASSED',
    score: result.score,
  });

  return result;
}

/**
 * 批量审核待处理的评价
 * @param limit 处理数量限制
 * @returns 处理结果统计
 */
export async function batchModeratePendingReviews(limit: number = 100): Promise<{
  processed: number;
  passed: number;
  flagged: number;
  blocked: number;
}> {
  const pendingReviews = await prisma.review.findMany({
    where: { moderationStatus: 'PENDING' },
    take: limit,
  });

  let passed = 0;
  let flagged = 0;
  let blocked = 0;

  for (const review of pendingReviews) {
    try {
      const result = await moderateReview(review.id);
      if (result.blocked) blocked++;
      else if (result.flagged) flagged++;
      else passed++;
    } catch (error) {
      logger.error(`Failed to moderate review ${review.id}`, error as Error);
    }
  }

  logger.info('Batch moderation completed', {
    processed: pendingReviews.length,
    passed,
    flagged,
    blocked,
  });

  return {
    processed: pendingReviews.length,
    passed,
    flagged,
    blocked,
  };
}

/**
 * 获取审核日志
 * @param reviewId 评价ID
 * @returns 审核日志列表
 */
export async function getModerationLogs(reviewId: string): Promise<ReviewModerationLog[]> {
  return prisma.reviewModerationLog.findMany({
    where: { reviewId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * 人工审核评价
 * @param reviewId 评价ID
 * @param action 审核动作
 * @param reason 审核原因
 * @param moderatorId 审核员ID
 */
export async function manualModerateReview(
  reviewId: string,
  action: 'APPROVE' | 'REJECT' | 'HIDE',
  reason?: string,
  moderatorId?: string
): Promise<void> {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw new Error('评价不存在');
  }

  let status: string;
  let moderationStatus: string;
  let logAction: string;

  switch (action) {
    case 'APPROVE':
      status = 'APPROVED';
      moderationStatus = 'PASSED';
      logAction = 'APPROVED';
      break;
    case 'REJECT':
      status = 'REJECTED';
      moderationStatus = 'BLOCKED';
      logAction = 'BLOCKED';
      break;
    case 'HIDE':
      status = 'HIDDEN';
      moderationStatus = 'FLAGGED';
      logAction = 'HIDDEN';
      break;
    default:
      throw new Error('无效的审核动作');
  }

  await prisma.review.update({
    where: { id: reviewId },
    data: {
      status: status as any,
      moderationStatus: moderationStatus as any,
    },
  });

  await prisma.reviewModerationLog.create({
    data: {
      reviewId,
      action: logAction as any,
      reason,
      triggeredBy: moderatorId || 'manual',
    },
  });

  logger.info('Manual review moderation', {
    reviewId,
    action,
    moderatorId,
    reason,
  });
}

/**
 * 添加敏感词
 * @param word 敏感词
 */
export function addSensitiveWord(word: string): void {
  if (!SENSITIVE_WORDS.includes(word)) {
    SENSITIVE_WORDS.push(word);
    logger.info('Sensitive word added', { word });
  }
}

/**
 * 移除敏感词
 * @param word 敏感词
 */
export function removeSensitiveWord(word: string): void {
  const index = SENSITIVE_WORDS.indexOf(word);
  if (index > -1) {
    SENSITIVE_WORDS.splice(index, 1);
    logger.info('Sensitive word removed', { word });
  }
}

/**
 * 获取敏感词列表
 * @returns 敏感词列表
 */
export function getSensitiveWords(): string[] {
  return [...SENSITIVE_WORDS];
}
