/**
 * Review Moderation Service
 * 评价审核服务
 *
 * 敏感词过滤、AI内容审核、异常评价标记
 */

import { ReviewModerationLog, ViolationType } from '@prisma/client';

import { prisma } from '../db/client';
import { logger } from '../utils/logger';
import { DEFAULT_SENSITIVE_WORDS } from '../config/sensitiveWords';

import { violationHandler, ViolationRecord } from './violationHandler';

// 从集中配置构建敏感词列表
const SENSITIVE_WORDS: string[] = DEFAULT_SENSITIVE_WORDS.map((w) => w.word);

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

/**
 * AI语义分析审核
 * 基于轻量语义规则模拟LLM审核能力：
 * - 情感极性分析（负面情感词密度）
 * - 语义模式匹配（诱导性、攻击性、虚假评价模式）
 * - 上下文一致性（评价内容与标题语义背离）
 * @param content 内容
 * @param title 标题
 * @returns 检查结果
 */
async function checkAISemanticAnalysis(content: string, title?: string): Promise<IRuleCheckResult> {
  const lowerContent = content.toLowerCase();
  let score = 0;
  const details: string[] = [];

  // 1. 负面情感词密度分析
  const negativeSentimentWords = [
    '极差',
    '糟糕',
    '失望',
    '恶心',
    '愤怒',
    '气愤',
    '无语',
    '坑爹',
    '上当',
    '后悔',
    ' worst',
    ' terrible',
    ' awful',
    ' horrible',
    ' disgusting',
    ' disappointed',
    ' hate',
    ' disgusting',
    ' frustrated',
    ' annoying',
  ];
  let negativeCount = 0;
  for (const word of negativeSentimentWords) {
    const regex = new RegExp(word, 'gi');
    const matches = lowerContent.match(regex);
    if (matches) negativeCount += matches.length;
  }
  const sentimentDensity = negativeCount / (content.length || 1);
  if (sentimentDensity > 0.05) {
    score += 25;
    details.push(`负面情感密度过高 (${(sentimentDensity * 100).toFixed(1)}%)`);
  }

  // 2. 语义模式：诱导性/操纵性语言
  const manipulativePatterns = [
    /(大家|所有人|千万|一定).*(不要|别).*(买|买|下单|尝试)/i,
    /(赶紧|立刻|马上).*(退款|退货|投诉|举报)/i,
    /(都是|全是|没一个).*(假的|骗人|垃圾|废物)/i,
    /(曝光|揭发|黑幕|内幕).*(这家|这个|该)/i,
  ];
  let manipulativeCount = 0;
  for (const pattern of manipulativePatterns) {
    if (pattern.test(content)) manipulativeCount++;
  }
  if (manipulativeCount > 0) {
    score += Math.min(manipulativeCount * 20, 40);
    details.push(`检测到诱导性语义模式 (${manipulativeCount}处)`);
  }

  // 3. 语义模式：虚假评价特征
  const fakeReviewPatterns = [
    /(好评|五星|非常满意).{0,5}(返现|红包|优惠券|奖励)/i,
    /(晒图|追评|好评).{0,10}(返|给|送).{0,5}(钱|券|礼)/i,
    /(老板|客服|店家).*(要求|让我|叫我).*(好评|五星)/i,
    /(刷单|刷评|水军|任务)/i,
  ];
  let fakeCount = 0;
  for (const pattern of fakeReviewPatterns) {
    if (pattern.test(content)) fakeCount++;
  }
  if (fakeCount > 0) {
    score += Math.min(fakeCount * 25, 50);
    details.push(`检测到虚假评价语义特征 (${fakeCount}处)`);
  }

  // 4. 上下文一致性：标题与内容语义背离
  if (title && title.length > 0) {
    const lowerTitle = title.toLowerCase();
    const titlePositive = /(好评|满意|不错|推荐|喜欢|完美|棒|good|great|love|nice)/i.test(title);
    const contentNegative = /(差|烂|垃圾|后悔|失望|骗人|不好|worst|terrible|bad|hate)/i.test(
      lowerContent
    );
    const titleNegative = /(差评|失望|垃圾|骗人|后悔|差|烂|worst|terrible|bad|hate)/i.test(
      lowerTitle
    );
    const contentPositive = /(好评|满意|不错|推荐|喜欢|good|great|love|nice)/i.test(lowerContent);

    if (titlePositive && contentNegative) {
      score += 30;
      details.push('标题与内容情感极性背离（标题正面/内容负面）');
    } else if (titleNegative && contentPositive) {
      score += 30;
      details.push('标题与内容情感极性背离（标题负面/内容正面）');
    }
  }

  // 5. 语义连贯性：检查语义碎片（大量无关联词拼接）
  const shortWordPattern = /(\b[\u4e00-\u9fa5]{1,2}\b\s*){6,}/;
  if (shortWordPattern.test(content)) {
    score += 20;
    details.push('语义碎片拼接特征');
  }

  if (score > 0) {
    return {
      triggered: true,
      score: Math.min(score, 80),
      details: details.join('; '),
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
  {
    name: 'ai_semantic_analysis',
    enabled: true,
    weight: 1.0,
    check: async (content: string, title?: string) => checkAISemanticAnalysis(content, title),
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
        } as unknown as import('@prisma/client').Prisma.InputJsonValue,
      },
    });

    // 触发违规处理：记录违规并联动处罚、信用分扣减、通知用户
    if (review) {
      try {
        const severity = Math.min(Math.floor(result.score / 10), 10);
        const violationRecord: ViolationRecord = {
          type: ViolationType.INAPPROPRIATE_CONTENT,
          severity,
          description: result.reason,
          reportId: reviewId,
        };
        await violationHandler.handleViolation(review.reviewerId, violationRecord, {
          notifyUser: true,
          creditDeduct: true,
        });
      } catch (error) {
        logger.error(`Failed to handle violation for review ${reviewId}:`, error as Error);
      }
    }
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
        } as unknown as import('@prisma/client').Prisma.InputJsonValue,
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
