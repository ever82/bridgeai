/**
 * Accept Task Service
 * 接单服务
 */

import {
  Task,
  TaskStatus,
  TaskAcceptRequest,
  TaskAcceptResponse,
  TaskEligibilityResult,
  TaskStatusUpdate,
  UserTaskSummary,
  calculateDistance,
} from '@bridgeai/shared';
import { logger } from '../../utils/logger';
import { getTaskById } from './taskFilter';

// Minimum requirements
const MIN_CREDIT_SCORE = 60;
const MIN_POINTS = 100;
const MAX_DISTANCE_KM = 50;

// Rate limiting
const acceptRateLimit: Map<string, { count: number; resetTime: number }> = new Map();
const MAX_ACCEPTS_PER_HOUR = 10;

// Task storage (in production, this would be from Prisma)
const taskStore: Map<string, Task> = new Map();
const userTaskMap: Map<string, string[]> = new Map(); // userId -> taskIds

/**
 * Check if user is eligible to accept a task
 * 检查用户是否有资格接单
 */
export async function checkTaskEligibility(
  taskId: string,
  userId: string,
  userLocation: { latitude: number; longitude: number },
  userCreditScore: number,
  userPoints: number
): Promise<TaskEligibilityResult> {
  try {
    const task = await getTaskById(taskId);

    if (!task) {
      return {
        eligible: false,
        reasons: ['任务不存在'],
      };
    }

    const reasons: string[] = [];
    let eligible = true;

    // Check task status
    if (task.status !== 'pending') {
      eligible = false;
      if (task.status === 'accepted') {
        reasons.push('任务已被接单');
      } else if (task.status === 'cancelled') {
        reasons.push('任务已取消');
      } else {
        reasons.push('任务状态不正确');
      }
    }

    // Check if already accepted by this user
    if (task.acceptorId === userId) {
      eligible = false;
      reasons.push('您已接过此任务');
    }

    // Check if accepted by another user
    if (task.acceptorId && task.acceptorId !== userId) {
      eligible = false;
      reasons.push('任务已被其他用户接单');
    }

    // Check credit score
    if (userCreditScore < MIN_CREDIT_SCORE) {
      eligible = false;
      reasons.push(`信用分不足，需要${MIN_CREDIT_SCORE}分`);
    }

    // Check points
    if (userPoints < MIN_POINTS) {
      eligible = false;
      reasons.push(`积分不足，需要${MIN_POINTS}分`);
    }

    // Check distance
    const { distanceKm } = calculateDistance(userLocation, task.coordinates);
    if (distanceKm > MAX_DISTANCE_KM) {
      eligible = false;
      reasons.push(`距离过远，超过${MAX_DISTANCE_KM}km限制`);
    }

    // Check rate limit
    const rateLimit = acceptRateLimit.get(userId);
    if (rateLimit) {
      const now = Date.now();
      if (now > rateLimit.resetTime) {
        // Reset rate limit
        acceptRateLimit.set(userId, { count: 0, resetTime: now + 60 * 60 * 1000 });
      } else if (rateLimit.count >= MAX_ACCEPTS_PER_HOUR) {
        eligible = false;
        reasons.push('接单过于频繁，请稍后再试');
      }
    }

    return {
      eligible,
      reasons,
      requiredCreditScore: MIN_CREDIT_SCORE,
      currentCreditScore: userCreditScore,
      requiredPoints: MIN_POINTS,
      currentPoints: userPoints,
      maxDistanceKm: MAX_DISTANCE_KM,
      currentDistanceKm: calculateDistance(userLocation, task.coordinates).distanceKm,
    };
  } catch (error) {
    logger.error('Error checking task eligibility', { error, taskId, userId });
    throw error;
  }
}

/**
 * Accept a task
 * 接单
 */
export async function acceptTask(
  request: TaskAcceptRequest,
  userCreditScore: number,
  userPoints: number
): Promise<TaskAcceptResponse> {
  try {
    const { taskId, userId, userLocation, message } = request;

    // Check eligibility
    const eligibility = await checkTaskEligibility(
      taskId,
      userId,
      userLocation,
      userCreditScore,
      userPoints
    );

    if (!eligibility.eligible) {
      return {
        success: false,
        error: eligibility.reasons.join('，'),
        errorCode: mapEligibilityToErrorCode(eligibility.reasons),
      };
    }

    const task = await getTaskById(taskId);
    if (!task) {
      return {
        success: false,
        error: '任务不存在',
        errorCode: 'ALREADY_ACCEPTED_BY_OTHER',
      };
    }

    // Update rate limit
    const now = Date.now();
    const rateLimit = acceptRateLimit.get(userId);
    if (rateLimit && now <= rateLimit.resetTime) {
      rateLimit.count++;
    } else {
      acceptRateLimit.set(userId, { count: 1, resetTime: now + 60 * 60 * 1000 });
    }

    // Update task
    const updatedTask: Task = {
      ...task,
      status: 'accepted',
      acceptorId: userId,
      acceptorName: 'Current User', // In production, get from user service
      acceptedAt: new Date(),
      updatedAt: new Date(),
    };

    // Save task
    taskStore.set(taskId, updatedTask);

    // Update user task map
    if (!userTaskMap.has(userId)) {
      userTaskMap.set(userId, []);
    }
    userTaskMap.get(userId)!.push(taskId);

    logger.info('Task accepted successfully', {
      taskId,
      userId,
      message,
    });

    return {
      success: true,
      task: updatedTask,
    };
  } catch (error) {
    logger.error('Error accepting task', { error, taskId: request.taskId, userId: request.userId });
    return {
      success: false,
      error: '接单失败，请稍后重试',
    };
  }
}

/**
 * Map eligibility reasons to error code
 * 将资格原因映射到错误码
 */
function mapEligibilityToErrorCode(reasons: string[]): TaskAcceptResponse['errorCode'] {
  if (reasons.some((r) => r.includes('信用分'))) return 'INSUFFICIENT_CREDIT';
  if (reasons.some((r) => r.includes('积分'))) return 'INSUFFICIENT_POINTS';
  if (reasons.some((r) => r.includes('距离'))) return 'TOO_FAR';
  if (reasons.some((r) => r.includes('已被接单'))) return 'ALREADY_ACCEPTED_BY_OTHER';
  if (reasons.some((r) => r.includes('已取消'))) return 'TASK_CANCELLED';
  if (reasons.some((r) => r.includes('频繁'))) return 'RATE_LIMITED';
  return undefined;
}

/**
 * Update task status
 * 更新任务状态
 */
export async function updateTaskStatus(
  update: TaskStatusUpdate
): Promise<Task | null> {
  try {
    const { taskId, status, updatedBy, reason } = update;

    const task = taskStore.get(taskId) || await getTaskById(taskId);
    if (!task) {
      return null;
    }

    // Validate status transition
    if (!isValidStatusTransition(task.status, status)) {
      logger.warn('Invalid status transition', {
        taskId,
        from: task.status,
        to: status,
      });
      return null;
    }

    const updatedTask: Task = {
      ...task,
      status,
      updatedAt: new Date(),
    };

    // Update timestamps based on status
    if (status === 'in_progress') {
      updatedTask.startedAt = new Date();
    } else if (status === 'completed') {
      updatedTask.completedAt = new Date();
    }

    taskStore.set(taskId, updatedTask);

    logger.info('Task status updated', {
      taskId,
      from: task.status,
      to: status,
      updatedBy,
      reason,
    });

    return updatedTask;
  } catch (error) {
    logger.error('Error updating task status', { error, taskId: update.taskId });
    throw error;
  }
}

/**
 * Check if status transition is valid
 * 检查状态转换是否有效
 */
function isValidStatusTransition(from: TaskStatus, to: TaskStatus): boolean {
  const validTransitions: Record<TaskStatus, TaskStatus[]> = {
    pending: ['accepted', 'cancelled'],
    accepted: ['in_progress', 'cancelled'],
    in_progress: ['completed', 'cancelled', 'disputed'],
    completed: [],
    cancelled: [],
    disputed: ['completed', 'cancelled'],
  };

  return validTransitions[from]?.includes(to) || false;
}

/**
 * Get user's task summary
 * 获取用户任务摘要
 */
export async function getUserTaskSummary(userId: string): Promise<UserTaskSummary> {
  const taskIds = userTaskMap.get(userId) || [];
  const tasks: Task[] = [];

  for (const taskId of taskIds) {
    const task = taskStore.get(taskId) || await getTaskById(taskId);
    if (task) {
      tasks.push(task);
    }
  }

  const acceptedTasks = tasks.filter((t) => t.status === 'accepted');
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress');
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const cancelledTasks = tasks.filter((t) => t.status === 'cancelled');

  const totalAccepted = tasks.length;
  const totalCompleted = completedTasks.length;
  const totalEarned = completedTasks.reduce((sum, t) => sum + t.budgetMax, 0);

  return {
    userId,
    acceptedTasks,
    inProgressTasks,
    completedTasks,
    cancelledTasks,
    totalAccepted,
    totalCompleted,
    totalEarned,
    acceptanceRate: totalAccepted > 0 ? 100 : 0,
    completionRate: totalAccepted > 0 ? (totalCompleted / totalAccepted) * 100 : 0,
    averageRating: 0, // In production, calculate from reviews
  };
}

/**
 * Get user's accepted tasks
 * 获取用户已接任务
 */
export async function getUserAcceptedTasks(userId: string): Promise<Task[]> {
  const summary = await getUserTaskSummary(userId);
  return [
    ...summary.acceptedTasks,
    ...summary.inProgressTasks,
  ];
}

/**
 * Get user's completed tasks
 * 获取用户已完成任务
 */
export async function getUserCompletedTasks(userId: string): Promise<Task[]> {
  const summary = await getUserTaskSummary(userId);
  return summary.completedTasks;
}

/**
 * Cancel a task
 * 取消任务
 */
export async function cancelTask(
  taskId: string,
  userId: string,
  reason: string
): Promise<Task | null> {
  const task = taskStore.get(taskId);
  if (!task) {
    return null;
  }

  // Only acceptor or publisher can cancel
  if (task.acceptorId !== userId && task.publisherId !== userId) {
    return null;
  }

  return await updateTaskStatus({
    taskId,
    status: 'cancelled',
    updatedBy: userId,
    reason,
  });
}

/**
 * Dispute a task
 * 申诉任务
 */
export async function disputeTask(
  taskId: string,
  userId: string,
  reason: string
): Promise<Task | null> {
  const task = taskStore.get(taskId);
  if (!task) {
    return null;
  }

  // Only acceptor can dispute
  if (task.acceptorId !== userId) {
    return null;
  }

  return await updateTaskStatus({
    taskId,
    status: 'disputed',
    updatedBy: userId,
    reason,
  });
}

/**
 * Complete a task
 * 完成任务
 */
export async function completeTask(
  taskId: string,
  userId: string
): Promise<Task | null> {
  const task = taskStore.get(taskId);
  if (!task) {
    return null;
  }

  // Only acceptor can complete
  if (task.acceptorId !== userId) {
    return null;
  }

  return await updateTaskStatus({
    taskId,
    status: 'completed',
    updatedBy: userId,
    reason: '任务完成',
  });
}

/**
 * Start a task
 * 开始任务
 */
export async function startTask(
  taskId: string,
  userId: string
): Promise<Task | null> {
  const task = taskStore.get(taskId);
  if (!task) {
    return null;
  }

  // Only acceptor can start
  if (task.acceptorId !== userId) {
    return null;
  }

  return await updateTaskStatus({
    taskId,
    status: 'in_progress',
    updatedBy: userId,
    reason: '任务开始',
  });
}
