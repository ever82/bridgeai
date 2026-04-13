import { EventEmitter } from 'events';
import { prisma } from '../db/client';

// Notification Types
export enum NotificationType {
  NEW_REVIEW = 'NEW_REVIEW',
  PENDING_REVIEW_REMINDER = 'PENDING_REVIEW_REMINDER',
  REVIEW_REPLY = 'REVIEW_REPLY',
  BAD_REVIEW_WARNING = 'BAD_REVIEW_WARNING',
  CREDIT_SCORE_CHANGE = 'CREDIT_SCORE_CHANGE',
}

// Notification Channels
export enum NotificationChannel {
  PUSH = 'PUSH',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  IN_APP = 'IN_APP',
}

// Notification Preferences
export interface NotificationPreferences {
  newReview: boolean;
  pendingReviewReminder: boolean;
  reviewReply: boolean;
  badReviewWarning: boolean;
  creditScoreChange: boolean;
  channels: NotificationChannel[];
}

// Default preferences
export const DEFAULT_PREFERENCES: NotificationPreferences = {
  newReview: true,
  pendingReviewReminder: true,
  reviewReply: true,
  badReviewWarning: true,
  creditScoreChange: true,
  channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
};

// Notification Events
export const notificationEvents = new EventEmitter();

export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channels?: NotificationChannel[];
}

// In-memory store for user preferences (should be moved to database in production)
const userPreferences = new Map<string, NotificationPreferences>();

/**
 * Get user's notification preferences
 * @param userId - User ID
 * @returns Notification preferences
 */
export function getNotificationPreferences(
  userId: string
): NotificationPreferences {
  return userPreferences.get(userId) ?? DEFAULT_PREFERENCES;
}

/**
 * Update user's notification preferences
 * @param userId - User ID
 * @param preferences - New preferences
 */
export function updateNotificationPreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>
): NotificationPreferences {
  const current = getNotificationPreferences(userId);
  const updated = { ...current, ...preferences };
  userPreferences.set(userId, updated);
  return updated;
}

/**
 * Check if user has enabled a specific notification type
 * @param userId - User ID
 * @param type - Notification type
 * @returns Whether the notification type is enabled
 */
export function isNotificationEnabled(
  userId: string,
  type: NotificationType
): boolean {
  const prefs = getNotificationPreferences(userId);

  switch (type) {
    case NotificationType.NEW_REVIEW:
      return prefs.newReview;
    case NotificationType.PENDING_REVIEW_REMINDER:
      return prefs.pendingReviewReminder;
    case NotificationType.REVIEW_REPLY:
      return prefs.reviewReply;
    case NotificationType.BAD_REVIEW_WARNING:
      return prefs.badReviewWarning;
    case NotificationType.CREDIT_SCORE_CHANGE:
      return prefs.creditScoreChange;
    default:
      return true;
  }
}

/**
 * Send push notification (placeholder implementation)
 * @param payload - Notification payload
 */
async function sendPushNotification(
  payload: NotificationPayload
): Promise<void> {
  // TODO: Integrate with Firebase Cloud Messaging, OneSignal, etc.
  console.log(`[PUSH] To ${payload.userId}: ${payload.title} - ${payload.body}`);

  // Emit event for testing and logging
  notificationEvents.emit('pushSent', payload);
}

/**
 * Send email notification (placeholder implementation)
 * @param payload - Notification payload
 */
async function sendEmailNotification(
  payload: NotificationPayload
): Promise<void> {
  // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
  console.log(`[EMAIL] To ${payload.userId}: ${payload.title}`);

  notificationEvents.emit('emailSent', payload);
}

/**
 * Send SMS notification (placeholder implementation)
 * @param payload - Notification payload
 */
async function sendSMSNotification(
  payload: NotificationPayload
): Promise<void> {
  // TODO: Integrate with SMS service (Twilio, etc.)
  console.log(`[SMS] To ${payload.userId}: ${payload.body}`);

  notificationEvents.emit('smsSent', payload);
}

/**
 * Send in-app notification
 * @param payload - Notification payload
 */
async function sendInAppNotification(
  payload: NotificationPayload
): Promise<void> {
  // Store in database for in-app notification center
  // TODO: Create Notification model in schema for persistence
  console.log(`[IN_APP] To ${payload.userId}: ${payload.title} - ${payload.body}`);

  notificationEvents.emit('inAppSent', payload);
}

/**
 * Send notification to user through specified channels
 * @param payload - Notification payload
 */
export async function sendNotification(
  payload: NotificationPayload
): Promise<void> {
  const { userId, type, channels } = payload;

  // Check if notification type is enabled for user
  if (!isNotificationEnabled(userId, type)) {
    console.log(`[NOTIFICATION] Skipped ${type} for user ${userId} (disabled)`);
    return;
  }

  const prefs = getNotificationPreferences(userId);
  const targetChannels = channels ?? prefs.channels;

  const promises: Promise<void>[] = [];

  for (const channel of targetChannels) {
    switch (channel) {
      case NotificationChannel.PUSH:
        promises.push(sendPushNotification(payload));
        break;
      case NotificationChannel.EMAIL:
        promises.push(sendEmailNotification(payload));
        break;
      case NotificationChannel.SMS:
        promises.push(sendSMSNotification(payload));
        break;
      case NotificationChannel.IN_APP:
        promises.push(sendInAppNotification(payload));
        break;
    }
  }

  await Promise.all(promises);

  // Emit general notification sent event
  notificationEvents.emit('notificationSent', {
    ...payload,
    channels: targetChannels,
  });
}

/**
 * Send new review notification
 * @param userId - User ID of the review recipient
 * @param raterName - Name of the reviewer
 * @param rating - Rating score
 * @param ratingId - Rating ID
 */
export async function sendNewReviewNotification(
  userId: string,
  raterName: string,
  rating: number,
  ratingId: string
): Promise<void> {
  await sendNotification({
    userId,
    type: NotificationType.NEW_REVIEW,
    title: '收到新评价',
    body: `${raterName} 给您打了 ${rating} 星评价`,
    data: {
      ratingId,
      rating,
      raterName,
    },
  });
}

/**
 * Send pending review reminder
 * @param userId - User ID
 * @param matchId - Match ID
 * @param partnerName - Partner's name
 */
export async function sendPendingReviewReminder(
  userId: string,
  matchId: string,
  partnerName: string
): Promise<void> {
  await sendNotification({
    userId,
    type: NotificationType.PENDING_REVIEW_REMINDER,
    title: '待评价提醒',
    body: `交易已完成，请对 ${partnerName} 进行评价`,
    data: {
      matchId,
      partnerName,
    },
  });
}

/**
 * Send review reply notification
 * @param userId - User ID of the original reviewer
 * @param rateeName - Name of the person who replied
 * @param ratingId - Rating ID
 */
export async function sendReviewReplyNotification(
  userId: string,
  rateeName: string,
  ratingId: string
): Promise<void> {
  await sendNotification({
    userId,
    type: NotificationType.REVIEW_REPLY,
    title: '评价收到回复',
    body: `${rateeName} 回复了您的评价`,
    data: {
      ratingId,
      rateeName,
    },
  });
}

/**
 * Send bad review warning notification
 * @param userId - User ID
 * @param rating - The bad rating received
 * @param creditDelta - Credit score change
 * @param ratingId - Rating ID
 */
export async function sendBadReviewWarning(
  userId: string,
  rating: number,
  creditDelta: number,
  ratingId: string
): Promise<void> {
  await sendNotification({
    userId,
    type: NotificationType.BAD_REVIEW_WARNING,
    title: '差评预警',
    body: `您收到了 ${rating} 星评价，信用分 ${creditDelta} 分`,
    data: {
      ratingId,
      rating,
      creditDelta,
    },
    channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
  });
}

/**
 * Send credit score change notification
 * @param userId - User ID
 * @param previousScore - Previous credit score
 * @param newScore - New credit score
 * @param reason - Reason for change
 */
export async function sendCreditScoreChangeNotification(
  userId: string,
  previousScore: number,
  newScore: number,
  reason: string
): Promise<void> {
  const delta = newScore - previousScore;
  const deltaText = delta > 0 ? `+${delta}` : `${delta}`;

  await sendNotification({
    userId,
    type: NotificationType.CREDIT_SCORE_CHANGE,
    title: delta > 0 ? '信用分提升' : '信用分下降',
    body: `您的信用分 ${deltaText}，当前 ${newScore} 分。原因：${reason}`,
    data: {
      previousScore,
      newScore,
      delta,
      reason,
    },
  });
}

/**
 * Schedule pending review reminders for a completed match
 * @param matchId - Match ID
 * @param completionTime - When the match was completed
 */
export async function scheduleReviewReminders(matchId: string, completionTime: Date): Promise<void> {
  const REMINDER_DELAY_MS = 24 * 60 * 60 * 1000; // 24 hours

  const match = await prisma.match.findUnique({
    where: { id: matchId },
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
  });

  if (!match) {
    throw new Error(`Match not found: ${matchId}`);
  }

  const demandUser = match.demand.agent.user;
  const supplyUser = match.supply.agent.user;

  // Schedule reminders for both parties
  setTimeout(async () => {
    // Check if demand user has already rated
    const demandUserRated = await prisma.rating.findFirst({
      where: {
        matchId,
        raterId: demandUser.id,
      },
    });

    if (!demandUserRated) {
      await sendPendingReviewReminder(
        demandUser.id,
        matchId,
        supplyUser.name || '对方'
      );
    }

    // Check if supply user has already rated
    const supplyUserRated = await prisma.rating.findFirst({
      where: {
        matchId,
        raterId: supplyUser.id,
      },
    });

    if (!supplyUserRated) {
      await sendPendingReviewReminder(
        supplyUser.id,
        matchId,
        demandUser.name || '对方'
      );
    }
  }, REMINDER_DELAY_MS);
}
