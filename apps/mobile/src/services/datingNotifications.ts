/**
 * Dating Notifications Service (Mobile)
 * 约会推荐通知处理 - 处理推送点击跳转匹配详情
 */

import { apiClient } from './api/client';

// ============================================
// 类型定义
// ============================================

export enum DatingNotificationType {
  DAILY_RECOMMENDATION = 'daily_recommendation',
  NEW_MATCH = 'new_match',
  MATCH_REMINDER = 'match_reminder',
  FEEDBACK_REQUEST = 'feedback_request',
}

export interface DatingNotification {
  id: string;
  type: DatingNotificationType;
  title: string;
  body: string;
  data?: {
    matchCount?: number;
    topMatchScore?: number;
    topMatchHighlights?: string[];
    topMatchProfileId?: string;
    profileId?: string;
    score?: number;
    highlights?: string[];
  };
  sentAt: string;
  readAt?: string;
}

export interface DatingNotificationPreferences {
  enabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  preferredTime?: string;
  maxDailyNotifications: number;
  frequency: 'realtime' | 'batched' | 'daily_digest';
}

// ============================================
// API 调用
// ============================================

/**
 * 获取约会通知列表
 */
export async function getDatingNotifications(limit: number = 20): Promise<DatingNotification[]> {
  const response = await apiClient.get('/dating/notifications', {
    params: { limit },
  });
  return response.data?.notifications ?? [];
}

/**
 * 获取通知偏好设置
 */
export async function getNotificationPreferences(): Promise<DatingNotificationPreferences> {
  const response = await apiClient.get('/dating/notifications/preferences');
  return (
    response.data ?? {
      enabled: true,
      maxDailyNotifications: 3,
      frequency: 'daily_digest',
    }
  );
}

/**
 * 更新通知偏好设置
 */
export async function updateNotificationPreferences(
  prefs: Partial<DatingNotificationPreferences>
): Promise<DatingNotificationPreferences> {
  const response = await apiClient.put('/dating/notifications/preferences', prefs);
  return response.data;
}

/**
 * 标记通知已读
 */
export async function markNotificationRead(notificationId: string): Promise<void> {
  await apiClient.put(`/dating/notifications/${notificationId}/read`);
}

/**
 * 处理推送通知点击 - 返回跳转信息
 */
export function handleNotificationPress(
  notificationData: Record<string, unknown>
): { screen: string; params?: Record<string, unknown> } | null {
  const type = notificationData.type as string;

  switch (type) {
    case DatingNotificationType.DAILY_RECOMMENDATION:
      return {
        screen: 'DatingRecommendations',
        params: {
          highlightProfileId: notificationData.topMatchProfileId,
        },
      };

    case DatingNotificationType.NEW_MATCH:
      return {
        screen: 'DatingRecommendations',
        params: {
          highlightProfileId: notificationData.profileId,
        },
      };

    case DatingNotificationType.MATCH_REMINDER:
      return {
        screen: 'DatingRecommendations',
      };

    case DatingNotificationType.FEEDBACK_REQUEST:
      return {
        screen: 'DatingRecommendations',
        params: {
          showFeedback: true,
        },
      };

    default:
      return null;
  }
}

export default {
  getDatingNotifications,
  getNotificationPreferences,
  updateNotificationPreferences,
  markNotificationRead,
  handleNotificationPress,
};
