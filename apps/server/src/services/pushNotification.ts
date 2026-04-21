/**
 * 推送通知服务 (Push Notification Service)
 * 支持多种推送渠道：应用内、邮件、短信、推送
 */

import { Notification, NotificationType, NotificationChannel, PriorityLevel } from '@prisma/client';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

import { prisma } from '../db/client';

// 推送配置
interface PushConfig {
  expoAccessToken?: string;
  defaultChannel: NotificationChannel;
  batchSize: number;
  maxRetries: number;
}

// 推送消息
export interface PushMessage {
  userId: string;
  title: string;
  content: string;
  type: NotificationType;
  data?: Record<string, any>;
  imageUrl?: string;
  actionUrl?: string;
  category?: string;
  priority?: PriorityLevel;
  channels?: NotificationChannel[];
}

// 推送结果
export interface PushResult {
  success: boolean;
  notificationId?: string;
  deliveryIds: string[];
  errors: string[];
}

// 频率控制配置
interface RateLimitConfig {
  maxPerMinute: number;
  maxPerHour: number;
  maxPerDay: number;
}

const defaultRateLimit: RateLimitConfig = {
  maxPerMinute: 10,
  maxPerHour: 60,
  maxPerDay: 100,
};

/**
 * 推送通知服务类
 */
export class PushNotificationService {
  private expo: Expo | null = null;
  private config: PushConfig;
  private rateLimits: Map<string, number[]> = new Map(); // userId -> timestamps

  constructor(config: Partial<PushConfig> = {}) {
    this.config = {
      defaultChannel: NotificationChannel.IN_APP,
      batchSize: 100,
      maxRetries: 3,
      ...config,
    };

    // 初始化 Expo SDK（如果有配置token）
    if (config.expoAccessToken) {
      this.expo = new Expo({ accessToken: config.expoAccessToken });
    }
  }

  /**
   * 发送单条推送通知
   */
  async send(message: PushMessage): Promise<PushResult> {
    const result: PushResult = {
      success: false,
      deliveryIds: [],
      errors: [],
    };

    try {
      // 检查用户推送偏好
      const prefs = await this.getUserPreferences(message.userId);
      if (!this.shouldSendToUser(prefs, message)) {
        return { success: true, deliveryIds: [], errors: [] };
      }

      // 检查频率限制
      if (await this.isRateLimited(message.userId)) {
        result.errors.push('Rate limit exceeded');
        return result;
      }

      // 创建通知记录
      const notification = await prisma.notification.create({
        data: {
          userId: message.userId,
          type: message.type,
          title: message.title,
          content: message.content,
          data: message.data || {},
          imageUrl: message.imageUrl,
          actionUrl: message.actionUrl,
          category: message.category,
          priority: message.priority || PriorityLevel.NORMAL,
          channel: this.config.defaultChannel,
          status: 'UNREAD',
        },
      });

      result.notificationId = notification.id;

      // 确定推送渠道
      const channels = message.channels || this.determineChannels(prefs, message);

      // 发送到各渠道
      for (const channel of channels) {
        try {
          const delivery = await this.sendToChannel(channel, notification, prefs);
          if (delivery) {
            result.deliveryIds.push(delivery.id);
          }
        } catch (error: any) {
          result.errors.push(`Channel ${channel} failed: ${error.message}`);
        }
      }

      // 更新通知状态为已发送
      await prisma.notification.update({
        where: { id: notification.id },
        data: { sentAt: new Date() },
      });

      result.success = result.errors.length === 0 || result.deliveryIds.length > 0;
      return result;
    } catch (error: any) {
      result.errors.push(`Send failed: ${error.message}`);
      return result;
    }
  }

  /**
   * 批量发送推送通知
   */
  async sendBatch(messages: PushMessage[]): Promise<PushResult[]> {
    const results: PushResult[] = [];

    // 分批处理
    for (let i = 0; i < messages.length; i += this.config.batchSize) {
      const batch = messages.slice(i, i + this.config.batchSize);
      const batchResults = await Promise.all(batch.map(msg => this.send(msg)));
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * 发送匹配结果通知
   */
  async sendMatchNotification(
    userId: string,
    matchId: string,
    matchType: 'new' | 'accepted' | 'rejected' | 'completed'
  ): Promise<PushResult> {
    const titles: Record<string, string> = {
      new: '发现新的匹配',
      accepted: '匹配已被接受',
      rejected: '匹配已被拒绝',
      completed: '匹配已完成',
    };

    const contents: Record<string, string> = {
      new: '系统为您找到了一个潜在匹配，点击查看详情',
      accepted: '您的匹配请求已被对方接受',
      rejected: '您的匹配请求已被对方拒绝',
      completed: '恭喜！匹配交易已完成',
    };

    const types: Record<string, NotificationType> = {
      new: NotificationType.MATCH_NEW,
      accepted: NotificationType.MATCH_ACCEPTED,
      rejected: NotificationType.MATCH_REJECTED,
      completed: NotificationType.MATCH_COMPLETED,
    };

    return this.send({
      userId,
      title: titles[matchType],
      content: contents[matchType],
      type: types[matchType],
      data: { matchId, type: matchType },
      actionUrl: `/matches/${matchId}`,
      category: 'match',
      priority: matchType === 'new' ? PriorityLevel.HIGH : PriorityLevel.NORMAL,
    });
  }

  /**
   * 发送新消息通知
   */
  async sendMessageNotification(
    userId: string,
    conversationId: string,
    senderName: string,
    messagePreview: string
  ): Promise<PushResult> {
    return this.send({
      userId,
      title: `新消息来自 ${senderName}`,
      content: messagePreview,
      type: NotificationType.MESSAGE_NEW,
      data: { conversationId, senderName },
      actionUrl: `/conversations/${conversationId}`,
      category: 'message',
      priority: PriorityLevel.NORMAL,
    });
  }

  /**
   * 发送评分通知
   */
  async sendRatingNotification(
    userId: string,
    matchId: string,
    raterName: string,
    rating: number
  ): Promise<PushResult> {
    return this.send({
      userId,
      title: '收到新的评分',
      content: `${raterName} 给您打了 ${rating} 分`,
      type: NotificationType.RATING_RECEIVED,
      data: { matchId, raterName, rating },
      actionUrl: `/matches/${matchId}/ratings`,
      category: 'rating',
      priority: PriorityLevel.NORMAL,
    });
  }

  /**
   * 发送到指定渠道
   */
  private async sendToChannel(
    channel: NotificationChannel,
    notification: Notification,
    prefs: any
  ): Promise<any> {
    // 检查渠道是否启用
    if (!this.isChannelEnabled(prefs, channel)) {
      return null;
    }

    // 检查免打扰时段
    if (await this.isInQuietHours(notification.userId)) {
      if (notification.priority !== PriorityLevel.URGENT) {
        return null;
      }
    }

    // 创建投递记录
    const delivery = await prisma.notificationDelivery.create({
      data: {
        notificationId: notification.id,
        channel,
        status: 'PENDING',
      },
    });

    // 根据渠道发送
    switch (channel) {
      case NotificationChannel.PUSH:
        await this.sendPushNotification(notification);
        break;
      case NotificationChannel.EMAIL:
        await this.queueEmail(notification);
        break;
      case NotificationChannel.SMS:
        await this.queueSMS(notification);
        break;
      case NotificationChannel.IN_APP:
        // 应用内通知已在数据库中，无需额外操作
        break;
    }

    // 更新投递状态
    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    return delivery;
  }

  /**
   * 发送 Expo 推送通知
   */
  private async sendPushNotification(notification: Notification): Promise<void> {
    if (!this.expo) {
      throw new Error('Expo client not initialized');
    }

    // 获取用户的推送令牌
    const tokens = await prisma.pushToken.findMany({
      where: {
        userId: notification.userId,
        isActive: true,
      },
    });

    if (tokens.length === 0) {
      return;
    }

    // 构建 Expo 推送消息
    const messages: ExpoPushMessage[] = tokens.map((token: any) => ({
      to: token.token,
      sound: 'default',
      title: notification.title,
      body: notification.content,
      data: notification.data as Record<string, any>,
      priority: this.mapPriorityToExpo(notification.priority),
      channelId: notification.category || 'default',
    }));

    // 发送推送
    const chunks = this.expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Push notification error:', error);
      }
    }

    // 处理推送结果
    await this.handlePushTickets(tokens, tickets);
  }

  /**
   * 处理 Expo 推送票据
   */
  private async handlePushTickets(tokens: any[], tickets: ExpoPushTicket[]): Promise<void> {
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      const token = tokens[i];

      if (ticket.status === 'error') {
        // 处理错误，如令牌无效则禁用
        if (ticket.details?.error === 'DeviceNotRegistered') {
          await prisma.pushToken.update({
            where: { id: token.id },
            data: { isActive: false },
          });
        }
      }
    }
  }

  /**
   * 队列邮件通知
   */
  private async queueEmail(notification: Notification): Promise<void> {
    // 获取用户邮箱
    const user = await prisma.user.findUnique({
      where: { id: notification.userId },
      select: { email: true, name: true },
    });

    if (!user?.email) {
      return;
    }

    // 创建邮件队列记录
    await prisma.emailQueue.create({
      data: {
        toEmail: user.email,
        toName: user.name,
        templateId: this.getEmailTemplate(notification.type),
        subject: notification.title,
        content: notification.content,
        variables: {
          ...(notification.data as Record<string, unknown> || {}),
          title: notification.title,
          content: notification.content,
        },
        priority: this.mapPriorityToNumber(notification.priority),
      },
    });
  }

  /**
   * 队列短信通知
   */
  private async queueSMS(notification: Notification): Promise<void> {
    // 获取用户手机号
    const user = await prisma.user.findUnique({
      where: { id: notification.userId },
      select: { phone: true },
    });

    if (!user?.phone) {
      return;
    }

    // 创建短信队列记录
    await prisma.sMSQueue.create({
      data: {
        phoneNumber: user.phone,
        templateId: this.getSMSTemplate(notification.type),
        content: `${notification.title}: ${notification.content}`,
        variables: notification.data as Record<string, any>,
        priority: this.mapPriorityToNumber(notification.priority),
      },
    });
  }

  /**
   * 获取用户推送偏好
   */
  private async getUserPreferences(userId: string): Promise<any> {
    const prefs = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!prefs) {
      // 创建默认偏好
      return prisma.notificationPreference.create({
        data: { userId },
      });
    }

    return prefs;
  }

  /**
   * 检查是否应该发送给该用户
   */
  private shouldSendToUser(prefs: any, message: PushMessage): boolean {
    // 检查通知类型偏好
    switch (message.type) {
      case NotificationType.MATCH_NEW:
      case NotificationType.MATCH_ACCEPTED:
      case NotificationType.MATCH_REJECTED:
      case NotificationType.MATCH_COMPLETED:
        return prefs.matchNotifications;
      case NotificationType.MESSAGE_NEW:
        return prefs.messageNotifications;
      case NotificationType.RATING_RECEIVED:
        return prefs.ratingNotifications;
      case NotificationType.SYSTEM_ANNOUNCEMENT:
        return prefs.systemNotifications;
      case NotificationType.PROMOTION:
        return prefs.promotionNotifications;
      default:
        return true;
    }
  }

  /**
   * 确定推送渠道
   */
  private determineChannels(prefs: any, message: PushMessage): NotificationChannel[] {
    const channels: NotificationChannel[] = [NotificationChannel.IN_APP];

    if (prefs.pushEnabled) {
      channels.push(NotificationChannel.PUSH);
    }
    if (prefs.emailEnabled && message.priority === PriorityLevel.HIGH) {
      channels.push(NotificationChannel.EMAIL);
    }
    if (prefs.smsEnabled && message.priority === PriorityLevel.URGENT) {
      channels.push(NotificationChannel.SMS);
    }

    return channels;
  }

  /**
   * 检查渠道是否启用
   */
  private isChannelEnabled(prefs: any, channel: NotificationChannel): boolean {
    switch (channel) {
      case NotificationChannel.PUSH:
        return prefs.pushEnabled;
      case NotificationChannel.EMAIL:
        return prefs.emailEnabled;
      case NotificationChannel.SMS:
        return prefs.smsEnabled;
      case NotificationChannel.IN_APP:
        return prefs.inAppEnabled;
      default:
        return true;
    }
  }

  /**
   * 检查是否超过频率限制
   */
  private async isRateLimited(userId: string): Promise<boolean> {
    const now = Date.now();
    const userLimits = this.rateLimits.get(userId) || [];

    // 清理旧记录（1天前）
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const recentLimits = userLimits.filter(t => t > oneDayAgo);

    // 检查限制
    const oneMinuteAgo = now - 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;

    const perMinute = recentLimits.filter(t => t > oneMinuteAgo).length;
    const perHour = recentLimits.filter(t => t > oneHourAgo).length;
    const perDay = recentLimits.length;

    if (
      perMinute >= defaultRateLimit.maxPerMinute ||
      perHour >= defaultRateLimit.maxPerHour ||
      perDay >= defaultRateLimit.maxPerDay
    ) {
      return true;
    }

    // 更新记录
    recentLimits.push(now);
    this.rateLimits.set(userId, recentLimits);

    return false;
  }

  /**
   * 检查是否在免打扰时段
   */
  private async isInQuietHours(userId: string): Promise<boolean> {
    const prefs = await this.getUserPreferences(userId);
    if (!prefs.quietHoursEnabled || !prefs.quietHoursStart || !prefs.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const { quietHoursStart, quietHoursEnd } = prefs;

    if (quietHoursStart <= quietHoursEnd) {
      // 同一天的时段，如 22:00 - 08:00（跨午夜）
      return currentTime >= quietHoursStart || currentTime <= quietHoursEnd;
    } else {
      // 跨午夜的时段
      return currentTime >= quietHoursStart || currentTime <= quietHoursEnd;
    }
  }

  /**
   * 映射优先级到 Expo
   */
  private mapPriorityToExpo(priority: PriorityLevel): 'default' | 'normal' | 'high' {
    switch (priority) {
      case PriorityLevel.LOW:
        return 'default';
      case PriorityLevel.NORMAL:
        return 'normal';
      case PriorityLevel.HIGH:
      case PriorityLevel.URGENT:
        return 'high';
      default:
        return 'normal';
    }
  }

  /**
   * 映射优先级到数字
   */
  private mapPriorityToNumber(priority: PriorityLevel): number {
    switch (priority) {
      case PriorityLevel.LOW:
        return 0;
      case PriorityLevel.NORMAL:
        return 1;
      case PriorityLevel.HIGH:
        return 2;
      case PriorityLevel.URGENT:
        return 3;
      default:
        return 1;
    }
  }

  /**
   * 获取邮件模板ID
   */
  private getEmailTemplate(type: NotificationType): string {
    const templates: Record<string, string> = {
      MATCH_NEW: 'match-new',
      MATCH_ACCEPTED: 'match-accepted',
      MATCH_REJECTED: 'match-rejected',
      MATCH_COMPLETED: 'match-completed',
      MESSAGE_NEW: 'message-new',
      RATING_RECEIVED: 'rating-received',
      SYSTEM_ANNOUNCEMENT: 'system-announcement',
      PROMOTION: 'promotion',
      REMINDER: 'reminder',
    };
    return templates[type] || 'default';
  }

  /**
   * 获取短信模板ID
   */
  private getSMSTemplate(type: NotificationType): string {
    const templates: Record<string, string> = {
      MATCH_NEW: 'sms-match-new',
      MATCH_ACCEPTED: 'sms-match-accepted',
      MATCH_COMPLETED: 'sms-match-completed',
      SYSTEM_ANNOUNCEMENT: 'sms-system',
    };
    return templates[type] || 'sms-default';
  }
}

// 导出单例
export const pushNotificationService = new PushNotificationService();
