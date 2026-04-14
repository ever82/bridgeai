/**
 * Job Match Notification Service
 * 匹配通知与推送服务
 *
 * 功能：新匹配结果通知、高匹配度职位推送、简历被查看通知、
 *       匹配状态变更通知、通知偏好设置
 */

import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';

/** 通知类型 */
export type NotificationType =
  | 'NEW_MATCH'
  | 'HIGH_MATCH_JOB'
  | 'RESUME_VIEWED'
  | 'MATCH_STATUS_CHANGED'
  | 'RECOMMENDATION_AVAILABLE';

/** 通知优先级 */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

/** 通知记录 */
export interface MatchNotification {
  id: string;
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: Date;
}

/** 通知偏好设置 */
export interface NotificationPreferences {
  newMatch: boolean;
  highMatchJob: boolean;
  highMatchThreshold: number;
  resumeViewed: boolean;
  statusChanged: boolean;
  recommendationDigest: 'realtime' | 'daily' | 'weekly' | 'none';
  quietHoursStart?: string; // HH:mm format
  quietHoursEnd?: string;   // HH:mm format
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  newMatch: true,
  highMatchJob: true,
  highMatchThreshold: 80,
  resumeViewed: true,
  statusChanged: true,
  recommendationDigest: 'daily',
};

/**
 * Job Match Notification Service
 */
export class JobMatchNotificationService {

  /**
   * 发送新匹配通知
   */
  async notifyNewMatch(
    userId: string,
    matchId: string,
    matchScore: number,
    jobTitle?: string,
    seekerName?: string
  ): Promise<MatchNotification | null> {
    const prefs = await this.getUserPreferences(userId);
    if (!prefs.newMatch) return null;

    if (!this.isWithinActiveHours(prefs)) {
      logger.debug('Notification suppressed - quiet hours', { userId });
      return null;
    }

    const isHighMatch = matchScore >= prefs.highMatchThreshold;
    const type = isHighMatch ? 'HIGH_MATCH_JOB' : 'NEW_MATCH';
    const priority: NotificationPriority = isHighMatch ? 'high' : 'normal';

    const title = isHighMatch
      ? `发现高匹配度${jobTitle ? '职位' : '候选人'}！匹配度${matchScore}%`
      : `新的${jobTitle ? '职位' : '候选人'}匹配`;

    const body = isHighMatch
      ? `有一个${jobTitle || seekerName || '匹配'}与您的需求高度匹配(${matchScore}%)，建议尽快查看！`
      : `有一个新的${jobTitle || seekerName || '匹配'}推荐，匹配度${matchScore}%`;

    return this.createNotification({
      userId,
      type,
      priority,
      title,
      body,
      data: { matchId, matchScore, jobTitle, seekerName },
    });
  }

  /**
   * 发送简历被查看通知
   */
  async notifyResumeViewed(
    seekerUserId: string,
    viewerName: string,
    jobTitle: string
  ): Promise<MatchNotification | null> {
    const prefs = await this.getUserPreferences(seekerUserId);
    if (!prefs.resumeViewed) return null;

    return this.createNotification({
      userId: seekerUserId,
      type: 'RESUME_VIEWED',
      priority: 'low',
      title: '您的简历被查看了',
      body: `${viewerName}查看了您的简历（职位：${jobTitle}）`,
      data: { viewerName, jobTitle },
    });
  }

  /**
   * 发送匹配状态变更通知
   */
  async notifyMatchStatusChanged(
    userId: string,
    matchId: string,
    oldStatus: string,
    newStatus: string,
    relatedName?: string
  ): Promise<MatchNotification | null> {
    const prefs = await this.getUserPreferences(userId);
    if (!prefs.statusChanged) return null;

    const statusMessages: Record<string, string> = {
      'PENDING_ACCEPTED': '对方已接受匹配',
      'PENDING_REJECTED': '匹配未被接受',
      'ACCEPTED_COMPLETED': '匹配流程已完成',
    };

    const message = statusMessages[`${oldStatus}_${newStatus}`] || `匹配状态变更为${newStatus}`;
    const priority: NotificationPriority = newStatus === 'ACCEPTED' ? 'high' : 'normal';

    return this.createNotification({
      userId,
      type: 'MATCH_STATUS_CHANGED',
      priority,
      title: '匹配状态更新',
      body: `${relatedName ? relatedName + ' - ' : ''}${message}`,
      data: { matchId, oldStatus, newStatus },
    });
  }

  /**
   * 发送推荐摘要通知
   */
  async notifyRecommendationDigest(
    userId: string,
    newJobCount: number,
    newCandidateCount: number,
    topMatchScore: number
  ): Promise<MatchNotification | null> {
    const prefs = await this.getUserPreferences(userId);
    if (prefs.recommendationDigest === 'none') return null;

    if (newJobCount === 0 && newCandidateCount === 0) return null;

    return this.createNotification({
      userId,
      type: 'RECOMMENDATION_AVAILABLE',
      priority: 'normal',
      title: '新推荐摘要',
      body: `您有${newJobCount}个新职位推荐和${newCandidateCount}个新候选人推荐，最高匹配度${topMatchScore}%`,
      data: { newJobCount, newCandidateCount, topMatchScore },
    });
  }

  /**
   * 获取用户通知列表
   */
  async getUserNotifications(
    userId: string,
    options?: {
      type?: NotificationType;
      unreadOnly?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ notifications: MatchNotification[]; total: number }> {
    const { limit = 20, offset = 0 } = options || {};

    // Since we don't have a dedicated Notification table, we use metadata on matches
    // In production, this would query a Notification table
    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { demand: { agent: { userId } } },
          { supply: { agent: { userId } } },
        ],
      },
      include: {
        demand: { select: { title: true, agent: { select: { userId: true, name: true } } } },
        supply: { select: { title: true, agent: { select: { userId: true, name: true } } } },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const notifications: MatchNotification[] = matches.map(m => {
      const isDemandOwner = m.demand.agent.userId === userId;
      const score = Number(m.score);

      return {
        id: m.id,
        userId,
        type: 'NEW_MATCH' as NotificationType,
        priority: score >= 80 ? 'high' : 'normal' as NotificationPriority,
        title: isDemandOwner ? `候选人匹配 (${score}%)` : `职位匹配 (${score}%)`,
        body: isDemandOwner
          ? `${m.supply.title || '候选人'}与您的职位匹配度${score}%`
          : `${m.demand.title}与您的简历匹配度${score}%`,
        data: {
          matchId: m.id,
          matchScore: score,
          status: m.status,
        },
        read: m.status !== 'PENDING',
        createdAt: m.createdAt,
      };
    });

    const total = await prisma.match.count({
      where: {
        OR: [
          { demand: { agent: { userId } } },
          { supply: { agent: { userId } } },
        ],
      },
    });

    return { notifications, total };
  }

  /**
   * 标记通知已读
   */
  async markAsRead(userId: string, notificationIds: string[]): Promise<void> {
    // Update match status as a proxy for read status
    for (const id of notificationIds) {
      const match = await prisma.match.findUnique({
        where: { id },
        include: {
          demand: { select: { agent: { select: { userId: true } } } },
          supply: { select: { agent: { select: { userId: true } } } } ,
        },
      });

      if (match) {
        const isOwner = match.demand.agent.userId === userId ||
          match.supply.agent.userId === userId;
        if (isOwner && match.status === 'PENDING') {
          // Don't auto-change status - just mark the metadata
          await prisma.match.update({
            where: { id },
            data: {
              metadata: {
                ...(match.metadata as Record<string, unknown> || {}),
                viewedBy: userId,
                viewedAt: new Date().toISOString(),
              },
            },
          });
        }
      }
    }
  }

  /**
   * 获取/设置用户通知偏好
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { privacySettings: true },
    });

    const settings = user?.privacySettings as Record<string, unknown> | null;
    const notifPrefs = settings?.jobNotifications as Partial<NotificationPreferences> | null;

    return { ...DEFAULT_PREFERENCES, ...notifPrefs };
  }

  async setUserPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { privacySettings: true },
    });

    const currentSettings = (user?.privacySettings as Record<string, unknown>) || {};
    const currentNotifPrefs = (currentSettings.jobNotifications as Partial<NotificationPreferences>) || {};

    await prisma.user.update({
      where: { id: userId },
      data: {
        privacySettings: {
          ...currentSettings,
          jobNotifications: { ...DEFAULT_PREFERENCES, ...currentNotifPrefs, ...preferences },
        },
      },
    });
  }

  // ---- Private helpers ----

  private async createNotification(params: {
    userId: string;
    type: NotificationType;
    priority: NotificationPriority;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }): Promise<MatchNotification> {
    logger.info('Job match notification created', {
      userId: params.userId,
      type: params.type,
      priority: params.priority,
    });

    // In production, this would insert into a Notification table
    // and push via WebSocket/Push notification
    return {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId: params.userId,
      type: params.type,
      priority: params.priority,
      title: params.title,
      body: params.body,
      data: params.data,
      read: false,
      createdAt: new Date(),
    };
  }

  private isWithinActiveHours(prefs: NotificationPreferences): boolean {
    if (!prefs.quietHoursStart || !prefs.quietHoursEnd) return true;

    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentMinutes = hours * 60 + minutes;

    const [startH, startM] = prefs.quietHoursStart.split(':').map(Number);
    const [endH, endM] = prefs.quietHoursEnd.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes <= endMinutes) {
      return currentMinutes < startMinutes || currentMinutes >= endMinutes;
    }
    // Crosses midnight
    return currentMinutes >= endMinutes && currentMinutes < startMinutes;
  }
}

// Export singleton
export const jobMatchNotificationService = new JobMatchNotificationService();
