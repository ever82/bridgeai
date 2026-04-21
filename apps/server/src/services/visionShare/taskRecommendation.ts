/**
 * Task Recommendation Service
 * 任务推荐服务
 */

import {
  Task,
  TaskRecommendation,
  TaskRecommendationRequest,
  TaskRecommendationPreferences,
  GeoCoordinates,
  calculateDistance,
} from '@bridgeai/shared';

import { logger } from '../../utils/logger';

import { getNearbyTasks } from './taskFilter';

// User preferences cache
const userPreferencesCache: Map<string, TaskRecommendationPreferences> = new Map();

// User task history (for recommendation learning)
const userTaskHistory: Map<string, { taskId: string; accepted: boolean }[]> = new Map();

/**
 * Get task recommendations for a user
 * 获取用户的任务推荐
 */
export async function getTaskRecommendations(
  request: TaskRecommendationRequest
): Promise<TaskRecommendation[]> {
  try {
    const { userId, userLocation, preferences = {}, limit = 10 } = request;

    // Get nearby tasks within 10km
    const nearbyResults = await getNearbyTasks({
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      radiusKm: 10,
      filter: {
        sortBy: 'distance',
        sortOrder: 'asc',
        limit: 50,
      },
    });

    // Filter out excluded tasks
    let tasks = nearbyResults.filter(
      result => !preferences.excludeTaskIds?.includes(result.task.id)
    );

    // Filter by preferred types
    if (preferences.preferredTypes && preferences.preferredTypes.length > 0) {
      tasks = tasks.filter(result => preferences.preferredTypes!.includes(result.task.type));
    }

    // Filter by minimum budget
    if (preferences.minBudget !== undefined) {
      tasks = tasks.filter(result => result.task.budgetMax >= preferences.minBudget!);
    }

    // Filter by max distance
    if (preferences.maxDistanceKm !== undefined) {
      tasks = tasks.filter(result => result.distanceKm <= preferences.maxDistanceKm!);
    }

    // Calculate match scores
    const recommendations: TaskRecommendation[] = tasks.map(result => ({
      task: result.task,
      matchScore: calculateMatchScore(result.task, userLocation, userId, preferences),
      matchReasons: generateMatchReasons(result.task, result.distanceKm, preferences),
      distanceKm: result.distanceKm,
    }));

    // Sort by match score (descending)
    recommendations.sort((a, b) => b.matchScore - a.matchScore);

    // Return top recommendations
    return recommendations.slice(0, limit);
  } catch (error) {
    logger.error('Error getting task recommendations', { error, userId });
    throw error;
  }
}

/**
 * Calculate match score for a task
 * 计算任务的匹配度评分
 */
function calculateMatchScore(
  task: Task,
  userLocation: GeoCoordinates,
  userId: string,
  preferences: TaskRecommendationPreferences
): number {
  let score = 0;

  // Distance score (closer is better, max 30 points)
  const { distanceKm } = calculateDistance(userLocation, task.coordinates);
  const distanceScore = Math.max(0, 30 - distanceKm * 3);
  score += distanceScore;

  // Budget score (higher budget is better, max 25 points)
  const avgBudget = (task.budgetMin + task.budgetMax) / 2;
  const budgetScore = Math.min(25, avgBudget / 200);
  score += budgetScore;

  // Priority score (higher priority is better, max 20 points)
  const priorityScores: Record<string, number> = {
    urgent: 20,
    high: 15,
    normal: 10,
    low: 5,
  };
  score += priorityScores[task.priority] || 10;

  // Type preference score (max 15 points)
  if (preferences.preferredTypes?.includes(task.type)) {
    score += 15;
  }

  // Publisher credit score (max 10 points)
  const creditScore = task.publisherCreditScore / 10;
  score += creditScore;

  return Math.min(100, Math.round(score));
}

/**
 * Generate match reasons for a task
 * 生成匹配原因
 */
function generateMatchReasons(
  task: Task,
  distanceKm: number,
  preferences: TaskRecommendationPreferences
): string[] {
  const reasons: string[] = [];

  // Distance reason
  if (distanceKm < 1) {
    reasons.push('距离极近，步行可达');
  } else if (distanceKm < 3) {
    reasons.push(`距离仅 ${distanceKm.toFixed(1)}km`);
  }

  // Budget reason
  const avgBudget = (task.budgetMin + task.budgetMax) / 2;
  if (avgBudget >= 3000) {
    reasons.push('预算充足');
  }

  // Priority reason
  if (task.priority === 'urgent') {
    reasons.push('紧急任务，快速响应');
  } else if (task.priority === 'high') {
    reasons.push('高优先级任务');
  }

  // Type preference reason
  if (preferences.preferredTypes?.includes(task.type)) {
    reasons.push('符合您的偏好类型');
  }

  // Publisher credit reason
  if (task.publisherCreditScore >= 90) {
    reasons.push('发布者信用极好');
  } else if (task.publisherCreditScore >= 80) {
    reasons.push('发布者信用良好');
  }

  return reasons;
}

/**
 * Get real-time task recommendations
 * 获取实时任务推荐
 */
export async function getRealtimeRecommendations(
  userId: string,
  userLocation: GeoCoordinates
): Promise<TaskRecommendation[]> {
  try {
    const preferences = userPreferencesCache.get(userId) || {};

    return await getTaskRecommendations({
      userId,
      userLocation,
      preferences,
      limit: 5,
    });
  } catch (error) {
    logger.error('Error getting realtime recommendations', { error, userId });
    throw error;
  }
}

/**
 * Save user recommendation preferences
 * 保存用户推荐偏好
 */
export async function saveUserPreferences(
  userId: string,
  preferences: TaskRecommendationPreferences
): Promise<void> {
  userPreferencesCache.set(userId, preferences);
  logger.info('User preferences saved', { userId });
}

/**
 * Get user recommendation preferences
 * 获取用户推荐偏好
 */
export async function getUserPreferences(
  userId: string
): Promise<TaskRecommendationPreferences | null> {
  return userPreferencesCache.get(userId) || null;
}

/**
 * Record user task interaction
 * 记录用户任务交互
 */
export async function recordTaskInteraction(
  userId: string,
  taskId: string,
  accepted: boolean
): Promise<void> {
  if (!userTaskHistory.has(userId)) {
    userTaskHistory.set(userId, []);
  }

  const history = userTaskHistory.get(userId)!;
  history.push({ taskId, accepted });

  // Keep only last 100 interactions
  if (history.length > 100) {
    history.shift();
  }

  logger.info('Task interaction recorded', { userId, taskId, accepted });
}

/**
 * Get user's accepted tasks
 * 获取用户已接任务
 */
export async function getUserAcceptedTasks(_userId: string): Promise<Task[]> {
  // In production, this would query the database
  // For now, return an empty array
  return [];
}

/**
 * Get user's task statistics
 * 获取用户任务统计
 */
export async function getUserTaskStats(userId: string): Promise<{
  totalAccepted: number;
  totalCompleted: number;
  acceptanceRate: number;
  completionRate: number;
}> {
  const history = userTaskHistory.get(userId) || [];
  const totalAccepted = history.length;
  const totalCompleted = history.filter(h => h.accepted).length;

  return {
    totalAccepted,
    totalCompleted,
    acceptanceRate: totalAccepted > 0 ? 100 : 0,
    completionRate: totalAccepted > 0 ? (totalCompleted / totalAccepted) * 100 : 0,
  };
}

/**
 * Push notification for recommended task
 * 推送推荐任务通知
 */
export async function pushRecommendationNotification(
  userId: string,
  recommendation: TaskRecommendation
): Promise<void> {
  logger.info('Pushing recommendation notification', {
    userId,
    taskId: recommendation.task.id,
    matchScore: recommendation.matchScore,
  });

  // In production, this would send a push notification
  // For now, just log it
}

/**
 * Subscribe to nearby task updates
 * 订阅附近任务更新
 */
export function subscribeToNearbyTasks(
  userId: string,
  userLocation: GeoCoordinates,
  radiusKm: number,
  _callback: (recommendations: TaskRecommendation[]) => void
): () => void {
  logger.info('Subscribed to nearby tasks', { userId, radiusKm });

  // In production, this would set up a WebSocket or polling mechanism
  // For now, just return an unsubscribe function
  return () => {
    logger.info('Unsubscribed from nearby tasks', { userId });
  };
}
