/**
 * Moderation Queue Service
 * 审核队列服务
 *
 * 管理内容举报的队列：review/message/user 举报的排队、人工审核、状态流转、AI预标记
 */

import { ModerationQueueItem, ModerationQueueStatus } from '@prisma/client';

import { prisma } from '../db/client';
import { logger } from '../utils/logger';

import * as reviewModerationService from './reviewModerationService';

// Queue item creation input
export interface ICreateQueueItem {
  contentType: 'review' | 'message' | 'user';
  contentId: string;
  content?: string;
  reportedBy: string;
  reportReason?: string;
}

// Queue list filter
export interface IQueueFilters {
  contentType?: string;
  status?: ModerationQueueStatus;
  assignedTo?: string;
  page?: number;
  limit?: number;
}

// Queue statistics
export interface IQueueStats {
  pending: number;
  inProgress: number;
  resolved: number;
  escalated: number;
  total: number;
  avgWaitTimeMinutes: number;
  byContentType: {
    review: number;
    message: number;
    user: number;
  };
}

/**
 * Add item to moderation queue
 * @param item Queue item data
 * @returns Created queue item
 */
export async function addToQueue(item: ICreateQueueItem): Promise<ModerationQueueItem> {
  // Check if item already exists in queue
  const existing = await prisma.moderationQueueItem.findFirst({
    where: {
      contentType: item.contentType,
      contentId: item.contentId,
      status: { in: ['PENDING', 'IN_PROGRESS'] },
    },
  });

  if (existing) {
    logger.debug('Item already in moderation queue', {
      contentType: item.contentType,
      contentId: item.contentId,
    });
    return existing;
  }

  // AI pre-scoring for reviews
  let aiScore: number | undefined;
  let aiFlags: string[] = [];

  if (item.contentType === 'review' && item.content) {
    try {
      const moderationResult = await reviewModerationService.moderateContent(item.content);
      aiScore = moderationResult.score;
      if (moderationResult.matchedWords) {
        aiFlags = moderationResult.matchedWords.map((m) => m.word);
      }
      if (moderationResult.reason) {
        aiFlags.push(...moderationResult.reason.split('; '));
      }
    } catch (error) {
      logger.error('AI pre-scoring failed for review', error as Error);
    }
  }

  const queueItem = await prisma.moderationQueueItem.create({
    data: {
      contentType: item.contentType,
      contentId: item.contentId,
      content: item.content,
      reportedBy: item.reportedBy,
      reportReason: item.reportReason,
      aiScore,
      aiFlags,
      status: 'PENDING',
    },
  });

  logger.info('Added item to moderation queue', {
    queueItemId: queueItem.id,
    contentType: item.contentType,
    contentId: item.contentId,
    aiScore,
  });

  return queueItem;
}

/**
 * Get queue items with filters and pagination
 * @param filters Filter and pagination options
 * @returns List of queue items with total count
 */
export async function getQueue(
  filters: IQueueFilters = {}
): Promise<{ items: ModerationQueueItem[]; total: number }> {
  const { contentType, status, assignedTo, page = 1, limit = 20 } = filters;

  const where: Record<string, unknown> = {};

  if (contentType) {
    where.contentType = contentType;
  }

  if (status) {
    where.status = status;
  }

  if (assignedTo) {
    where.assignedTo = assignedTo;
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.moderationQueueItem.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      skip,
      take: limit,
    }),
    prisma.moderationQueueItem.count({ where }),
  ]);

  return { items, total };
}

/**
 * Get single queue item by ID
 * @param id Queue item ID
 * @returns Queue item or null
 */
export async function getItemById(id: string): Promise<ModerationQueueItem | null> {
  return prisma.moderationQueueItem.findUnique({
    where: { id },
  });
}

/**
 * Assign queue item to a moderator
 * @param id Queue item ID
 * @param moderatorId Moderator user ID
 * @returns Updated queue item
 */
export async function assignItem(
  id: string,
  moderatorId: string
): Promise<ModerationQueueItem> {
  const item = await prisma.moderationQueueItem.findUnique({
    where: { id },
  });

  if (!item) {
    throw new Error('Queue item not found');
  }

  if (item.status === 'RESOLVED') {
    throw new Error('Cannot assign resolved item');
  }

  const updated = await prisma.moderationQueueItem.update({
    where: { id },
    data: {
      assignedTo: moderatorId,
      status: 'IN_PROGRESS',
    },
  });

  logger.info('Queue item assigned', {
    queueItemId: id,
    moderatorId,
  });

  return updated;
}

/**
 * Resolve queue item with action
 * @param id Queue item ID
 * @param action Action taken: 'APPROVE' | 'HIDE' | 'WARN' | 'BAN'
 * @param note Optional moderator note
 * @param moderatorId Moderator user ID
 * @returns Updated queue item
 */
export async function resolveItem(
  id: string,
  action: 'APPROVE' | 'HIDE' | 'WARN' | 'BAN',
  note?: string,
  moderatorId?: string
): Promise<ModerationQueueItem> {
  const item = await prisma.moderationQueueItem.findUnique({
    where: { id },
  });

  if (!item) {
    throw new Error('Queue item not found');
  }

  if (item.status === 'RESOLVED') {
    throw new Error('Item already resolved');
  }

  // Perform content action based on type and action
  await performContentAction(item.contentType, item.contentId, action);

  const updated = await prisma.moderationQueueItem.update({
    where: { id },
    data: {
      status: 'RESOLVED',
      action,
      actionNote: note,
      assignedTo: moderatorId || item.assignedTo,
    },
  });

  logger.info('Queue item resolved', {
    queueItemId: id,
    action,
    moderatorId,
  });

  return updated;
}

/**
 * Escalate queue item to higher-level moderator
 * @param id Queue item ID
 * @param note Escalation note
 * @param moderatorId Current moderator ID
 * @returns Updated queue item
 */
export async function escalateItem(
  id: string,
  note?: string,
  moderatorId?: string
): Promise<ModerationQueueItem> {
  const item = await prisma.moderationQueueItem.findUnique({
    where: { id },
  });

  if (!item) {
    throw new Error('Queue item not found');
  }

  if (item.status === 'RESOLVED') {
    throw new Error('Cannot escalate resolved item');
  }

  const updated = await prisma.moderationQueueItem.update({
    where: { id },
    data: {
      status: 'ESCALATED',
      actionNote: note ? `[ESCALATED] ${note}` : '[ESCALATED]',
      assignedTo: moderatorId || item.assignedTo,
    },
  });

  logger.info('Queue item escalated', {
    queueItemId: id,
    moderatorId,
  });

  return updated;
}

/**
 * Get queue statistics
 * @returns Queue statistics
 */
export async function getStats(): Promise<IQueueStats> {
  const [items, statusCounts, typeCounts, oldestPending] = await Promise.all([
    prisma.moderationQueueItem.findMany({
      where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
      select: { createdAt: true },
    }),
    prisma.moderationQueueItem.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    prisma.moderationQueueItem.groupBy({
      by: ['contentType'],
      where: { status: 'PENDING' },
      _count: { id: true },
    }),
    prisma.moderationQueueItem.findFirst({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    }),
  ]);

  // Build status counts map
  const statusMap: Record<string, number> = {
    PENDING: 0,
    IN_PROGRESS: 0,
    RESOLVED: 0,
    ESCALATED: 0,
  };

  for (const s of statusCounts) {
    statusMap[s.status] = s._count.id;
  }

  // Build type counts map
  const typeMap: Record<string, number> = {
    review: 0,
    message: 0,
    user: 0,
  };

  for (const t of typeCounts) {
    typeMap[t.contentType] = t._count.id;
  }

  // Calculate average wait time (in minutes)
  let avgWaitTimeMinutes = 0;
  if (oldestPending && items.length > 0) {
    const now = new Date();
    const totalWaitMs = items.reduce((sum, item) => {
      return sum + (now.getTime() - item.createdAt.getTime());
    }, 0);
    avgWaitTimeMinutes = Math.round(totalWaitMs / items.length / 60000);
  }

  return {
    pending: statusMap.PENDING,
    inProgress: statusMap.IN_PROGRESS,
    resolved: statusMap.RESOLVED,
    escalated: statusMap.ESCALATED,
    total: items.length + statusMap.RESOLVED,
    avgWaitTimeMinutes,
    byContentType: {
      review: typeMap.review,
      message: typeMap.message,
      user: typeMap.user,
    },
  };
}

/**
 * Perform action on content based on type and action
 * @param contentType Content type
 * @param contentId Content ID
 * @param action Action to perform
 */
async function performContentAction(
  contentType: string,
  contentId: string,
  action: 'APPROVE' | 'HIDE' | 'WARN' | 'BAN'
): Promise<void> {
  switch (contentType) {
    case 'review':
      await handleReviewAction(contentId, action);
      break;
    case 'message':
      await handleMessageAction(contentId, action);
      break;
    case 'user':
      await handleUserAction(contentId, action);
      break;
    default:
      logger.warn('Unknown content type for moderation action', { contentType, contentId });
  }
}

/**
 * Handle review moderation action
 */
async function handleReviewAction(
  reviewId: string,
  action: 'APPROVE' | 'HIDE' | 'WARN' | 'BAN'
): Promise<void> {
  switch (action) {
    case 'APPROVE':
      await prisma.review.update({
        where: { id: reviewId },
        data: {
          status: 'APPROVED',
          moderationStatus: 'PASSED',
        },
      });
      break;
    case 'HIDE':
      await prisma.review.update({
        where: { id: reviewId },
        data: {
          status: 'HIDDEN',
          moderationStatus: 'FLAGGED',
        },
      });
      break;
    case 'WARN':
      // For WARN, mark as flagged but visible
      await prisma.review.update({
        where: { id: reviewId },
        data: {
          moderationStatus: 'FLAGGED',
        },
      });
      break;
    case 'BAN':
      // For BAN, hide the review and mark as blocked
      await prisma.review.update({
        where: { id: reviewId },
        data: {
          status: 'REJECTED',
          moderationStatus: 'BLOCKED',
        },
      });
      break;
  }
}

/**
 * Handle message moderation action
 */
async function handleMessageAction(
  messageId: string,
  action: 'APPROVE' | 'HIDE' | 'WARN' | 'BAN'
): Promise<void> {
  switch (action) {
    case 'APPROVE':
      // No action needed for approved messages
      break;
    case 'HIDE':
    case 'BAN':
      // For message hiding, we could soft-delete or flag
      await prisma.message.update({
        where: { id: messageId },
        data: {
          metadata: { hidden: true, moderationAction: action },
        },
      });
      break;
    case 'WARN':
      // Just log the warning
      logger.info('Message warning issued', { messageId });
      break;
  }
}

/**
 * Handle user moderation action
 */
async function handleUserAction(
  userId: string,
  action: 'APPROVE' | 'HIDE' | 'WARN' | 'BAN'
): Promise<void> {
  switch (action) {
    case 'APPROVE':
      // No action needed
      break;
    case 'HIDE':
    case 'WARN':
      // Could implement user content visibility controls
      logger.info('User warning issued', { userId });
      break;
    case 'BAN':
      await prisma.user.update({
        where: { id: userId },
        data: {
          status: 'SUSPENDED',
        },
      });
      break;
  }
}

/**
 * Add review report to queue (integrates with reviewService.reportReview)
 * @param reviewId Review ID
 * @param reporterId Reporter user ID
 * @param reason Report reason
 * @param content Cached review content
 */
export async function addReviewReportToQueue(
  reviewId: string,
  reporterId: string,
  reason: string,
  content?: string
): Promise<ModerationQueueItem> {
  return addToQueue({
    contentType: 'review',
    contentId: reviewId,
    content,
    reportedBy: reporterId,
    reportReason: reason,
  });
}

/**
 * Add message report to queue
 * @param messageId Message ID
 * @param reporterId Reporter user ID
 * @param reason Report reason
 * @param content Cached message content
 */
export async function addMessageReportToQueue(
  messageId: string,
  reporterId: string,
  reason: string,
  content?: string
): Promise<ModerationQueueItem> {
  return addToQueue({
    contentType: 'message',
    contentId: messageId,
    content,
    reportedBy: reporterId,
    reportReason: reason,
  });
}
