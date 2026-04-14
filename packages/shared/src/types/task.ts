/**
 * Task Types for VisionShare
 * VisionShare场景任务类型定义
 */

import { GeoCoordinates, Location, EARTH_RADIUS_KM } from './location';

// ============================================
// Task Status
// ============================================

export type TaskStatus =
  | 'pending'      // 待接单
  | 'accepted'     // 已接单
  | 'in_progress'  // 进行中
  | 'completed'    // 已完成
  | 'cancelled'    // 已取消
  | 'disputed';    // 申诉中

export const TASK_STATUS_LABELS: Record<TaskStatus, { zh: string; en: string }> = {
  pending: { zh: '待接单', en: 'Pending' },
  accepted: { zh: '已接单', en: 'Accepted' },
  in_progress: { zh: '进行中', en: 'In Progress' },
  completed: { zh: '已完成', en: 'Completed' },
  cancelled: { zh: '已取消', en: 'Cancelled' },
  disputed: { zh: '申诉中', en: 'Disputed' },
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  pending: '#8C8C8C',
  accepted: '#1890FF',
  in_progress: '#FAAD14',
  completed: '#52C41A',
  cancelled: '#FF4D4F',
  disputed: '#722ED1',
};

// ============================================
// Task Types
// ============================================

export type TaskType =
  | 'photography'      // 摄影
  | 'video'            // 视频拍摄
  | 'design'           // 设计
  | 'artwork'          // 艺术作品
  | 'modeling'         // 模特
  | 'editing'          // 后期编辑
  | 'other';           // 其他

export const TASK_TYPE_LABELS: Record<TaskType, { zh: string; en: string }> = {
  photography: { zh: '摄影', en: 'Photography' },
  video: { zh: '视频拍摄', en: 'Video Shooting' },
  design: { zh: '设计', en: 'Design' },
  artwork: { zh: '艺术作品', en: 'Artwork' },
  modeling: { zh: '模特', en: 'Modeling' },
  editing: { zh: '后期编辑', en: 'Editing' },
  other: { zh: '其他', en: 'Other' },
};

// ============================================
// Task Priority
// ============================================

export type TaskPriority = 'urgent' | 'high' | 'normal' | 'low';

export const TASK_PRIORITY_LABELS: Record<TaskPriority, { zh: string; en: string; color: string }> = {
  urgent: { zh: '紧急', en: 'Urgent', color: '#FF4D4F' },
  high: { zh: '高', en: 'High', color: '#FF7A45' },
  normal: { zh: '普通', en: 'Normal', color: '#FFA940' },
  low: { zh: '低', en: 'Low', color: '#73D13D' },
};

// ============================================
// Task Entity
// ============================================

export interface Task {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;

  // 发布者信息
  publisherId: string;
  publisherName: string;
  publisherAvatar?: string;
  publisherCreditScore: number;

  // 位置信息
  location: Location;
  coordinates: GeoCoordinates;
  address: string;

  // 预算信息
  budgetMin: number;
  budgetMax: number;
  currency: string;

  // 时间信息
  publishTime: Date;
  deadline?: Date;
  estimatedDuration?: number; // 预估时长（分钟）

  // 图片
  images?: string[];

  // 标签
  tags?: string[];

  // 接单信息
  acceptorId?: string;
  acceptorName?: string;
  acceptedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;

  // 匹配度评分 (推荐用)
  matchScore?: number;

  // 统计
  viewCount: number;
  inquiryCount: number;
  applicationCount: number;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Task Filter
// ============================================

export interface TaskFilter {
  // 距离筛选
  distanceRange?: 1 | 5 | 10 | 0; // 0 表示全城

  // 预算筛选
  budgetMin?: number;
  budgetMax?: number;

  // 任务类型
  types?: TaskType[];

  // 发布时间
  publishTimeRange?: 'today' | 'week' | 'month' | 'all';

  // 排序方式
  sortBy?: 'distance' | 'time' | 'budget' | 'match';
  sortOrder?: 'asc' | 'desc';

  // 分页
  page?: number;
  limit?: number;
}

// ============================================
// Task Search Request/Response
// ============================================

export interface TaskSearchRequest {
  // 用户当前位置
  userLocation: GeoCoordinates;

  // 筛选条件
  filter?: TaskFilter;

  // 搜索关键词
  keyword?: string;
}

export interface TaskSearchResponse {
  tasks: Task[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ============================================
// Nearby Task Query
// ============================================

export interface NearbyTaskQuery {
  latitude: number;
  longitude: number;
  radiusKm: number;
  filter?: TaskFilter;
}

export interface NearbyTaskResult {
  task: Task;
  distanceKm: number;
  estimatedArrivalMinutes?: number;
}

// ============================================
// Task Recommendation
// ============================================

export interface TaskRecommendation {
  task: Task;
  matchScore: number;
  matchReasons: string[];
  distanceKm: number;
}

export interface TaskRecommendationRequest {
  userId: string;
  userLocation: GeoCoordinates;
  preferences?: TaskRecommendationPreferences;
  limit?: number;
}

export interface TaskRecommendationPreferences {
  preferredTypes?: TaskType[];
  minBudget?: number;
  maxDistanceKm?: number;
  excludeTaskIds?: string[];
}

// ============================================
// Task Acceptance
// ============================================

export interface TaskAcceptRequest {
  taskId: string;
  userId: string;
  userLocation: GeoCoordinates;
  message?: string;
}

export interface TaskAcceptResponse {
  success: boolean;
  task?: Task;
  error?: string;
  errorCode?:
    | 'INSUFFICIENT_CREDIT'
    | 'INSUFFICIENT_POINTS'
    | 'TOO_FAR'
    | 'ALREADY_ACCEPTED'
    | 'TASK_CANCELLED'
    | 'ALREADY_ACCEPTED_BY_OTHER'
    | 'RATE_LIMITED';
}

// ============================================
// Task Status Update
// ============================================

export interface TaskStatusUpdate {
  taskId: string;
  status: TaskStatus;
  updatedBy: string;
  reason?: string;
}

// ============================================
// User Task Summary
// ============================================

export interface UserTaskSummary {
  userId: string;
  // 作为供给方
  acceptedTasks: Task[];
  inProgressTasks: Task[];
  completedTasks: Task[];
  cancelledTasks: Task[];
  totalAccepted: number;
  totalCompleted: number;
  totalEarned: number;

  // 统计
  acceptanceRate: number;
  completionRate: number;
  averageRating: number;
}

// ============================================
// Task Review
// ============================================

export interface TaskReview {
  id: string;
  taskId: string;
  reviewerId: string;
  reviewerName: string;
  reviewerAvatar?: string;
  rating: number;
  content: string;
  tags?: string[];
  createdAt: Date;
}

// ============================================
// Task Notification
// ============================================

export interface TaskNotification {
  id: string;
  type: 'recommendation' | 'status_change' | 'reminder' | 'message';
  userId: string;
  taskId?: string;
  title: string;
  content: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: Date;
}

// ============================================
// Task Eligibility Check
// ============================================

export interface TaskEligibilityResult {
  eligible: boolean;
  reasons: string[];
  requiredCreditScore?: number;
  currentCreditScore?: number;
  requiredPoints?: number;
  currentPoints?: number;
  maxDistanceKm?: number;
  currentDistanceKm?: number;
}

// ============================================
// Task Event
// ============================================

export type TaskEventType =
  | 'task_created'
  | 'task_updated'
  | 'task_accepted'
  | 'task_started'
  | 'task_completed'
  | 'task_cancelled'
  | 'task_disputed'
  | 'task_recommended';

export interface TaskEvent {
  id: string;
  type: TaskEventType;
  taskId: string;
  userId?: string;
  data?: Record<string, any>;
  createdAt: Date;
}

// ============================================
// Constants
// ============================================

export const DEFAULT_TASK_FILTER: TaskFilter = {
  distanceRange: 5,
  budgetMin: 0,
  budgetMax: 10000,
  types: [],
  publishTimeRange: 'week',
  sortBy: 'distance',
  sortOrder: 'asc',
  page: 1,
  limit: 20,
};

export const DISTANCE_RANGE_OPTIONS = [
  { value: 1, label: '1km', labelZh: '1公里' },
  { value: 5, label: '5km', labelZh: '5公里' },
  { value: 10, label: '10km', labelZh: '10公里' },
  { value: 0, label: 'City', labelZh: '全城' },
];

export const SORT_OPTIONS = [
  { value: 'distance', label: 'Distance', labelZh: '距离最近' },
  { value: 'time', label: 'Time', labelZh: '最新发布' },
  { value: 'budget', label: 'Budget', labelZh: '预算最高' },
  { value: 'match', label: 'Match', labelZh: '匹配度' },
];

export const PUBLISH_TIME_OPTIONS = [
  { value: 'today', label: 'Today', labelZh: '今天' },
  { value: 'week', label: 'This Week', labelZh: '本周' },
  { value: 'month', label: 'This Month', labelZh: '本月' },
  { value: 'all', label: 'All Time', labelZh: '全部' },
];

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  coord1: GeoCoordinates,
  coord2: GeoCoordinates
): number {
  const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

  const lat1Rad = toRadians(coord1.latitude);
  const lat2Rad = toRadians(coord2.latitude);
  const deltaLatRad = toRadians(coord2.latitude - coord1.latitude);
  const deltaLngRad = toRadians(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLngRad / 2) *
      Math.sin(deltaLngRad / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}
