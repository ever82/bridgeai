/**
 * Task Recommendation Service
 * 任务推荐服务
 */
import { Task, TaskRecommendation, TaskRecommendationRequest, TaskRecommendationPreferences, GeoCoordinates } from '@bridgeai/shared';
/**
 * Get task recommendations for a user
 * 获取用户的任务推荐
 */
export declare function getTaskRecommendations(request: TaskRecommendationRequest): Promise<TaskRecommendation[]>;
/**
 * Get real-time task recommendations
 * 获取实时任务推荐
 */
export declare function getRealtimeRecommendations(userId: string, userLocation: GeoCoordinates): Promise<TaskRecommendation[]>;
/**
 * Save user recommendation preferences
 * 保存用户推荐偏好
 */
export declare function saveUserPreferences(userId: string, preferences: TaskRecommendationPreferences): Promise<void>;
/**
 * Get user recommendation preferences
 * 获取用户推荐偏好
 */
export declare function getUserPreferences(userId: string): Promise<TaskRecommendationPreferences | null>;
/**
 * Record user task interaction
 * 记录用户任务交互
 */
export declare function recordTaskInteraction(userId: string, taskId: string, accepted: boolean): Promise<void>;
/**
 * Get user's accepted tasks
 * 获取用户已接任务
 */
export declare function getUserAcceptedTasks(_userId: string): Promise<Task[]>;
/**
 * Get user's task statistics
 * 获取用户任务统计
 */
export declare function getUserTaskStats(userId: string): Promise<{
    totalAccepted: number;
    totalCompleted: number;
    acceptanceRate: number;
    completionRate: number;
}>;
/**
 * Push notification for recommended task
 * 推送推荐任务通知
 */
export declare function pushRecommendationNotification(userId: string, recommendation: TaskRecommendation): Promise<void>;
/**
 * Subscribe to nearby task updates
 * 订阅附近任务更新
 */
export declare function subscribeToNearbyTasks(userId: string, userLocation: GeoCoordinates, radiusKm: number, _callback: (recommendations: TaskRecommendation[]) => void): () => void;
//# sourceMappingURL=taskRecommendation.d.ts.map