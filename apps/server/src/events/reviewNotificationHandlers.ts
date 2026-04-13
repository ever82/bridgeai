import { EventEmitter } from 'events';
import { prisma } from '../db/client';
import {
  sendNotification,
  NotificationType,
  NotificationChannel,
  notificationEvents,
  sendNewReviewNotification,
  sendReviewReplyNotification,
  sendPendingReviewReminder,
  sendBadReviewWarning,
  sendCreditScoreChangeNotification,
} from '../services/notificationService';
import { reviewEvents, ReviewEventType } from './reviewEventHandlers';

// Notification Handler Events
export const reviewNotificationEvents = new EventEmitter();

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
export async function handleReviewCreatedNotification(
  ratingId: string
): Promise<void> {
  try {
    const rating = await prisma.rating.findUnique({
      where: { id: ratingId },
      include: {
        rater: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        ratee: {
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

    if (!rating) {
      console.warn(`[NOTIFICATION] Rating ${ratingId} not found`);
      return;
    }

    const raterName = rating.rater?.name || '匿名用户';

    // Send notification to ratee
    await sendNewReviewNotification(
      rating.rateeId,
      raterName,
      rating.score,
      ratingId
    );

    // Emit event
    reviewNotificationEvents.emit(ReviewNotificationType.REVIEW_CREATED, {
      ratingId,
      rateeId: rating.rateeId,
      raterId: rating.raterId,
      score: rating.score,
    });

    console.log(
      `[NOTIFICATION] Review created notification sent for rating ${ratingId}`
    );
  } catch (error) {
    console.error(
      `[NOTIFICATION] Error handling review created notification:`,
      error
    );
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
    const rating = await prisma.rating.findUnique({
      where: { id: ratingId },
      include: {
        rater: {
          select: {
            id: true,
            name: true,
          },
        },
        ratee: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!rating) {
      console.warn(`[NOTIFICATION] Rating ${ratingId} not found`);
      return;
    }

    const rateeName = rating.ratee?.name || '对方';

    // Send notification to the original rater
    await sendReviewReplyNotification(
      rating.raterId,
      rateeName,
      ratingId
    );

    // Emit event
    reviewNotificationEvents.emit(ReviewNotificationType.REVIEW_REPLIED, {
      ratingId,
      raterId: rating.raterId,
      rateeId: rating.rateeId,
      replyContent,
    });

    console.log(
      `[NOTIFICATION] Review reply notification sent for rating ${ratingId}`
    );
  } catch (error) {
    console.error(
      `[NOTIFICATION] Error handling review reply notification:`,
      error
    );
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
    const existingRating = await prisma.rating.findFirst({
      where: {
        matchId,
        raterId: userId,
      },
    });

    if (existingRating) {
      console.log(`[NOTIFICATION] User ${userId} already rated match ${matchId}`);
      return;
    }

    // Send reminder
    await sendPendingReviewReminder(userId, matchId, partnerName);

    // Emit event
    reviewNotificationEvents.emit(ReviewNotificationType.REVIEW_REMINDER, {
      matchId,
      userId,
      partnerName,
    });

    console.log(
      `[NOTIFICATION] Pending review reminder sent to user ${userId} for match ${matchId}`
    );
  } catch (error) {
    console.error(
      `[NOTIFICATION] Error handling pending review reminder:`,
      error
    );
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
    const rating = await prisma.rating.findUnique({
      where: { id: ratingId },
      include: {
        ratee: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!rating) {
      console.warn(`[NOTIFICATION] Rating ${ratingId} not found`);
      return;
    }

    // Only send for bad reviews (<= 2 stars)
    if (rating.score > 2) {
      return;
    }

    await sendBadReviewWarning(
      rating.rateeId,
      rating.score,
      creditDelta,
      ratingId
    );

    // Emit event
    reviewNotificationEvents.emit(ReviewNotificationType.REVIEW_CREATED, {
      ratingId,
      rateeId: rating.rateeId,
      score: rating.score,
      creditDelta,
      isBadReview: true,
    });

    console.log(
      `[NOTIFICATION] Bad review warning sent for rating ${ratingId}`
    );
  } catch (error) {
    console.error(
      `[NOTIFICATION] Error handling bad review warning:`,
      error
    );
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

    await sendCreditScoreChangeNotification(
      userId,
      previousScore,
      newScore,
      reason
    );

    // Emit event
    reviewNotificationEvents.emit(
      ReviewNotificationType.CREDIT_SCORE_UPDATED,
      {
        userId,
        previousScore,
        newScore,
        delta,
        reason,
      }
    );

    console.log(
      `[NOTIFICATION] Credit score change notification sent to user ${userId}`
    );
  } catch (error) {
    console.error(
      `[NOTIFICATION] Error handling credit score change notification:`,
      error
    );
    throw error;
  }
}

/**
 * Handle review reported notification
 * Sends notification to admins and the reported user
 * @param reportId - Report ID
 */
export async function handleReviewReportedNotification(
  reportId: string
): Promise<void> {
  try {
    // This is a placeholder for review report functionality
    // In a real implementation, you would:
    // 1. Get the report details from the database
    // 2. Notify admins
    // 3. Potentially notify the reported user

    console.log(`[NOTIFICATION] Review reported: ${reportId}`);

    // Emit event
    reviewNotificationEvents.emit(ReviewNotificationType.REVIEW_REPORTED, {
      reportId,
    });
  } catch (error) {
    console.error(
      `[NOTIFICATION] Error handling review reported notification:`,
      error
    );
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
  notificationEvents.on('pushSent', (data) => {
    console.log(`[NOTIFICATION_EVENT] Push notification sent to ${data.userId}`);
  });

  // Listen for email sent events
  notificationEvents.on('emailSent', (data) => {
    console.log(`[NOTIFICATION_EVENT] Email sent to ${data.userId}`);
  });

  // Listen for SMS sent events
  notificationEvents.on('smsSent', (data) => {
    console.log(`[NOTIFICATION_EVENT] SMS sent to ${data.userId}`);
  });

  // Listen for in-app sent events
  notificationEvents.on('inAppSent', (data) => {
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
  reviewNotificationEvents.on(
    ReviewNotificationType.REVIEW_CREATED,
    (data) => {
      console.log(`[NOTIFICATION_EVENT] Review created: ${data.ratingId}`);
    }
  );

  reviewNotificationEvents.on(
    ReviewNotificationType.REVIEW_REPLIED,
    (data) => {
      console.log(`[NOTIFICATION_EVENT] Review replied: ${data.ratingId}`);
    }
  );

  reviewNotificationEvents.on(
    ReviewNotificationType.REVIEW_REMINDER,
    (data) => {
      console.log(`[NOTIFICATION_EVENT] Review reminder: ${data.matchId}`);
    }
  );

  reviewNotificationEvents.on(
    ReviewNotificationType.REVIEW_REPORTED,
    (data) => {
      console.log(`[NOTIFICATION_EVENT] Review reported: ${data.reportId}`);
    }
  );

  reviewNotificationEvents.on(
    ReviewNotificationType.CREDIT_SCORE_UPDATED,
    (data) => {
      console.log(
        `[NOTIFICATION_EVENT] Credit score updated: ${data.userId} (${data.previousScore} -> ${data.newScore})`
      );
    }
  );

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
  // This is a placeholder implementation
  // In a real implementation, you would query a Notification table
  return {
    unreadCount: 0,
    lastNotificationAt: null,
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
  // This is a placeholder implementation
  // In a real implementation, you would update a Notification table
  console.log(`[NOTIFICATION] Marked ${notificationIds.length} notifications as read for user ${userId}`);
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
): Promise<Array<{
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: Date;
}>> {
  // This is a placeholder implementation
  // In a real implementation, you would query a Notification table
  return [];
}
