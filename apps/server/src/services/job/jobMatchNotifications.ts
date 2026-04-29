/**
 * Job Match Notification Service
 *
 * Handles match-related notifications: new matches, high-match pushes,
 * resume-viewed notifications, match status changes, and quiet hours.
 */

import { EventEmitter } from 'events';

import { NotificationType, PriorityLevel } from '@prisma/client';

import { prisma } from '../../db/client';
import { pushNotificationService, type PushMessage } from '../pushNotification';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MatchEventType =
  | 'new_match'
  | 'high_match_job'
  | 'resume_viewed'
  | 'match_accepted'
  | 'match_rejected'
  | 'match_completed';

export interface MatchNotificationPayload {
  userId: string;
  matchId: string;
  matchScore?: number;
  jobTitle?: string;
  candidateName?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationPreferenceUpdate {
  matchNotifications?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  quietHoursEnabled?: boolean;
  dailyLimit?: number;
}

// ---------------------------------------------------------------------------
// Event emitter for real-time notifications
// ---------------------------------------------------------------------------

const emitter = new EventEmitter();

// ---------------------------------------------------------------------------
// Notification content builders
// ---------------------------------------------------------------------------

function buildNotificationContent(
  type: MatchEventType,
  payload: MatchNotificationPayload
): { title: string; content: string; prismaType: NotificationType; priority: PriorityLevel } {
  switch (type) {
    case 'new_match':
      return {
        title: '发现新匹配',
        content: `系统为您找到了一个新匹配${payload.jobTitle ? `：${payload.jobTitle}` : ''}`,
        prismaType: NotificationType.MATCH_NEW,
        priority: PriorityLevel.NORMAL,
      };
    case 'high_match_job':
      return {
        title: '发现高匹配度职位',
        content: `有一个匹配度${payload.matchScore ? `达${Math.round(payload.matchScore)}%` : '很高'}的职位${payload.jobTitle ? `：${payload.jobTitle}` : ''}推荐给您`,
        prismaType: NotificationType.MATCH_NEW,
        priority: PriorityLevel.HIGH,
      };
    case 'resume_viewed':
      return {
        title: '简历已被查看',
        content: `您的简历已被招聘方查看${payload.candidateName ? `（${payload.candidateName}）` : ''}`,
        prismaType: NotificationType.MESSAGE_NEW,
        priority: PriorityLevel.LOW,
      };
    case 'match_accepted':
      return {
        title: '匹配已被接受',
        content: `您的匹配请求已被对方接受`,
        prismaType: NotificationType.MATCH_ACCEPTED,
        priority: PriorityLevel.HIGH,
      };
    case 'match_rejected':
      return {
        title: '匹配已被拒绝',
        content: `您的匹配请求已被对方拒绝`,
        prismaType: NotificationType.MATCH_REJECTED,
        priority: PriorityLevel.NORMAL,
      };
    case 'match_completed':
      return {
        title: '匹配已完成',
        content: '恭喜！您的匹配已成功完成',
        prismaType: NotificationType.MATCH_COMPLETED,
        priority: PriorityLevel.HIGH,
      };
  }
}

// ---------------------------------------------------------------------------
// Quiet-hours check
// ---------------------------------------------------------------------------

async function isInQuietHours(userId: string): Promise<boolean> {
  const pref = await prisma.notificationPreference.findUnique({
    where: { userId },
  });
  if (!pref || !pref.quietHoursEnabled || !pref.quietHoursStart || !pref.quietHoursEnd) {
    return false;
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = pref.quietHoursStart.split(':').map(Number);
  const [endH, endM] = pref.quietHoursEnd.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
  // Overnight quiet hours (e.g. 22:00 - 07:00)
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

// ---------------------------------------------------------------------------
// Core: send match notification
// ---------------------------------------------------------------------------

async function sendMatchNotification(
  type: MatchEventType,
  payload: MatchNotificationPayload
): Promise<{ sent: boolean; reason?: string }> {
  const { userId } = payload;

  // Check user preferences for match notifications
  const pref = await prisma.notificationPreference.findUnique({ where: { userId } });
  if (pref && !pref.matchNotifications) {
    return { sent: false, reason: 'match_notifications_disabled' };
  }

  // Quiet-hours check (skip for urgent)
  const { priority } = buildNotificationContent(type, payload);
  if (priority !== PriorityLevel.URGENT) {
    const quiet = await isInQuietHours(userId);
    if (quiet) {
      return { sent: false, reason: 'quiet_hours' };
    }
  }

  // Daily limit check
  if (pref && pref.dailyLimit > 0) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayCount = await prisma.notification.count({
      where: {
        userId,
        createdAt: { gte: todayStart },
        category: 'match',
      },
    });
    if (todayCount >= pref.dailyLimit) {
      return { sent: false, reason: 'daily_limit' };
    }
  }

  const { title, content, prismaType } = buildNotificationContent(type, payload);

  const message: PushMessage = {
    userId,
    title,
    content,
    type: prismaType,
    data: {
      matchId: payload.matchId,
      matchType: type,
      matchScore: payload.matchScore,
      ...payload.metadata,
    },
    actionUrl: `/matches/${payload.matchId}`,
    category: 'match',
    priority,
  };

  const result = await pushNotificationService.send(message);

  // Emit real-time event
  emitter.emit('match:notification', { type, payload, notificationId: result.notificationId });

  return { sent: result.success };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Notify user about a new match.
 */
export async function notifyNewMatch(
  payload: MatchNotificationPayload
): Promise<{ sent: boolean; reason?: string }> {
  return sendMatchNotification('new_match', payload);
}

/**
 * Push notification for high-match-score job.
 */
export async function notifyHighMatchJob(
  payload: MatchNotificationPayload
): Promise<{ sent: boolean; reason?: string }> {
  return sendMatchNotification('high_match_job', payload);
}

/**
 * Notify candidate that their resume was viewed.
 */
export async function notifyResumeViewed(
  payload: MatchNotificationPayload
): Promise<{ sent: boolean; reason?: string }> {
  return sendMatchNotification('resume_viewed', payload);
}

/**
 * Notify about match status change.
 */
export async function notifyMatchStatusChange(
  status: 'accepted' | 'rejected' | 'completed',
  payload: MatchNotificationPayload
): Promise<{ sent: boolean; reason?: string }> {
  const typeMap: Record<string, MatchEventType> = {
    accepted: 'match_accepted',
    rejected: 'match_rejected',
    completed: 'match_completed',
  };
  return sendMatchNotification(typeMap[status], payload);
}

// ---------------------------------------------------------------------------
// Notification preferences
// ---------------------------------------------------------------------------

/**
 * Get notification preferences for a user.
 */
export async function getNotificationPreferences(userId: string) {
  return prisma.notificationPreference.findUnique({ where: { userId } });
}

/**
 * Update notification preferences (including quiet hours).
 */
export async function updateNotificationPreferences(
  userId: string,
  updates: NotificationPreferenceUpdate
) {
  const data: Record<string, unknown> = {};
  if (updates.matchNotifications !== undefined)
    data.matchNotifications = updates.matchNotifications;
  if (updates.quietHoursStart !== undefined) data.quietHoursStart = updates.quietHoursStart;
  if (updates.quietHoursEnd !== undefined) data.quietHoursEnd = updates.quietHoursEnd;
  if (updates.quietHoursEnabled !== undefined) data.quietHoursEnabled = updates.quietHoursEnabled;
  if (updates.dailyLimit !== undefined) data.dailyLimit = updates.dailyLimit;

  return prisma.notificationPreference.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
}

// ---------------------------------------------------------------------------
// Event subscription
// ---------------------------------------------------------------------------

/**
 * Subscribe to match notification events.
 */
export function onMatchNotification(
  listener: (event: {
    type: MatchEventType;
    payload: MatchNotificationPayload;
    notificationId?: string;
  }) => void
): () => void {
  emitter.on('match:notification', listener);
  return () => {
    emitter.off('match:notification', listener);
  };
}
