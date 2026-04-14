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

import { ReferralRecord, ReferralStatus } from '../../models/ReferralRecord';
import { MutualConsent, ConsentStatus, ReferralResult } from '../../models/MutualConsent';

export enum NotificationType {
  // 决策相关
  OTHER_USER_DECIDED = 'other_user_decided',    // 对方已决策
  MUTUAL_ACCEPT = 'mutual_accept',              // 双方同意成功
  SINGLE_ACCEPT = 'single_accept',              // 单方同意
  MUTUAL_REJECT = 'mutual_reject',              // 双方拒绝
  SINGLE_REJECT = 'single_reject',              // 单方拒绝

  // 超时相关
  TIMEOUT_WARNING = 'timeout_warning',          // 即将超时提醒
  TIMEOUT_EXPIRED = 'timeout_expired',          // 已超时

  // 消息相关
  NEW_HUMAN_MESSAGE = 'new_human_message',      // 新真人消息
  FIRST_MESSAGE = 'first_message',              // 第一条消息提示

  // 系统相关
  REFERRAL_CANCELLED = 'referral_cancelled',    // 引荐取消
  SYSTEM_MAINTENANCE = 'system_maintenance',    // 系统维护
}

export enum NotificationChannel {
  PUSH = 'push',
  SMS = 'sms',
  EMAIL = 'email',
  IN_APP = 'in_app',
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

// 通知模板
const notificationTemplates: Record<NotificationType, {
  title: string;
  body: string;
  priority: 'high' | 'normal' | 'low';
  channels: NotificationChannel[];
}> = {
  [NotificationType.OTHER_USER_DECIDED]: {
    title: '新动态',
    body: '对方已对引荐做出了回应，快去看看吧！',
    priority: 'high',
    channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
  },
  [NotificationType.MUTUAL_ACCEPT]: {
    title: '🎉 匹配成功！',
    body: '恭喜！你们双方已同意交换联系方式，真人聊天已开启。',
    priority: 'high',
    channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP, NotificationChannel.SMS],
  },
  [NotificationType.SINGLE_ACCEPT]: {
    title: '引荐结果',
    body: '这次引荐的结果出来了。虽然未能匹配成功，但别灰心，更好的缘分在前方等你。',
    priority: 'normal',
    channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
  },
  [NotificationType.MUTUAL_REJECT]: {
    title: '引荐结果',
    body: '这次引荐未能成功，但这只是缘分未到。我们会继续为你寻找更合适的对象。',
    priority: 'normal',
    channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
  },
  [NotificationType.SINGLE_REJECT]: {
    title: '引荐结果',
    body: '这次引荐未能成功。有时候缘分需要一点时间，我们会继续为你寻找更合适的人。',
    priority: 'normal',
    channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
  },
  [NotificationType.TIMEOUT_WARNING]: {
    title: '决策提醒',
    body: '你对引荐的决策即将过期，请尽快做出选择。',
    priority: 'high',
    channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
  },
  [NotificationType.TIMEOUT_EXPIRED]: {
    title: '引荐过期',
    body: '引荐决策时间已过期。如果仍有意向，可以重新发起引荐请求。',
    priority: 'normal',
    channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
  },
  [NotificationType.NEW_HUMAN_MESSAGE]: {
    title: '新消息',
    body: '你收到了一条新消息',
    priority: 'normal',
    channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
  },
  [NotificationType.FIRST_MESSAGE]: {
    title: '开启对话',
    body: '你们已经成功匹配，可以开始聊天了！建议从共同的兴趣爱好聊起。',
    priority: 'normal',
    channels: [NotificationChannel.IN_APP],
  },
  [NotificationType.REFERRAL_CANCELLED]: {
    title: '引荐取消',
    body: '对方取消了这次引荐。',
    priority: 'normal',
    channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
  },
  [NotificationType.SYSTEM_MAINTENANCE]: {
    title: '系统维护',
    body: '系统即将进行维护，可能会影响引荐功能的使用。',
    priority: 'low',
    channels: [NotificationChannel.IN_APP],
  },
};

// 模拟通知存储
const notificationStore: ReferralNotification[] = [];

/**
 * 发送引荐通知
 */
export async function sendReferralNotification(
  referral: ReferralRecord,
  consent: MutualConsent
): Promise<void> {
  // 发送引荐邀请通知给双方
  const template = notificationTemplates[NotificationType.OTHER_USER_DECIDED];

  await Promise.all([
    sendNotification(referral.userAId, referral.id, {
      ...template,
      type: NotificationType.OTHER_USER_DECIDED,
      data: {
        referralId: referral.id,
        consentId: consent.id,
        matchScore: referral.matchData.matchScore,
        expiresAt: consent.expiresAt.toISOString(),
      },
    }),
    sendNotification(referral.userBId, referral.id, {
      ...template,
      type: NotificationType.OTHER_USER_DECIDED,
      data: {
        referralId: referral.id,
        consentId: consent.id,
        matchScore: referral.matchData.matchScore,
        expiresAt: consent.expiresAt.toISOString(),
      },
    }),
  ]);
}

/**
 * 发送对方已决策通知
 * 注意：不透露具体选择
 */
export async function sendOtherUserDecidedNotification(
  referral: ReferralRecord,
  decidedUserId: string
): Promise<void> {
  const otherUserId = decidedUserId === referral.userAId
    ? referral.userBId
    : referral.userAId;

  const template = notificationTemplates[NotificationType.OTHER_USER_DECIDED];

  await sendNotification(otherUserId, referral.id, {
    ...template,
    type: NotificationType.OTHER_USER_DECIDED,
    data: {
      referralId: referral.id,
      hint: '对方已做出选择，快去看看吧！',
    },
  });
}

/**
 * 发送双方同意成功通知
 */
export async function sendMutualAcceptNotification(
  referral: ReferralRecord,
  chatRoomId: string
): Promise<void> {
  const template = notificationTemplates[NotificationType.MUTUAL_ACCEPT];

  await Promise.all([
    sendNotification(referral.userAId, referral.id, {
      ...template,
      body: `${template.body} 点击立即进入聊天房间。`,
      data: {
        referralId: referral.id,
        chatRoomId,
        otherUserId: referral.userBId,
      },
    }),
    sendNotification(referral.userBId, referral.id, {
      ...template,
      body: `${template.body} 点击立即进入聊天房间。`,
      data: {
        referralId: referral.id,
        chatRoomId,
        otherUserId: referral.userAId,
      },
    }),
  ]);

  // 发送第一条消息提示
  await sendFirstMessageNotification(referral, chatRoomId);
}

/**
 * 发送单方同意通知
 */
export async function sendSingleAcceptNotification(
  referral: ReferralRecord,
  acceptedUserId: string
): Promise<void> {
  const template = notificationTemplates[NotificationType.SINGLE_ACCEPT];

  await Promise.all([
    sendNotification(referral.userAId, referral.id, {
      ...template,
      data: { referralId: referral.id },
    }),
    sendNotification(referral.userBId, referral.id, {
      ...template,
      data: { referralId: referral.id },
    }),
  ]);
}

/**
 * 发送婉转化拒绝通知
 */
export async function sendRejectionNotification(
  referral: ReferralRecord,
  mutual: boolean
): Promise<void> {
  const template = mutual
    ? notificationTemplates[NotificationType.MUTUAL_REJECT]
    : notificationTemplates[NotificationType.SINGLE_REJECT];

  await Promise.all([
    sendNotification(referral.userAId, referral.id, {
      ...template,
      data: { referralId: referral.id },
    }),
    sendNotification(referral.userBId, referral.id, {
      ...template,
      data: { referralId: referral.id },
    }),
  ]);
}

/**
 * 发送即将超时提醒
 */
export async function sendTimeoutWarningNotification(
  referral: ReferralRecord,
  consent: MutualConsent,
  hoursRemaining: number
): Promise<void> {
  const template = notificationTemplates[NotificationType.TIMEOUT_WARNING];

  const usersToNotify: string[] = [];

  if (consent.userAConsent.status === ConsentStatus.PENDING) {
    usersToNotify.push(referral.userAId);
  }
  if (consent.userBConsent.status === ConsentStatus.PENDING) {
    usersToNotify.push(referral.userBId);
  }

  await Promise.all(usersToNotify.map(userId =>
    sendNotification(userId, referral.id, {
      ...template,
      body: `${template.body} 剩余时间：约${Math.ceil(hoursRemaining)}小时。`,
      data: {
        referralId: referral.id,
        hoursRemaining,
      },
    })
  ));
}

/**
 * 发送已超时通知
 */
export async function sendTimeoutExpiredNotification(
  referral: ReferralRecord
): Promise<void> {
  const template = notificationTemplates[NotificationType.TIMEOUT_EXPIRED];

  await Promise.all([
    sendNotification(referral.userAId, referral.id, {
      ...template,
      data: { referralId: referral.id },
    }),
    sendNotification(referral.userBId, referral.id, {
      ...template,
      data: { referralId: referral.id },
    }),
  ]);
}

/**
 * 发送新真人消息提醒
 */
export async function sendNewHumanMessageNotification(
  referralId: string,
  recipientUserId: string,
  senderName: string,
  messagePreview: string
): Promise<void> {
  const template = notificationTemplates[NotificationType.NEW_HUMAN_MESSAGE];

  await sendNotification(recipientUserId, referralId, {
    ...template,
    title: `${senderName}`,
    body: messagePreview.length > 50
      ? messagePreview.substring(0, 50) + '...'
      : messagePreview,
    data: {
      referralId,
      senderName,
    },
  });
}

/**
 * 发送第一条消息提示
 */
async function sendFirstMessageNotification(
  referral: ReferralRecord,
  chatRoomId: string
): Promise<void> {
  const template = notificationTemplates[NotificationType.FIRST_MESSAGE];

  // 只在应用内发送
  await Promise.all([
    sendInAppNotification(referral.userAId, {
      ...template,
      data: { referralId: referral.id, chatRoomId },
    }),
    sendInAppNotification(referral.userBId, {
      ...template,
      data: { referralId: referral.id, chatRoomId },
    }),
  ]);
}

/**
 * 发送取消通知
 */
export async function sendCancelNotification(
  referral: ReferralRecord,
  cancelledBy: string
): Promise<void> {
  const otherUserId = cancelledBy === referral.userAId
    ? referral.userBId
    : referral.userAId;

  const template = notificationTemplates[NotificationType.REFERRAL_CANCELLED];

  await sendNotification(otherUserId, referral.id, {
    ...template,
    data: { referralId: referral.id },
  });
}

/**
 * 通用发送通知函数
 */
async function sendNotification(
  userId: string,
  referralId: string,
  payload: Omit<NotificationPayload, 'channels'> & { channels: NotificationChannel[] }
): Promise<void> {
  // 创建通知记录
  const notification: ReferralNotification = {
    id: generateNotificationId(),
    userId,
    referralId,
    type: payload.type,
    payload: payload as NotificationPayload,
    sentAt: new Date(),
    channelResults: {} as Record<NotificationChannel, boolean>,
  };

  // 发送各个渠道
  for (const channel of payload.channels) {
    try {
      await sendToChannel(userId, channel, payload);
      notification.channelResults[channel] = true;
    } catch (error) {
      console.error(`Failed to send notification to ${channel}:`, error);
      notification.channelResults[channel] = false;
    }
  }

  notificationStore.push(notification);
}

/**
 * 发送到特定渠道
 */
async function sendToChannel(
  userId: string,
  channel: NotificationChannel,
  payload: Omit<NotificationPayload, 'channels'>
): Promise<void> {
  switch (channel) {
    case NotificationChannel.PUSH:
      // TODO: 调用推送服务
      console.log(`[PUSH] To ${userId}: ${payload.title} - ${payload.body}`);
      break;

    case NotificationChannel.SMS:
      // TODO: 调用短信服务
      console.log(`[SMS] To ${userId}: ${payload.title} - ${payload.body}`);
      break;

    case NotificationChannel.EMAIL:
      // TODO: 调用邮件服务
      console.log(`[EMAIL] To ${userId}: ${payload.title}`);
      break;

    case NotificationChannel.IN_APP:
      await sendInAppNotification(userId, payload);
      break;
  }
}

/**
 * 发送应用内通知
 */
async function sendInAppNotification(
  userId: string,
  payload: Omit<NotificationPayload, 'channels'>
): Promise<void> {
  // TODO: 存储到应用内通知收件箱
  // TODO: 通过WebSocket推送实时通知
  console.log(`[IN_APP] To ${userId}: ${payload.title} - ${payload.body}`);
}

/**
 * 获取用户通知列表
 */
export async function getUserNotifications(
  userId: string,
  unreadOnly?: boolean
): Promise<ReferralNotification[]> {
  return notificationStore
    .filter(n => n.userId === userId)
    .filter(n => !unreadOnly || !n.readAt)
    .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
}

/**
 * 标记通知已读
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<void> {
  const notification = notificationStore.find(n => n.id === notificationId);
  if (notification) {
    notification.readAt = new Date();
  }
}

/**
 * 获取未读通知数量
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return notificationStore.filter(
    n => n.userId === userId && !n.readAt
  ).length;
}

/**
 * 生成通知ID
 */
function generateNotificationId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export default {
  sendReferralNotification,
  sendOtherUserDecidedNotification,
  sendMutualAcceptNotification,
  sendSingleAcceptNotification,
  sendRejectionNotification,
  sendTimeoutWarningNotification,
  sendTimeoutExpiredNotification,
  sendNewHumanMessageNotification,
  sendCancelNotification,
  getUserNotifications,
  markNotificationAsRead,
  getUnreadNotificationCount,
};
