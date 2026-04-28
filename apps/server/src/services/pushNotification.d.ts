/**
 * 推送通知服务 (Push Notification Service)
 * 支持多种推送渠道：应用内、邮件、短信、推送
 */
import { NotificationType, NotificationChannel, PriorityLevel } from '@prisma/client';
interface PushConfig {
    expoAccessToken?: string;
    defaultChannel: NotificationChannel;
    batchSize: number;
    maxRetries: number;
}
export interface PushMessage {
    userId: string;
    title: string;
    content: string;
    type: NotificationType;
    data?: Record<string, any>;
    imageUrl?: string;
    videoUrl?: string;
    actionUrl?: string;
    category?: string;
    priority?: PriorityLevel;
    channels?: NotificationChannel[];
    actions?: PushAction[];
}
export interface PushAction {
    action: string;
    title: string;
    icon?: string;
}
export interface PushResult {
    success: boolean;
    notificationId?: string;
    deliveryIds: string[];
    errors: string[];
}
/**
 * 推送通知服务类
 */
export declare class PushNotificationService {
    private expo;
    private config;
    private rateLimits;
    constructor(config?: Partial<PushConfig>);
    /**
     * 发送单条推送通知
     */
    send(message: PushMessage): Promise<PushResult>;
    /**
     * 批量发送推送通知
     */
    sendBatch(messages: PushMessage[]): Promise<PushResult[]>;
    /**
     * 发送匹配结果通知
     */
    sendMatchNotification(userId: string, matchId: string, matchType: 'new' | 'accepted' | 'rejected' | 'completed'): Promise<PushResult>;
    /**
     * 发送新消息通知
     */
    sendMessageNotification(userId: string, conversationId: string, senderName: string, messagePreview: string): Promise<PushResult>;
    /**
     * 发送评分通知
     */
    sendRatingNotification(userId: string, matchId: string, raterName: string, rating: number): Promise<PushResult>;
    /**
     * 发送到指定渠道
     */
    private sendToChannel;
    /**
     * 发送移动端推送通知 (APNs, FCM via Expo)
     */
    private sendMobilePushNotification;
    /**
     * 处理 Expo 推送票据
     */
    private handlePushTickets;
    /**
     * 发送 Web Push 通知
     */
    private sendWebPushNotification;
    /**
     * 队列邮件通知
     */
    private queueEmail;
    /**
     * 队列短信通知
     */
    private queueSMS;
    /**
     * 获取用户推送偏好
     */
    private getUserPreferences;
    /**
     * 检查是否应该发送给该用户
     */
    private shouldSendToUser;
    /**
     * 确定推送渠道
     */
    private determineChannels;
    /**
     * 检查渠道是否启用
     */
    private isChannelEnabled;
    /**
     * 检查是否超过频率限制
     */
    private isRateLimited;
    /**
     * 检查是否在免打扰时段
     */
    private isInQuietHours;
    /**
     * 映射优先级到 Expo
     */
    private mapPriorityToExpo;
    /**
     * 映射优先级到数字
     */
    private mapPriorityToNumber;
    /**
     * 获取邮件模板ID
     */
    private getEmailTemplate;
    /**
     * 获取短信模板ID
     */
    private getSMSTemplate;
}
export declare const pushNotificationService: PushNotificationService;
export {};
//# sourceMappingURL=pushNotification.d.ts.map