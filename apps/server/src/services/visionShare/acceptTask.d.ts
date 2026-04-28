/**
 * Accept Task Service
 * 接单服务
 */
import { Task, TaskAcceptRequest, TaskAcceptResponse, TaskEligibilityResult, TaskStatusUpdate, UserTaskSummary } from '@bridgeai/shared';
/**
 * Check if user is eligible to accept a task
 * 检查用户是否有资格接单
 */
export declare function checkTaskEligibility(taskId: string, userId: string, userLocation: {
    latitude: number;
    longitude: number;
}, userCreditScore: number, userPoints: number): Promise<TaskEligibilityResult>;
/**
 * Accept a task
 * 接单
 */
export declare function acceptTask(request: TaskAcceptRequest, userCreditScore: number, userPoints: number): Promise<TaskAcceptResponse>;
/**
 * Update task status
 * 更新任务状态
 */
export declare function updateTaskStatus(update: TaskStatusUpdate): Promise<Task | null>;
/**
 * Get user's task summary
 * 获取用户任务摘要
 */
export declare function getUserTaskSummary(userId: string): Promise<UserTaskSummary>;
/**
 * Get user's accepted tasks
 * 获取用户已接任务
 */
export declare function getUserAcceptedTasks(userId: string): Promise<Task[]>;
/**
 * Get user's completed tasks
 * 获取用户已完成任务
 */
export declare function getUserCompletedTasks(userId: string): Promise<Task[]>;
/**
 * Cancel a task
 * 取消任务
 */
export declare function cancelTask(taskId: string, userId: string, reason: string): Promise<Task | null>;
/**
 * Dispute a task
 * 申诉任务
 */
export declare function disputeTask(taskId: string, userId: string, reason: string): Promise<Task | null>;
/**
 * Complete a task
 * 完成任务
 */
export declare function completeTask(taskId: string, userId: string): Promise<Task | null>;
/**
 * Start a task
 * 开始任务
 */
export declare function startTask(taskId: string, userId: string): Promise<Task | null>;
//# sourceMappingURL=acceptTask.d.ts.map