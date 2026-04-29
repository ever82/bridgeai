/**
 * 推送通知服务 (Push Notification Service)
 * 支持多种推送渠道：应用内、邮件、短信、推送
 */
import { NotificationType, NotificationChannel, PriorityLevel } from '@prisma/client';
import { Expo } from 'expo-server-sdk';
import { prisma } from '../db/client';
import { webPushAdapter } from './push/WebPushAdapter';
const defaultRateLimit = {
    maxPerMinute: 10,
    maxPerHour: 60,
    maxPerDay: 100,
};
/**
 * 推送通知服务类
 */
export class PushNotificationService {
    expo = null;
    config;
    rateLimits = new Map(); // userId -> timestamps
    constructor(config = {}) {
        this.config = {
            defaultChannel: NotificationChannel.IN_APP,
            batchSize: 100,
            maxRetries: 3,
            ...config,
        };
        // Initialize Expo SDK (if token provided)
        if (config.expoAccessToken) {
            this.expo = new Expo({ accessToken: config.expoAccessToken });
        }
        // Initialize Web Push adapter
        webPushAdapter.initialize({ enabled: true }).catch(err => {
            console.error('Failed to initialize WebPushAdapter:', err);
        });
    }
    /**
     * 发送单条推送通知
     */
    async send(message) {
        const result = {
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
                }
                catch (error) {
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
        }
        catch (error) {
            result.errors.push(`Send failed: ${error.message}`);
            return result;
        }
    }
    /**
     * 批量发送推送通知
     */
    async sendBatch(messages) {
        const results = [];
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
    async sendMatchNotification(userId, matchId, matchType) {
        const titles = {
            new: '发现新的匹配',
            accepted: '匹配已被接受',
            rejected: '匹配已被拒绝',
            completed: '匹配已完成',
        };
        const contents = {
            new: '系统为您找到了一个潜在匹配，点击查看详情',
            accepted: '您的匹配请求已被对方接受',
            rejected: '您的匹配请求已被对方拒绝',
            completed: '恭喜！匹配交易已完成',
        };
        const types = {
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
    async sendMessageNotification(userId, conversationId, senderName, messagePreview) {
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
    async sendRatingNotification(userId, matchId, raterName, rating) {
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
    async sendToChannel(channel, notification, prefs) {
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
                await this.sendMobilePushNotification(notification);
                await this.sendWebPushNotification(notification);
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
     * 发送移动端推送通知 (APNs, FCM via Expo)
     */
    async sendMobilePushNotification(notification) {
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
        const messages = tokens.map((token) => {
            const msg = {
                to: token.token,
                sound: 'default',
                title: notification.title,
                body: notification.content,
                data: notification.data,
                priority: this.mapPriorityToExpo(notification.priority),
                channelId: notification.category || 'default',
            };
            // Add image support
            if (notification.imageUrl) {
                msg.image = notification.imageUrl;
            }
            // Add video support if available
            const data = notification.data;
            if (data?.videoUrl) {
                msg.mp4 = data.videoUrl;
            }
            return msg;
        });
        // 发送推送
        const chunks = this.expo.chunkPushNotifications(messages);
        const tickets = [];
        for (const chunk of chunks) {
            try {
                const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
                tickets.push(...ticketChunk);
            }
            catch (error) {
                console.error('Push notification error:', error);
            }
        }
        // 处理推送结果
        await this.handlePushTickets(tokens, tickets);
    }
    /**
     * 处理 Expo 推送票据
     */
    async handlePushTickets(tokens, tickets) {
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
     * 发送 Web Push 通知
     */
    async sendWebPushNotification(notification) {
        if (!webPushAdapter.isConfigured()) {
            return;
        }
        // Get web push subscriptions for user
        const subscriptions = await prisma.webPushSubscription.findMany({
            where: {
                userId: notification.userId,
                isActive: true,
            },
        });
        if (subscriptions.length === 0) {
            return;
        }
        // Send to all active subscriptions
        for (const sub of subscriptions) {
            try {
                const result = await webPushAdapter.send(sub.endpoint, {
                    title: notification.title,
                    body: notification.content,
                    data: notification.data,
                    tag: notification.category || 'default',
                    renotify: true,
                    vibrate: [200, 100, 200],
                });
                if (!result.success) {
                    console.warn(`Web push failed for endpoint ${sub.endpoint}: ${result.error}`);
                }
            }
            catch (error) {
                console.error('Web push notification error:', error);
            }
        }
    }
    /**
     * 队列邮件通知
     */
    async queueEmail(notification) {
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
                    ...(notification.data || {}),
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
    async queueSMS(notification) {
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
                variables: notification.data,
                priority: this.mapPriorityToNumber(notification.priority),
            },
        });
    }
    /**
     * 获取用户推送偏好
     */
    async getUserPreferences(userId) {
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
    shouldSendToUser(prefs, message) {
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
    determineChannels(prefs, message) {
        const channels = [NotificationChannel.IN_APP];
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
    isChannelEnabled(prefs, channel) {
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
    async isRateLimited(userId) {
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
        if (perMinute >= defaultRateLimit.maxPerMinute ||
            perHour >= defaultRateLimit.maxPerHour ||
            perDay >= defaultRateLimit.maxPerDay) {
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
    async isInQuietHours(userId) {
        const prefs = await this.getUserPreferences(userId);
        if (!prefs.quietHoursEnabled || !prefs.quietHoursStart || !prefs.quietHoursEnd) {
            return false;
        }
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const { quietHoursStart, quietHoursEnd } = prefs;
        if (quietHoursStart <= quietHoursEnd) {
            // Same day range, e.g., 08:00 - 22:00
            return currentTime >= quietHoursStart && currentTime <= quietHoursEnd;
        }
        else {
            // Cross-midnight range, e.g., 22:00 - 08:00
            return currentTime >= quietHoursStart || currentTime <= quietHoursEnd;
        }
    }
    /**
     * 映射优先级到 Expo
     */
    mapPriorityToExpo(priority) {
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
    mapPriorityToNumber(priority) {
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
    getEmailTemplate(type) {
        const templates = {
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
    getSMSTemplate(type) {
        const templates = {
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
//# sourceMappingURL=pushNotification.js.map