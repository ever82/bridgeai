/**
 * Review Service
 * 评价服务
 *
 * 评价的提交、查询、回复、删除等核心功能
 */

import { Review, ReviewReply, Prisma } from '@prisma/client';

import { prisma } from '../db/client';
import { logger } from '../utils/logger';

// 评价创建数据接口
export interface ICreateReviewData {
  matchId: string;
  reviewerId: string;
  revieweeId: string;
  sceneType?: string;
  rating: number;
  title?: string;
  content: string;
  tags?: string[];
}

// 评价更新数据接口
export interface IUpdateReviewData {
  title?: string;
  content?: string;
  rating?: number;
  tags?: string[];
}

// 评价回复数据接口
export interface ICreateReplyData {
  reviewId: string;
  authorId: string;
  content: string;
  isOfficial?: boolean;
}

// 评价查询参数接口
export interface IReviewQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  sceneType?: string;
  startDate?: Date;
  endDate?: Date;
}

// 评价列表响应接口
export interface IReviewListResponse {
  reviews: Review[];
  total: number;
  page: number;
  limit: number;
}

// 评价统计响应接口
export interface IReviewStatsResponse {
  userId: string;
  totalReviews: number;
  avgRating: number;
  fiveStarCount: number;
  fourStarCount: number;
  threeStarCount: number;
  twoStarCount: number;
  oneStarCount: number;
  responseRate: number;
}

/**
 * 验证评价权限
 * 检查用户是否有权限评价（交易完成后）
 * @param matchId 匹配ID
 * @param reviewerId 评价者ID
 * @returns 是否有权限
 */
export async function validateReviewPermission(
  matchId: string,
  reviewerId: string
): Promise<{ allowed: boolean; reason?: string; match?: any }> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      demand: { include: { agent: true } },
      supply: { include: { agent: true } },
    },
  });

  if (!match) {
    return { allowed: false, reason: '匹配不存在' };
  }

  // 检查匹配是否已完成
  if (match.status !== 'COMPLETED') {
    return { allowed: false, reason: '交易未完成，无法评价' };
  }

  // 检查评价者是否是交易的参与者
  const participantIds = [match.demand?.agent?.userId, match.supply?.agent?.userId];

  if (!participantIds.includes(reviewerId)) {
    return { allowed: false, reason: '您不是该交易的参与者' };
  }

  // 检查是否已经评价过
  const existingReview = await prisma.review.findFirst({
    where: {
      matchId,
      reviewerId,
    },
  });

  if (existingReview) {
    return { allowed: false, reason: '您已经评价过该交易' };
  }

  return { allowed: true, match };
}

/**
 * 创建评价
 * @param data 评价数据
 * @returns 创建的评价
 */
export async function createReview(data: ICreateReviewData): Promise<Review> {
  const { matchId, reviewerId, revieweeId, sceneType, rating, title, content, tags } = data;

  // 验证评分范围
  if (rating < 1 || rating > 5) {
    throw new Error('评分必须在1-5之间');
  }

  // 验证评价权限
  const permission = await validateReviewPermission(matchId, reviewerId);
  if (!permission.allowed) {
    throw new Error(permission.reason || '无评价权限');
  }

  // 创建评价
  const review = await prisma.review.create({
    data: {
      matchId,
      reviewerId,
      revieweeId,
      sceneType: sceneType as any,
      rating,
      title,
      content,
      tags: tags || [],
      status: 'PENDING',
      moderationStatus: 'PENDING',
      isVerified: true, // 交易完成的评价视为已验证
    },
  });

  logger.info('Review created', {
    reviewId: review.id,
    matchId,
    reviewerId,
    revieweeId,
    rating,
  });

  // 异步更新评价统计
  await updateReviewStats(revieweeId);

  return review;
}

/**
 * 获取评价详情
 * @param reviewId 评价ID
 * @returns 评价详情
 */
export async function getReviewById(reviewId: string): Promise<Review | null> {
  return prisma.review.findUnique({
    where: { id: reviewId },
    include: {
      reviewer: {
        select: { id: true, name: true, avatarUrl: true },
      },
      reviewee: {
        select: { id: true, name: true, avatarUrl: true },
      },
      replies: {
        include: {
          author: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

/**
 * 获取收到的评价列表
 * @param userId 用户ID
 * @param params 查询参数
 * @returns 评价列表
 */
export async function getReceivedReviews(
  userId: string,
  params: IReviewQueryParams = {}
): Promise<IReviewListResponse> {
  const { page = 1, limit = 10, status, sceneType, startDate, endDate } = params;

  const where: Prisma.ReviewWhereInput = {
    revieweeId: userId,
  };

  if (status) {
    where.status = status as any;
  }

  if (sceneType) {
    where.sceneType = sceneType as any;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        reviewer: {
          select: { id: true, name: true, avatarUrl: true },
        },
        replies: {
          include: {
            author: {
              select: { id: true, name: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.review.count({ where }),
  ]);

  return { reviews, total, page, limit };
}

/**
 * 获取发出的评价列表
 * @param userId 用户ID
 * @param params 查询参数
 * @returns 评价列表
 */
export async function getGivenReviews(
  userId: string,
  params: IReviewQueryParams = {}
): Promise<IReviewListResponse> {
  const { page = 1, limit = 10, status, sceneType, startDate, endDate } = params;

  const where: Prisma.ReviewWhereInput = {
    reviewerId: userId,
  };

  if (status) {
    where.status = status as any;
  }

  if (sceneType) {
    where.sceneType = sceneType as any;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        reviewee: {
          select: { id: true, name: true, avatarUrl: true },
        },
        replies: {
          include: {
            author: {
              select: { id: true, name: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.review.count({ where }),
  ]);

  return { reviews, total, page, limit };
}

/**
 * 更新评价
 * @param reviewId 评价ID
 * @param userId 操作用户ID
 * @param data 更新数据
 * @returns 更新后的评价
 */
export async function updateReview(
  reviewId: string,
  userId: string,
  data: IUpdateReviewData
): Promise<Review> {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw new Error('评价不存在');
  }

  // 只有评价者本人可以修改
  if (review.reviewerId !== userId) {
    throw new Error('无权修改他人评价');
  }

  // 已删除的评价不能修改
  if (review.status === 'DELETED') {
    throw new Error('已删除的评价无法修改');
  }

  // 验证评分范围
  if (data.rating !== undefined && (data.rating < 1 || data.rating > 5)) {
    throw new Error('评分必须在1-5之间');
  }

  const updatedReview = await prisma.review.update({
    where: { id: reviewId },
    data: {
      ...data,
      // 修改后重新进入审核状态
      moderationStatus: 'PENDING',
    },
  });

  logger.info('Review updated', { reviewId, userId });

  // 重新计算统计
  await updateReviewStats(review.revieweeId);

  return updatedReview;
}

/**
 * 删除评价（软删除）
 * @param reviewId 评价ID
 * @param userId 操作用户ID
 * @param isAdmin 是否管理员
 */
export async function deleteReview(
  reviewId: string,
  userId: string,
  isAdmin: boolean = false
): Promise<void> {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw new Error('评价不存在');
  }

  // 只有评价者本人或管理员可以删除
  if (review.reviewerId !== userId && !isAdmin) {
    throw new Error('无权删除他人评价');
  }

  await prisma.review.update({
    where: { id: reviewId },
    data: { status: 'DELETED' },
  });

  logger.info('Review deleted', { reviewId, userId, isAdmin });

  // 更新统计
  await updateReviewStats(review.revieweeId);
}

/**
 * 回复评价
 * @param data 回复数据
 * @returns 创建的回复
 */
export async function replyToReview(data: ICreateReplyData): Promise<ReviewReply> {
  const { reviewId, authorId, content, isOfficial = false } = data;

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw new Error('评价不存在');
  }

  // 已删除的评价不能回复
  if (review.status === 'DELETED') {
    throw new Error('已删除的评价无法回复');
  }

  // 只有被评价者或管理员可以回复
  if (review.revieweeId !== authorId && !isOfficial) {
    throw new Error('无权回复此评价');
  }

  const reply = await prisma.reviewReply.create({
    data: {
      reviewId,
      authorId,
      content,
      isOfficial,
    },
  });

  logger.info('Review reply created', {
    replyId: reply.id,
    reviewId,
    authorId,
  });

  return reply;
}

/**
 * 删除评价回复
 * @param replyId 回复ID
 * @param userId 操作用户ID
 * @param isAdmin 是否管理员
 */
export async function deleteReply(
  replyId: string,
  userId: string,
  isAdmin: boolean = false
): Promise<void> {
  const reply = await prisma.reviewReply.findUnique({
    where: { id: replyId },
  });

  if (!reply) {
    throw new Error('回复不存在');
  }

  // 只有回复作者或管理员可以删除
  if (reply.authorId !== userId && !isAdmin) {
    throw new Error('无权删除他人回复');
  }

  await prisma.reviewReply.delete({
    where: { id: replyId },
  });

  logger.info('Review reply deleted', { replyId, userId, isAdmin });
}

/**
 * 更新评价统计
 * @param userId 用户ID
 */
export async function updateReviewStats(userId: string): Promise<void> {
  const reviews = await prisma.review.findMany({
    where: {
      revieweeId: userId,
      status: 'APPROVED',
    },
    select: { rating: true },
  });

  const totalReviews = reviews.length;
  const avgRating =
    totalReviews > 0
      ? reviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / totalReviews
      : 0;

  const fiveStarCount = reviews.filter((r: { rating: number }) => r.rating === 5).length;
  const fourStarCount = reviews.filter((r: { rating: number }) => r.rating === 4).length;
  const threeStarCount = reviews.filter((r: { rating: number }) => r.rating === 3).length;
  const twoStarCount = reviews.filter((r: { rating: number }) => r.rating === 2).length;
  const oneStarCount = reviews.filter((r: { rating: number }) => r.rating === 1).length;

  // 计算回复率
  const reviewsWithReplies = await prisma.review.count({
    where: {
      revieweeId: userId,
      status: 'APPROVED',
      replies: { some: {} },
    },
  });

  const responseRate = totalReviews > 0 ? (reviewsWithReplies / totalReviews) * 100 : 0;

  await prisma.reviewStats.upsert({
    where: { userId },
    create: {
      userId,
      totalReviews,
      avgRating,
      fiveStarCount,
      fourStarCount,
      threeStarCount,
      twoStarCount,
      oneStarCount,
      responseRate,
    },
    update: {
      totalReviews,
      avgRating,
      fiveStarCount,
      fourStarCount,
      threeStarCount,
      twoStarCount,
      oneStarCount,
      responseRate,
    },
  });

  logger.debug('Review stats updated', { userId, totalReviews, avgRating });
}

/**
 * 获取用户评价统计
 * @param userId 用户ID
 * @returns 评价统计
 */
export async function getUserReviewStats(userId: string): Promise<IReviewStatsResponse | null> {
  const stats = await prisma.reviewStats.findUnique({
    where: { userId },
  });

  if (!stats) {
    return null;
  }

  return {
    userId: stats.userId,
    totalReviews: stats.totalReviews,
    avgRating: Number(stats.avgRating),
    fiveStarCount: stats.fiveStarCount,
    fourStarCount: stats.fourStarCount,
    threeStarCount: stats.threeStarCount,
    twoStarCount: stats.twoStarCount,
    oneStarCount: stats.oneStarCount,
    responseRate: Number(stats.responseRate),
  };
}

/**
 * 审核评价
 * @param reviewId 评价ID
 * @param action 审核动作
 * @param reason 原因
 * @param moderatorId 审核员ID
 */
export async function moderateReview(
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

  switch (action) {
    case 'APPROVE':
      status = 'APPROVED';
      moderationStatus = 'PASSED';
      break;
    case 'REJECT':
      status = 'REJECTED';
      moderationStatus = 'BLOCKED';
      break;
    case 'HIDE':
      status = 'HIDDEN';
      moderationStatus = 'FLAGGED';
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

  // 记录审核日志
  await prisma.reviewModerationLog.create({
    data: {
      reviewId,
      action: (action === 'APPROVE'
        ? 'APPROVED'
        : action === 'REJECT'
          ? 'BLOCKED'
          : 'HIDDEN') as any,
      reason,
      triggeredBy: moderatorId || 'system',
    },
  });

  logger.info('Review moderated', {
    reviewId,
    action,
    moderatorId,
    reason,
  });

  // 更新统计
  await updateReviewStats(review.revieweeId);
}

/**
 * 举报评价
 * @param reviewId 评价ID
 * @param reporterId 举报者ID
 * @param reason 举报原因
 * @param description 详细描述
 */
export async function reportReview(
  reviewId: string,
  reporterId: string,
  reason: string,
  description?: string
): Promise<void> {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw new Error('评价不存在');
  }

  // 不能举报自己的评价
  if (review.reviewerId === reporterId) {
    throw new Error('不能举报自己的评价');
  }

  // 检查是否已经举报过
  const existingReport = await prisma.reviewReport.findFirst({
    where: {
      reviewId,
      reporterId,
    },
  });

  if (existingReport) {
    throw new Error('您已经举报过该评价');
  }

  await prisma.reviewReport.create({
    data: {
      reviewId,
      reporterId,
      reason: reason as any,
      description,
      status: 'PENDING',
    },
  });

  // 自动标记评价为待审核
  await prisma.review.update({
    where: { id: reviewId },
    data: { moderationStatus: 'FLAGGED' },
  });

  logger.info('Review reported', {
    reviewId,
    reporterId,
    reason,
  });
}

/**
 * 处理举报
 * @param reportId 举报ID
 * @param action 处理动作
 * @param resolution 处理说明
 * @param handlerId 处理人ID
 */
export async function handleReport(
  reportId: string,
  action: 'RESOLVE' | 'DISMISS',
  resolution?: string,
  handlerId?: string
): Promise<void> {
  const report = await prisma.reviewReport.findUnique({
    where: { id: reportId },
  });

  if (!report) {
    throw new Error('举报不存在');
  }

  if (report.status !== 'PENDING') {
    throw new Error('举报已被处理');
  }

  const status = action === 'RESOLVE' ? 'RESOLVED' : 'DISMISSED';

  await prisma.reviewReport.update({
    where: { id: reportId },
    data: {
      status: status as any,
      handledBy: handlerId,
      handledAt: new Date(),
      resolution,
    },
  });

  // 如果确认违规，隐藏评价
  if (action === 'RESOLVE') {
    await prisma.review.update({
      where: { id: report.reviewId },
      data: { status: 'HIDDEN' },
    });
  }

  logger.info('Report handled', {
    reportId,
    action,
    handlerId,
  });
}
