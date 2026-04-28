import { EventEmitter } from 'events';

import { NotificationType, NotificationStatus, PriorityLevel } from '@prisma/client';

import { prisma } from '../db/client';
import {
  NotificationChannel,
  sendNewReviewNotification,
  sendReviewReplyNotification,
  sendPendingReviewReminder,
  sendBadReviewWarning,
  sendCreditScoreChangeNotification,
} from '../services/notificationService';

import { reviewEvents, ReviewEventType } from './reviewEventHandlers';

// Re-export reviewNotificationEvents from notificationService
export { reviewNotificationEvents } from '../services/notificationService';

// Notification Handler Events
const notificationEvents = new EventEmitter();

// Notification Handler Types
export enum ReviewNotificationType {
  REVIEW_CREATED = 'REVIEW_CREATED',
  REVIEW_REPLIED = 'REVIEW_REPLIED',
  REVIEW_REMINDER = 'REVIEW_REMINDER',
  REVIEW_REPORTED = 'REVIEW_REPORTED',
  CREDIT_SCORE_UPDATED = 'CREDIT_SCORE_UPDATED',
}

/**
 * Handle new review created notification
 * Sends notification to the review recipient
 * @param ratingId - Rating ID
 */
export async function handleReviewCreatedNotification(ratingId: string): Promise<void> {
  try {
    const review = await prisma.review.findUnique({
      where: { id: ratingId },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        reviewee: {
          select: {
            id: true,
            name: true,
          },
        },
        match: {
          include: {
            demand: {
              include: {
                agent: {
                  include: {
                    user: true,
                  },
                },
              },
            },
            supply: {
              include: {
                agent: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!review) {
      console.warn(`[NOTIFICATION] Review ${ratingId} not found`);
      return;
    }

    const raterName = review.reviewer?.name || '匿名用户';

    // Send notification to reviewee
    await sendNewReviewNotification(review.revieweeId, raterName, review.rating, ratingId);

    // Emit event
    notificationEvents.emit(ReviewNotificationType.REVIEW_CREATED, {
      ratingId,
      rateeId: review.revieweeId,
      raterId: review.reviewerId,
      score: review.rating,
    });

    console.log(`[NOTIFICATION] Review created notification sent for review ${ratingId}`);
  } catch (error) {
    console.error(`[NOTIFICATION] Error handling review created notification:`, error);
    throw error;
  }
}

/**
 * Handle review reply notification
 * Sends notification to the original reviewer
 * @param ratingId - Rating ID
 * @param replyContent - Reply content
 */
export async function handleReviewReplyNotification(
  ratingId: string,
  replyContent: string
): Promise<void> {
  try {
    const review = await prisma.review.findUnique({
      where: { id: ratingId },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
          },
        },
        reviewee: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!review) {
      console.warn(`[NOTIFICATION] Review ${ratingId} not found`);
      return;
    }

    const rateeName = review.reviewee?.name || '对方';

    // Send notification to the original reviewer
    await sendReviewReplyNotification(review.reviewerId, rateeName, ratingId);

    // Emit event
    notificationEvents.emit(ReviewNotificationType.REVIEW_REPLIED, {
      ratingId,
      raterId: review.reviewerId,
      rateeId: review.revieweeId,
      replyContent,
    });

    console.log(`[NOTIFICATION] Review reply notification sent for review ${ratingId}`);
  } catch (error) {
    console.error(`[NOTIFICATION] Error handling review reply notification:`, error);
    throw error;
  }
}

/**
 * Handle pending review reminder notification
 * Sends reminder to users who haven't reviewed after match completion
 * @param matchId - Match ID
 * @param userId - User ID to remind
 * @param partnerName - Partner's name for context
 */
export async function handlePendingReviewReminder(
  matchId: string,
  userId: string,
  partnerName: string
): Promise<void> {
  try {
    // Check if user has already rated this match
    const existingReview = await prisma.review.findFirst({
      where: {
        matchId,
        reviewerId: userId,
      },
    });

    if (existingReview) {
      console.log(`[NOTIFICATION] User ${userId} already rated match ${matchId}`);
      return;
    }

    // Send reminder
    await sendPendingReviewReminder(userId, matchId, partnerName);

    // Emit event
    notificationEvents.emit(ReviewNotificationType.REVIEW_REMINDER, {
      matchId,
      userId,
      partnerName,
    });

    console.log(
      `[NOTIFICATION] Pending review reminder sent to user ${userId} for match ${matchId}`
    );
  } catch (error) {
    console.error(`[NOTIFICATION] Error handling pending review reminder:`, error);
    throw error;
  }
}

/**
 * Handle bad review warning notification
 * Sends warning when user receives a bad review
 * @param ratingId - Rating ID
 * @param creditDelta - Credit score change
 */
export async function handleBadReviewWarningNotification(
  ratingId: string,
  creditDelta: number
): Promise<void> {
  try {
    const review = await prisma.review.findUnique({
      where: { id: ratingId },
      include: {
        reviewee: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!review) {
      console.warn(`[NOTIFICATION] Review ${ratingId} not found`);
      return;
    }

    // Only send for bad reviews (<= 2 stars)
    if (review.rating > 2) {
      return;
    }

    await sendBadReviewWarning(review.revieweeId, review.rating, creditDelta, ratingId);

    // Emit event
    notificationEvents.emit(ReviewNotificationType.REVIEW_CREATED, {
      ratingId,
      rateeId: review.revieweeId,
      score: review.rating,
      creditDelta,
      isBadReview: true,
    });

    console.log(`[NOTIFICATION] Bad review warning sent for review ${ratingId}`);
  } catch (error) {
    console.error(`[NOTIFICATION] Error handling bad review warning:`, error);
    throw error;
  }
}

/**
 * Handle credit score change notification
 * Sends notification when credit score changes significantly
 * @param userId - User ID
 * @param previousScore - Previous credit score
 * @param newScore - New credit score
 * @param reason - Reason for change
 */
export async function handleCreditScoreChangeNotification(
  userId: string,
  previousScore: number,
  newScore: number,
  reason: string
): Promise<void> {
  try {
    const delta = newScore - previousScore;

    // Only notify for significant changes (>= 5 points)
    if (Math.abs(delta) < 5) {
      return;
    }

    await sendCreditScoreChangeNotification(userId, previousScore, newScore, reason);

    // Emit event
    notificationEvents.emit(ReviewNotificationType.CREDIT_SCORE_UPDATED, {
      userId,
      previousScore,
      newScore,
      delta,
      reason,
    });

    console.log(`[NOTIFICATION] Credit score change notification sent to user ${userId}`);
  } catch (error) {
    console.error(`[NOTIFICATION] Error handling credit score change notification:`, error);
    throw error;
  }
}

/**
 * Handle review reported notification
 * Sends notification to admins and the reported user
 * @param reportId - Report ID
 */
export async function handleReviewReportedNotification(reportId: string): Promise<void> {
  try {
    const report = await prisma.reviewReport.findUnique({
      where: { id: reportId },
      include: {
        review: {
          include: {
            reviewer: {
              select: { id: true, name: true },
            },
            reviewee: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!report) {
      console.warn(`[NOTIFICATION] Review report ${reportId} not found`);
      return;
    }

    // Find admin users to notify
    const adminRole = await prisma.role.findUnique({
      where: { name: 'admin' },
    });

    let adminUsers: { userId: string }[] = [];
    if (adminRole) {
      adminUsers = await prisma.userRole.findMany({
        where: { roleId: adminRole.id },
        select: { userId: true },
      });
    }

    const reviewerName = report.review.reviewer?.name || '匿名用户';
    const reasonText = report.reason;

    // Notify admins
    for (const admin of adminUsers) {
      await prisma.notification.create({
        data: {
          userId: admin.userId,
          type: NotificationType.SYSTEM_ANNOUNCEMENT,
          title: '评价被举报',
          content: `用户 ${reviewerName} 的评价被举报，原因：${reasonText}`,
          data: { reportId, reviewId: report.reviewId },
          priority: PriorityLevel.HIGH,
          category: 'system',
        },
      });
    }

    console.log(
      `[NOTIFICATION] Review reported notification sent to ${adminUsers.length} admins for report ${reportId}`
    );

    // Emit event
    notificationEvents.emit(ReviewNotificationType.REVIEW_REPORTED, {
      reportId,
    });
  } catch (error) {
    console.error(`[NOTIFICATION] Error handling review reported notification:`, error);
    throw error;
  }
}

/**
 * Setup notification event listeners
 * Listens to events from notification service
 */
export function setupNotificationListeners(): void {
  // Listen for notification sent events
  notificationEvents.on(
    'notificationSent',
    (data: {
      userId: string;
      type: NotificationType;
      title: string;
      body: string;
      channels: NotificationChannel[];
    }) => {
      console.log(
        `[NOTIFICATION_EVENT] Notification sent to ${data.userId} via ${data.channels.join(', ')}`
      );
    }
  );

  // Listen for push sent events
  notificationEvents.on('pushSent', data => {
    console.log(`[NOTIFICATION_EVENT] Push notification sent to ${data.userId}`);
  });

  // Listen for email sent events
  notificationEvents.on('emailSent', data => {
    console.log(`[NOTIFICATION_EVENT] Email sent to ${data.userId}`);
  });

  // Listen for SMS sent events
  notificationEvents.on('smsSent', data => {
    console.log(`[NOTIFICATION_EVENT] SMS sent to ${data.userId}`);
  });

  // Listen for in-app sent events
  notificationEvents.on('inAppSent', data => {
    console.log(`[NOTIFICATION_EVENT] In-app notification sent to ${data.userId}`);
  });
}

/**
 * Setup review event listeners for notifications
 * Listens to review events and triggers notifications
 */
export function setupReviewEventListeners(): void {
  // Listen for rating submitted events
  reviewEvents.on(
    ReviewEventType.RATING_SUBMITTED,
    async (payload: { ratingId: string; processed: boolean }) => {
      if (payload.processed) {
        await handleReviewCreatedNotification(payload.ratingId);
      }
    }
  );

  // Listen for match completed events
  reviewEvents.on(
    ReviewEventType.MATCH_COMPLETED,
    async (payload: { matchId: string; completedAt: Date; remindersScheduled: boolean }) => {
      // Reminders are scheduled in the reviewEventHandlers
      console.log(`[NOTIFICATION] Review reminders scheduled for match ${payload.matchId}`);
    }
  );
}

/**
 * Initialize all review notification handlers
 * Sets up event listeners and handlers
 */
export function initializeReviewNotificationHandlers(): void {
  // Setup notification listeners
  setupNotificationListeners();

  // Setup review event listeners
  setupReviewEventListeners();

  // Setup review notification event listeners
  notificationEvents.on(ReviewNotificationType.REVIEW_CREATED, data => {
    console.log(`[NOTIFICATION_EVENT] Review created: ${data.ratingId}`);
  });

  notificationEvents.on(ReviewNotificationType.REVIEW_REPLIED, data => {
    console.log(`[NOTIFICATION_EVENT] Review replied: ${data.ratingId}`);
  });

  notificationEvents.on(ReviewNotificationType.REVIEW_REMINDER, data => {
    console.log(`[NOTIFICATION_EVENT] Review reminder: ${data.matchId}`);
  });

  notificationEvents.on(ReviewNotificationType.REVIEW_REPORTED, data => {
    console.log(`[NOTIFICATION_EVENT] Review reported: ${data.reportId}`);
  });

  notificationEvents.on(ReviewNotificationType.CREDIT_SCORE_UPDATED, data => {
    console.log(
      `[NOTIFICATION_EVENT] Credit score updated: ${data.userId} (${data.previousScore} -> ${data.newScore})`
    );
  });

  console.log('[NOTIFICATION] Review notification handlers initialized');
}

/**
 * Get notification statistics for a user
 * @param userId - User ID
 * @returns Notification statistics
 */
export async function getUserNotificationStats(userId: string): Promise<{
  unreadCount: number;
  lastNotificationAt: Date | null;
}> {
  const [unreadCount, lastNotification] = await Promise.all([
    prisma.notification.count({
      where: { userId, status: NotificationStatus.UNREAD },
    }),
    prisma.notification.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
  ]);

  return {
    unreadCount,
    lastNotificationAt: lastNotification?.createdAt ?? null,
  };
}

/**
 * Mark notifications as read for a user
 * @param userId - User ID
 * @param notificationIds - Notification IDs to mark as read
 */
export async function markNotificationsAsRead(
  userId: string,
  notificationIds: string[]
): Promise<void> {
  await prisma.notification.updateMany({
    where: {
      id: { in: notificationIds },
      userId,
      status: NotificationStatus.UNREAD,
    },
    data: {
      status: NotificationStatus.READ,
      readAt: new Date(),
    },
  });
}

/**
 * Get notification history for a user
 * @param userId - User ID
 * @param limit - Number of notifications to return
 * @param offset - Offset for pagination
 * @returns Notification history
 */
export async function getNotificationHistory(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<
  Array<{
    id: string;
    type: NotificationType;
    title: string;
    body: string;
    read: boolean;
    createdAt: Date;
  }>
> {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    select: {
      id: true,
      type: true,
      title: true,
      content: true,
      status: true,
      createdAt: true,
    },
  });

  return notifications.map(n => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.content,
    read: n.status === NotificationStatus.READ,
    createdAt: n.createdAt,
  }));
}
