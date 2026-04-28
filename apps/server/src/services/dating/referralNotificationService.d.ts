/**
 * Referral Notification Service
 * 引荐结果通知服务
 *
 * 发送各种引荐相关的通知：
 * - 对方已决策提醒（不透露具体选择）
 * - 双方同意成功通知
 * - 引荐失败通知（婉转化表达）
 * - 新真人消息提醒
 * - 决策即将超时提醒
 */
import { ReferralRecord } from '../../models/ReferralRecord';
import { MutualConsent } from '../../models/MutualConsent';
export declare enum NotificationType {
    OTHER_USER_DECIDED = "other_user_decided",// 对方已决策
    MUTUAL_ACCEPT = "mutual_accept",// 双方同意成功
    SINGLE_ACCEPT = "single_accept",// 单方同意
    MUTUAL_REJECT = "mutual_reject",// 双方拒绝
    SINGLE_REJECT = "single_reject",// 单方拒绝
    TIMEOUT_WARNING = "timeout_warning",// 即将超时提醒
    TIMEOUT_EXPIRED = "timeout_expired",// 已超时
    NEW_HUMAN_MESSAGE = "new_human_message",// 新真人消息
    FIRST_MESSAGE = "first_message",// 第一条消息提示
    REFERRAL_CANCELLED = "referral_cancelled",// 引荐取消
    SYSTEM_MAINTENANCE = "system_maintenance"
}
export declare enum NotificationChannel {
    PUSH = "push",
    SMS = "sms",
    EMAIL = "email",
    IN_APP = "in_app"
}
export interface NotificationPayload {
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, any>;
    priority: 'high' | 'normal' | 'low';
    channels: NotificationChannel[];
}
export interface ReferralNotification {
    id: string;
    userId: string;
    referralId: string;
    type: NotificationType;
    payload: NotificationPayload;
    sentAt: Date;
    readAt?: Date;
    channelResults: Record<NotificationChannel, boolean>;
}
/**
 * 发送引荐通知
 */
export declare function sendReferralNotification(referral: ReferralRecord, consent: MutualConsent): Promise<void>;
/**
 * 发送对方已决策通知
 * 注意：不透露具体选择
 */
export declare function sendOtherUserDecidedNotification(referral: ReferralRecord, decidedUserId: string): Promise<void>;
/**
 * 发送双方同意成功通知
 */
export declare function sendMutualAcceptNotification(referral: ReferralRecord, chatRoomId: string): Promise<void>;
/**
 * 发送单方同意通知
 */
export declare function sendSingleAcceptNotification(referral: ReferralRecord, _acceptedUserId: string): Promise<void>;
/**
 * 发送婉转化拒绝通知
 */
export declare function sendRejectionNotification(referral: ReferralRecord, mutual: boolean): Promise<void>;
/**
 * 发送即将超时提醒
 */
export declare function sendTimeoutWarningNotification(referral: ReferralRecord, consent: MutualConsent, hoursRemaining: number): Promise<void>;
/**
 * 发送已超时通知
 */
export declare function sendTimeoutExpiredNotification(referral: ReferralRecord): Promise<void>;
/**
 * 发送新真人消息提醒
 */
export declare function sendNewHumanMessageNotification(referralId: string, recipientUserId: string, senderName: string, messagePreview: string): Promise<void>;
/**
 * 发送取消通知
 */
export declare function sendCancelNotification(referral: ReferralRecord, cancelledBy: string): Promise<void>;
/**
 * 获取用户通知列表
 */
export declare function getUserNotifications(userId: string, unreadOnly?: boolean): Promise<ReferralNotification[]>;
/**
 * 标记通知已读
 */
export declare function markNotificationAsRead(notificationId: string): Promise<void>;
/**
 * 获取未读通知数量
 */
export declare function getUnreadNotificationCount(userId: string): Promise<number>;
declare const _default: {
    sendReferralNotification: typeof sendReferralNotification;
    sendOtherUserDecidedNotification: typeof sendOtherUserDecidedNotification;
    sendMutualAcceptNotification: typeof sendMutualAcceptNotification;
    sendSingleAcceptNotification: typeof sendSingleAcceptNotification;
    sendRejectionNotification: typeof sendRejectionNotification;
    sendTimeoutWarningNotification: typeof sendTimeoutWarningNotification;
    sendTimeoutExpiredNotification: typeof sendTimeoutExpiredNotification;
    sendNewHumanMessageNotification: typeof sendNewHumanMessageNotification;
    sendCancelNotification: typeof sendCancelNotification;
    getUserNotifications: typeof getUserNotifications;
    markNotificationAsRead: typeof markNotificationAsRead;
    getUnreadNotificationCount: typeof getUnreadNotificationCount;
};
export default _default;
//# sourceMappingURL=referralNotificationService.d.ts.map