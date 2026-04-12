/**
 * 通知中心 API 服务 (Notification API Service)
 * 与服务器通知 API 通信
 */

import { apiClient } from './api';

// 通知类型
export enum NotificationType {
  MATCH_NEW = 'MATCH_NEW',
  MATCH_ACCEPTED = 'MATCH_ACCEPTED',
  MATCH_REJECTED = 'MATCH_REJECTED',
  MATCH_COMPLETED = 'MATCH_COMPLETED',
  MESSAGE_NEW = 'MESSAGE_NEW',
  RATING_RECEIVED = 'RATING_RECEIVED',
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',
  PROMOTION = 'PROMOTION',
  REMINDER = 'REMINDER',
}

// 通知状态
export enum NotificationStatus {
  UNREAD = 'UNREAD',
  READ = 'READ',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED',
}

// 通知渠道
export enum NotificationChannel {
  IN_APP = 'IN_APP',
  PUSH = 'PUSH',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
}

// 优先级
export enum PriorityLevel {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

// 通知项
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  data?: Record<string, any>;
  imageUrl?: string;
  actionUrl?: string;
  category?: string;
  priority: PriorityLevel;
  channel: NotificationChannel;
  status: NotificationStatus;
  sentAt?: string;
  readAt?: string;
  createdAt: string;
  deliveries?: NotificationDelivery[];
}

// 通知投递记录
export interface NotificationDelivery {
  id: string;
  channel: NotificationChannel;
  status: string;
  sentAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  errorMessage?: string;
  retryCount: number;
}

// 通知分类
export interface NotificationCategory {
  id: string;
  name: string;
  icon: string;
  unreadCount: number;
}

// 分页通知列表
export interface PaginatedNotifications {
  items: Notification[];
  total: number;
  unreadCount: number;
  hasMore: boolean;
}

// 通知统计
export interface NotificationStats {
  total: number;
  unread: number;
  read: number;
  archived: number;
  byType: Record<string, number>;
  byCategory: Record<string, number>;
}

// 查询选项
export interface NotificationQueryOptions {
  status?: NotificationStatus | NotificationStatus[];
  type?: NotificationType | NotificationType[];
  category?: string;
  limit?: number;
  offset?: number;
}

/**
 * 获取通知列表
 */
export async function getNotifications(
  options: NotificationQueryOptions = {}
): Promise<PaginatedNotifications> {
  const params = new URLSearchParams();

  if (options.status) {
    if (Array.isArray(options.status)) {
      options.status.forEach(s => params.append('status', s));
    } else {
      params.append('status', options.status);
    }
  }

  if (options.type) {
    if (Array.isArray(options.type)) {
      options.type.forEach(t => params.append('type', t));
    } else {
      params.append('type', options.type);
    }
  }

  if (options.category) {
    params.append('category', options.category);
  }

  params.append('limit', String(options.limit || 20));
  params.append('offset', String(options.offset || 0));

  const response = await apiClient.get(`/notifications?${params.toString()}`);
  return response.data;
}

/**
 * 获取未读通知数量
 */
export async function getUnreadCount(category?: string): Promise<number> {
  const params = category ? `?category=${category}` : '';
  const response = await apiClient.get(`/notifications/unread-count${params}`);
  return response.data.count;
}

/**
 * 获取通知分类
 */
export async function getNotificationCategories(): Promise<NotificationCategory[]> {
  const response = await apiClient.get('/notifications/categories');
  return response.data;
}

/**
 * 获取通知统计
 */
export async function getNotificationStats(): Promise<NotificationStats> {
  const response = await apiClient.get('/notifications/stats');
  return response.data;
}

/**
 * 获取最新通知
 */
export async function getLatestNotifications(limit: number = 5): Promise<Notification[]> {
  const response = await apiClient.get(`/notifications/latest?limit=${limit}`);
  return response.data;
}

/**
 * 搜索通知
 */
export async function searchNotifications(
  keyword: string,
  options: { limit?: number; offset?: number } = {}
): Promise<PaginatedNotifications> {
  const params = new URLSearchParams();
  params.append('q', keyword);
  params.append('limit', String(options.limit || 20));
  params.append('offset', String(options.offset || 0));

  const response = await apiClient.get(`/notifications/search?${params.toString()}`);
  return response.data;
}

/**
 * 获取通知详情
 */
export async function getNotificationDetail(id: string): Promise<Notification> {
  const response = await apiClient.get(`/notifications/${id}`);
  return response.data;
}

/**
 * 标记通知为已读
 */
export async function markAsRead(id: string): Promise<boolean> {
  try {
    const response = await apiClient.post(`/notifications/${id}/read`);
    return response.success;
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    return false;
  }
}

/**
 * 批量标记为已读
 */
export async function markMultipleAsRead(ids: string[]): Promise<number> {
  try {
    const response = await apiClient.post('/notifications/batch-read', { ids });
    return response.data.markedCount;
  } catch (error) {
    console.error('Failed to mark notifications as read:', error);
    return 0;
  }
}

/**
 * 标记所有通知为已读
 */
export async function markAllAsRead(): Promise<number> {
  try {
    const response = await apiClient.post('/notifications/read-all');
    return response.data.markedCount;
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
    return 0;
  }
}

/**
 * 归档通知
 */
export async function archiveNotification(id: string): Promise<boolean> {
  try {
    const response = await apiClient.post(`/notifications/${id}/archive`);
    return response.success;
  } catch (error) {
    console.error('Failed to archive notification:', error);
    return false;
  }
}

/**
 * 批量归档通知
 */
export async function archiveMultiple(ids: string[]): Promise<number> {
  try {
    const response = await apiClient.post('/notifications/batch-archive', { ids });
    return response.data.archivedCount;
  } catch (error) {
    console.error('Failed to archive notifications:', error);
    return 0;
  }
}

/**
 * 删除通知
 */
export async function deleteNotification(id: string): Promise<boolean> {
  try {
    const response = await apiClient.delete(`/notifications/${id}`);
    return response.success;
  } catch (error) {
    console.error('Failed to delete notification:', error);
    return false;
  }
}

/**
 * 批量删除通知
 */
export async function deleteMultiple(ids: string[]): Promise<number> {
  try {
    const response = await apiClient.post('/notifications/batch-delete', { ids });
    return response.data.deletedCount;
  } catch (error) {
    console.error('Failed to delete notifications:', error);
    return 0;
  }
}

/**
 * 清理过期通知
 */
export async function cleanupNotifications(
  type: 'expired' | 'deleted' = 'expired',
  olderThanDays?: number
): Promise<number> {
  try {
    const body: any = { type };
    if (olderThanDays) {
      body.olderThanDays = olderThanDays;
    }
    const response = await apiClient.post('/notifications/cleanup', body);
    return response.data.cleanedCount;
  } catch (error) {
    console.error('Failed to cleanup notifications:', error);
    return 0;
  }
}
