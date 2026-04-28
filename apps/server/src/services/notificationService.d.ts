/**
 * 通知中心服务 (Notification Center Service)
 * 管理用户通知列表、分类、已读/未读状态
 */
import { EventEmitter } from 'events';
import { Notification, NotificationType, NotificationStatus, NotificationChannel, PriorityLevel } from '@prisma/client';
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
interface PaginatedNotifications {
    items: Notification[];
    total: number;
    unreadCount: number;
    hasMore: boolean;
}
interface NotificationStats {
    total: number;
    unread: number;
    read: number;
    archived: number;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
}
export interface PushAnalytics {
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    conversionRate: number;
    byChannel: Record<string, ChannelStats>;
}
interface ChannelStats {
    sent: number;
    delivered: number;
    failed: number;
    opened: number;
    clicked: number;
}
interface NotificationCategory {
    id: string;
    name: string;
    icon?: string;
    unreadCount: number;
}
/**
 * 通知中心服务类
 */
export declare class NotificationService {
    /**
     * 获取用户通知列表
     */
    getNotifications(options: NotificationQueryOptions): Promise<PaginatedNotifications>;
    /**
     * 获取通知详情
     */
    getNotificationDetail(notificationId: string, userId: string): Promise<Notification | null>;
    /**
     * 标记通知为已读
     */
    markAsRead(notificationId: string, userId: string): Promise<boolean>;
    /**
     * 批量标记为已读
     */
    markMultipleAsRead(notificationIds: string[], userId: string): Promise<number>;
    /**
     * 标记所有通知为已读
     */
    markAllAsRead(userId: string): Promise<number>;
    /**
     * 归档通知
     */
    archiveNotification(notificationId: string, userId: string): Promise<boolean>;
    /**
     * 批量归档通知
     */
    archiveMultiple(notificationIds: string[], userId: string): Promise<number>;
    /**
     * 删除通知
     */
    deleteNotification(notificationId: string, userId: string): Promise<boolean>;
    /**
     * 批量删除通知
     */
    deleteMultiple(notificationIds: string[], userId: string): Promise<number>;
    /**
     * 清空已删除的通知
     */
    cleanupDeleted(userId: string, olderThanDays?: number): Promise<number>;
    /**
     * 清空过期通知
     */
    cleanupExpired(userId?: string): Promise<number>;
    /**
     * 获取通知统计
     */
    getStats(userId: string): Promise<NotificationStats>;
    /**
     * 获取推送分析数据
     */
    getPushAnalytics(userId: string, startDate?: Date, endDate?: Date): Promise<PushAnalytics>;
    /**
     * 重试失败的推送通知
     */
    retryFailedDeliveries(maxRetries?: number): Promise<number>;
    /**
     * 按类型统计
     */
    private getCountByType;
    /**
     * 按分类统计
     */
    private getCountByCategory;
    /**
     * 获取通知分类列表
     */
    getCategories(userId: string): Promise<NotificationCategory[]>;
    /**
     * 获取未读通知数量
     */
    getUnreadCount(userId: string, category?: string): Promise<number>;
    /**
     * Send notification to a user
     */
    sendToUser(userId: string, data: {
        type: string;
        title: string;
        content: string;
        data?: Record<string, unknown>;
        imageUrl?: string;
        actionUrl?: string;
        category?: string;
        priority?: string;
        channels?: string[];
    }): Promise<Notification>;
    /**
     * 获取最新通知
     */
    getLatestNotifications(userId: string, limit?: number): Promise<Notification[]>;
    /**
     * 搜索通知
     */
    searchNotifications(userId: string, keyword: string, options?: {
        limit?: number;
        offset?: number;
    }): Promise<PaginatedNotifications>;
    /**
     * 订阅通知更新（用于WebSocket）
     */
    subscribeToUpdates(userId: string, _callback: (notification: Notification) => void): void;
    /**
     * 取消订阅
     */
    unsubscribeFromUpdates(userId: string): void;
}
export declare const notificationService: NotificationService;
export { NotificationType, NotificationChannel } from '@prisma/client';
export declare enum ReviewNotificationType {
    NEW_REVIEW = "NEW_REVIEW",
    PENDING_REVIEW_REMINDER = "PENDING_REVIEW_REMINDER",
    REVIEW_REPLY = "REVIEW_REPLY",
    BAD_REVIEW_WARNING = "BAD_REVIEW_WARNING",
    CREDIT_SCORE_CHANGE = "CREDIT_SCORE_CHANGE"
}
export declare const reviewNotificationEvents: EventEmitter<[never]>;
export interface ReviewNotificationPreferences {
    newReview: boolean;
    pendingReviewReminder: boolean;
    reviewReply: boolean;
    badReviewWarning: boolean;
    creditScoreChange: boolean;
}
/**
 * Get user's review notification preferences
 * @param userId - User ID
 * @returns Notification preferences
 */
export declare function getReviewNotificationPreferences(userId: string): ReviewNotificationPreferences;
/**
 * Update user's review notification preferences
 * @param userId - User ID
 * @param preferences - New preferences
 */
export declare function updateReviewNotificationPreferences(userId: string, preferences: Partial<ReviewNotificationPreferences>): ReviewNotificationPreferences;
/**
 * Send new review notification
 * @param userId - User ID of the review recipient
 * @param raterName - Name of the reviewer
 * @param rating - Rating score
 * @param ratingId - Rating ID
 */
export declare function sendNewReviewNotification(userId: string, raterName: string, rating: number, ratingId: string): Promise<void>;
/**
 * Send pending review reminder
 * @param userId - User ID
 * @param matchId - Match ID
 * @param partnerName - Partner's name
 */
export declare function sendPendingReviewReminder(userId: string, matchId: string, partnerName: string): Promise<void>;
/**
 * Send review reply notification
 * @param userId - User ID of the original reviewer
 * @param rateeName - Name of the person who replied
 * @param ratingId - Rating ID
 */
export declare function sendReviewReplyNotification(userId: string, rateeName: string, ratingId: string): Promise<void>;
/**
 * Send bad review warning notification
 * @param userId - User ID
 * @param rating - The bad rating received
 * @param creditDelta - Credit score change
 * @param ratingId - Rating ID
 */
export declare function sendBadReviewWarning(userId: string, rating: number, creditDelta: number, ratingId: string): Promise<void>;
/**
 * Send credit score change notification
 * @param userId - User ID
 * @param previousScore - Previous credit score
 * @param newScore - New credit score
 * @param reason - Reason for change
 */
export declare function sendCreditScoreChangeNotification(userId: string, previousScore: number, newScore: number, reason: string): Promise<void>;
/**
 * Schedule pending review reminders for a completed match
 * @param matchId - Match ID
 * @param completionTime - When the match was completed
 */
export declare function scheduleReviewReminders(matchId: string, _completionTime: Date): Promise<void>;
//# sourceMappingURL=notificationService.d.ts.map