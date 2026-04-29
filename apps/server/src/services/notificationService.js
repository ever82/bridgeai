/**
 * 通知中心服务 (Notification Center Service)
 * 管理用户通知列表、分类、已读/未读状态
 */
import { EventEmitter } from 'events';
import { NotificationType, PriorityLevel, } from '@prisma/client';
import { prisma } from '../db/client';
import { pushNotificationService } from './pushNotification';
/**
 * 通知中心服务类
 */
export class NotificationService {
    /**
     * 获取用户通知列表
     */
    async getNotifications(options) {
        const { userId, status, type, category, channel, priority, startDate, endDate, limit = 20, offset = 0, } = options;
        // 构建查询条件
        const where = { userId };
        if (status) {
            if (Array.isArray(status)) {
                where.status = { in: status };
            }
            else {
                where.status = status;
            }
        }
        if (type) {
            if (Array.isArray(type)) {
                where.type = { in: type };
            }
            else {
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
            if (startDate)
                where.createdAt.gte = startDate;
            if (endDate)
                where.createdAt.lte = endDate;
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
    async getNotificationDetail(notificationId, userId) {
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
    async markAsRead(notificationId, userId) {
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
        }
        catch (error) {
            console.error('Error marking notification as read:', error);
            return false;
        }
    }
    /**
     * 批量标记为已读
     */
    async markMultipleAsRead(notificationIds, userId) {
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
        }
        catch (error) {
            console.error('Error marking notifications as read:', error);
            return 0;
        }
    }
    /**
     * 标记所有通知为已读
     */
    async markAllAsRead(userId) {
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
        }
        catch (error) {
            console.error('Error marking all notifications as read:', error);
            return 0;
        }
    }
    /**
     * 归档通知
     */
    async archiveNotification(notificationId, userId) {
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
        }
        catch (error) {
            console.error('Error archiving notification:', error);
            return false;
        }
    }
    /**
     * 批量归档通知
     */
    async archiveMultiple(notificationIds, userId) {
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
        }
        catch (error) {
            console.error('Error archiving notifications:', error);
            return 0;
        }
    }
    /**
     * 删除通知
     */
    async deleteNotification(notificationId, userId) {
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
        }
        catch (error) {
            console.error('Error deleting notification:', error);
            return false;
        }
    }
    /**
     * 批量删除通知
     */
    async deleteMultiple(notificationIds, userId) {
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
        }
        catch (error) {
            console.error('Error deleting notifications:', error);
            return 0;
        }
    }
    /**
     * 清空已删除的通知
     */
    async cleanupDeleted(userId, olderThanDays = 30) {
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
        }
        catch (error) {
            console.error('Error cleaning up deleted notifications:', error);
            return 0;
        }
    }
    /**
     * 清空过期通知
     */
    async cleanupExpired(userId) {
        try {
            const now = new Date();
            const where = {
                expiresAt: { lt: now },
            };
            if (userId) {
                where.userId = userId;
            }
            const result = await prisma.notification.deleteMany({ where });
            return result.count;
        }
        catch (error) {
            console.error('Error cleaning up expired notifications:', error);
            return 0;
        }
    }
    /**
     * 获取通知统计
     */
    async getStats(userId) {
        const [total, unread, read, archived, byType, byCategory] = await Promise.all([
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
     * 获取推送分析数据
     */
    async getPushAnalytics(userId, startDate, endDate) {
        const dateFilter = {};
        if (startDate)
            dateFilter.gte = startDate;
        if (endDate)
            dateFilter.lte = endDate;
        const notificationWhere = { userId };
        if (startDate || endDate) {
            notificationWhere.createdAt = dateFilter;
        }
        // Get all notifications with their deliveries
        const notifications = await prisma.notification.findMany({
            where: notificationWhere,
            include: {
                deliveries: true,
            },
        });
        // Calculate metrics
        let totalSent = 0;
        let totalDelivered = 0;
        let totalFailed = 0;
        let totalOpened = 0;
        const byChannel = {};
        for (const notif of notifications) {
            // Use parent notification's read status as proxy for "opened".
            // A notification is considered opened if its parent Notification has readAt set.
            const isOpened = notif.readAt !== null;
            for (const delivery of notif.deliveries) {
                totalSent++;
                byChannel[delivery.channel] = byChannel[delivery.channel] || {
                    sent: 0,
                    delivered: 0,
                    failed: 0,
                    opened: 0,
                    clicked: 0,
                };
                byChannel[delivery.channel].sent++;
                if (delivery.status === 'SENT' || delivery.status === 'DELIVERED') {
                    totalDelivered++;
                    byChannel[delivery.channel].delivered++;
                    // Track opens based on parent notification readAt for delivered notifications
                    if (isOpened) {
                        totalOpened++;
                        byChannel[delivery.channel].opened++;
                    }
                }
                else if (delivery.status === 'FAILED') {
                    totalFailed++;
                    byChannel[delivery.channel].failed++;
                }
            }
        }
        return {
            totalSent,
            totalDelivered,
            totalFailed,
            deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
            openRate: totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0,
            // clickRate uses same proxy as openRate until dedicated clickedAt field
            // is added to NotificationDelivery model (requires DB migration).
            clickRate: totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0,
            // TODO: conversionRate requires conversion tracking (e.g. goal completion),
            // which is not yet available. Requires a dedicated conversion events table.
            conversionRate: 0,
            byChannel,
        };
    }
    /**
     * 重试失败的推送通知
     */
    async retryFailedDeliveries(maxRetries = 3) {
        const failedDeliveries = await prisma.notificationDelivery.findMany({
            where: {
                status: 'FAILED',
                retryCount: { lt: maxRetries },
            },
            include: {
                notification: true,
            },
            take: 100, // Process in batches
        });
        let retriedCount = 0;
        for (const delivery of failedDeliveries) {
            try {
                // Reset status and increment retry count
                await prisma.notificationDelivery.update({
                    where: { id: delivery.id },
                    data: {
                        status: 'PENDING',
                        retryCount: { increment: 1 },
                        errorMessage: null,
                    },
                });
                // Actually resend the notification through the delivery's channel
                const notification = delivery.notification;
                const result = await pushNotificationService.send({
                    userId: notification.userId,
                    title: notification.title,
                    content: notification.content,
                    type: notification.type,
                    data: notification.data || {},
                    imageUrl: notification.imageUrl ?? undefined,
                    actionUrl: notification.actionUrl ?? undefined,
                    category: notification.category ?? undefined,
                    priority: notification.priority,
                    channels: [delivery.channel],
                });
                if (result.success) {
                    await prisma.notificationDelivery.update({
                        where: { id: delivery.id },
                        data: {
                            status: 'SENT',
                            sentAt: new Date(),
                        },
                    });
                    retriedCount++;
                }
                else {
                    await prisma.notificationDelivery.update({
                        where: { id: delivery.id },
                        data: {
                            status: 'FAILED',
                            errorMessage: result.errors.join('; ') || 'Retry send failed',
                        },
                    });
                }
            }
            catch (error) {
                console.error(`Failed to retry delivery ${delivery.id}:`, error);
                await prisma.notificationDelivery
                    .update({
                    where: { id: delivery.id },
                    data: {
                        status: 'FAILED',
                        errorMessage: error.message || 'Unknown error during retry',
                    },
                })
                    .catch(() => { });
            }
        }
        return retriedCount;
    }
    /**
     * 按类型统计
     */
    async getCountByType(userId) {
        const result = await prisma.notification.groupBy({
            by: ['type'],
            where: { userId },
            _count: { type: true },
        });
        return result.reduce((acc, item) => {
            acc[item.type] = item._count.type;
            return acc;
        }, {});
    }
    /**
     * 按分类统计
     */
    async getCountByCategory(userId) {
        const result = await prisma.notification.groupBy({
            by: ['category'],
            where: { userId },
            _count: { category: true },
        });
        return result.reduce((acc, item) => {
            acc[item.category || 'other'] = item._count.category;
            return acc;
        }, {});
    }
    /**
     * 获取通知分类列表
     */
    async getCategories(userId) {
        const categories = [
            { id: 'match', name: '匹配通知', icon: 'handshake' },
            { id: 'message', name: '消息通知', icon: 'message' },
            { id: 'rating', name: '评分通知', icon: 'star' },
            { id: 'system', name: '系统通知', icon: 'bell' },
            { id: 'promotion', name: '促销活动', icon: 'gift' },
            { id: 'other', name: '其他', icon: 'dots' },
        ];
        // 获取各分类的未读数
        const unreadCounts = await Promise.all(categories.map(cat => prisma.notification.count({
            where: {
                userId,
                category: cat.id,
                status: 'UNREAD',
            },
        })));
        return categories.map((cat, index) => ({
            ...cat,
            unreadCount: unreadCounts[index],
        }));
    }
    /**
     * 获取未读通知数量
     */
    async getUnreadCount(userId, category) {
        const where = {
            userId,
            status: 'UNREAD',
        };
        if (category) {
            where.category = category;
        }
        return prisma.notification.count({ where });
    }
    /**
     * Send notification to a user
     */
    async sendToUser(userId, data) {
        return prisma.notification.create({
            data: {
                userId,
                type: data.type,
                title: data.title,
                content: data.content,
                data: data.data,
                imageUrl: data.imageUrl,
                actionUrl: data.actionUrl,
                category: data.category,
                priority: data.priority || 'NORMAL',
                channel: data.channels?.[0] || 'IN_APP',
            },
        });
    }
    /**
     * 获取最新通知
     */
    async getLatestNotifications(userId, limit = 5) {
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
        });
    }
    /**
     * 搜索通知
     */
    async searchNotifications(userId, keyword, options = {}) {
        const { limit = 20, offset = 0 } = options;
        const where = {
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
    subscribeToUpdates(userId, _callback) {
        // 这里应该与WebSocket服务集成
        // 用于实时推送新通知
        console.log(`Subscribed user ${userId} to notification updates`);
    }
    /**
     * 取消订阅
     */
    unsubscribeFromUpdates(userId) {
        console.log(`Unsubscribed user ${userId} from notification updates`);
    }
}
// 导出单例
export const notificationService = new NotificationService();
// Re-export Prisma enums for use by other modules
export { NotificationType, NotificationChannel } from '@prisma/client';
// ============================================
// ISSUE-CR002c: Rating & Review Notification Functions
// ============================================
// Review Notification Types
export var ReviewNotificationType;
(function (ReviewNotificationType) {
    ReviewNotificationType["NEW_REVIEW"] = "NEW_REVIEW";
    ReviewNotificationType["PENDING_REVIEW_REMINDER"] = "PENDING_REVIEW_REMINDER";
    ReviewNotificationType["REVIEW_REPLY"] = "REVIEW_REPLY";
    ReviewNotificationType["BAD_REVIEW_WARNING"] = "BAD_REVIEW_WARNING";
    ReviewNotificationType["CREDIT_SCORE_CHANGE"] = "CREDIT_SCORE_CHANGE";
})(ReviewNotificationType || (ReviewNotificationType = {}));
// Review Notification Events
export const reviewNotificationEvents = new EventEmitter();
// In-memory store for user preferences
const userReviewPreferences = new Map();
export const DEFAULT_REVIEW_PREFERENCES = {
    newReview: true,
    pendingReviewReminder: true,
    reviewReply: true,
    badReviewWarning: true,
    creditScoreChange: true,
};
/**
 * Get user's review notification preferences
 * @param userId - User ID
 * @returns Notification preferences
 */
export function getReviewNotificationPreferences(userId) {
    return userReviewPreferences.get(userId) ?? DEFAULT_REVIEW_PREFERENCES;
}
/**
 * Reset review notification preferences (for testing)
 */
export function resetReviewNotificationPreferences() {
    userReviewPreferences.clear();
}
/**
 * Update user's review notification preferences
 * @param userId - User ID
 * @param preferences - New preferences
 */
export function updateReviewNotificationPreferences(userId, preferences) {
    const current = getReviewNotificationPreferences(userId);
    const updated = { ...current, ...preferences };
    userReviewPreferences.set(userId, updated);
    return updated;
}
/**
 * Send new review notification
 * @param userId - User ID of the review recipient
 * @param raterName - Name of the reviewer
 * @param rating - Rating score
 * @param ratingId - Rating ID
 */
export async function sendNewReviewNotification(userId, raterName, rating, ratingId) {
    const prefs = getReviewNotificationPreferences(userId);
    if (!prefs.newReview)
        return;
    await notificationService.sendToUser(userId, {
        type: NotificationType.REVIEW_RATING,
        title: '收到新评价',
        content: `${raterName} 给您打了 ${rating} 星评价`,
        data: {
            ratingId,
            rating,
            raterName,
        },
        priority: PriorityLevel.NORMAL,
    });
    reviewNotificationEvents.emit(ReviewNotificationType.NEW_REVIEW, {
        userId,
        ratingId,
        rating,
    });
}
/**
 * Send pending review reminder
 * @param userId - User ID
 * @param matchId - Match ID
 * @param partnerName - Partner's name
 */
export async function sendPendingReviewReminder(userId, matchId, partnerName) {
    const prefs = getReviewNotificationPreferences(userId);
    if (!prefs.pendingReviewReminder)
        return;
    await notificationService.sendToUser(userId, {
        type: NotificationType.REVIEW_REMINDER,
        title: '待评价提醒',
        content: `交易已完成，请对 ${partnerName} 进行评价`,
        data: {
            matchId,
            partnerName,
        },
        priority: PriorityLevel.NORMAL,
    });
    reviewNotificationEvents.emit(ReviewNotificationType.PENDING_REVIEW_REMINDER, {
        userId,
        matchId,
    });
}
/**
 * Send review reply notification
 * @param userId - User ID of the original reviewer
 * @param rateeName - Name of the person who replied
 * @param ratingId - Rating ID
 */
export async function sendReviewReplyNotification(userId, rateeName, ratingId) {
    const prefs = getReviewNotificationPreferences(userId);
    if (!prefs.reviewReply)
        return;
    await notificationService.sendToUser(userId, {
        type: 'review_reply',
        title: '评价收到回复',
        content: `${rateeName} 回复了您的评价`,
        data: {
            ratingId,
            rateeName,
        },
        priority: PriorityLevel.NORMAL,
    });
    reviewNotificationEvents.emit(ReviewNotificationType.REVIEW_REPLY, {
        userId,
        ratingId,
    });
}
/**
 * Send bad review warning notification
 * @param userId - User ID
 * @param rating - The bad rating received
 * @param creditDelta - Credit score change
 * @param ratingId - Rating ID
 */
export async function sendBadReviewWarning(userId, rating, creditDelta, ratingId) {
    const prefs = getReviewNotificationPreferences(userId);
    if (!prefs.badReviewWarning)
        return;
    await notificationService.sendToUser(userId, {
        type: 'review_bad_rating',
        title: '差评预警',
        content: `您收到了 ${rating} 星评价，信用分 ${creditDelta} 分`,
        data: {
            ratingId,
            rating,
            creditDelta,
        },
        priority: PriorityLevel.HIGH,
    });
    reviewNotificationEvents.emit(ReviewNotificationType.BAD_REVIEW_WARNING, {
        userId,
        ratingId,
        creditDelta,
    });
}
/**
 * Send credit score change notification
 * @param userId - User ID
 * @param previousScore - Previous credit score
 * @param newScore - New credit score
 * @param reason - Reason for change
 */
export async function sendCreditScoreChangeNotification(userId, previousScore, newScore, reason) {
    const prefs = getReviewNotificationPreferences(userId);
    if (!prefs.creditScoreChange)
        return;
    const delta = newScore - previousScore;
    const deltaText = delta > 0 ? `+${delta}` : `${delta}`;
    await notificationService.sendToUser(userId, {
        type: 'credit_score_change',
        title: delta > 0 ? '信用分提升' : '信用分下降',
        content: `您的信用分 ${deltaText}，当前 ${newScore} 分。原因：${reason}`,
        data: {
            previousScore,
            newScore,
            delta,
            reason,
        },
        priority: PriorityLevel.NORMAL,
    });
    reviewNotificationEvents.emit(ReviewNotificationType.CREDIT_SCORE_CHANGE, {
        userId,
        previousScore,
        newScore,
        delta,
    });
}
/**
 * Schedule pending review reminders for a completed match
 * @param matchId - Match ID
 * @param completionTime - When the match was completed
 */
export async function scheduleReviewReminders(matchId, _completionTime) {
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
            await sendPendingReviewReminder(demandUser.id, matchId, supplyUser.name || '对方');
        }
        // Check if supply user has already rated
        const supplyUserRated = await prisma.rating.findFirst({
            where: {
                matchId,
                raterId: supplyUser.id,
            },
        });
        if (!supplyUserRated) {
            await sendPendingReviewReminder(supplyUser.id, matchId, demandUser.name || '对方');
        }
    }, REMINDER_DELAY_MS);
}
//# sourceMappingURL=notificationService.js.map