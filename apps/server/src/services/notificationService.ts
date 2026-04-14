/**
 * 通知中心服务 (Notification Center Service)
 * 管理用户通知列表、分类、已读/未读状态
 */

import { PrismaClient, Notification, NotificationType, NotificationStatus, NotificationChannel, PriorityLevel } from '@prisma/client';

const prisma = new PrismaClient();

// 查询选项
interface NotificationQueryOptions {
  userId: string;
  status?: NotificationStatus | NotificationStatus[];
  type?: NotificationType | NotificationType[];
  category?: string;
  channel?: NotificationChannel;
  priority?: PriorityLevel;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

// 分页结果
interface PaginatedNotifications {
  items: Notification[];
  total: number;
  unreadCount: number;
  hasMore: boolean;
}

// 通知统计
interface NotificationStats {
  total: number;
  unread: number;
  read: number;
  archived: number;
  byType: Record<string, number>;
  byCategory: Record<string, number>;
}

// 通知分类
interface NotificationCategory {
  id: string;
  name: string;
  icon?: string;
  unreadCount: number;
}

/**
 * 通知中心服务类
 */
export class NotificationService {
  /**
   * 获取用户通知列表
   */
  async getNotifications(options: NotificationQueryOptions): Promise<PaginatedNotifications> {
    const {
      userId,
      status,
      type,
      category,
      channel,
      priority,
      startDate,
      endDate,
      limit = 20,
      offset = 0,
    } = options;

    // 构建查询条件
    const where: any = { userId };

    if (status) {
      if (Array.isArray(status)) {
        where.status = { in: status };
      } else {
        where.status = status;
      }
    }

    if (type) {
      if (Array.isArray(type)) {
        where.type = { in: type };
      } else {
        where.type = type;
      }
    }

    if (category) {
      where.category = category;
    }

    if (channel) {
      where.channel = channel;
    }

    if (priority) {
      where.priority = priority;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    // 查询通知列表
    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          deliveries: {
            select: {
              channel: true,
              status: true,
              sentAt: true,
            },
          },
        },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId, status: 'UNREAD' },
      }),
    ]);

    return {
      items,
      total,
      unreadCount,
      hasMore: offset + items.length < total,
    };
  }

  /**
   * 获取通知详情
   */
  async getNotificationDetail(notificationId: string, userId: string): Promise<Notification | null> {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
      include: {
        deliveries: {
          select: {
            id: true,
            channel: true,
            status: true,
            sentAt: true,
            deliveredAt: true,
            failedAt: true,
            errorMessage: true,
            retryCount: true,
          },
        },
      },
    });

    if (notification && notification.status === 'UNREAD') {
      // 自动标记为已读
      await this.markAsRead(notificationId, userId);
    }

    return notification;
  }

  /**
   * 标记通知为已读
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      await prisma.notification.updateMany({
        where: {
          id: notificationId,
          userId,
          status: 'UNREAD',
        },
        data: {
          status: 'READ',
          readAt: new Date(),
        },
      });
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * 批量标记为已读
   */
  async markMultipleAsRead(notificationIds: string[], userId: string): Promise<number> {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId,
          status: 'UNREAD',
        },
        data: {
          status: 'READ',
          readAt: new Date(),
        },
      });
      return result.count;
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      return 0;
    }
  }

  /**
   * 标记所有通知为已读
   */
  async markAllAsRead(userId: string): Promise<number> {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          userId,
          status: 'UNREAD',
        },
        data: {
          status: 'READ',
          readAt: new Date(),
        },
      });
      return result.count;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return 0;
    }
  }

  /**
   * 归档通知
   */
  async archiveNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      await prisma.notification.updateMany({
        where: {
          id: notificationId,
          userId,
        },
        data: {
          status: 'ARCHIVED',
        },
      });
      return true;
    } catch (error) {
      console.error('Error archiving notification:', error);
      return false;
    }
  }

  /**
   * 批量归档通知
   */
  async archiveMultiple(notificationIds: string[], userId: string): Promise<number> {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId,
        },
        data: {
          status: 'ARCHIVED',
        },
      });
      return result.count;
    } catch (error) {
      console.error('Error archiving notifications:', error);
      return 0;
    }
  }

  /**
   * 删除通知
   */
  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      await prisma.notification.updateMany({
        where: {
          id: notificationId,
          userId,
        },
        data: {
          status: 'DELETED',
        },
      });
      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  }

  /**
   * 批量删除通知
   */
  async deleteMultiple(notificationIds: string[], userId: string): Promise<number> {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId,
        },
        data: {
          status: 'DELETED',
        },
      });
      return result.count;
    } catch (error) {
      console.error('Error deleting notifications:', error);
      return 0;
    }
  }

  /**
   * 清空已删除的通知
   */
  async cleanupDeleted(userId: string, olderThanDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await prisma.notification.deleteMany({
        where: {
          userId,
          status: 'DELETED',
          updatedAt: { lt: cutoffDate },
        },
      });

      return result.count;
    } catch (error) {
      console.error('Error cleaning up deleted notifications:', error);
      return 0;
    }
  }

  /**
   * 清空过期通知
   */
  async cleanupExpired(userId?: string): Promise<number> {
    try {
      const now = new Date();
      const where: any = {
        expiresAt: { lt: now },
      };

      if (userId) {
        where.userId = userId;
      }

      const result = await prisma.notification.deleteMany({ where });
      return result.count;
    } catch (error) {
      console.error('Error cleaning up expired notifications:', error);
      return 0;
    }
  }

  /**
   * 获取通知统计
   */
  async getStats(userId: string): Promise<NotificationStats> {
    const [
      total,
      unread,
      read,
      archived,
      byType,
      byCategory,
    ] = await Promise.all([
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, status: 'UNREAD' } }),
      prisma.notification.count({ where: { userId, status: 'READ' } }),
      prisma.notification.count({ where: { userId, status: 'ARCHIVED' } }),
      this.getCountByType(userId),
      this.getCountByCategory(userId),
    ]);

    return {
      total,
      unread,
      read,
      archived,
      byType,
      byCategory,
    };
  }

  /**
   * 按类型统计
   */
  private async getCountByType(userId: string): Promise<Record<string, number>> {
    const result = await prisma.notification.groupBy({
      by: ['type'],
      where: { userId },
      _count: { type: true },
    });

    return result.reduce((acc: Record<string, number>, item: any) => {
      acc[item.type] = item._count.type;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * 按分类统计
   */
  private async getCountByCategory(userId: string): Promise<Record<string, number>> {
    const result = await prisma.notification.groupBy({
      by: ['category'],
      where: { userId },
      _count: { category: true },
    });

    return result.reduce((acc: Record<string, number>, item: any) => {
      acc[item.category || 'other'] = item._count.category;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * 获取通知分类列表
   */
  async getCategories(userId: string): Promise<NotificationCategory[]> {
    const categories = [
      { id: 'match', name: '匹配通知', icon: 'handshake' },
      { id: 'message', name: '消息通知', icon: 'message' },
      { id: 'rating', name: '评分通知', icon: 'star' },
      { id: 'system', name: '系统通知', icon: 'bell' },
      { id: 'promotion', name: '促销活动', icon: 'gift' },
      { id: 'other', name: '其他', icon: 'dots' },
    ];

    // 获取各分类的未读数
    const unreadCounts = await Promise.all(
      categories.map(cat =>
        prisma.notification.count({
          where: {
            userId,
            category: cat.id,
            status: 'UNREAD',
          },
        })
      )
    );

    return categories.map((cat, index) => ({
      ...cat,
      unreadCount: unreadCounts[index],
    }));
  }

  /**
   * 获取未读通知数量
   */
  async getUnreadCount(userId: string, category?: string): Promise<number> {
    const where: any = {
      userId,
      status: 'UNREAD',
    };

    if (category) {
      where.category = category;
    }

    return prisma.notification.count({ where });
  }

  /**
   * 获取最新通知
   */
  async getLatestNotifications(userId: string, limit: number = 5): Promise<Notification[]> {
    return prisma.notification.findMany({
      where: {
        userId,
        status: { in: ['UNREAD', 'READ'] },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        type: true,
        title: true,
        content: true,
        imageUrl: true,
        actionUrl: true,
        status: true,
        priority: true,
        createdAt: true,
        readAt: true,
      },
    }) as Promise<Notification[]>;
  }

  /**
   * 搜索通知
   */
  async searchNotifications(
    userId: string,
    keyword: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<PaginatedNotifications> {
    const { limit = 20, offset = 0 } = options;

    const where: any = {
      userId,
      OR: [
        { title: { contains: keyword, mode: 'insensitive' } },
        { content: { contains: keyword, mode: 'insensitive' } },
      ],
    };

    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, status: 'UNREAD' } }),
    ]);

    return {
      items,
      total,
      unreadCount,
      hasMore: offset + items.length < total,
    };
  }

  /**
   * 订阅通知更新（用于WebSocket）
   */
  subscribeToUpdates(userId: string, callback: (notification: Notification) => void): void {
    // 这里应该与WebSocket服务集成
    // 用于实时推送新通知
    console.log(`Subscribed user ${userId} to notification updates`);
  }

  /**
   * 取消订阅
   */
  unsubscribeFromUpdates(userId: string): void {
    console.log(`Unsubscribed user ${userId} from notification updates`);
  }
}

// 导出单例
export const notificationService = new NotificationService();
