/**
 * Task Types for VisionShare
 * VisionShare场景任务类型定义
 */
import { GeoCoordinates, Location } from './location';
export type TaskStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';
export declare const TASK_STATUS_LABELS: Record<TaskStatus, {
    zh: string;
    en: string;
}>;
export declare const TASK_STATUS_COLORS: Record<TaskStatus, string>;
export type TaskType = 'photography' | 'video' | 'design' | 'artwork' | 'modeling' | 'editing' | 'other';
export declare const TASK_TYPE_LABELS: Record<TaskType, {
    zh: string;
    en: string;
}>;
export type TaskPriority = 'urgent' | 'high' | 'normal' | 'low';
export declare const TASK_PRIORITY_LABELS: Record<TaskPriority, {
    zh: string;
    en: string;
    color: string;
}>;
export interface Task {
    id: string;
    title: string;
    description: string;
    type: TaskType;
    status: TaskStatus;
    priority: TaskPriority;
    publisherId: string;
    publisherName: string;
    publisherAvatar?: string;
    publisherCreditScore: number;
    location: Location;
    coordinates: GeoCoordinates;
    address: string;
    budgetMin: number;
    budgetMax: number;
    currency: string;
    publishTime: Date;
    deadline?: Date;
    estimatedDuration?: number;
    images?: string[];
    tags?: string[];
    acceptorId?: string;
    acceptorName?: string;
    acceptedAt?: Date;
    startedAt?: Date;
    completedAt?: Date;
    matchScore?: number;
    viewCount: number;
    inquiryCount: number;
    applicationCount: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface TaskFilter {
    distanceRange?: 1 | 5 | 10 | 0;
    budgetMin?: number;
    budgetMax?: number;
    types?: TaskType[];
    publishTimeRange?: 'today' | 'week' | 'month' | 'all';
    sortBy?: 'distance' | 'time' | 'budget' | 'match';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
}
export interface TaskSearchRequest {
    userLocation: GeoCoordinates;
    filter?: TaskFilter;
    keyword?: string;
}
export interface TaskSearchResponse {
    tasks: Task[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}
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
    errorCode?: 'INSUFFICIENT_CREDIT' | 'INSUFFICIENT_POINTS' | 'TOO_FAR' | 'ALREADY_ACCEPTED' | 'TASK_CANCELLED' | 'ALREADY_ACCEPTED_BY_OTHER' | 'RATE_LIMITED';
}
export interface TaskStatusUpdate {
    taskId: string;
    status: TaskStatus;
    updatedBy: string;
    reason?: string;
}
export interface UserTaskSummary {
    userId: string;
    acceptedTasks: Task[];
    inProgressTasks: Task[];
    completedTasks: Task[];
    cancelledTasks: Task[];
    totalAccepted: number;
    totalCompleted: number;
    totalEarned: number;
    acceptanceRate: number;
    completionRate: number;
    averageRating: number;
}
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
export type TaskEventType = 'task_created' | 'task_updated' | 'task_accepted' | 'task_started' | 'task_completed' | 'task_cancelled' | 'task_disputed' | 'task_recommended';
export interface TaskEvent {
    id: string;
    type: TaskEventType;
    taskId: string;
    userId?: string;
    data?: Record<string, any>;
    createdAt: Date;
}
export declare const DEFAULT_TASK_FILTER: TaskFilter;
export declare const DISTANCE_RANGE_OPTIONS: {
    value: number;
    label: string;
    labelZh: string;
}[];
export declare const SORT_OPTIONS: {
    value: string;
    label: string;
    labelZh: string;
}[];
export declare const PUBLISH_TIME_OPTIONS: {
    value: string;
    label: string;
    labelZh: string;
}[];
//# sourceMappingURL=task.d.ts.map