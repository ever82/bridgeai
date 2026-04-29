/**
 * Match Notification Service
 * 约会匹配推送通知服务 - 每日推荐推送、个性化内容、频率控制、时间偏好
 */
import type { MatchScore } from './matchAlgorithm';
export declare enum MatchNotificationType {
    DAILY_RECOMMENDATION = "daily_recommendation",// 每日推荐
    NEW_MATCH = "new_match",// 新匹配
    MATCH_REMINDER = "match_reminder",// 匹配提醒
    FEEDBACK_REQUEST = "feedback_request"
}
export interface MatchNotificationPayload {
    type: MatchNotificationType;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    priority: 'high' | 'normal' | 'low';
}
export interface MatchNotification {
    id: string;
    userId: string;
    type: MatchNotificationType;
    payload: MatchNotificationPayload;
    sentAt: Date;
    readAt?: Date;
}
export interface NotificationPreferences {
    enabled: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    preferredTime?: string;
    maxDailyNotifications: number;
    frequency: 'realtime' | 'batched' | 'daily_digest';
}
/**
 * 发送每日推荐推送通知
 */
export declare function sendDailyRecommendationNotification(userId: string, matchScores: MatchScore[]): Promise<MatchNotification | null>;
/**
 * 发送新匹配通知
 */
export declare function sendNewMatchNotification(userId: string, match: MatchScore): Promise<MatchNotification | null>;
/**
 * 发送反馈请求通知
 */
export declare function sendFeedbackRequestNotification(userId: string): Promise<MatchNotification | null>;
/**
 * 获取用户通知偏好
 */
export declare function getNotificationPreferences(userId: string): NotificationPreferences;
/**
 * 更新用户通知偏好
 */
export declare function updateNotificationPreferences(userId: string, prefs: Partial<NotificationPreferences>): NotificationPreferences;
/**
 * 获取用户的通知列表
 */
export declare function getUserNotifications(userId: string, options?: {
    type?: MatchNotificationType;
    limit?: number;
}): MatchNotification[];
/**
 * 标记通知已读
 */
export declare function markNotificationRead(userId: string, notificationId: string): boolean;
declare const _default: {
    sendDailyRecommendationNotification: typeof sendDailyRecommendationNotification;
    sendNewMatchNotification: typeof sendNewMatchNotification;
    sendFeedbackRequestNotification: typeof sendFeedbackRequestNotification;
    getNotificationPreferences: typeof getNotificationPreferences;
    updateNotificationPreferences: typeof updateNotificationPreferences;
    getUserNotifications: typeof getUserNotifications;
    markNotificationRead: typeof markNotificationRead;
};
export default _default;
//# sourceMappingURL=matchNotificationService.d.ts.map